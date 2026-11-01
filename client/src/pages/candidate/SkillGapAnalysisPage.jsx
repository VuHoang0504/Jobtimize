import React, { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import { buildLearning } from '../../utils/skillLearning.mjs';
import './SkillGapAnalysisPage.css';

const managerUrl = '/candidate/dashboard?tab=cvs';
const statusLabel = { Ready: 'Đã xác nhận', NeedsReview: 'Cần xác nhận', Queued: 'Đang chờ đọc', Processing: 'Đang đọc', Failed: 'Đọc chưa thành công', NotReady: 'Chưa sẵn sàng' };
const priority = skill => skill.prioritySource === 'ai' ? 'AI nhận diện từ yêu cầu' : skill.isMandatory ? 'Bắt buộc' : 'Ưu tiên';

export default function SkillGapAnalysisPage() {
  const [params, setParams] = useSearchParams();
  const query = params.toString();
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({ keyword: '', location: '', categoryId: '', scope: '' });
  const [tab, setTab] = useState('insights');
  const [ai, setAi] = useState(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiRetry, setAiRetry] = useState(0);
  const [courseSkill, setCourseSkill] = useState('');
  const [language, setLanguage] = useState('');
  const [provider, setProvider] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(24);
  const [retry, setRetry] = useState(0);
  const detailRef = useRef(null);
  const focusDetail = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    setBusy(true); setError('');
    setCourseSkill(''); setLanguage(''); setProvider('');
    const current = new URLSearchParams(query);
    setFilters({ keyword: current.get('keyword') || '', location: current.get('location') || '', categoryId: current.get('categoryId') || '', scope: current.get('scope') || '' });
    api.post('/candidate/skill-gap', Object.fromEntries(current), { signal: controller.signal })
      .then(response => { if (!controller.signal.aborted) setData(response.data.data); })
      .catch(err => { if (!controller.signal.aborted) setError(err.response?.data?.message || 'Chưa kết nối được với máy chủ. Vui lòng thử lại.'); })
      .finally(() => { if (!controller.signal.aborted) setBusy(false); });
    return () => controller.abort();
  }, [query, retry]);

  const analysis = !error && !busy ? data?.analysis : null;
  const cvId = data?.selectedCV?.cvId;
  const versionId = data?.selectedCV?.versionId;
  const selectedId = analysis?.job?.JobID;
  const criteriaHash = analysis?.criteriaHash;

  useEffect(() => {
    setAi(null);
    if (!analysis || !cvId || !selectedId) { setAiBusy(false); return; }
    const controller = new AbortController();
    setAiBusy(true);
    api.post('/candidate/skill-gap/insights', { cvId, jobId: selectedId, cvVersionId: versionId, criteriaHash }, { signal: controller.signal })
      .then(response => {
        if (controller.signal.aborted) return;
        const result = response.data.data;
        setAi(result);
      })
      .catch(err => { if (!controller.signal.aborted) setAi({ status: 'Unavailable', message: err.response?.data?.message || 'Chưa nhận được nhận xét AI. Bạn có thể xem đối chiếu kỹ năng hoặc thử lại.' }); })
      .finally(() => { if (!controller.signal.aborted) setAiBusy(false); });
    return () => controller.abort();
  }, [cvId, versionId, selectedId, criteriaHash, aiRetry]);

  useEffect(() => {
    if (!busy && !error && focusDetail.current && analysis) {
      detailRef.current?.focus({ preventScroll: true });
      if (window.innerWidth < 1024) detailRef.current?.scrollIntoView({ behavior: 'instant', block: 'start' });
      focusDetail.current = false;
    }
  }, [busy, error, analysis]);

  const change = updates => {
    const next = new URLSearchParams(params);
    Object.entries(updates).forEach(([key, value]) => value ? next.set(key, String(value)) : next.delete(key));
    setParams(next, { replace: true });
  };
  const ready = data?.status === 'Ready';
  const missing = analysis?.missingSkills || [];
  const { learning, courses, searches } = buildLearning(analysis, ai);
  const providers = [...new Set(courses.map(course => course.Provider))];
  const displayedCourses = courses.filter(course => (!courseSkill || course.skills.some(skill => String(skill.skillId) === courseSkill)) && (!language || course.Language === language) && (!provider || course.Provider === provider));
  const displayedSearches = searches.filter(skill => !courseSkill || String(skill.skillId) === courseSkill);
  const pages = Math.max(1, Math.ceil((data?.jobs?.length || 0) / pageSize));
  const currentPage = Math.min(page, pages);
  const jobs = data?.jobs?.slice((currentPage - 1) * pageSize, currentPage * pageSize) || [];
  const pickSkill = skillId => { setCourseSkill(String(skillId)); setLanguage(''); setProvider(''); setTab('learning'); };

  return (
    <main className="skill-workspace">
      <header className="skill-intro"><div><h1>Tìm việc phù hợp với CV</h1><p>Xem cả cơ hội cùng ngành nghề khi kỹ năng chưa khớp. Chọn một tin để nhận xét và chuẩn bị ứng tuyển.</p></div><Link to={managerUrl}>Quản lý CV</Link></header>
      <section className="skill-cv" aria-label="Chọn CV phân tích">
        <div className="skill-cv-select"><label htmlFor="analysis-cv">CV dùng để đối chiếu</label><select id="analysis-cv" value={cvId || ''} disabled={busy || !data?.cvs?.length} onChange={event => { setPage(1); change({ cvId: event.target.value }); }}>
          {!data?.cvs?.length && <option value="">{busy ? 'Đang tải CV...' : 'Bạn chưa có CV'}</option>}
          {data?.cvs?.map(cv => <option key={cv.cvId} value={cv.cvId}>{cv.title}{cv.isPrimary ? ' (CV chính)' : ''} — {statusLabel[cv.status] || 'Cần kiểm tra'}</option>)}
        </select></div><div className="skill-cv-note"><strong>{data?.selectedCV?.version ? `Phiên bản ${data.selectedCV.version}` : 'Dữ liệu CV đã lưu'}</strong><p>Dùng thông tin đã xác nhận. Không cần đọc lại tệp CV.</p></div>
      </section>
      {error && <div className="skill-notice skill-error" role="alert"><p>{error}</p><button type="button" onClick={() => setRetry(value => value + 1)}>Thử lại</button>{params.has('jobId') && <button type="button" onClick={() => change({ jobId: '' })}>Quay lại gợi ý việc làm</button>}</div>}
      {busy && !data && <p className="skill-loading" role="status">Đang tìm việc liên quan đến CV...</p>}
      {!busy && !error && !ready && <section className="skill-empty"><h2>Chuẩn bị CV để tìm việc phù hợp</h2><p>Chọn một CV đã xác nhận hoặc vào Quản lý CV để kiểm tra thông tin đã trích xuất.</p><Link className="skill-primary" to={managerUrl}>Mở Quản lý CV</Link></section>}
      {ready && <>
        {data.verifiedSkillCount === 0 && <p className="skill-notice">CV chưa có kỹ năng đã xác nhận. Việc liên quan được tìm từ chức danh và kinh nghiệm; bạn có thể bổ sung kỹ năng trong Quản lý CV.</p>}
        <form className="skill-filters" onSubmit={event => { event.preventDefault(); setPage(1); change({ ...filters, jobId: '' }); }}>
          <div><label htmlFor="analysis-keyword">Vị trí hoặc công ty</label><input id="analysis-keyword" value={filters.keyword} onChange={event => setFilters({ ...filters, keyword: event.target.value })} placeholder="Ví dụ: Frontend, React" /></div>
          <div><label htmlFor="analysis-category">Ngành nghề</label><select id="analysis-category" value={filters.categoryId} onChange={event => setFilters({ ...filters, categoryId: event.target.value })}><option value="">Tất cả ngành nghề</option>{data.categories.map(category => <option key={category.categoryId} value={category.categoryId}>{category.name}</option>)}</select></div>
          <div><label htmlFor="analysis-location">Địa điểm</label><input id="analysis-location" value={filters.location} onChange={event => setFilters({ ...filters, location: event.target.value })} placeholder="Ví dụ: Hà Nội" /></div>
          <div><label htmlFor="analysis-scope">Danh sách việc</label><select id="analysis-scope" value={filters.scope} onChange={event => setFilters({ ...filters, scope: event.target.value })}><option value="">Liên quan đến CV</option><option value="all">Tất cả việc đang tuyển</option></select></div>
          <button className="skill-primary" disabled={busy}>Lọc việc làm</button>
        </form>
        <div className="skill-columns" aria-busy={busy}>
          <section className="skill-job-list" aria-label="Việc làm gợi ý">
            <div className="skill-list-heading"><div><h2>Việc làm gợi ý <span>({data.jobs.length})</span></h2><p>Điểm kỹ năng từ cao xuống thấp, gồm cả việc liên quan đạt 0%.</p></div><div className="skill-page-size"><label htmlFor="job-page-size">Số việc mỗi trang</label><select id="job-page-size" value={pageSize} onChange={event => { setPageSize(Number(event.target.value)); setPage(1); }}><option value={12}>12</option><option value={24}>24</option><option value={48}>48</option></select></div></div>
            <div className="skill-job-rows">
              {!data.jobs.length && <div className="skill-empty"><h3>Chưa tìm thấy việc liên quan</h3><p>Thử đổi bộ lọc hoặc khám phá tất cả việc đang tuyển.</p><button type="button" className="skill-secondary" onClick={() => { setPage(1); change({ scope: 'all', keyword: '', categoryId: '', location: '', jobId: '' }); }}>Xem tất cả việc đang tuyển</button></div>}
              {jobs.map(job => <button type="button" key={job.JobID} className={`skill-job-row ${selectedId === job.JobID ? 'is-selected' : ''}`} aria-pressed={selectedId === job.JobID} disabled={busy} onClick={() => { focusDetail.current = true; change({ jobId: job.JobID }); }}>
                <div className="skill-job-body"><h3>{job.Title}</h3><p className="skill-job-meta" title={`${job.CompanyName} | ${job.Location || ''} | ${job.SalaryRange || ''}`}><span>{job.CompanyName}</span><span>{job.Location || 'Địa điểm chưa cập nhật'}</span></p><p className="skill-job-reason">{job.recommendationReason || `Khớp ${job.matchedCount} kỹ năng trong CV`}</p></div>
                <div className="skill-job-result"><strong>{job.matchScore === null ? 'Chưa chấm điểm' : `${job.matchScore}%`}</strong><span>{job.matchedCount} kỹ năng khớp</span></div>
              </button>)}
            </div>
            <div className="skill-pagination"><span>{data.jobs.length ? `${(currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, data.jobs.length)} / ${data.jobs.length} việc` : '0 việc'}</span><div><button type="button" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>Trước</button><span>{currentPage} / {pages}</span><button type="button" disabled={currentPage >= pages} onClick={() => setPage(currentPage + 1)}>Sau</button></div></div>
          </section>
          <section className="skill-detail" ref={detailRef} tabIndex={-1} aria-label="Đối chiếu công việc">
            {busy ? <p className="skill-empty" role="status">Đang cập nhật kết quả...</p> : analysis ? <>
              <header className="skill-detail-header"><p>{analysis.job.CompanyName}</p><div className="skill-detail-title"><h2>{analysis.job.Title}</h2><strong>{analysis.matchScore === null ? 'Chưa chấm điểm' : `${analysis.matchScore}%`}</strong></div><div className="skill-detail-meta"><span>{analysis.job.Location || 'Địa điểm chưa cập nhật'}</span><span>{analysis.job.SalaryRange || 'Lương thỏa thuận'}</span></div><Link className="skill-primary" to={`/jobs/${analysis.job.JobID}?cvId=${cvId}`}>Xem tin và ứng tuyển</Link></header>
              <div className="skill-tabs" role="tablist" aria-label="Nội dung phân tích">{[['insights', 'Nhận xét AI'], ['comparison', 'Đối chiếu kỹ năng'], ['learning', 'Kỹ năng & khóa học']].map(([value, label], index, tabs) => <button key={value} type="button" role="tab" id={`skill-tab-${value}`} aria-selected={tab === value} aria-controls={`skill-panel-${value}`} tabIndex={tab === value ? 0 : -1} onClick={() => setTab(value)} onKeyDown={event => { if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) { event.preventDefault(); const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length; setTab(tabs[next][0]); document.getElementById(`skill-tab-${tabs[next][0]}`)?.focus(); } }}>{label}{value === 'insights' && aiBusy ? '…' : ''}</button>)}</div>
              <div className="skill-detail-scroll">
                <section id="skill-panel-insights" role="tabpanel" aria-labelledby="skill-tab-insights" hidden={tab !== 'insights'}>
                  {aiBusy && <div className="skill-ai-loading" role="status"><h3>AI đang đối chiếu CV với yêu cầu công việc</h3><p>Bạn có thể xem tab Đối chiếu kỹ năng trong lúc chờ nhận xét.</p></div>}
                  {!aiBusy && ai?.status !== 'Ready' && <div className="skill-notice"><p>{ai?.message || 'Chưa có nhận xét AI cho công việc này.'}</p><button type="button" onClick={() => ai?.status === 'Stale' ? setRetry(value => value + 1) : setAiRetry(value => value + 1)}>{ai?.status === 'Stale' ? 'Cập nhật kết quả' : 'Thử lại nhận xét AI'}</button></div>}
                  {ai?.status === 'Ready' && <><div className="skill-ai-summary"><h3>Nhận xét cho CV của bạn</h3><p>{ai.summary}</p><span>Phân tích từ CV đã lưu và yêu cầu của tin tuyển dụng{ai.cached ? '. Đã dùng lại kết quả phân tích.' : '.'}</span></div>
                    <div className="skill-ai-counts"><span>{ai.requirements.filter(skill => skill.status === 'matched').length} có bằng chứng</span><span>{ai.requirements.filter(skill => skill.status === 'missing').length} chưa có bằng chứng</span><span>{ai.requirements.filter(skill => skill.status === 'needsReview').length} cần kiểm tra</span></div>
                    {ai.requirements.map(skill => <article className="skill-ai-requirement" key={skill.skillId}><div><h3>{skill.skillName}</h3><span className={`skill-evidence-status is-${skill.status}`}>{skill.status === 'matched' ? 'Có bằng chứng' : skill.status === 'needsReview' ? 'Cần xác nhận thêm' : 'Chưa có bằng chứng'}</span></div><p>{skill.reason}</p>{skill.jobEvidence && <blockquote><strong>Yêu cầu công việc</strong>{skill.jobEvidence}</blockquote>}{skill.cvEvidence && <blockquote><strong>Trong CV</strong>{skill.cvEvidence}</blockquote>}{skill.nextStep && <p className="skill-next-step">{skill.nextStep}</p>}{skill.status !== 'matched' && <button type="button" className="skill-text-button" onClick={() => pickSkill(skill.skillId)}>Xem kỹ năng và nguồn học</button>}</article>)}
                    <p className="skill-method">Nhận xét AI có thể nhận diện thêm bằng chứng từ kinh nghiệm. Điểm ở đầu trang vẫn dựa trên kỹ năng đã xác nhận; hãy kiểm tra nhận xét trước khi cập nhật CV.</p>
                  </>}
                </section>
                <section id="skill-panel-comparison" role="tabpanel" aria-labelledby="skill-tab-comparison" hidden={tab !== 'comparison'}>
                  <p className="skill-method">{analysis.status === 'NoCriteria' ? 'Chưa có đủ tiêu chí kỹ năng chuẩn hóa để tính điểm. Xem nhận xét AI để phân tích nội dung yêu cầu công việc.' : analysis.criteriaSource === 'description' ? 'Kỹ năng được nhận diện từ nội dung tin. Chưa xác định kỹ năng bắt buộc hay ưu tiên.' : 'Kỹ năng bắt buộc có trọng số gấp đôi kỹ năng ưu tiên. Điểm không đánh giá kinh nghiệm, cấp bậc hay xác suất trúng tuyển.'}</p>
                  <section className="skill-evidence"><h3>Kỹ năng có trong CV ({analysis.matchedSkills.length})</h3>{!analysis.matchedSkills.length && <p className="skill-muted">Chưa có kỹ năng khớp trong danh sách đã xác nhận. Công việc vẫn có thể liên quan đến ngành nghề hoặc kinh nghiệm của bạn.</p>}{analysis.matchedSkills.map(skill => <div className="skill-evidence-row" key={skill.skillId}><div><strong>{skill.skillName}</strong><span>{analysis.criteriaSource === 'description' ? 'Trong nội dung tin' : priority(skill)}</span></div><p>{skill.evidence || 'Kỹ năng đã được xác nhận trong CV.'}</p></div>)}</section>
                  <section className="skill-gaps"><h3>Yêu cầu chưa có bằng chứng ({missing.length})</h3><p className="skill-muted">Bổ sung bằng chứng nếu bạn đã có kỹ năng, hoặc chọn nguồn học để chuẩn bị.</p><div className="skill-gap-options">{missing.map(skill => <button type="button" key={skill.skillId} onClick={() => pickSkill(skill.skillId)}><strong>{skill.skillName}</strong><span>{analysis.criteriaSource === 'description' ? 'Trong nội dung tin' : priority(skill)}</span></button>)}</div>{!missing.length && analysis.status === 'Ready' && <p className="skill-success">CV đã bao phủ các tiêu chí kỹ năng chuẩn hóa. Kiểm tra thêm yêu cầu về kinh nghiệm và cấp bậc.</p>}</section>
                </section>
                <section id="skill-panel-learning" role="tabpanel" aria-labelledby="skill-tab-learning" hidden={tab !== 'learning'}>
                  <div className="skill-learning-intro"><h3>Kỹ năng nên ưu tiên bổ sung</h3><p>{ai?.status === 'Ready' ? 'Ưu tiên theo yêu cầu công việc và bằng chứng AI đối chiếu trong CV.' : 'Nguồn học dựa trên các yêu cầu chưa có trong kỹ năng đã xác nhận.'}</p></div>
                  {!learning.length && <p className="skill-notice">Chưa có kỹ năng cần bổ sung từ kết quả hiện tại. Kiểm tra thêm yêu cầu kinh nghiệm trong tin tuyển dụng.</p>}
                  <div className="skill-learning-steps">{learning.map(skill => <article key={skill.skillId}><div><strong>{skill.skillName}</strong><span>{skill.status === 'needsReview' ? 'Kiểm tra bằng chứng trước' : skill.isMandatory ? 'Ưu tiên bổ sung' : 'Bổ sung tiếp theo'}</span></div><p>{skill.nextStep || 'Kiểm tra bằng chứng trong CV; nếu chưa có, học kiến thức nền và thực hiện một bài tập hoặc dự án để chứng minh kỹ năng.'}</p><button type="button" className="skill-text-button" onClick={() => { setCourseSkill(String(skill.skillId)); setLanguage(''); setProvider(''); }}>Lọc nguồn học cho kỹ năng này</button></article>)}</div>
                  <div className="skill-course-heading"><h3>Khóa học phù hợp</h3><span>{displayedCourses.length} nguồn học</span></div>
                  <div className="skill-course-filters"><div><label htmlFor="course-skill">Kỹ năng cần bổ sung</label><select id="course-skill" value={courseSkill} onChange={event => setCourseSkill(event.target.value)}><option value="">Tất cả kỹ năng còn thiếu</option>{learning.map(skill => <option key={skill.skillId} value={skill.skillId}>{skill.skillName}</option>)}</select></div><div><label htmlFor="course-language">Ngôn ngữ</label><select id="course-language" value={language} onChange={event => setLanguage(event.target.value)}><option value="">Tất cả ngôn ngữ</option><option value="vi">Tiếng Việt</option><option value="en">Tiếng Anh</option><option value="unknown">Theo trang khóa học</option></select></div><div><label htmlFor="course-provider">Nguồn học</label><select id="course-provider" value={provider} onChange={event => setProvider(event.target.value)}><option value="">Tất cả nguồn học</option>{providers.map(value => <option key={value}>{value}</option>)}</select></div></div>
                  {!displayedCourses.length && <div className="skill-notice"><p>{courses.length ? 'Bộ lọc hiện tại đang ẩn các nguồn học đã tìm được.' : learning.length ? 'Chưa có khóa học cụ thể trong danh mục cho kỹ năng này. Bạn có thể tìm chương trình phù hợp tại các nguồn bên dưới.' : 'Chưa có kỹ năng thiếu để đề xuất khóa học cho công việc này.'}</p>{(courseSkill || language || provider) && <button type="button" onClick={() => { setCourseSkill(''); setLanguage(''); setProvider(''); }}>Bỏ bộ lọc khóa học</button>}</div>}
                  <div className="skill-course-grid">{displayedCourses.map(course => <article className="skill-course" key={course.id}><p>{course.Provider}{course.Kind === 'catalog' ? ' · Danh mục đào tạo' : ''}</p><h3><a href={course.Url} target="_blank" rel="noopener noreferrer">{course.Title}</a></h3><p>{course.Language === 'vi' ? 'Tiếng Việt' : course.Language === 'en' ? 'Tiếng Anh' : 'Ngôn ngữ theo trang khóa học'}</p><div className="skill-course-tags">{course.skills.map(skill => <span key={skill.skillId}>{skill.skillName}</span>)}</div><a className="skill-course-link" href={course.Url} target="_blank" rel="noopener noreferrer">{course.Kind === 'catalog' ? 'Xem các chương trình đào tạo' : 'Xem chương trình và học phí'}</a></article>)}</div>
                  {displayedSearches.length > 0 && <section className="skill-learning-steps" aria-label="Tìm thêm khóa học"><h3>Tìm thêm khóa học</h3><p className="skill-muted">Các liên kết sau mở kết quả tìm kiếm tại nền tảng học, không phải khóa học đã được chọn sẵn.</p>{displayedSearches.map(skill => <article key={skill.skillId}><strong>{skill.skillName}</strong><div>{skill.links.map(link => <a className="skill-text-button" key={link.provider} href={link.url} target="_blank" rel="noopener noreferrer">Tìm trên {link.provider}</a>)}</div></article>)}</section>}
                  <p className="skill-method">Khóa học được lấy từ danh mục nguồn học, không phải liên kết do AI tự tạo. Hoàn thành khóa học không tự động thêm kỹ năng vào CV.</p>
                </section>
              </div>
            </> : <div className="skill-empty"><h2>Chọn việc để phân tích</h2><p>Nhận xét AI, bằng chứng kỹ năng và nguồn học sẽ xuất hiện tại đây.</p></div>}
          </section>
        </div>
      </>}
    </main>
  );
}
