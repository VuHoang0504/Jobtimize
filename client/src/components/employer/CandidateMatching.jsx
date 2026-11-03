import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, Search, FileText, Send } from 'lucide-react';
import api from '../../services/api';
import { openProtectedCV } from '../../services/cv';
import MatchScoreBadge from '../common/MatchScoreBadge';
import InviteCandidateModal from './InviteCandidateModal';

const control = 'rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green disabled:opacity-50';

export default function CandidateMatching({ onInvited }) {
  const [options, setOptions] = useState(null), [jobId, setJobId] = useState('');
  const [result, setResult] = useState(null), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [candidate, setCandidate] = useState(null), [initialLoading, setInitialLoading] = useState(true);
  const request = useRef(null);

  async function loadOptions(signal) {
    setInitialLoading(true); setError('');
    try {
      const res = await api.get('/employer/candidate-matching/jobs', { signal });
      if (!signal.aborted) { setOptions(res.data.data); setJobId(String(res.data.data.jobs[0]?.JobID || '')); }
    } catch (err) { if (!signal.aborted) setError('Chưa tải được danh sách tin. Vui lòng thử lại.'); }
    finally { if (!signal.aborted) setInitialLoading(false); }
  }
  useEffect(() => {
    const controller = new AbortController();
    loadOptions(controller.signal);
    return () => { controller.abort(); request.current?.abort(); };
  }, []);

  async function search(page = 1) {
    request.current?.abort();
    const controller = new AbortController(); request.current = controller;
    setBusy(true); setError(''); setResult(null);
    try {
      const res = await api.get(`/employer/jobs/${jobId}/candidate-matches`, { params: { page }, signal: controller.signal });
      if (!controller.signal.aborted) setResult(res.data.data);
    } catch (err) { if (!controller.signal.aborted) setError(err.response?.data?.message || 'Chưa tìm được ứng viên. Vui lòng thử lại.'); }
    finally { if (!controller.signal.aborted) setBusy(false); }
  }

  return <section aria-labelledby="candidate-matching-title" className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
    <div className="border-l-4 border-brand-green p-5 sm:p-7">
      <div className="flex items-start gap-3">
        <Briefcase className="mt-1 h-5 w-5 shrink-0 text-brand-greenDark" aria-hidden="true" />
        <div><h2 id="candidate-matching-title" className="text-lg font-bold text-gray-900">Tìm ứng viên phù hợp với tin tuyển dụng</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-600">Chọn tin đang tuyển để đối chiếu yêu cầu kỹ năng với CV chính của ứng viên đang tìm việc.</p></div>
      </div>
      {initialLoading ? <p role="status" className="mt-5 text-sm text-gray-500">Đang tải tin tuyển dụng…</p> : options?.hasAccess ? <>
        {options.jobs.length ? <form onSubmit={event => { event.preventDefault(); search(); }} className="mt-6 flex flex-col items-stretch gap-3 sm:flex-row sm:items-end">
          <label className="flex-1 text-sm font-semibold text-gray-700">Tin tuyển dụng của bạn
            <select required value={jobId} onChange={event => { request.current?.abort(); setBusy(false); setJobId(event.target.value); setResult(null); setError(''); }} className={`mt-2 block w-full ${control}`}>
              {options.jobs.map(job => <option value={job.JobID} key={job.JobID}>{job.Title}{job.Location ? ` — ${job.Location}` : ''}</option>)}
            </select>
          </label>
          <button disabled={busy || !jobId} className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-green px-5 py-3 text-sm font-bold text-white hover:bg-brand-greenDark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green focus-visible:ring-offset-2 disabled:opacity-50"><Search className="h-4 w-4" aria-hidden="true" />{busy ? 'Đang đối chiếu…' : 'Tìm ứng viên phù hợp'}</button>
        </form> : <p className="mt-5 text-sm text-gray-600">Chưa có tin đang tuyển. <Link className="font-semibold text-brand-greenDark underline" to="/employer/post-job">Đăng tin tuyển dụng</Link> để bắt đầu.</p>}
      </> : options && <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-xl bg-gray-50 p-4 text-sm"><p className="max-w-xl text-gray-600">Chức năng dành cho tài khoản đã mở gói trả phí. Mở gói để xem điểm phù hợp và lý do đề xuất từng ứng viên.</p><Link className="font-semibold text-brand-greenDark underline" to="/employer/pricing">Xem gói dịch vụ</Link></div>}
      {error && <div role="alert" className="mt-4 text-sm text-red-700">{error} {!options && <button className="ml-2 underline" onClick={() => loadOptions(new AbortController().signal)}>Thử lại</button>}</div>}
    </div>
    {busy && <p role="status" className="border-t border-gray-100 p-6 text-sm text-gray-600">Đang phân tích yêu cầu tin và đối chiếu các CV đủ dữ liệu…</p>}
    {result && <div className="border-t border-gray-200">
      <div className="bg-gray-50 px-5 py-5 sm:px-7">
        <h3 className="font-bold text-gray-900">Yêu cầu đối chiếu: {result.job.Title}</h3>
        <p className="mt-2 text-xs leading-relaxed text-gray-500">{result.criteriaSource === 'text' ? 'Kỹ năng được nhận diện từ nội dung tin.' : 'Kỹ năng lấy từ yêu cầu đã khai báo trong tin.'} Kỹ năng bắt buộc có trọng số gấp đôi.</p>
        <div className="mt-3 flex flex-wrap gap-2">{result.criteria.map(skill => <span key={skill.SkillID} className={`rounded-md border px-2.5 py-1 text-xs font-medium ${skill.IsMandatory ? 'border-emerald-200 bg-brand-greenLight text-brand-greenDark' : 'border-gray-200 bg-white text-gray-600'}`}>{skill.SkillName}{skill.IsMandatory ? ' · Bắt buộc' : ''}</span>)}</div>
        <p className="mt-4 text-sm font-semibold text-gray-800" role="status">{result.total} ứng viên có kỹ năng phù hợp trong {result.evaluated} CV đủ dữ liệu.</p>
        <p className="mt-1 text-xs leading-relaxed text-gray-500">Xếp theo điểm kỹ năng giảm dần. Điểm giúp đối chiếu CV, không phải xác suất trúng tuyển. Chỉ tìm kiếm và đề xuất; lời mời được gửi khi bạn xác nhận.</p>
      </div>
      {!result.candidates.length ? <p className="px-5 py-8 text-sm leading-relaxed text-gray-600 sm:px-7">{result.message || 'Chưa có CV đủ dữ liệu khớp với các kỹ năng của tin này. Bạn có thể tìm thêm trong kho CV bên dưới hoặc kiểm tra lại yêu cầu kỹ năng của tin.'}</p> : <div className="divide-y divide-gray-100">{result.candidates.map(item => <article key={item.ProfileID} className="p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-bold text-gray-900">{item.FullName}</h3><p className="mt-1 text-sm text-gray-600">{item.Headline || 'Ứng viên đang tìm việc'}</p>{item.CurrentLocation && <p className="mt-1 text-xs text-gray-500">{item.CurrentLocation}</p>}</div><MatchScoreBadge score={item.analysis.matchScore} /></div>
        <p className="mt-3 text-xs text-gray-500">CV: {item.CVTitle} · Phiên bản {item.analysis.cvVersion}</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">{[[item.analysis.matchedSkills, 'Kỹ năng phù hợp', true], [item.analysis.missingSkills, 'Kỹ năng còn thiếu', false]].map(([skills, title, matched]) => <div key={title}><h4 className="text-xs font-semibold text-gray-700">{title}</h4><div className="mt-2 flex flex-wrap gap-1.5">{skills.length ? skills.map(skill => <span key={skill.skillId} className={`rounded-md px-2 py-1 text-xs ${matched ? 'bg-brand-greenLight text-brand-greenDark' : 'bg-gray-100 text-gray-600'}`}>{skill.skillName}{skill.isMandatory ? ' (bắt buộc)' : ''}</span>) : <span className="text-xs text-gray-500">Không có</span>}</div></div>)}</div>
        <details className="mt-4 text-xs text-gray-600"><summary className="cursor-pointer font-semibold text-brand-greenDark focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-green">Vì sao ứng viên được đề xuất?</summary><p className="mt-2 leading-relaxed">{item.analysis.summary}</p>{item.analysis.matchedSkills.filter(skill => typeof skill.evidence === 'string' && skill.evidence).map(skill => <p key={skill.skillId} className="mt-2 break-words leading-relaxed"><strong>{skill.skillName}:</strong> {skill.evidence}</p>)}</details>
        <div className="mt-5 flex flex-wrap gap-3"><button className={`inline-flex items-center gap-2 ${control}`} onClick={() => openProtectedCV(item.CVFileUrl).catch(() => setError('Chưa mở được CV. Vui lòng thử lại.'))}><FileText className="h-4 w-4" aria-hidden="true" />Xem CV</button><button className={`inline-flex items-center gap-2 text-brand-greenDark ${control}`} onClick={() => setCandidate(item)}><Send className="h-4 w-4" aria-hidden="true" />Mời ứng tuyển</button></div>
      </article>)}</div>}
      {result.pages > 1 && <nav aria-label="Trang ứng viên phù hợp" className="flex items-center justify-between border-t border-gray-100 p-5"><button className={control} disabled={busy || result.page <= 1} onClick={() => search(result.page - 1)}>Trang trước</button><span className="text-xs text-gray-500">Trang {result.page}/{result.pages}</span><button className={control} disabled={busy || result.page >= result.pages} onClick={() => search(result.page + 1)}>Trang sau</button></nav>}
    </div>}
    {candidate && <InviteCandidateModal isOpen candidate={candidate} initialJobId={jobId} onClose={() => setCandidate(null)} onInvited={onInvited} />}
  </section>;
}
