import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import api from '../../services/api';

export default function CandidateInvitations() {
  const location = useLocation();
  const invitationId = new URLSearchParams(location.search).get('invitationId');
  const [page, setPage] = useState(1);
  const [state, setState] = useState({ items: [], loading: true, error: '', hasMore: false });
  useEffect(() => { setPage(1); }, [invitationId]);
  useEffect(() => {
    const controller = new AbortController();
    setState({ items: [], loading: true, error: '', hasMore: false });
    api.get('/candidate/invitations', { params: { id: invitationId || undefined, page }, signal: controller.signal })
      .then(res => { if (!controller.signal.aborted) setState({ items: res.data.data, hasMore: res.data.hasMore, loading: false, error: '' }); })
      .catch(() => { if (!controller.signal.aborted) setState({ items: [], hasMore: false, loading: false, error: 'Không thể tải lời mời. Vui lòng thử lại.' }); });
    return () => controller.abort();
  }, [invitationId, page, location.key]);
  return <section className="rounded-2xl border bg-white p-6 space-y-4" aria-label="Lời mời ứng tuyển">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-bold">Lời mời ứng tuyển</h2>
      {invitationId && <Link className="text-sm text-blue-700" to="/candidate/dashboard?tab=invitations">Xem tất cả lời mời</Link>}</div>
    {state.loading && <p role="status">Đang tải lời mời…</p>}
    {state.error && <p role="alert" className="text-red-700">{state.error}</p>}
    {!state.loading && !state.error && !state.items.length && <p className="text-gray-500">Không có lời mời phù hợp.</p>}
    {state.items.map(item => <article key={item.InvitationID} className="rounded-xl border p-4 space-y-2">
      <h3 className="font-semibold">{item.Title}</h3><p className="text-sm text-gray-600">{item.CompanyName} · {new Date(item.SentAt).toLocaleString('vi-VN')}</p>
      <p className="whitespace-pre-wrap break-words text-sm">{item.Message}</p>
      <p className="text-xs text-gray-500">Trạng thái lời mời: {item.Status}</p>
      <Link to={`/jobs/${item.JobID}`} className="inline-block text-sm font-semibold text-blue-700">Xem công việc{item.JobStatus === 'Published' ? ' và ứng tuyển' : ' (hiện chưa mở tuyển)'}</Link>
    </article>)}
    {!invitationId && (page > 1 || state.hasMore) && <div className="flex justify-between text-sm">
      <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="disabled:opacity-40">Trước</button><span>Trang {page}</span>
      <button disabled={!state.hasMore} onClick={() => setPage(p => p + 1)} className="disabled:opacity-40">Sau</button>
    </div>}
  </section>;
}
