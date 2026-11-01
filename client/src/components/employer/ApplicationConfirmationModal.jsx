import React from 'react';
import useRecruitmentDialog from '../common/useRecruitmentDialog';
import '../common/recruitment.css';

export default function ApplicationConfirmationModal({ applicant, jobTitle, busy, error, onCancel, onConfirm }) {
  const dialog = useRecruitmentDialog();

  return <dialog ref={dialog} className="recruit-confirmation" aria-labelledby="application-confirmation-title"
    aria-describedby="application-confirmation-description" onCancel={event => { event.preventDefault(); if (!busy) onCancel(); }}>
    <div className="recruit-confirmation-content">
      <h2 id="application-confirmation-title">Gửi xác nhận ứng tuyển?</h2>
      <p id="application-confirmation-description" className="recruit-confirmation-description">Bạn có chắc chắn muốn xác nhận hồ sơ ứng tuyển dưới đây?</p>
      <dl className="recruit-confirmation-summary">
        <div><dt>Ứng viên</dt><dd>{applicant.FullName}</dd></div>
        <div><dt>Vị trí</dt><dd>{jobTitle}</dd></div>
        <div><dt>Email nhận</dt><dd>{applicant.Email}</dd></div>
      </dl>
      <p className="recruit-confirmation-note">Ứng viên sẽ nhận email và thông báo trên Jobtimize. Trạng thái hồ sơ chuyển thành <strong>“Ứng tuyển thành công, kiểm tra email”</strong>.</p>
      {error && <p role="alert" className="recruit-notice recruit-error">{error}</p>}
    </div>
    <div className="recruit-confirmation-footer" aria-busy={busy}>
      <button autoFocus type="button" className="recruit-button" disabled={busy} onClick={onCancel}>Quay lại</button>
      <button type="button" className="recruit-button recruit-primary" disabled={busy} onClick={onConfirm}>{busy ? 'Đang gửi xác nhận…' : 'Gửi xác nhận'}</button>
    </div>
  </dialog>;
}
