import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import api from '../../services/api';
import InterviewModal from './InterviewModal';
import { StatusPill, InterviewDetails, invitationLabels, formatDate } from '../common/RecruitmentUI';

export default function EmployerInvitations() {
  const location = useLocation();
  const selectedId = new URLSearchParams(location.search).get('invitationId');
  const [items, setItems] = useState([]), [loading, setLoading] = useState(true);
  const [error, setError] = useState(''), [filter, setFilter] = useState('ALL'), [selected, setSelected] = useState(null);
  async function refresh() {
    setLoading(true); setError('');
    try { setItems((await api.get('/employer/invitations')).data.data); }
    catch { setError('Chưa tải được lời mời. Vui lòng thử lại.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { refresh(); }, [location.key]);
  useEffect(() => {
    if (selectedId) { setFilter('ALL'); if (!loading) document.getElementById(`invitation-${selectedId}`)?.scrollIntoView({ block: 'center' }); }
  }, [selectedId, loading]);
  const visible = items.filter(item => filter === 'ALL' || item.Status === filter);
  return <section className="recruit-workspace" aria-label="Lời mời đã gửi">
    <header className="recruit-header recruit-row"><div><h2>Lời mời đã gửi</h2><p className="recruit-muted">Theo dõi phản hồi và hẹn phỏng vấn khi ứng viên quan tâm.</p></div><button className="recruit-button" disabled={loading} onClick={refresh}>Tải lại</button></header>
    <div className="recruit-tabs">{[['ALL', 'Tất cả'], ...Object.entries(invitationLabels)].map(([key, label]) => <button key={key} className="recruit-button" aria-pressed={filter === key} onClick={() => setFilter(key)}>{label} ({items.filter(item => key === 'ALL' || item.Status === key).length})</button>)}</div>
    {error && <p role="alert" className="recruit-notice recruit-error">{error}</p>}
    {loading ? <p role="status">Đang tải lời mời…</p> : !visible.length ? <p className="recruit-panel recruit-muted">Chưa có lời mời trong mục này. Chọn ứng viên trong Kho CV để gửi lời mời.</p> : visible.map(item => {
      const interview = item.InterviewID ? { InterviewID: item.InterviewID, InterviewDate: item.InterviewDate, InterviewType: item.InterviewType, LocationOrLink: item.LocationOrLink, Notes: item.Notes, Status: item.InterviewStatus, Version: item.InterviewVersion } : null;
      return <article id={`invitation-${item.InvitationID}`} key={item.InvitationID} className={`recruit-panel ${String(item.InvitationID) === selectedId ? 'recruit-highlight' : ''}`}>
        <div className="recruit-row"><div><h3>{item.CandidateName}</h3><p className="recruit-muted">{item.CandidateEmail}</p></div><StatusPill value={item.Status} labels={invitationLabels} /></div>
        <p className="mt-3 font-medium">{item.JobTitle}</p><p className="recruit-message">{item.Message}</p>
        <p className="recruit-muted mt-3">Gửi lúc {formatDate(item.SentAt)}{item.RespondedAt && ` • Phản hồi lúc ${formatDate(item.RespondedAt)}`}</p>
        {interview && <InterviewDetails interview={interview} />}
        <div className="recruit-actions"><Link className="recruit-button" to={`/jobs/${item.JobID}`}>Xem công việc</Link>
          {item.Status === 'Accepted' && <button className="recruit-button recruit-primary" onClick={() => setSelected({ ...item, interview })}>{interview ? 'Điều chỉnh lịch' : 'Hẹn phỏng vấn'}</button>}
        </div>
      </article>;
    })}
    {selected && <InterviewModal isOpen applicant={selected} onClose={() => setSelected(null)} onScheduled={refresh} />}
  </section>;
}
