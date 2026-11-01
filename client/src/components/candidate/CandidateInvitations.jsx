import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import api from '../../services/api';
import { StatusPill, InterviewDetails, invitationLabels, formatDate } from '../common/RecruitmentUI';

export default function CandidateInvitations() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const invitationId = params.get('invitationId'), interviewId = params.get('interviewId');
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState({ items: [], interviews: [], loading: true, hasMore: false });
  const [error, setError] = useState(''), [message, setMessage] = useState(''), [busy, setBusy] = useState(false);
  useEffect(() => { setPage(1); }, [invitationId]);
  useEffect(() => {
    const controller = new AbortController();
    setState(previous => ({ ...previous, loading: true })); setError('');
    Promise.all([
      api.get('/candidate/invitations', { params: { id: invitationId || undefined, page }, signal: controller.signal }),
      api.get('/candidate/interviews', { signal: controller.signal })
    ]).then(([invitations, interviews]) => {
      if (!controller.signal.aborted) setState({ items: invitations.data.data, interviews: interviews.data.data, hasMore: invitations.data.hasMore, loading: false });
    }).catch(() => { if (!controller.signal.aborted) { setError('Chưa tải được lời mời và lịch. Vui lòng tải lại.'); setState(previous => ({ ...previous, loading: false })); } });
    return () => controller.abort();
  }, [invitationId, page, location.key, revision]);
  useEffect(() => {
    if (!state.loading && interviewId) document.getElementById(`interview-${interviewId}`)?.scrollIntoView({ block: 'center' });
  }, [state.loading, interviewId]);
  async function respond(path, status, version) {
    setBusy(true); setError(''); setMessage('');
    try {
      const res = await api.patch(path, { status, version }); setMessage(res.data.message);
      setRevision(value => value + 1); window.dispatchEvent(new Event('notifications-changed'));
    } catch (err) { setError(err.response?.data?.message || 'Chưa ghi nhận phản hồi. Vui lòng tải lại và thử lại.'); }
    finally { setBusy(false); }
  }
  const schedules = state.interviews.filter(item => interviewId ? String(item.InterviewID) === interviewId : invitationId ? String(item.InvitationID) === invitationId : true);
  return <section className="recruit-workspace" aria-label="Lời mời và lịch phỏng vấn">
    <header className="recruit-header recruit-row"><div><h1>Lời mời & lịch phỏng vấn</h1><p className="recruit-muted">Phản hồi lời mời và xác nhận thời gian gặp nhà tuyển dụng.</p></div><button className="recruit-button" disabled={busy || state.loading} onClick={() => setRevision(value => value + 1)}>Tải lại</button></header>
    {(invitationId || interviewId) && <Link className="text-blue-700 underline" to="/candidate/dashboard?tab=invitations">Xem tất cả lời mời và lịch</Link>}
    {message && <p role="status" className="recruit-notice">{message}</p>}{error && <p role="alert" className="recruit-notice recruit-error">{error}</p>}
    {state.loading ? <p role="status">Đang tải…</p> : <>
      <h2 className="mt-5">Lời mời ứng tuyển</h2>
      {!state.items.length && <p className="recruit-panel recruit-muted">Chưa có lời mời. Các lời mời từ nhà tuyển dụng sẽ xuất hiện tại đây.</p>}
      {state.items.map(item => {
        const open = item.JobStatus === 'Published' && (!item.ExpiresAt || new Date(item.ExpiresAt) > new Date());
        return <article key={item.InvitationID} className="recruit-panel">
          <div className="recruit-row"><div><h3>{item.Title}</h3><p className="recruit-muted">{item.CompanyName}</p></div><StatusPill value={item.Status} labels={invitationLabels} /></div>
          <p className="recruit-message">{item.Message}</p><p className="recruit-muted mt-3">Gửi lúc {formatDate(item.SentAt)}{item.RespondedAt && ` • Phản hồi lúc ${formatDate(item.RespondedAt)}`}</p>
          <div className="recruit-actions"><Link className="recruit-button" to={`/jobs/${item.JobID}`}>Xem công việc</Link>
            {item.Status === 'Sent' && open && <><button className="recruit-button recruit-primary" disabled={busy} onClick={() => respond(`/candidate/invitations/${item.InvitationID}/respond`, 'Accepted', item.Version)}>Quan tâm</button><button className="recruit-button" disabled={busy} onClick={() => respond(`/candidate/invitations/${item.InvitationID}/respond`, 'Declined', item.Version)}>Từ chối</button></>}
          </div>
          {!open && <p className="recruit-muted mt-3">Công việc hiện không nhận phản hồi lời mời.</p>}
          {item.Status === 'Accepted' && <p className="recruit-muted mt-3">Bạn đã quan tâm. Lịch phỏng vấn do nhà tuyển dụng gửi sẽ hiển thị bên dưới. Thao tác này không tự nộp hồ sơ ứng tuyển.</p>}
        </article>;
      })}
      {!invitationId && (page > 1 || state.hasMore) && <div className="recruit-actions"><button className="recruit-button" disabled={page <= 1} onClick={() => setPage(value => value - 1)}>Trước</button><span>Trang {page}</span><button className="recruit-button" disabled={!state.hasMore} onClick={() => setPage(value => value + 1)}>Sau</button></div>}
      <h2 className="mt-8">Lịch phỏng vấn</h2><p className="recruit-muted">Bao gồm lịch từ lời mời và hồ sơ bạn đã ứng tuyển.</p>
      {!schedules.length && <p className="recruit-panel recruit-muted">Chưa có lịch phỏng vấn.</p>}
      {schedules.map(item => <article id={`interview-${item.InterviewID}`} key={item.InterviewID} className={`recruit-panel ${String(item.InterviewID) === interviewId ? 'recruit-highlight' : ''}`}>
        <h3>{item.JobTitle}</h3><p className="recruit-muted">{item.CompanyName}</p>
        <InterviewDetails interview={item} contact={item}>
          {item.Status === 'Pending' && new Date(item.InterviewDate) > new Date() && <div className="recruit-actions"><button className="recruit-button recruit-primary" disabled={busy} onClick={() => respond(`/candidate/interviews/${item.InterviewID}/respond`, 'Confirmed', item.Version)}>Xác nhận tham gia</button><button className="recruit-button" disabled={busy} onClick={() => respond(`/candidate/interviews/${item.InterviewID}/respond`, 'Declined', item.Version)}>Không thể tham gia</button></div>}
          {item.Status === 'Declined' && <p className="recruit-muted mt-3">Liên hệ nhà tuyển dụng bằng email hoặc số điện thoại ở trên để thống nhất lịch mới.</p>}
          {new Date(item.InterviewDate) <= new Date() && <p className="recruit-muted mt-3">Thời gian phỏng vấn đã qua.</p>}
        </InterviewDetails>
      </article>)}
    </>}
  </section>;
}
