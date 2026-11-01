import React, { useEffect, useRef, useState } from 'react';
import api from '../../services/api';
import '../common/recruitment.css';

export default function InterviewModal({ isOpen, onClose, applicant, onScheduled }) {
  const existing = applicant?.interview;
  const localDate = value => {
    const date = new Date(value);
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  };
  const [date, setDate] = useState(existing ? localDate(existing.InterviewDate) : '');
  const [type, setType] = useState(existing?.InterviewType || 'Online');
  const [place, setPlace] = useState(existing?.LocationOrLink || '');
  const [notes, setNotes] = useState(existing?.Notes || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const dialog = useRef(null);
  const closeRef = useRef(onClose); closeRef.current = onClose;
  const busyRef = useRef(busy); busyRef.current = busy;
  useEffect(() => {
    const previous = document.activeElement;
    dialog.current?.querySelector('button, input')?.focus();
    const onKey = event => {
      if (event.key === 'Escape' && !busyRef.current) closeRef.current();
      if (event.key !== 'Tab') return;
      const elements = [...dialog.current.querySelectorAll('button:not(:disabled), input, textarea, select')];
      const first = elements[0], last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); previous?.focus(); };
  }, []);
  if (!isOpen || !applicant) return null;
  async function submit(event) {
    event.preventDefault(); setError(''); setBusy(true);
    try {
      const response = await api.post('/employer/interviews', {
        ...(applicant.InvitationID ? { invitationId: applicant.InvitationID } : { applicationId: applicant.ApplicationID }),
        interviewDate: new Date(date).toISOString(), interviewType: type, locationOrLink: place.trim(), notes: notes.trim(), version: existing?.Version
      });
      setSuccess(response.data.message); window.dispatchEvent(new Event('notifications-changed')); onScheduled?.();
    } catch (err) { setError(err.response?.data?.message || 'Chưa lưu được lịch. Vui lòng thử lại.'); }
    finally { setBusy(false); }
  }
  return <div className="recruit-dialog-backdrop"><section ref={dialog} className="recruit-dialog" role="dialog" aria-modal="true" aria-labelledby="interview-heading">
    <div className="recruit-row"><h2 id="interview-heading" className="text-xl font-semibold">{existing ? 'Điều chỉnh lịch phỏng vấn' : 'Hẹn phỏng vấn'}</h2><button className="recruit-button" disabled={busy} onClick={onClose}>Đóng</button></div>
    <p className="mt-2 text-sm text-slate-600">{applicant.FullName || applicant.CandidateName} — {applicant.JobTitle}</p>
    <p className="mt-2 text-sm text-slate-500">Ứng viên nhận lịch qua website và email. Lịch thay đổi cần được xác nhận lại.</p>
    {error && <p role="alert" className="recruit-notice recruit-error">{error}</p>}
    {success ? <><p role="status" className="recruit-notice">{success}</p><button className="recruit-button recruit-primary" onClick={onClose}>Hoàn tất</button></> : <form onSubmit={submit}>
      <label className="recruit-field">Ngày giờ phỏng vấn (giờ trên thiết bị của bạn)<input autoComplete="off" className="recruit-input" type="datetime-local" required min={localDate(Date.now())} value={date} onChange={event => setDate(event.target.value)} /></label>
      <label className="recruit-field">Hình thức<select className="recruit-input" value={type} onChange={event => { setType(event.target.value); setPlace(''); }}><option value="Online">Trực tuyến</option><option value="Offline">Trực tiếp</option></select></label>
      <label className="recruit-field">{type === 'Online' ? 'Đường dẫn cuộc họp' : 'Địa điểm phỏng vấn'}<input className="recruit-input" type={type === 'Online' ? 'url' : 'text'} required maxLength={500} placeholder={type === 'Online' ? 'Dán đường dẫn cuộc họp đã tạo' : 'Địa chỉ, tầng, phòng'} value={place} onChange={event => setPlace(event.target.value)} /></label>
      <label className="recruit-field">Hướng dẫn & thông tin liên hệ<textarea className="recruit-input" rows={3} maxLength={2000} placeholder="Nội dung cần chuẩn bị, email hoặc số điện thoại để hẹn lại" value={notes} onChange={event => setNotes(event.target.value)} /></label>
      <div className="recruit-actions justify-end"><button type="button" className="recruit-button" disabled={busy} onClick={onClose}>Hủy</button><button className="recruit-button recruit-primary" disabled={busy}>{busy ? 'Đang gửi lịch…' : 'Gửi lịch phỏng vấn'}</button></div>
    </form>}
  </section></div>;
}
