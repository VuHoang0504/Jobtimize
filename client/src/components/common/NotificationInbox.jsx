import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Bell, CheckCheck, RefreshCw, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

export default function NotificationInbox() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [snapshot, setSnapshot] = useState({ data: [], total: 0, unread: 0 });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const dropdownRef = useRef(null), generation = useRef(0), pending = useRef(null);
  const identity = `${user?.userId}:${user?.role}`;
  const currentIdentity = useRef(identity);
  currentIdentity.current = identity;

  const refresh = useCallback(async () => {
    if (!user || document.hidden || pending.current) return;
    const controller = new AbortController(); pending.current = controller;
    const version = generation.current;
    try {
      const response = await api.get('/notifications', { params: { page, filter }, signal: controller.signal, timeout: 10000 });
      if (version === generation.current && currentIdentity.current === identity) {
        setSnapshot(response.data); setError('');
        const count = filter === 'unread' ? response.data.unread : response.data.total;
        if (page > Math.max(1, Math.ceil(count / 20))) setPage(Math.max(1, Math.ceil(count / 20)));
      }
    } catch (err) {
      if (!controller.signal.aborted && version === generation.current) setError('Chưa tải được thông báo. Bạn có thể thử lại.');
    } finally { if (pending.current === controller) pending.current = null; }
  }, [identity, page, filter]);

  useEffect(() => {
    generation.current++; pending.current?.abort(); pending.current = null;
    setSnapshot({ data: [], total: 0, unread: 0 }); setError('');
    setBusy(false);
    setIsOpen(false); setPage(1); setFilter('all');
  }, [identity]);
  useEffect(() => {
    generation.current++; pending.current?.abort(); pending.current = null;
    setSnapshot(prev => ({ ...prev, data: [] })); void refresh();
    const timer = setInterval(refresh, 30000);
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('focus', refresh); window.addEventListener('notifications-changed', refresh);
    return () => {
      clearInterval(timer); document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('focus', refresh); window.removeEventListener('notifications-changed', refresh);
      generation.current++; pending.current?.abort(); pending.current = null;
    };
  }, [refresh]);
  useEffect(() => {
    const outside = event => { if (!dropdownRef.current?.contains(event.target)) setIsOpen(false); };
    const escape = event => { if (event.key === 'Escape') setIsOpen(false); };
    document.addEventListener('mousedown', outside); document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('mousedown', outside); document.removeEventListener('keydown', escape); };
  }, []);

  async function markRead(item) {
    const version = generation.current;
    const owner = identity;
    setBusy(true);
    try {
      await api.patch(item ? `/notifications/${item.id}/read` : '/notifications/read-all', undefined, { timeout: 10000 });
      if (version !== generation.current || owner !== currentIdentity.current) return;
      pending.current?.abort(); pending.current = null; generation.current++;
      if (item) {
        setSnapshot(previous => ({ ...previous, unread: Math.max(0, previous.unread - (item.readAt ? 0 : 1)),
          data: filter === 'unread' ? previous.data.filter(n => n.id !== item.id)
            : previous.data.map(n => n.id === item.id ? { ...n, readAt: n.readAt || new Date().toISOString() } : n) }));
        setIsOpen(false); navigate(item.href);
        void refresh();
      } else await refresh();
    } catch { if (owner === currentIdentity.current) setError('Không thể đánh dấu đã đọc. Vui lòng thử lại.'); }
    finally { if (owner === currentIdentity.current) setBusy(false); }
  }
  if (!user) return null;
  const count = filter === 'unread' ? snapshot.unread : snapshot.total;
  return <div className="relative" ref={dropdownRef}>
    <button type="button" aria-label={`Thông báo${snapshot.unread ? `, ${snapshot.unread} chưa đọc` : ''}`} aria-expanded={isOpen}
      onClick={() => { setIsOpen(open => !open); void refresh(); }} className="relative p-2 rounded-lg text-slate-600 hover:bg-slate-100">
      <Bell className="w-5 h-5" />{snapshot.unread > 0 && <span className="absolute -top-1 -right-1 min-w-4 rounded-full bg-red-600 px-1 text-[10px] text-white">{snapshot.unread > 99 ? '99+' : snapshot.unread}</span>}
    </button>
    {isOpen && <section aria-label="Danh sách thông báo" className="fixed left-4 right-4 top-20 md:absolute md:left-auto md:right-0 md:top-auto md:mt-2 md:w-96 bg-white shadow-xl rounded-xl border border-gray-200 z-50 overflow-hidden">
      <div className="p-4 border-b space-y-3">
        <div className="flex items-center justify-between gap-2"><h2 className="font-bold text-sm">Thông báo</h2><div className="flex gap-3">
          <button type="button" onClick={refresh} aria-label="Tải lại thông báo"><RefreshCw className="w-4 h-4" /></button>
          <button type="button" onClick={() => setIsOpen(false)} aria-label="Đóng danh sách thông báo"><X className="w-4 h-4" /></button>
        </div></div>
        <div className="flex items-center gap-2">{[['all', `Tất cả (${snapshot.total})`], ['unread', `Chưa đọc (${snapshot.unread})`]].map(([key, label]) => <button key={key} type="button"
          aria-pressed={filter === key} onClick={() => { setPage(1); setFilter(key); }} className={`px-2 py-1 rounded-lg text-xs ${filter === key ? 'bg-slate-900 text-white' : 'bg-slate-100'}`}>{label}</button>)}</div>
        {snapshot.unread > 0 && <button type="button" disabled={busy} onClick={() => markRead()} className="flex items-center gap-1 text-xs text-blue-700 disabled:opacity-50"><CheckCheck className="w-4 h-4" />Đánh dấu tất cả đã đọc</button>}
      </div>
      {error && <p role="alert" className="p-3 text-xs text-red-700">{error}</p>}
      <div className="max-h-[min(400px,60vh)] overflow-y-auto divide-y divide-gray-100">
        {!snapshot.data.length && <p className="p-8 text-center text-sm text-gray-500">{filter === 'unread' ? 'Không có thông báo chưa đọc.' : 'Chưa có thông báo.'}</p>}
        {snapshot.data.map(item => <button key={item.id} type="button" disabled={busy} onClick={() => markRead(item)} className={`w-full text-left p-4 hover:bg-slate-50 disabled:opacity-60 ${item.readAt ? '' : 'bg-blue-50/60'}`}>
          <div className="flex gap-2 items-start"><div className="flex-1"><p className="text-sm font-semibold text-slate-900">{item.title}</p><p className="mt-1 text-sm text-slate-600 break-words">{item.body}</p>
            <time className="mt-1 block text-xs text-slate-500" dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString('vi-VN')}</time></div>{!item.readAt && <span aria-label="Chưa đọc" className="w-2 h-2 bg-blue-600 rounded-full shrink-0 mt-1" />}</div>
        </button>)}
      </div>
      {count > 20 && <div className="flex justify-between items-center border-t p-3 text-xs">
        <button type="button" disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="disabled:opacity-40">Trước</button><span>Trang {page}/{Math.max(1, Math.ceil(count / 20))}</span>
        <button type="button" disabled={page * 20 >= count} onClick={() => setPage(p => p + 1)} className="disabled:opacity-40">Sau</button>
      </div>}
    </section>}
  </div>;
}
