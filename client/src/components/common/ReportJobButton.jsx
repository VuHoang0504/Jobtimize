import React, { useState } from 'react';
import { Flag, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
export default function ReportJobButton({ jobId }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false), [reason, setReason] = useState(''), [busy, setBusy] = useState(false), [feedback, setFeedback] = useState('');
  if (!['Candidate', 'Employer'].includes(user?.role)) return null;
  async function submit(event) {
    event.preventDefault(); setBusy(true); setFeedback('');
    try { await api.post('/reports', { targetType: 'JobPosting', targetId: jobId, reason }); setFeedback('Báo cáo đã được gửi tới quản trị viên.'); setOpen(false); setReason(''); }
    catch (error) { setFeedback(error.response?.data?.message || 'Không thể gửi báo cáo. Vui lòng thử lại.'); }
    finally { setBusy(false); }
  }
  return <div>
    <button type="button" onClick={() => { setOpen(true); setFeedback(''); }} className="inline-flex gap-1 items-center text-xs text-gray-600 hover:text-red-700"><Flag className="w-4 h-4" />Báo cáo vi phạm</button>
    {feedback && <p role="status" className="mt-2 text-sm">{feedback}</p>}
    {open && <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4"><form role="dialog" aria-modal="true" aria-label="Báo cáo tin tuyển dụng" onSubmit={submit} className="w-full max-w-md rounded-2xl bg-white p-6 space-y-4">
      <div className="flex justify-between"><h2 className="font-bold">Báo cáo tin tuyển dụng</h2><button type="button" disabled={busy} aria-label="Đóng báo cáo" onClick={() => setOpen(false)}><X className="w-5 h-5" /></button></div>
      <label className="block text-sm">Nội dung báo cáo<textarea autoFocus required minLength={10} maxLength={2000} value={reason} onChange={event => setReason(event.target.value)} className="block w-full mt-2 border rounded-xl p-3 min-h-32" placeholder="Mô tả thông tin cần quản trị viên kiểm tra" /></label>
      {feedback && <p role="alert" className="text-sm text-red-700">{feedback}</p>}
      <button type="submit" disabled={busy} className="rounded-xl bg-blue-600 px-4 py-2 text-white text-sm disabled:opacity-50">{busy ? 'Đang gửi…' : 'Gửi báo cáo'}</button>
    </form></div>}
  </div>;
}
