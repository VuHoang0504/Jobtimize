import React, { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import api from '../../services/api';
import { openProtectedCV } from '../../services/cv';
import InterviewModal from '../../components/employer/InterviewModal';
import ApplicationConfirmationModal from '../../components/employer/ApplicationConfirmationModal';
import ApplicationNoticeModal from '../../components/employer/ApplicationNoticeModal';
import MatchScoreBadge from '../../components/common/MatchScoreBadge';
import { StatusPill, InterviewDetails, applicationLabels, formatDate } from '../../components/common/RecruitmentUI';

export default function EmployerATSPage() {
  const { jobId } = useParams(); const location = useLocation();
  const selectedId = new URLSearchParams(location.search).get('applicationId');
  const [job, setJob] = useState(null), [items, setItems] = useState([]), [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL'), [keyword, setKeyword] = useState(''), [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [message, setMessage] = useState('');
  const [confirmation, setConfirmation] = useState(null);
  const [notice, setNotice] = useState(null);
  const [matchingAccess, setMatchingAccess] = useState(false);
  async function refresh() {
    setLoading(true); setError('');
    try {
      const res = await api.get(`/employer/jobs/${jobId}/ats`); setJob(res.data.data.job); setItems(res.data.data.applicants);
      setMatchingAccess(res.data.data.matchingAccess === true);
    } catch (err) { setError(err.response?.data?.message || 'Chưa tải được hồ sơ. Vui lòng thử lại.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { refresh(); }, [jobId, location.key]);
  useEffect(() => {
    if (selectedId) { setFilter('ALL'); setKeyword(''); if (!loading) document.getElementById(`application-${selectedId}`)?.scrollIntoView({ block: 'center' }); }
  }, [loading, selectedId]);
  async function update(item, status) {
    if (busy) return false;
    setBusy(true); setMessage(''); setError('');
    try {
      const response = await api.patch(`/employer/applications/${item.ApplicationID}/status`, { status });
      setMessage(response.data.message); await refresh(); window.dispatchEvent(new Event('notifications-changed'));
      return true;
    } catch (err) { setError(err.response?.data?.message || 'Chưa cập nhật được hồ sơ. Vui lòng thử lại.'); return false; }
    finally { setBusy(false); }
  }
  const visible = items.filter(item => (filter === 'ALL' || item.Status === filter) && `${item.FullName} ${item.Email}`.toLowerCase().includes(keyword.toLowerCase()));
  return <div className="recruit-workspace max-w-6xl mx-auto px-4 sm:px-6 py-8">
    <Link className="text-sm text-blue-700 underline" to="/employer/dashboard">Quản lý tin tuyển dụng</Link>
    <header className="recruit-header mt-5"><div className="recruit-row"><div><h1>Hồ sơ ứng tuyển</h1><p className="mt-2 font-medium">{job?.Title}</p><p className="recruit-muted">Xem hồ sơ, xét duyệt và gửi lịch phỏng vấn cho từng ứng viên.</p></div><button className="recruit-button" disabled={loading || busy} onClick={refresh}>Tải lại</button></div></header>
    {message && <p role="status" className="recruit-notice">{message}</p>}{error && <p role="alert" className="recruit-notice recruit-error">{error}</p>}
    {!loading && !error && <div className="my-5 rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-600">
      {matchingAccess ? 'Đã mở khóa đánh giá độ phù hợp. Hồ sơ được xếp theo điểm kỹ năng từ cao xuống thấp. Điểm tham khảo hỗ trợ xét duyệt, không thay thế quyết định tuyển dụng.' : <>Đánh giá độ phù hợp dành cho tài khoản đã mở gói trả phí. <Link className="font-semibold text-brand-greenDark underline" to="/employer/pricing">Xem gói dịch vụ</Link></>}
    </div>}
    <label className="recruit-field max-w-sm">Tìm theo tên hoặc email<input type="search" className="recruit-input" placeholder="Tên hoặc email ứng viên" value={keyword} onChange={event => setKeyword(event.target.value)} /></label>
    <div className="recruit-tabs">{[['ALL', 'Tất cả'], ...Object.entries(applicationLabels)].map(([key, label]) => <button key={key} className="recruit-button" aria-pressed={filter === key} onClick={() => setFilter(key)}>{label} ({items.filter(item => key === 'ALL' || item.Status === key).length})</button>)}</div>
    {loading ? <p role="status">Đang tải hồ sơ…</p> : !visible.length ? <p className="recruit-panel recruit-muted">Chưa có hồ sơ phù hợp với bộ lọc. Hồ sơ mới ứng tuyển sẽ xuất hiện tại đây.</p> : visible.map(item => <article key={item.ApplicationID} id={`application-${item.ApplicationID}`} className={`recruit-panel ${String(item.ApplicationID) === selectedId ? 'recruit-highlight' : ''}`}>
      <div className="recruit-row"><div><h2>{item.FullName}</h2><p className="recruit-muted">{item.Headline || 'Ứng viên'} • Nộp lúc {formatDate(item.AppliedAt)}</p></div><StatusPill value={item.Status} labels={applicationLabels} /></div>
      <dl className="recruit-details"><div><dt>Email</dt><dd>{item.Email}</dd></div><div><dt>Điện thoại</dt><dd>{item.Phone || 'Chưa cung cấp'}</dd></div></dl>
      {matchingAccess && <div className="my-4 rounded-xl border border-emerald-100 bg-emerald-50/40 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-bold text-gray-900">Độ phù hợp với tin tuyển dụng</h3>
          <MatchScoreBadge score={item.MatchScore} />
        </div>
        <p className="mt-2 text-xs leading-relaxed text-gray-600">{item.matchAnalysis?.summary || (item.MatchScore == null ? 'Chưa đủ dữ liệu CV hoặc yêu cầu kỹ năng để đánh giá hồ sơ này.' : 'Điểm đã lưu khi ứng tuyển. Hồ sơ cũ chưa có chi tiết kỹ năng đối chiếu.')}</p>
        {item.matchAnalysis && <details className="mt-3 text-sm">
          <summary className="cursor-pointer font-semibold text-brand-greenDark focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-green">Xem chi tiết đánh giá</summary>
          <p className="mt-3 text-xs text-gray-500">Kết quả theo CV lúc nộp hồ sơ{item.matchAnalysis.cvVersion ? `, phiên bản ${item.matchAnalysis.cvVersion}` : ''}. Kỹ năng bắt buộc có trọng số gấp đôi kỹ năng khác.</p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            {[[item.matchAnalysis.matchedSkills, 'Kỹ năng phù hợp'], [item.matchAnalysis.missingSkills, 'Kỹ năng chưa đáp ứng']].map(([skills, title]) => <div key={title}>
              <h4 className="text-xs font-bold text-gray-800">{title}</h4>
              {Array.isArray(skills) && skills.length ? <ul className="mt-2 space-y-2 text-xs text-gray-700">{skills.map((skill, index) => <li key={skill.skillId || index}>
                <span className="font-semibold">{skill.skillName}</span>{skill.isMandatory && <span className="text-gray-500"> (bắt buộc)</span>}
                {typeof skill.evidence === 'string' && skill.evidence && <p className="mt-1 break-words text-gray-500">{skill.evidence}</p>}
              </li>)}</ul> : <p className="mt-2 text-xs text-gray-500">Chưa có dữ liệu kỹ năng trong nhóm này.</p>}
            </div>)}
          </div>
        </details>}
      </div>}
      {item.interview && <InterviewDetails interview={item.interview} />}
      <div className="recruit-actions">
        {item.CVFileUrl && <button className="recruit-button" onClick={() => openProtectedCV(item.CVFileUrl).catch(() => setError('Chưa mở được CV. Vui lòng thử lại.'))}>Xem CV</button>}
        {item.Status === 'Applied' && <button className="recruit-button recruit-primary" disabled={busy} onClick={() => update(item, 'Screening')}>Duyệt vào xét tuyển</button>}
        {item.Status === 'Offered' && <button className="recruit-button recruit-primary" onClick={() => setNotice(item)}>Gửi thông báo mới</button>}
        {!['Rejected', 'Offered'].includes(item.Status) && <><button className="recruit-button" disabled={busy} onClick={() => setSelected({ ...item, JobTitle: job?.Title })}>{item.interview ? 'Điều chỉnh lịch' : 'Hẹn phỏng vấn'}</button>
          {['Screening', 'Interviewing'].includes(item.Status) && <button className="recruit-button" disabled={busy} onClick={() => { setError(''); setConfirmation(item); }}>Xác nhận ứng tuyển</button>}
          <button className="recruit-button" disabled={busy} onClick={() => update(item, 'Rejected')}>Từ chối hồ sơ</button></>}
      </div>
    </article>)}
    {selected && <InterviewModal isOpen applicant={selected} onClose={() => setSelected(null)} onScheduled={refresh} />}
    {confirmation && <ApplicationConfirmationModal applicant={confirmation} jobTitle={job?.Title} busy={busy} error={error}
      onCancel={() => setConfirmation(null)} onConfirm={async () => { if (await update(confirmation, 'Offered')) setConfirmation(null); }} />}
    {notice && <ApplicationNoticeModal applicant={notice} jobTitle={job?.Title} onClose={() => setNotice(null)} />}
  </div>;
}
