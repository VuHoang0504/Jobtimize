import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Check, CheckCircle2, ChevronRight, Download, FileText, History, Loader2, Plus, RefreshCw, Search, Star, Trash2, Upload, X } from 'lucide-react';
import api from '../../services/api';

const field = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100';
const secondary = 'inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50';
const primary = 'inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50';
const states = {
  Queued: ['Chờ đọc nội dung', 'bg-slate-100 text-slate-600'],
  Processing: ['Đang đọc nội dung', 'bg-blue-50 text-blue-700'],
  NeedsReview: ['Cần kiểm tra', 'bg-amber-50 text-amber-800'],
  Ready: ['Sẵn sàng đối chiếu', 'bg-emerald-50 text-emerald-700'],
  Failed: ['Chưa đọc được', 'bg-red-50 text-red-700']
};
const blank = () => ({ personal: { fullName: '', email: '', phone: '', headline: '', location: '' }, summary: '', skills: [], experiences: [], educations: [], certifications: [], languages: [] });
const date = value => value ? new Date(value).toLocaleDateString('vi-VN') : '';
function Status({ value }) {
  const [label, color] = states[value] || ['Cần tải lại tệp', 'bg-amber-50 text-amber-800'];
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${color}`}>
    {['Queued', 'Processing'].includes(value) ? <Loader2 className="h-3 w-3 animate-spin" /> : value === 'Ready' ? <Check className="h-3 w-3" /> : null}{label}
  </span>;
}

export default function CVManager({ onChange }) {
  const [cvs, setCVs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [busy, setBusy] = useState(false);
  const [target, setTarget] = useState(null);
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [progress, setProgress] = useState(0);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [analysis, setAnalysis] = useState(blank);
  const [dirty, setDirty] = useState(false);
  const [panel, setPanel] = useState('info');
  const [preview, setPreview] = useState('');
  const [previewType, setPreviewType] = useState('');
  const [previewError, setPreviewError] = useState('');
  const [reviewError, setReviewError] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [skillName, setSkillName] = useState('');
  const [remove, setRemove] = useState(null);
  const selectedRef = useRef(null);
  const uploadRef = useRef(null), reviewRef = useRef(null), removeRef = useRef(null), fileRef = useRef(null);

  async function load(quiet = false) {
    if (!quiet) setLoading(true);
    try {
      const { data } = await api.get('/cv-documents');
      if (!data.success) throw new Error();
      setCVs(data.data);
      setError('');
    } catch { setError('Không tải được danh sách CV. Vui lòng thử lại.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);
  useEffect(() => {
    if (!dirty) return;
    const warn = event => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  useEffect(() => {
    if (!cvs.some(cv => ['Queued', 'Processing'].includes(cv.document?.status))) return;
    const timer = setInterval(() => load(true), 4000);
    return () => clearInterval(timer);
  }, [cvs]);
  async function loadDetail(id, replace = true) {
    try {
      const { data } = await api.get('/cv-documents/' + id);
      if (!data.success) throw new Error();
      if (selectedRef.current !== id) return;
      setDetail(data.data);
      if (replace) {
        setAnalysis(data.data.document?.analysis || blank());
        setEditTitle(data.data.Title);
        setDirty(false);
      }
    } catch { setReviewError('Không tải được thông tin CV. Hãy đóng và mở lại.'); }
  }
  useEffect(() => {
    if (!selected || !['Queued', 'Processing'].includes(detail?.document?.status)) return;
    const timer = setInterval(() => loadDetail(selected), 3500);
    return () => clearInterval(timer);
  }, [selected, detail?.document?.status]);
  useEffect(() => {
    if (!selected) return;
    const controller = new AbortController();
    let url;
    setPreview(''); setPreviewError('');
    api.get('/cv-documents/' + selected + '/file', { responseType: 'blob', signal: controller.signal, timeout: 60000 })
      .then(response => { url = URL.createObjectURL(response.data); setPreviewType(response.data.type); setPreview(url); })
      .catch(() => { if (!controller.signal.aborted) setPreviewError('Không mở được tệp gốc. Bạn có thể tải lại phiên bản mới.'); });
    return () => { controller.abort(); if (url) URL.revokeObjectURL(url); };
  }, [selected, detail?.document?.versionId]);

  function openReview(cv) {
    selectedRef.current = cv.CVID; setSelected(cv.CVID); setDetail(null); setReviewError(''); setDirty(false); setPanel('info');
    setAnalysis(blank()); loadDetail(cv.CVID); reviewRef.current.showModal();
  }
  function openUpload(cv = null) {
    setTarget(cv); setTitle(cv?.Title || ''); setFile(null); setProgress(0); setUploadError('');
    if (fileRef.current) fileRef.current.value = '';
    uploadRef.current.showModal();
  }
  function pickFile(value) {
    if (!value) return;
    if (value.size > 10 * 1024 * 1024) { setUploadError('CV tối đa 10 MB.'); return; }
    setFile(value); setUploadError('');
    if (!title.trim()) setTitle(value.name.replace(/\.[^.]+$/, ''));
  }
  async function upload(event) {
    event.preventDefault();
    if (!file) { setUploadError('Chọn tệp CV để tải lên.'); return; }
    setBusy(true); setUploadError('');
    try {
      const form = new FormData(); form.append('cvFile', file); form.append('title', title.trim());
      const { data } = await api.post('/cv-documents' + (target ? '/' + target.CVID + '/versions' : ''), form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: event => setProgress(event.total ? Math.round(event.loaded / event.total * 100) : 0)
      });
      if (!data.success) throw new Error();
      uploadRef.current.close();
      setNotice('Đã lưu tệp. Nội dung sẽ được đọc trong nền; bạn có thể rời trang và quay lại sau.');
      await load(true); if (selected && target?.CVID === selected) await loadDetail(selected); onChange?.();
    } catch (err) { setUploadError(err.response?.data?.message || 'Tải lên thất bại. Vui lòng thử lại.'); }
    finally { setBusy(false); }
  }
  async function action(work, message) {
    setBusy(true); setError(''); setReviewError('');
    try { await work(); setNotice(message); await load(true); onChange?.(); }
    catch (err) { const msg = err.response?.data?.message || 'Thao tác chưa thành công. Vui lòng thử lại.'; setError(msg); setReviewError(msg); }
    finally { setBusy(false); }
  }
  async function save(event) {
    event.preventDefault();
    setBusy(true); setReviewError('');
    try {
      await api.put(`/cv-documents/${selected}/analysis`, { versionId: detail.document.versionId, analysis });
      setNotice('Đã xác nhận thông tin. CV sẵn sàng để đối chiếu với việc làm.');
      await loadDetail(selected); await load(true); onChange?.();
    } catch (err) { setReviewError(err.response?.data?.message || 'Chưa lưu được. Thông tin bạn nhập vẫn được giữ lại.'); }
    finally { setBusy(false); }
  }
  function change(key, value) { setAnalysis(prev => ({ ...prev, [key]: value })); setDirty(true); }
  function editRecord(section, index, key, value) {
    change(section, analysis[section].map((item, i) => i === index ? { ...item, [key]: value } : item));
  }
  const waiting = ['Queued', 'Processing'].includes(detail?.document?.status);
  const visible = cvs.filter(cv => cv.Title.toLowerCase().includes(search.toLowerCase()) &&
    (filter === 'all' || (filter === 'ready' ? cv.document?.status === 'Ready' : cv.document?.status !== 'Ready')));

  return (
    <section className="min-w-0 space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div><h1 className="text-2xl font-bold tracking-tight text-slate-900">Quản lý CV</h1><p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">Mỗi cơ hội, một bản CV phù hợp. Lưu tài liệu, kiểm tra nội dung và chọn bản bạn muốn gửi.</p></div>
        <button type="button" onClick={() => openUpload()} className={primary}><Upload className="h-4 w-4" /> Tải CV lên</button>
      </header>
      <div className="flex flex-col gap-4 rounded-xl border border-blue-100 bg-blue-50/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3"><FileText className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" /><div><p className="text-sm font-semibold text-slate-800">Chưa có CV? Bắt đầu từ một mẫu có sẵn.</p><p className="mt-1 text-xs leading-5 text-slate-500">Chỉnh sửa trực tiếp, tải PDF và dùng ngay để đối chiếu kỹ năng.</p></div></div>
        <Link to="/candidate/cv-builder" className="inline-flex shrink-0 items-center gap-2 text-sm font-semibold text-blue-700">Thiết kế CV <ArrowUpRight className="h-4 w-4" /></Link>
      </div>
      {notice && <p role="status" className="flex items-start gap-2 text-sm leading-6 text-emerald-700"><CheckCircle2 className="mt-1 h-4 w-4 shrink-0" />{notice}</p>}
      {error && <div role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-700">{error} <button onClick={() => load()} className="ml-2 underline">Thử lại</button></div>}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4">
          <div className="flex gap-1" aria-label="Lọc CV">{[['all', 'Tất cả'], ['ready', 'Sẵn sàng'], ['review', 'Cần xử lý']].map(([key, label]) => <button key={key} type="button" aria-pressed={filter === key} onClick={() => setFilter(key)} className={`rounded-lg px-3 py-2 text-xs font-semibold ${filter === key ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>{label}</button>)}</div>
          <div className="relative"><Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><input aria-label="Tìm CV" value={search} onChange={event => setSearch(event.target.value)} placeholder="Tìm theo tên CV" className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-xs focus:outline-blue-600 sm:w-48" /></div>
        </div>
        {loading ? <div className="p-10 text-center text-sm text-slate-500"><Loader2 className="mx-auto mb-3 h-5 w-5 animate-spin" />Đang tải CV...</div> : !visible.length ? <div className="px-6 py-14 text-center"><FileText className="mx-auto mb-4 h-10 w-10 text-slate-300" /><h2 className="font-semibold text-slate-800">{cvs.length ? 'Không có CV phù hợp bộ lọc' : 'Một nơi dành riêng cho CV của bạn'}</h2><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">{cvs.length ? 'Thử đổi tên tìm kiếm hoặc chọn tất cả.' : 'Tải bản PDF, DOCX hoặc ảnh CV. Sau khi đọc xong, bạn kiểm tra thông tin trước khi sử dụng.'}</p>{!cvs.length && <button type="button" onClick={() => openUpload()} className={primary + ' mt-5'}>Tải CV đầu tiên</button>}</div> : <ul className="divide-y divide-slate-100">{visible.map(cv => <li key={cv.CVID} className="p-5 transition-colors hover:bg-slate-50/60">
          <div className="flex items-start gap-4"><div className={`flex h-14 w-11 shrink-0 items-center justify-center rounded-md border ${cv.CvType === 'OnlineBuilder' ? 'border-blue-200 bg-blue-50 text-blue-600' : 'border-slate-200 bg-white text-slate-400'}`}><FileText className="h-6 w-6" /></div>
            <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><button onClick={() => openReview(cv)} className="break-words text-left text-sm font-semibold text-slate-900 hover:text-blue-700">{cv.Title}</button>{cv.IsPrimary && <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-600"><Star className="h-3 w-3 fill-current" />CV chính</span>}</div>
              <p className="mt-1.5 text-xs text-slate-400">{cv.CvType === 'OnlineBuilder' ? 'CV trực tuyến' : 'Tệp tải lên'} · Cập nhật {date(cv.UpdatedAt || cv.CreatedAt)}{cv.document && ` · Phiên bản ${cv.document.version}`}</p>
              <div className="mt-3"><Status value={cv.document?.status} /></div>
            </div><button onClick={() => openReview(cv)} aria-label={'Xem ' + cv.Title} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-blue-600"><ChevronRight className="h-5 w-5" /></button>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2 sm:ml-15"><button type="button" onClick={() => openReview(cv)} className={secondary}>{cv.document?.status === 'NeedsReview' ? 'Kiểm tra thông tin' : 'Xem và quản lý'}</button>
            {cv.CvType === 'OnlineBuilder' && <Link to={'/candidate/cv-builder?id=' + cv.CVID} className={secondary}>Chỉnh sửa CV</Link>}
            {!cv.IsPrimary && <button disabled={busy} onClick={() => action(() => api.put(`/candidate/cv/${cv.CVID}/primary`), 'Đã đổi CV chính. Điểm phù hợp sẽ dựa trên CV này.')} className="px-2 py-2 text-xs font-medium text-slate-500 hover:text-blue-700">Đặt làm CV chính</button>}
            <button disabled={busy} aria-label={'Xóa ' + cv.Title} onClick={() => { setRemove(cv); removeRef.current.showModal(); }} className="ml-auto rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
          </div>
        </li>)}</ul>}
      </div>
      <p className="text-xs leading-6 text-slate-400">CV chính dùng để gợi ý việc làm. Khi ứng tuyển, bạn chọn lại CV muốn gửi; bản đã gửi được giữ riêng, không thay đổi khi bạn sửa CV sau này.</p>

      <dialog ref={uploadRef} onCancel={event => { if (busy) event.preventDefault(); }} className="m-auto w-[calc(100%_-_2rem)] max-w-lg rounded-xl border border-slate-200 p-0 shadow-xl backdrop:bg-slate-900/40">
        <form onSubmit={upload}><div className="flex items-center justify-between border-b border-slate-100 px-6 py-4"><h2 className="font-semibold text-slate-900">{target ? 'Tải phiên bản mới' : 'Thêm CV của bạn'}</h2><button type="button" disabled={busy} onClick={() => uploadRef.current.close()} aria-label="Đóng tải lên" className="p-2 text-slate-400"><X className="h-5 w-5" /></button></div>
          <div className="space-y-5 p-6"><div><label htmlFor="cv-upload-title" className="mb-2 block text-sm font-medium text-slate-700">Tên CV</label><input id="cv-upload-title" disabled={busy} required maxLength={200} value={title} onChange={event => setTitle(event.target.value)} placeholder="Ví dụ: CV Marketing — bản tiếng Việt" className={field} /></div>
            <div onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); if (!busy) pickFile(event.dataTransfer.files[0]); }} className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center"><Upload className="mx-auto mb-3 h-7 w-7 text-blue-600" /><p className="text-sm font-medium text-slate-800">{file ? file.name : 'Kéo tệp CV vào đây'}</p><label className="mt-3 inline-block cursor-pointer text-sm font-semibold text-blue-600">Chọn tệp từ máy<input ref={fileRef} type="file" aria-label="Tệp CV" disabled={busy} accept=".pdf,.docx,.png,.jpg,.jpeg,.webp" onChange={event => pickFile(event.target.files[0])} className="sr-only" /></label><p className="mt-3 text-xs text-slate-400">PDF, DOCX, PNG, JPG, WebP · Tối đa 10 MB, PDF tối đa 20 trang</p></div>
            <p className="text-xs leading-6 text-slate-500">Tệp được lưu riêng tư. Thông tin đọc được chỉ dùng để đối chiếu sau khi bạn kiểm tra và xác nhận.</p>
            {uploadError && <p role="alert" className="text-sm text-red-700">{uploadError}</p>}
            {busy && <div className="h-1.5 overflow-hidden rounded-full bg-slate-100"><div style={{ width: `${progress}%` }} className="h-full bg-blue-600" /></div>}
          </div><div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4"><button type="button" disabled={busy} onClick={() => uploadRef.current.close()} className={secondary}>Hủy</button><button disabled={busy} className={primary}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}{busy ? 'Đang lưu tệp...' : 'Tải lên và đọc nội dung'}</button></div>
        </form>
      </dialog>

      <dialog ref={reviewRef} onClose={() => { selectedRef.current = null; setSelected(null); }} onCancel={event => { if (busy || (dirty && !window.confirm('Bạn có thay đổi chưa lưu. Đóng mà không lưu?'))) event.preventDefault(); else setSelected(null); }} className="m-auto h-[90vh] w-[calc(100%_-_2rem)] max-w-7xl overflow-hidden rounded-xl border border-slate-200 p-0 shadow-xl backdrop:bg-slate-900/40">
        <div className="flex h-full flex-col"><div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4"><div className="min-w-0"><h2 className="truncate font-semibold text-slate-900">{detail?.Title || 'Thông tin CV'}</h2><p className="mt-1 text-xs text-slate-400">Đối chiếu với bản gốc trước khi xác nhận.</p></div><button type="button" disabled={busy} onClick={() => { if (!dirty || window.confirm('Đóng mà không lưu các thay đổi?')) { reviewRef.current.close(); setSelected(null); } }} aria-label="Đóng thông tin CV" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button></div>
          <div className="grid min-h-0 flex-1 lg:grid-cols-[42%_58%]">
            <div className="hidden min-h-0 flex-col border-r border-slate-200 bg-slate-100 p-4 lg:flex"><div className="mb-3 flex items-center justify-between"><span className="text-xs font-semibold text-slate-600">Tệp gốc</span>{preview && <a href={preview} download={detail?.document?.originalName || `${detail?.Title || 'CV'}.pdf`} className="inline-flex items-center gap-1 text-xs font-medium text-blue-700"><Download className="h-3.5 w-3.5" />Tải tệp</a>}</div>
              {preview && (previewType === 'application/pdf' ? <iframe title="Bản gốc CV" src={preview} className="min-h-0 w-full flex-1 rounded-lg bg-white" /> : previewType.startsWith('image/') ? <div className="overflow-auto"><img src={preview} alt="Bản gốc CV" className="w-full rounded-lg" /></div> : <div className="p-6 text-sm text-slate-500">Tải file DOCX để xem trong phần mềm soạn thảo. Bạn có thể đối chiếu văn bản ở mục Nội dung gốc.</div>)}
              {!preview && <p className="p-5 text-sm text-slate-500">{previewError || 'Đang mở tệp...'}</p>}
            </div>
            <div className="min-h-0 overflow-y-auto p-5 sm:p-6">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-2"><Status value={detail?.document?.status} />{preview && <a href={preview} target="_blank" rel="noreferrer" className={secondary + ' lg:hidden'}>Mở tệp gốc</a>}</div>
              <div className="mb-6 flex gap-1 border-b border-slate-200">{[['info', 'Thông tin'], ['source', 'Nội dung gốc'], ['history', 'Lịch sử']].map(([key, label]) => <button type="button" key={key} onClick={() => setPanel(key)} className={`border-b-2 px-3 pb-3 pt-1 text-sm font-medium ${panel === key ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500'}`}>{label}</button>)}</div>
              {!detail ? <p className="text-sm text-slate-500">Đang tải thông tin...</p> : panel === 'source' ? <pre className="whitespace-pre-wrap break-words rounded-lg bg-slate-50 p-4 font-sans text-sm leading-7 text-slate-600">{detail.document?.rawText || 'Chưa có văn bản trích xuất. CV trực tuyến sử dụng dữ liệu bạn nhập trong trình thiết kế.'}</pre> : panel === 'history' ? <div className="space-y-4">{detail.history.map(item => <div key={item.versionId} className="flex items-center justify-between gap-2 border-b border-slate-100 pb-4"><div><p className="flex items-center gap-2 text-sm font-semibold text-slate-800"><History className="h-4 w-4 text-slate-400" />Phiên bản {item.version}</p><p className="mt-1 text-xs text-slate-400">{date(item.updatedAt)}</p></div><div className="flex items-center gap-2"><Status value={item.status} /><button type="button" onClick={async () => { try { const response = await api.get(`/cv-documents/${selected}/file?versionId=${item.versionId}`, { responseType: 'blob' }); const url = URL.createObjectURL(response.data); const a = document.createElement('a'); a.href = url; a.download = `CV-v${item.version}.${response.data.type.includes('wordprocessingml') ? 'docx' : response.data.type.startsWith('image/') ? response.data.type.split('/')[1] : 'pdf'}`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 30000); } catch { setReviewError('Không tải được phiên bản này.'); } }} aria-label={'Tải phiên bản ' + item.version} className="p-2 text-blue-600"><Download className="h-4 w-4" /></button></div></div>)}</div> : <form id="cv-review-form" onSubmit={save}><fieldset disabled={busy} className="min-w-0 space-y-6">
                <div className="flex items-end gap-2"><div className="flex-1"><label htmlFor="cv-rename" className="mb-2 block text-sm font-medium text-slate-700">Tên CV</label><input id="cv-rename" value={editTitle} maxLength={200} onChange={event => setEditTitle(event.target.value)} className={field} /></div><button type="button" disabled={busy || !editTitle.trim() || editTitle === detail.Title} onClick={() => action(async () => { await api.patch('/cv-documents/' + selected, { title: editTitle }); setDetail(prev => ({ ...prev, Title: editTitle })); }, 'Đã đổi tên CV.')} className={secondary}>Đổi tên</button></div>
                {(detail.document?.warnings?.length > 0 || detail.document?.error) && <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-4 text-xs leading-6 text-amber-900">{detail.document.error && <p>{detail.document.error}</p>}{detail.document.warnings.map((warning, index) => <p key={index}>{warning}</p>)}</div>}
                {waiting ? <div className="py-8 text-center"><Loader2 className="mx-auto mb-3 h-6 w-6 animate-spin text-blue-600" /><p className="text-sm font-medium text-slate-700">Đang đọc nội dung trong CV</p><p className="mt-2 text-xs leading-6 text-slate-500">Bạn có thể đóng cửa sổ này. Kết quả sẽ được lưu khi xử lý xong.</p></div> : <>
                  <div><h3 className="mb-4 text-sm font-semibold text-slate-900">Thông tin trong CV</h3><div className="grid gap-4 sm:grid-cols-2">{[['fullName', 'Họ và tên'], ['headline', 'Chức danh'], ['email', 'Email'], ['phone', 'Số điện thoại'], ['location', 'Địa điểm']].map(([key, label]) => <div key={key}><label htmlFor={'cv-personal-' + key} className="mb-2 block text-xs font-medium text-slate-500">{label}</label><input id={'cv-personal-' + key} value={analysis.personal?.[key] || ''} onChange={event => change('personal', { ...analysis.personal, [key]: event.target.value })} className={field} /></div>)}</div><label htmlFor="cv-summary" className="mb-2 mt-4 block text-xs font-medium text-slate-500">Giới thiệu chuyên môn</label><textarea id="cv-summary" rows={3} value={analysis.summary || ''} onChange={event => change('summary', event.target.value)} className={field} /></div>
                  <div className="border-t border-slate-100 pt-5"><h3 className="text-sm font-semibold text-slate-900">Kỹ năng và bằng chứng</h3><p className="mb-4 mt-1 text-xs leading-6 text-slate-500">Chỉ giữ kỹ năng thật sự có trong CV. Thông tin bổ sung được ghi nhận là do bạn xác nhận.</p><div className="space-y-3">{(analysis.skills || []).map((skill, index) => <div key={index} className="rounded-lg border border-slate-200 p-3"><div className="flex items-center gap-2"><input aria-label={'Tên kỹ năng ' + (index + 1)} value={skill.name} onChange={event => editRecord('skills', index, 'name', event.target.value)} className={field} /><button type="button" aria-label={'Bỏ kỹ năng ' + skill.name} onClick={() => change('skills', analysis.skills.filter((_, i) => i !== index))} className="p-2 text-slate-400 hover:text-red-600"><X className="h-4 w-4" /></button></div><p className={`my-2 text-xs ${skill.verified ? 'text-emerald-700' : 'text-amber-700'}`}>{skill.verified ? 'Có bằng chứng / đã xác nhận' : 'Cần kiểm tra bằng chứng'}{skill.canonicalName && skill.canonicalName !== skill.name ? ' · Chuẩn hóa: ' + skill.canonicalName : ''}</p><textarea aria-label={'Bằng chứng cho ' + skill.name} rows={2} placeholder="Trích đoạn thể hiện kỹ năng này trong CV" value={skill.evidence || ''} onChange={event => editRecord('skills', index, 'evidence', event.target.value)} className={field} /></div>)}</div><div className="mt-3 flex gap-2"><input aria-label="Kỹ năng bổ sung" value={skillName} onChange={event => setSkillName(event.target.value)} placeholder="Tên kỹ năng có trong CV" className={field} /><button type="button" disabled={!skillName.trim()} onClick={() => { change('skills', [...(analysis.skills || []), { name: skillName.trim(), evidence: '', verified: false }]); setSkillName(''); }} className={secondary}><Plus className="h-4 w-4" />Thêm</button></div></div>
                  {[
                    ['experiences', 'Kinh nghiệm', [['company', 'Công ty'], ['role', 'Vị trí'], ['startDate', 'Từ tháng/năm'], ['endDate', 'Đến tháng/năm'], ['description', 'Công việc và kết quả']]],
                    ['educations', 'Học vấn', [['school', 'Trường'], ['degree', 'Bằng cấp / chuyên ngành'], ['year', 'Thời gian']]],
                    ['certifications', 'Chứng chỉ', [['name', 'Tên chứng chỉ'], ['issuer', 'Đơn vị cấp'], ['year', 'Năm cấp']]],
                    ['languages', 'Ngoại ngữ', [['language', 'Ngôn ngữ'], ['proficiency', 'Trình độ']]]
                  ].map(([section, label, fields]) => <div key={section} className="border-t border-slate-100 pt-5"><div className="mb-4 flex items-center justify-between"><h3 className="text-sm font-semibold text-slate-900">{label}</h3><button type="button" onClick={() => change(section, [...(analysis[section] || []), Object.fromEntries(fields.map(([key]) => [key, '']))])} className="text-xs font-semibold text-blue-600">Thêm mục</button></div><div className="space-y-4">{(analysis[section] || []).map((item, index) => <div key={index} className="relative space-y-3 rounded-lg border border-slate-200 p-4"><button type="button" aria-label={'Xóa mục ' + label + ' ' + (index + 1)} onClick={() => change(section, analysis[section].filter((_, i) => i !== index))} className="absolute right-2 top-2 p-1 text-slate-400"><X className="h-4 w-4" /></button>{fields.map(([key, caption]) => <div key={key}><label className="mb-1 block text-xs text-slate-500" htmlFor={`${section}-${index}-${key}`}>{caption}</label>{key === 'description' ? <textarea id={`${section}-${index}-${key}`} rows={3} value={item[key] || ''} onChange={event => editRecord(section, index, key, event.target.value)} className={field} /> : <input id={`${section}-${index}-${key}`} value={item[key] || ''} onChange={event => editRecord(section, index, key, event.target.value)} className={field} />}</div>)}</div>)}</div></div>)}
                  <p className="rounded-lg bg-slate-50 p-4 text-xs leading-6 text-slate-500">Khi xác nhận, bạn đã kiểm tra các thông tin trên với tệp gốc. Việc này không chỉnh sửa nội dung file đã tải lên hoặc hồ sơ cá nhân.</p>
                </>}
              </fieldset></form>}
              {reviewError && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{reviewError}</p>}
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white px-5 py-4"><div className="flex flex-wrap gap-2">{detail?.CvType === 'OnlineBuilder' ? <Link to={'/candidate/cv-builder?id=' + selected} className={secondary}>Sửa bản thiết kế</Link> : <button type="button" disabled={busy} onClick={() => openUpload(detail)} className={secondary}><Upload className="h-4 w-4" />Phiên bản mới</button>}{['Failed', 'NeedsReview'].includes(detail?.document?.status) && <button type="button" disabled={busy} onClick={() => action(async () => { await api.post('/cv-documents/' + selected + '/retry'); await loadDetail(selected); }, 'Đã đưa CV vào hàng đợi đọc lại.')} className={secondary}><RefreshCw className="h-4 w-4" />Đọc lại</button>}</div><button type="submit" form="cv-review-form" disabled={busy || waiting || !detail?.document || panel !== 'info'} className={primary}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}{detail?.document?.status === 'Ready' ? 'Lưu thông tin đã kiểm tra' : 'Xác nhận và sử dụng CV'}</button></div>
        </div>
      </dialog>

      <dialog ref={removeRef} className="m-auto w-[calc(100%_-_2rem)] max-w-md rounded-xl border border-slate-200 p-6 shadow-xl backdrop:bg-slate-900/40"><h2 className="text-lg font-semibold text-slate-900">Xóa CV khỏi danh sách?</h2><p className="mt-3 text-sm leading-7 text-slate-500">{remove?.Title} sẽ được ẩn khỏi Quản lý CV. Bản đã gửi cho nhà tuyển dụng vẫn được giữ nguyên.</p><div className="mt-6 flex justify-end gap-3"><button disabled={busy} onClick={() => removeRef.current.close()} className={secondary}>Giữ lại</button><button disabled={busy} onClick={() => action(async () => { await api.delete('/cv-documents/' + remove.CVID); removeRef.current.close(); }, 'Đã xóa CV khỏi danh sách.')} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Xóa CV</button></div></dialog>
    </section>
  );
}
