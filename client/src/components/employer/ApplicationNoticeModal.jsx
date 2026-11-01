import React, { useRef, useState } from 'react';
import useRecruitmentDialog from '../common/useRecruitmentDialog';
import api from '../../services/api';
import '../common/recruitment.css';

export default function ApplicationNoticeModal({ applicant, jobTitle, onClose }) {
  const dialog = useRecruitmentDialog(), sending = useRef(false);
  const [subject, setSubject] = useState(`Thông báo về hồ sơ ứng tuyển ${jobTitle || ''}`.slice(0, 160));
  const [message, setMessage] = useState(''), [busy, setBusy] = useState(false);
  const [error, setError] = useState(''), [success, setSuccess] = useState('');
  async function submit(event) {
    event.preventDefault();
    if (sending.current) return;
    sending.current = true; setBusy(true); setError('');
    try {
      const response = await api.post(`/employer/applications/${applicant.ApplicationID}/email`, { subject: subject.trim(), message: message.trim() });
      setSuccess(response.data.message);
    } catch (err) { setError(err.response?.data?.message || 'Chưa gửi được email. Nội dung vẫn được giữ để bạn thử lại.'); }
    finally { sending.current = false; setBusy(false); }
  }
  return <dialog ref={dialog} className="recruit-confirmation" aria-labelledby="notice-title" onCancel={event => { event.preventDefault(); if (!sending.current) onClose(); }}>
    <form onSubmit={submit}>
      <div className="recruit-confirmation-content">
        <h2 id="notice-title">Gửi thông báo mới</h2>
        <p className="recruit-confirmation-description">Trao đổi bước tiếp theo qua email với ứng viên đã được xác nhận.</p>
        <dl className="recruit-confirmation-summary"><div><dt>Người nhận</dt><dd>{applicant.FullName}<span className="block recruit-muted font-normal">{applicant.Email}</span></dd></div><div><dt>Vị trí</dt><dd>{jobTitle}</dd></div></dl>
        {success ? <p role="status" className="recruit-notice">{success}</p> : <>
          <label className="recruit-field" htmlFor="notice-subject">Tiêu đề email</label>
          <input autoFocus id="notice-subject" className="recruit-input mt-2" value={subject} maxLength={160} required disabled={busy} onChange={event => setSubject(event.target.value)} />
          <label className="recruit-field" htmlFor="notice-message">Nội dung email</label>
          <textarea id="notice-message" className="recruit-input mt-2" rows={6} maxLength={5000} required disabled={busy} placeholder="Nhập nội dung cần trao đổi, thời gian hoặc hướng dẫn cho ứng viên…" value={message} onChange={event => setMessage(event.target.value)} />
          <p className="recruit-confirmation-note mt-3">Nội dung được gửi đến email ở trên. Ứng viên có thể trả lời trực tiếp về email nhà tuyển dụng.</p>
        </>}
        {error && <p role="alert" className="recruit-notice recruit-error">{error}</p>}
      </div>
      <div className="recruit-confirmation-footer" aria-busy={busy}>
        <button type="button" className="recruit-button" disabled={busy} onClick={onClose}>{success ? 'Hoàn tất' : 'Quay lại'}</button>
        {!success && <button type="submit" className="recruit-button recruit-primary" disabled={busy || !subject.trim() || !message.trim()}>{busy ? 'Đang gửi email…' : 'Gửi email'}</button>}
      </div>
    </form>
  </dialog>;
}
