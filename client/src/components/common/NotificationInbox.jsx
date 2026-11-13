import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Bell, CheckCheck, RefreshCw, Settings2, Sparkles, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { subscribeNotifications } from '../../services/notificationStream';
import JobNotificationSettings from './JobNotificationSettings';

const iconButton = 'grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-blue-600';
const notificationTime = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' });

export default function NotificationInbox() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [snapshot, setSnapshot] = useState({ data: [], total: 0, unread: 0 });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [opportunity, setOpportunity] = useState(null);
  const seenOpportunities = useRef(null), refreshAgain = useRef(false), latestRefresh = useRef(null);
  const dropdownRef = useRef(null), generation = useRef(0), pending = useRef(null);
  const identity = `${user?.userId}:${user?.role}`;
  const currentIdentity = useRef(identity);
  currentIdentity.current = identity;

  const refresh = useCallback(async () => {
    if (!user || document.hidden) return;
    if (pending.current) { refreshAgain.current = true; return; }
    const controller = new AbortController(); pending.current = controller;
    const version = generation.current;
    try {
      const response = await api.get('/notifications', { params: { page, filter }, signal: controller.signal, timeout: 10000 });
      if (version === generation.current && currentIdentity.current === identity) {
        const alerts = response.data.data.filter(item => item.type === 'job_match_alert');
        if (response.data.latestOpportunity) alerts.unshift(response.data.latestOpportunity);
        const fresh = seenOpportunities.current !== null && alerts.find(item => !item.readAt && item.id > seenOpportunities.current);
        seenOpportunities.current = Math.max(seenOpportunities.current || 0, ...alerts.map(item => item.id));
        if (fresh) setOpportunity(fresh);
        else if (Object.prototype.hasOwnProperty.call(response.data, 'latestOpportunity')) setOpportunity(previous => previous?.id === response.data.latestOpportunity?.id ? previous : null);
        else if (page === 1 && filter === 'all') setOpportunity(previous => previous && alerts.some(item => item.id === previous.id && !item.readAt) ? previous : null);
        setSnapshot(response.data); setError('');
        const count = filter === 'unread' ? response.data.unread : response.data.total;
        if (page > Math.max(1, Math.ceil(count / 20))) setPage(Math.max(1, Math.ceil(count / 20)));
      }
    } catch (err) {
      if (!controller.signal.aborted && version === generation.current) setError('Chưa tải được thông báo. Bạn có thể thử lại.');
    } finally {
      if (pending.current === controller) {
        pending.current = null;
        if (refreshAgain.current) { refreshAgain.current = false; void latestRefresh.current?.(); }
      }
    }
  }, [identity, page, filter]);
  latestRefresh.current = refresh;

  useEffect(() => {
    generation.current++; pending.current?.abort(); pending.current = null;
    setSnapshot({ data: [], total: 0, unread: 0 }); setError('');
    setBusy(false);
    setOpportunity(null); seenOpportunities.current = null; refreshAgain.current = false;
    setIsOpen(false); setPage(1); setFilter('all');
  }, [identity]);
  useEffect(() => {
    if (!user) return;
    return subscribeNotifications(() => { void latestRefresh.current?.(); });
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
        setOpportunity(previous => previous?.id === item.id ? null : previous);
        setSnapshot(previous => ({ ...previous, unread: Math.max(0, previous.unread - (item.readAt ? 0 : 1)),
          data: filter === 'unread' ? previous.data.filter(n => n.id !== item.id)
            : previous.data.map(n => n.id === item.id ? { ...n, readAt: n.readAt || new Date().toISOString() } : n) }));
        setIsOpen(false); navigate(item.href);
        void refresh();
      } else { setOpportunity(null); await refresh(); }
    } catch { if (owner === currentIdentity.current) setError('Không thể đánh dấu đã đọc. Vui lòng thử lại.'); }
    finally { if (owner === currentIdentity.current) setBusy(false); }
  }

  function preferencesSaved() {
    setShowSettings(false);
    pending.current?.abort();
    pending.current = null;
    generation.current++;
    if (page === 1) void refresh();
    else setPage(1);
  }

  if (!user) return null;
  const count = filter === 'unread' ? snapshot.unread : snapshot.total;
  return <div className="relative" ref={dropdownRef}>
    <span role="status" aria-atomic="true" className="sr-only">{snapshot.unread ? `Bạn có ${snapshot.unread} thông báo chưa đọc.` : ''}</span>
    <button type="button" aria-label={`Thông báo${snapshot.unread ? `, ${snapshot.unread} chưa đọc` : ''}`} aria-expanded={isOpen}
      onClick={() => { setShowSettings(false); setIsOpen(open => !open); void refresh(); }}
      className={`relative ${iconButton} ${isOpen ? 'bg-blue-50 text-blue-700' : ''}`}>
      <Bell aria-hidden="true" className="h-5 w-5" />
      {snapshot.unread > 0 && <span aria-hidden="true" className="absolute -right-1 -top-1 min-w-4 rounded-full bg-blue-700 px-1 text-center text-[10px] font-semibold text-white ring-2 ring-white">{snapshot.unread > 99 ? '99+' : snapshot.unread}</span>}
    </button>
    {isOpen && <section aria-label={showSettings ? 'Cài đặt thông báo việc làm' : 'Danh sách thông báo'}
      className="fixed left-3 right-3 top-16 z-50 flex max-h-[min(36rem,calc(100dvh-5rem))] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/15 md:absolute md:left-auto md:right-0 md:top-full md:mt-2 md:w-[26rem]">
      <div className="shrink-0 border-b border-slate-200 px-4 pb-3 pt-3 sm:px-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-bold tracking-tight text-slate-900">{showSettings ? 'Cài đặt việc làm' : 'Thông báo'}</h2>
          <div className="flex items-center gap-1">
            {!showSettings && <button type="button" onClick={refresh} aria-label="Tải lại thông báo" title="Tải lại thông báo" className={iconButton}><RefreshCw className="h-4 w-4" /></button>}
            <button type="button" onClick={() => setIsOpen(false)} aria-label="Đóng danh sách thông báo" title="Đóng" className={iconButton}><X className="h-5 w-5" /></button>
          </div>
        </div>
        {!showSettings && <>
          <div className="mt-2 flex items-center gap-1.5">
            {[['all', `Tất cả (${snapshot.total})`], ['unread', `Chưa đọc (${snapshot.unread})`]].map(([key, label]) =>
              <button key={key} type="button" aria-pressed={filter === key}
                onClick={() => { setPage(1); setFilter(key); }}
                className={`rounded-lg px-3 py-2 text-xs font-semibold ${filter === key ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>{label}</button>)}
            {snapshot.unread > 0 && <button type="button" disabled={busy} onClick={() => markRead()}
              aria-label="Đánh dấu tất cả đã đọc" title="Đánh dấu tất cả đã đọc"
              className={`ml-auto ${iconButton} text-blue-700 disabled:opacity-50`}><CheckCheck className="h-[18px] w-[18px]" /></button>}
          </div>
        </>}
      </div>
      {showSettings ? <JobNotificationSettings onCancel={() => setShowSettings(false)} onSaved={preferencesSaved} /> : <>
        {error && <p role="alert" className="mx-4 mt-3 shrink-0 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <div className="min-h-0 space-y-1 overflow-y-auto overscroll-contain p-2">
          {!snapshot.data.length && <p className="px-4 py-10 text-center text-sm text-slate-500">{filter === 'unread' ? 'Không có thông báo chưa đọc.' : 'Chưa có thông báo.'}</p>}
          {snapshot.data.map(item => <button key={item.id} type="button" disabled={busy} onClick={() => markRead(item)}
            className={`block w-full rounded-xl px-3 py-3 text-left focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600 disabled:opacity-60 ${item.readAt ? 'hover:bg-slate-50' : 'bg-blue-50 hover:bg-blue-100/70'}`}>
            <div className="flex items-start gap-2.5">
              <span aria-label={item.readAt ? undefined : 'Chưa đọc'} aria-hidden={item.readAt ? true : undefined}
                className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${item.readAt ? 'bg-transparent' : 'bg-blue-600'}`} />
              <div className="min-w-0">
                <>{item.type === 'job_match_alert' && <span className="mb-1 inline-flex items-center gap-1 whitespace-nowrap rounded bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-800"><Sparkles aria-hidden="true" className="h-3 w-3" />Việc làm phù hợp</span>}</><p className="break-words text-sm font-semibold leading-5 text-slate-900">{item.title}</p>
                <p className="mt-0.5 break-words text-sm leading-5 text-slate-600">{item.body}</p>
                <time className="mt-1.5 block text-xs text-slate-500" dateTime={item.createdAt}>{notificationTime.format(new Date(item.createdAt))}</time>
              </div>
            </div>
          </button>)}
        </div>
        {count > 20 && <div className="flex shrink-0 items-center justify-between border-t border-slate-200 px-4 py-2 text-xs text-slate-600">
          <button type="button" disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="rounded px-2 py-1 font-semibold hover:bg-slate-100 disabled:opacity-40">Trước</button>
          <span>Trang {page}/{Math.ceil(count / 20)}</span>
          <button type="button" disabled={page * 20 >= count} onClick={() => setPage(p => p + 1)} className="rounded px-2 py-1 font-semibold hover:bg-slate-100 disabled:opacity-40">Sau</button>
        </div>}
        {user.role === 'Candidate' && <div className="shrink-0 border-t border-slate-200 px-3 py-2">
          <button type="button" onClick={() => setShowSettings(true)}
            className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-blue-600">
            <Settings2 aria-hidden="true" className="h-4 w-4 text-slate-500" />Cài đặt thông báo việc làm
          </button>
        </div>}
      </>}
    </section>}
    {opportunity && <aside aria-label="Việc làm phù hợp mới" className="fixed bottom-4 left-4 right-4 z-50 rounded-xl border border-emerald-200 bg-white p-4 shadow-xl sm:left-auto sm:w-96">
      <div className="flex items-start gap-2"><Sparkles aria-hidden="true" className="mt-1 h-5 w-5 shrink-0 text-emerald-700" /><div className="min-w-0 flex-1" role="status" aria-atomic="true"><p className="font-semibold text-slate-900">{opportunity.title}</p><p className="mt-1 break-words text-sm text-slate-600">{opportunity.body}</p></div>
        <button type="button" aria-label="Ẩn gợi ý việc làm" onClick={() => setOpportunity(null)} className="-mr-2 -mt-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"><X className="h-4 w-4" /></button></div>
      <button type="button" disabled={busy} onClick={() => markRead(opportunity)} className="mt-3 min-h-11 rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60">Xem việc làm</button>
    </aside>}
  </div>;
}
