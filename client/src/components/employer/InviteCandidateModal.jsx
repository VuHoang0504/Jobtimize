import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import '../common/recruitment.css';

export default function InviteCandidateModal({ isOpen, onClose, candidate, onInvited, initialJobId }) {
  const [jobs, setJobs] = useState([]), [jobId, setJobId] = useState('');
  const [message, setMessage] = useState(`Chào ${candidate?.FullName || 'bạn'},\nChúng tôi mời bạn tìm hiểu vị trí tuyển dụng dưới đây. Nếu quan tâm, vui lòng phản hồi trên Jobtimize để chúng tôi sắp xếp phỏng vấn.`);
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [error, setError] = useState(''), [success, setSuccess] = useState('');
  const dialog = useRef(null), closeRef = useRef(onClose), busyRef = useRef(busy);
  closeRef.current = onClose; busyRef.current = busy;
  useEffect(() => {
    const controller = new AbortController();
    api.get('/employer/jobs', { signal: controller.signal }).then(res => {
      const openJobs = res.data.data.filter(item => item.Status === 'Published' && (!item.ExpiresAt || new Date(item.ExpiresAt) > new Date()));
      setJobs(openJobs); setJobId(openJobs.find(item => String(item.JobID) === String(initialJobId))?.JobID || openJobs[0]?.JobID || '');
    }).catch(() => { if (!controller.signal.aborted) setError('Chưa tải được tin tuyển dụng. Đóng cửa sổ và thử lại.'); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    const previous = document.activeElement;
    dialog.current?.querySelector('button')?.focus();
    const keydown = event => {
      if (event.key === 'Escape' && !busyRef.current) closeRef.current();
      if (event.key !== 'Tab') return;
      const items = [...dialog.current.querySelectorAll('button:not(:disabled), input, textarea, select, a')];
      if (event.shiftKey && document.activeElement === items[0]) { event.preventDefault(); items.at(-1)?.focus(); }
      else if (!event.shiftKey && document.activeElement === items.at(-1)) { event.preventDefault(); items[0]?.focus(); }
    };
    document.addEventListener('keydown', keydown);
    return () => { controller.abort(); document.removeEventListener('keydown', keydown); previous?.focus(); };
  }, []);
  if (!isOpen || !candidate) return null;
  async function submit(event) {
    event.preventDefault(); setError(''); setBusy(true);
    try {
      const response = await api.post('/employer/invite-candidate', { profileId: candidate.ProfileID, jobId, message: message.trim() });
      setSuccess(response.data.message); onInvited?.(); window.dispatchEvent(new Event('notifications-changed'));
    } catch (err) { setError(err.response?.data?.message || 'Chưa gửi được lời mời. Vui lòng thử lại.'); }
    finally { setBusy(false); }
  }
  return <div className="recruit-dialog-backdrop"><section ref={dialog} className="recruit-dialog" role="dialog" aria-modal="true" aria-labelledby="invite-title">
    <div className="recruit-row"><h2 className="text-xl font-semibold" id="invite-title">Gửi lời mời ứng tuyển</h2><button className="recruit-button" disabled={busy} onClick={onClose}>Đóng</button></div>
    <p className="mt-3 font-medium">{candidate.FullName}</p><p className="recruit-muted">{candidate.Headline} • {candidate.Email}</p>
    <p className="recruit-muted mt-3">Ứng viên nhận lời mời trên website và qua email. Bạn theo dõi phản hồi tại Lời mời đã gửi.</p>
    {error && <p role="alert" className="recruit-notice recruit-error">{error}</p>}
    {success ? <><p role="status" className="recruit-notice">{success}</p><button className="recruit-button recruit-primary" onClick={onClose}>Hoàn tất</button></> : loading ? <p role="status" className="mt-4">Đang tải tin tuyển dụng…</p> : !jobs.length ? <div className="mt-4"><p>Chưa có tin đang mở để gửi lời mời.</p><Link className="recruit-button mt-3" to="/employer/post-job" onClick={onClose}>Đăng tin tuyển dụng</Link></div> : <form onSubmit={submit}>
      <label className="recruit-field">Vị trí tuyển dụng<select className="recruit-input" required value={jobId} onChange={event => setJobId(event.target.value)}>{jobs.map(item => <option key={item.JobID} value={item.JobID}>{item.Title}</option>)}</select></label>
      <label className="recruit-field">Nội dung lời mời<textarea className="recruit-input" rows={5} maxLength={2000} value={message} onChange={event => setMessage(event.target.value)} /></label>
      <div className="recruit-actions justify-end"><button type="button" className="recruit-button" disabled={busy} onClick={onClose}>Hủy</button><button className="recruit-button recruit-primary" disabled={busy}>{busy ? 'Đang gửi…' : 'Gửi lời mời'}</button></div>
    </form>}
  </section></div>;
}
