import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { ArrowLeft, ArrowRight, Check, CheckCircle2, ChevronDown, Eye, FileText, Loader2, MapPin, Search, Send, Wand2, X } from 'lucide-react';

const inputClass = 'w-full rounded-lg border border-slate-300 bg-white px-3.5 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50';
const levels = ['Intern / Thực tập sinh', 'Fresher / Mới tốt nghiệp', 'Junior (1 - 2 năm)', 'Middle (2 - 4 năm)', 'Senior (5+ năm)', 'Trưởng nhóm / Quản lý'];

export default function PostJobPage() {
  const [categories, setCategories] = useState([]);
  const [skillTaxonomy, setSkillTaxonomy] = useState([]);
  const [metaLoading, setMetaLoading] = useState(true);
  const [metaError, setMetaError] = useState('');
  const [metaRetry, setMetaRetry] = useState(0);
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [salaryRange, setSalaryRange] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [requirements, setRequirements] = useState('');
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [skillSearch, setSkillSearch] = useState('');
  const [allSkills, setAllSkills] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [level, setLevel] = useState(levels[3]);
  const [notes, setNotes] = useState('');
  const [suggestion, setSuggestion] = useState(null);
  const [suggestionError, setSuggestionError] = useState('');
  const [suggestionApplied, setSuggestionApplied] = useState(false);
  const previewRef = useRef(null);
  const errorRef = useRef(null);

  useEffect(() => {
    const controller = new AbortController();
    setMetaLoading(true);
    setMetaError('');
    Promise.all([
      api.get('/metadata/categories', { signal: controller.signal }),
      api.get('/metadata/skills', { signal: controller.signal })
    ]).then(([catRes, skillRes]) => {
      if (!catRes.data?.success || !Array.isArray(catRes.data.data) || !skillRes.data?.success || !Array.isArray(skillRes.data.data)) throw new Error('Invalid metadata');
      setCategories(catRes.data.data);
      setSkillTaxonomy(skillRes.data.data);
      if (!catRes.data.data.length) setMetaError('Chưa có ngành nghề để đăng tin. Vui lòng liên hệ quản trị viên.');
    }).catch(() => {
      if (!controller.signal.aborted) setMetaError('Không tải được danh mục ngành nghề và kỹ năng. Vui lòng thử lại.');
    }).finally(() => {
      if (!controller.signal.aborted) setMetaLoading(false);
    });
    return () => controller.abort();
  }, [metaRetry]);

  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  const category = categories.find(item => String(item.CategoryID) === String(categoryId));
  const chosenSkills = selectedSkills.map(item => ({ ...item, name: skillTaxonomy.find(skill => skill.SkillID === item.skillId)?.SkillName || '' }));
  const normalize = value => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
  const visibleSkills = skillTaxonomy.filter(skill =>
    (allSkills || !categoryId || String(skill.CategoryID) === String(categoryId)) &&
    normalize(skill.SkillName).includes(normalize(skillSearch.trim()))
  );
  const checks = [
    { label: 'Thông tin vị trí', done: Boolean(title.trim() && categoryId && location.trim()), href: '#job-basics' },
    { label: 'Nội dung tuyển dụng', done: Boolean(description.trim() && requirements.trim()), href: '#job-content' },
    { label: 'Kỹ năng yêu cầu', done: selectedSkills.length > 0, href: '#job-skills', optional: true }
  ];

  const toggleSkill = skillId => setSelectedSkills(prev => prev.some(item => item.skillId === skillId)
    ? prev.filter(item => item.skillId !== skillId)
    : [...prev, { skillId, isMandatory: true }]);

  const generateContent = async () => {
    setSuggestionError('');
    if (!title.trim() || !categoryId) {
      setSuggestionError('Nhập tên vị trí và chọn ngành nghề trước khi tạo gợi ý.');
      document.getElementById(!title.trim() ? 'job-title' : 'job-category')?.focus();
      return;
    }
    setGenerating(true);
    setSuggestionApplied(false);
    try {
      const { data } = await api.post('/ai/generate-jd', {
        title: title.trim(), categoryName: category?.CategoryName || '', level,
        skills: chosenSkills.map(skill => skill.name).join(', '), additionalNotes: notes.trim()
      });
      if (!data?.success || !data.data?.description || !data.data?.requirements) throw new Error('Incomplete suggestion');
      setSuggestion(data.data);
    } catch {
      setSuggestionError('Chưa tạo được gợi ý nội dung. Bạn có thể thử lại hoặc tiếp tục tự viết.');
    } finally {
      setGenerating(false);
    }
  };

  const applySuggestion = () => {
    const benefits = typeof suggestion.benefits === 'string' ? suggestion.benefits.trim() : '';
    setDescription(suggestion.description + (benefits ? '\n\nQuyền lợi\n' + benefits : ''));
    setRequirements(suggestion.requirements);
    if (!salaryRange.trim() && suggestion.suggestedSalaryRange) setSalaryRange(suggestion.suggestedSalaryRange);
    const suggestedNames = (Array.isArray(suggestion.suggestedSkills) ? suggestion.suggestedSkills : []).filter(name => typeof name === 'string').map(name => normalize(name.trim()));
    const matchedSkills = skillTaxonomy.filter(skill => suggestedNames.some(name => name &&
      (name === normalize(skill.SkillName) || (skill.NormalizedName && name === normalize(skill.NormalizedName)))));
    setSelectedSkills(prev => [...prev, ...matchedSkills.filter(skill => !prev.some(item => item.skillId === skill.SkillID)).map(skill => ({ skillId: skill.SkillID, isMandatory: true }))]);
    setSuggestion(null);
    setSuggestionApplied(true);
  };

  const handleSubmit = async event => {
    event.preventDefault();
    if (loading) return;
    setError('');
    if (!title.trim() || !categoryId || !location.trim() || !description.trim() || !requirements.trim()) {
      setError('Vui lòng điền đủ các trường có dấu * và không chỉ nhập khoảng trắng.');
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post('/employer/jobs', {
        title: title.trim(), categoryId, salaryRange: salaryRange.trim(), location: location.trim(),
        description: description.trim(), requirements: requirements.trim(), skills: selectedSkills
      });
      if (!data?.success) throw new Error('Post rejected');
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: 'instant' });
    } catch (err) {
      const message = err.response?.status === 403
        ? 'Chưa thể đăng tin với gói dịch vụ hiện tại. Vui lòng kiểm tra hạn mức trong mục Gói dịch vụ.'
        : 'Chưa gửi được tin tuyển dụng. Nội dung vẫn được giữ lại, vui lòng thử lại.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) return (
    <main className="mx-auto max-w-2xl px-4 py-20 text-center">
      <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-600" />
      <h1 className="mt-6 text-2xl font-bold text-slate-900">Tin tuyển dụng đã được gửi duyệt</h1>
      <p className="mt-3 text-sm leading-7 text-slate-600">{title} sẽ hiển thị với ứng viên sau khi được phê duyệt. Bạn có thể theo dõi trạng thái và chỉnh sửa tin trong trang quản lý.</p>
      <Link to="/employer/dashboard" className="mt-8 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700">Về quản lý tuyển dụng <ArrowRight className="h-4 w-4" /></Link>
    </main>
  );

  return (
    <main className="min-h-screen bg-slate-50 pb-28 lg:pb-14">
      <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8">
        <Link to="/employer/dashboard" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-blue-700"><ArrowLeft className="h-4 w-4" /> Quản lý tuyển dụng</Link>
        <header className="mb-8 mt-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Đăng tin tuyển dụng</h1>
            <p className="mt-2 text-sm text-slate-500">Một tin rõ ràng giúp bạn tìm đúng người. Bắt đầu với vị trí cần tuyển.</p>
          </div>
          <span className="text-xs text-slate-500">Các trường có dấu <span className="text-red-600">*</span> là bắt buộc</span>
        </header>
        <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,1fr)_320px]">
          <form
            id="post-job-form"
            onSubmit={handleSubmit}
            className="min-w-0 rounded-xl border border-slate-200 bg-white shadow-sm"
          >
            <fieldset disabled={loading} className="min-w-0 disabled:opacity-70">
              <section id="job-basics" className="scroll-mt-24 p-5 sm:p-7">
                <div className="mb-6">
                  <h2 className="text-lg font-semibold text-slate-900">Thông tin vị trí</h2>
                  <p className="mt-1 text-sm text-slate-500">Thông tin đầu tiên ứng viên nhìn thấy khi tìm việc.</p>
                </div>
                {metaError && <div role="alert" className="mb-5 rounded-lg bg-amber-50 p-4 text-sm text-amber-800">
                  {metaError}
                  <button
                    type="button"
                    onClick={() => setMetaRetry(value => value + 1)}
                    className="ml-2 font-semibold underline"
                  >Thử lại</button>
                </div>}
                <div className="space-y-5">
                  <div>
                    <label htmlFor="job-title" className="mb-2 block text-sm font-medium text-slate-700">Tên vị trí tuyển dụng <span className="text-red-600">*</span></label>
                    <input
                      id="job-title"
                      required
                      maxLength={200}
                      value={title}
                      onChange={event => setTitle(event.target.value)}
                      placeholder="Ví dụ: Chuyên viên Marketing, Kế toán tổng hợp..."
                      className={inputClass}
                    />
                  </div>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <label htmlFor="job-category" className="mb-2 block text-sm font-medium text-slate-700">Ngành nghề <span className="text-red-600">*</span></label>
                      <select
                        id="job-category"
                        required
                        value={categoryId}
                        disabled={metaLoading || Boolean(metaError)}
                        onChange={event => setCategoryId(event.target.value)}
                        className={inputClass}
                      >
                        <option value="">
                          {metaLoading ? 'Đang tải ngành nghề...' : 'Chọn ngành nghề'}
                        </option>
                        {categories.map(item => <option key={item.CategoryID} value={item.CategoryID}>
                          {item.CategoryName}
                        </option>)}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="job-location" className="mb-2 block text-sm font-medium text-slate-700">Địa điểm làm việc <span className="text-red-600">*</span></label>
                      <input
                        id="job-location"
                        required
                        maxLength={150}
                        value={location}
                        onChange={event => setLocation(event.target.value)}
                        placeholder="Ví dụ: Hà Nội, TP. Hồ Chí Minh, từ xa..."
                        className={inputClass}
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="job-salary" className="mb-2 block text-sm font-medium text-slate-700">Mức lương</label>
                    <input
                      id="job-salary"
                      maxLength={100}
                      value={salaryRange}
                      onChange={event => setSalaryRange(event.target.value)}
                      placeholder="Ví dụ: 15 - 25 triệu VNĐ"
                      className={inputClass}
                    />
                    <p className="mt-2 text-xs text-slate-500">Để trống nếu mức lương thỏa thuận.</p>
                  </div>
                </div>
              </section>
              <section id="job-content" className="scroll-mt-24 border-t border-slate-200 p-5 sm:p-7">
                <div className="mb-5">
                  <h2 className="text-lg font-semibold text-slate-900">Nội dung tuyển dụng</h2>
                  <p className="mt-1 text-sm text-slate-500">Mô tả công việc, quyền lợi và những gì bạn mong đợi ở ứng viên.</p>
                </div>
                <details className="mb-6 rounded-lg border border-blue-100 bg-blue-50/60">
                  <summary className="flex cursor-pointer list-none items-center gap-3 p-4 text-sm font-semibold text-blue-800"><Wand2 className="h-5 w-5" /> Gợi ý nội dung <ChevronDown className="ml-auto h-4 w-4" /></summary>
                  <div className="space-y-4 border-t border-blue-100 p-4">
                    <p className="text-sm leading-6 text-slate-600">Tạo bản gợi ý từ tên vị trí, ngành nghề và kỹ năng đã chọn. Bạn có thể xem lại trước khi áp dụng.</p>
                    <div>
                      <label htmlFor="job-level" className="mb-2 block text-sm font-medium text-slate-700">Cấp bậc cần tuyển</label>
                      <select
                        id="job-level"
                        value={level}
                        onChange={event => setLevel(event.target.value)}
                        className={inputClass}
                      >
                        {levels.map(item => <option key={item}>
                          {item}
                        </option>)}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="job-notes" className="mb-2 block text-sm font-medium text-slate-700">Thông tin bổ sung</label>
                      <textarea
                        id="job-notes"
                        rows={3}
                        value={notes}
                        onChange={event => setNotes(event.target.value)}
                        placeholder="Sản phẩm, nhiệm vụ chính, quyền lợi, yêu cầu đặc biệt..."
                        className={inputClass}
                      />
                    </div>
                    <button
                      type="button"
                      disabled={generating || metaLoading || Boolean(metaError)}
                      onClick={generateContent}
                      className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                      {generating ? 'Đang soạn nội dung...' : 'Tạo gợi ý'}
                    </button>
                    {suggestionError && <p role="alert" className="text-sm text-red-700">
                      {suggestionError}
                    </p>}
                    {suggestion && <div className="space-y-4 rounded-lg border border-blue-200 bg-white p-4" aria-label="Bản gợi ý">
                      <h3 className="font-semibold text-slate-900">Xem lại bản gợi ý</h3>
                      <div>
                        <h4 className="text-sm font-semibold">Mô tả công việc</h4>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-600">
                          {suggestion.description}
                        </p>
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold">Yêu cầu ứng viên</h4>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-600">
                          {suggestion.requirements}
                        </p>
                      </div>
                      {suggestion.benefits && <div><h4 className="text-sm font-semibold">Quyền lợi</h4><p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-600">{suggestion.benefits}</p></div>}
                      <p className="text-xs leading-5 text-slate-500">Áp dụng sẽ thay phần mô tả và yêu cầu đang có. Mức lương đã nhập và các kỹ năng đã chọn được giữ lại.</p>
                      <div className="flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={applySuggestion}
                          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                        >Áp dụng nội dung</button>
                        <button
                          type="button"
                          onClick={() => setSuggestion(null)}
                          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600"
                        >Bỏ gợi ý</button>
                      </div>
                    </div>}
                  </div>
                </details>
                {suggestionApplied && <p role="status" className="mb-5 flex items-center gap-2 text-sm text-emerald-700"><CheckCircle2 className="h-4 w-4" /> Đã áp dụng. Bạn có thể chỉnh sửa nội dung bên dưới.</p>}
                <div className="space-y-5">
                  <div>
                    <label htmlFor="job-description" className="mb-2 block text-sm font-medium text-slate-700">Mô tả công việc và quyền lợi <span className="text-red-600">*</span></label>
                    <textarea
                      id="job-description"
                      required
                      rows={8}
                      value={description}
                      onChange={event => setDescription(event.target.value)}
                      placeholder={'- Nhiệm vụ và trách nhiệm chính\n- Dự án, sản phẩm hoặc khách hàng phụ trách\n- Quyền lợi, thời gian làm việc và cơ hội phát triển'}
                      className={inputClass + ' min-h-40 leading-7'}
                    />
                    <p className="mt-2 text-xs text-slate-500">Mỗi ý một dòng để ứng viên dễ đọc.</p>
                  </div>
                  <div>
                    <label htmlFor="job-requirements" className="mb-2 block text-sm font-medium text-slate-700">Yêu cầu ứng viên <span className="text-red-600">*</span></label>
                    <textarea
                      id="job-requirements"
                      required
                      rows={6}
                      value={requirements}
                      onChange={event => setRequirements(event.target.value)}
                      placeholder={'- Kinh nghiệm và chuyên môn cần có\n- Kỹ năng, bằng cấp hoặc chứng chỉ phù hợp\n- Những yếu tố được ưu tiên'}
                      className={inputClass + ' min-h-40 leading-7'}
                    />
                  </div>
                </div>
              </section>
              <section id="job-skills" className="scroll-mt-24 border-t border-slate-200 p-5 sm:p-7">
                <div className="mb-5">
                  <h2 className="text-lg font-semibold text-slate-900">Kỹ năng yêu cầu <span className="ml-1 text-xs font-normal text-slate-400">Không bắt buộc</span></h2>
                  <p className="mt-1 text-sm leading-6 text-slate-500">Chọn kỹ năng để đối chiếu hồ sơ ứng viên. Phân biệt kỹ năng bắt buộc với kỹ năng được ưu tiên.</p>
                </div>
                {chosenSkills.length > 0 && <div className="mb-5 space-y-2" aria-label="Kỹ năng đã chọn">
                  {chosenSkills.map(skill => <div key={skill.skillId} className="flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
                    <span className="mr-auto text-sm font-medium text-slate-800">
                      {skill.name}
                    </span>
                    <select
                      aria-label={'Mức độ yêu cầu cho ' + skill.name}
                      value={skill.isMandatory ? 'required' : 'preferred'}
                      onChange={event => setSelectedSkills(prev => prev.map(item => item.skillId === skill.skillId ? { ...item, isMandatory: event.target.value === 'required' } : item))}
                      className="rounded-md border border-slate-200 bg-white p-2 text-xs"
                    >
                      <option value="required">Bắt buộc</option>
                      <option value="preferred">Ưu tiên</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => toggleSkill(skill.skillId)}
                      aria-label={'Bỏ kỹ năng ' + skill.name}
                      className="rounded-md p-2 text-slate-500 hover:bg-white hover:text-red-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>)}
                </div>}
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                  <input
                    aria-label="Tìm kỹ năng"
                    value={skillSearch}
                    onChange={event => setSkillSearch(event.target.value)}
                    placeholder="Tìm kỹ năng theo tên..."
                    className={inputClass + ' pl-10'}
                  />
                </div>
                <label className="my-4 flex items-center gap-2 text-sm text-slate-600"><input
                    type="checkbox"
                    checked={allSkills}
                    onChange={event => setAllSkills(event.target.checked)}
                    className="h-4 w-4 rounded accent-blue-600"
                  /> Hiển thị kỹ năng của tất cả ngành nghề</label>
                <div className="flex max-h-64 flex-wrap gap-2 overflow-y-auto" aria-label="Danh sách kỹ năng">
                  {visibleSkills.map(skill => { const selected = selectedSkills.some(item => item.skillId === skill.SkillID); return <button
                    key={skill.SkillID}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => toggleSkill(skill.SkillID)}
                    className={'inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm ' + (selected ? 'border-blue-300 bg-blue-50 font-medium text-blue-700' : 'border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-700')}
                  >
                    {selected && <Check className="h-3.5 w-3.5" />}
                    {skill.SkillName}
                  </button>; })}
                  {!metaLoading && !visibleSkills.length && <p className="text-sm leading-6 text-slate-500">Chưa có kỹ năng phù hợp. Thử từ khóa khác hoặc hiển thị kỹ năng của tất cả ngành nghề. Bạn vẫn có thể gửi tin mà không chọn kỹ năng.</p>}
                </div>
              </section>
            </fieldset>
            {error && <div
              ref={errorRef}
              tabIndex={-1}
              role="alert"
              className="mx-5 mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 outline-none sm:mx-7"
            >
              {error}
            </div>}
          </form>
          <aside className="space-y-5 lg:sticky lg:top-24">
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <h2 className="text-sm font-semibold text-slate-900">Hoàn thiện tin tuyển dụng</h2>
              <nav aria-label="Các phần của tin tuyển dụng" className="mt-4 space-y-1">
                {checks.map(item => <a
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 rounded-lg py-2.5 text-sm text-slate-600 hover:text-blue-700"
                >
                  <span className={'flex h-6 w-6 items-center justify-center rounded-full border ' + (item.done ? 'border-emerald-200 bg-emerald-50 text-emerald-600' : 'border-slate-200 text-slate-300')}>
                    {item.done ? <Check className="h-3.5 w-3.5" /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
                  </span>
                  {item.label}
                  {item.optional && <span className="ml-auto text-xs text-slate-400">Tùy chọn</span>}
                </a>)}
              </nav>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="mb-4 flex items-center gap-2 text-xs font-medium text-slate-500"><FileText className="h-4 w-4" /> Thông tin hiển thị với ứng viên</div>
              <h3 className="break-words text-lg font-semibold leading-7 text-slate-900">
                {title.trim() || 'Tên vị trí tuyển dụng'}
              </h3>
              <p className="mt-3 text-sm font-semibold text-blue-700">
                {salaryRange.trim() || 'Lương thỏa thuận'}
              </p>
              <p className="mt-3 flex items-start gap-2 text-sm text-slate-500">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                <span className="break-words">
                  {location.trim() || 'Địa điểm làm việc'}
                </span>
              </p>
              <p className="mt-3 break-words text-xs leading-6 text-slate-500">
                {category?.CategoryName || 'Ngành nghề chưa chọn'}
              </p>
              <button
                type="button"
                onClick={() => previewRef.current?.showModal()}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              ><Eye className="h-4 w-4" /> Xem trước tin</button>
            </div>
            <p className="px-1 text-xs leading-6 text-slate-500">Tin sẽ được kiểm duyệt trước khi hiển thị. Bạn có thể chỉnh sửa và theo dõi trạng thái tại trang quản lý tuyển dụng.</p>
            <div className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-3 border-t border-slate-200 bg-white p-4 lg:static lg:block lg:border-0 lg:bg-transparent lg:p-0">
              <button
                type="button"
                onClick={() => previewRef.current?.showModal()}
                className="rounded-lg border border-slate-300 p-3 text-slate-600 lg:hidden"
                aria-label="Xem trước tin"
              >
                <Eye className="h-5 w-5" />
              </button>
              <button
                type="submit"
                form="post-job-form"
                disabled={loading || generating || metaLoading || Boolean(metaError)}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {loading ? 'Đang gửi tin...' : 'Gửi tin tuyển dụng'}
              </button>
            </div>
          </aside>
        </div>
      </div>
      <dialog
        ref={previewRef}
        aria-labelledby="preview-title"
        className="m-auto max-h-[85vh] w-[calc(100%_-_2rem)] max-w-3xl rounded-xl border border-slate-200 bg-white p-0 shadow-xl backdrop:bg-slate-900/50"
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
          <h2 id="preview-title" className="font-semibold text-slate-900">Xem trước tin tuyển dụng</h2>
          <button
            type="button"
            onClick={() => previewRef.current?.close()}
            aria-label="Đóng bản xem trước"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-6 break-words p-6 sm:p-8">
          <div>
            <h3 className="text-2xl font-bold text-slate-900">
              {title.trim() || 'Tên vị trí tuyển dụng'}
            </h3>
            <p className="mt-3 font-semibold text-blue-700">
              {salaryRange.trim() || 'Lương thỏa thuận'}
            </p>
            <p className="mt-2 text-sm text-slate-500">{location.trim() || 'Địa điểm chưa nhập'} · {category?.CategoryName || 'Ngành nghề chưa chọn'}</p>
          </div>
          <div>
            <h4 className="font-semibold text-slate-900">Mô tả công việc và quyền lợi</h4>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-600">
              {description.trim() || 'Chưa có mô tả công việc.'}
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-slate-900">Yêu cầu ứng viên</h4>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-600">
              {requirements.trim() || 'Chưa có yêu cầu ứng viên.'}
            </p>
          </div>
          {chosenSkills.length > 0 && <div>
            <h4 className="font-semibold text-slate-900">Kỹ năng yêu cầu</h4>
            <div className="mt-3 flex flex-wrap gap-2">
              {chosenSkills.map(skill => <span key={skill.skillId} className="rounded-md bg-slate-100 px-3 py-1.5 text-xs text-slate-600">{skill.name} · {skill.isMandatory ? 'Bắt buộc' : 'Ưu tiên'}</span>)}
            </div>
          </div>}
        </div>
      </dialog>
    </main>
  );
}
