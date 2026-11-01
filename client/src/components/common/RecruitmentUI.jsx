import React from 'react';
import './recruitment.css';

export const invitationLabels = { Sent: 'Chờ phản hồi', Accepted: 'Quan tâm', Declined: 'Đã từ chối' };
export const interviewLabels = { Pending: 'Chờ xác nhận lịch', Confirmed: 'Đã xác nhận', Declined: 'Không thể tham gia', Cancelled: 'Đã hủy' };
export const applicationLabels = { Applied: 'Mới ứng tuyển', Screening: 'Đang xét duyệt', Interviewing: 'Phỏng vấn', Offered: 'Đã xác nhận ứng tuyển', Rejected: 'Đã từ chối' };
export const candidateApplicationLabels = { ...applicationLabels, Offered: 'Ứng tuyển thành công, kiểm tra email' };
export const formatDate = value => value ? new Date(value).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }) : 'Chưa có';
export function StatusPill({ value, labels }) {
  return <span className={`recruit-status recruit-status-${value}`}>{labels[value] || value}</span>;
}
export function InterviewDetails({ interview, contact, children }) {
  const online = interview.InterviewType === 'Online';
  const safeLink = /^https?:\/\//i.test(interview.LocationOrLink || '');
  return <section className="recruit-interview" aria-label="Thông tin lịch phỏng vấn">
    <div className="recruit-row"><h4>Lịch phỏng vấn</h4><StatusPill value={interview.Status} labels={interviewLabels} /></div>
    <dl className="recruit-details">
      <div><dt>Thời gian (giờ Việt Nam)</dt><dd>{formatDate(interview.InterviewDate)}</dd></div>
      <div><dt>Hình thức</dt><dd>{online ? 'Trực tuyến' : 'Trực tiếp'}</dd></div>
      <div className="recruit-wide"><dt>{online ? 'Đường dẫn cuộc họp' : 'Địa điểm'}</dt><dd>{online && safeLink ? <a href={interview.LocationOrLink} target="_blank" rel="noreferrer">{interview.LocationOrLink}</a> : interview.LocationOrLink}</dd></div>
      {interview.Notes && <div className="recruit-wide"><dt>Hướng dẫn & liên hệ</dt><dd className="recruit-message">{interview.Notes}</dd></div>}
      {contact && <div className="recruit-wide"><dt>Liên hệ nhà tuyển dụng khi cần hẹn lại</dt><dd>{contact.EmployerEmail} {contact.EmployerPhone && ` • ${contact.EmployerPhone}`}</dd></div>}
    </dl>{children}
  </section>;
}
