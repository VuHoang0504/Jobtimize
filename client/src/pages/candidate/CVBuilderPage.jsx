import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Save, Undo2, Redo2, SlidersHorizontal, X, ImagePlus, Plus, ChevronUp, ChevronDown, GripVertical, Eye, EyeOff, Trash2, RotateCcw } from 'lucide-react';
import api from '../../services/api';
import { downloadCV } from '../../services/cv';
import CVRenderer from '../../components/candidate/CVOnlineTemplates';
import CVAvatarDialog from '../../components/candidate/CVAvatarDialog';
import { useCVEditor, useUnsavedCV } from '../../components/candidate/useCVEditor';
import { TEMPLATES, FONTS, SECTION_LABELS, ITEM_DEFAULTS, defaultDesign, normalizeCV, setPath, columnFor, validateCV } from '../../../../shared/cv/model.mjs';
import '../../styles/cv-builder.css';
import { fontStyles } from '../../../../shared/cv/fonts.mjs';

const emptyCV = () => normalizeCV({ experiences: [{ ...ITEM_DEFAULTS.experiences }], educations: [{ ...ITEM_DEFAULTS.educations }],
  design: { ...defaultDesign('minimal'), hidden: ['awards', 'interests', 'activities', 'references', 'additional', 'projects', 'certifications', 'languages'] } }, 'minimal');
const initial = { title: 'CV của tôi', template: 'minimal', cvData: emptyCV(), isPrimary: false };
const serialize = value => JSON.stringify(value);
const asDataURL = blob => new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(blob); });

export default function CVBuilderPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const id = new URLSearchParams(location.search).get('id');
  const editor = useCVEditor(initial);
  const { value, current, change } = editor;
  const [saved, setSaved] = useState(serialize(initial));
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [retry, setRetry] = useState(0);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [drawer, setDrawer] = useState(false);
  const [selected, setSelected] = useState('summary');
  const [zoom, setZoom] = useState('fit');
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarData, setAvatarData] = useState('');
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [dragged, setDragged] = useState(null);
  const loadedId = useRef(undefined);
  const canvas = useRef(null);
  const fileInput = useRef(null);
  const drawerRef = useRef(null);
  const drawerTrigger = useRef(null);
  const busy = saving || exporting;
  const dirty = !loading && serialize(value) !== saved;
  useUnsavedCV(dirty);
  useEffect(() => { const style = document.createElement('style'); style.textContent = fontStyles(); document.head.append(style); return () => style.remove(); }, []);

  useEffect(() => {
    if (loadedId.current === id) return;
    let cancelled = false;
    async function load() {
      setLoading(true); setLoadError('');
      try {
        let next;
        if (id) {
          const { data: response } = await api.get(`/candidate/cv/${id}`);
          const row = response.data;
          if (!response.success || !row?.CvData) throw new Error('Không tìm thấy dữ liệu CV online.');
          const template = TEMPLATES[row.Template] ? row.Template : 'modern';
          const raw = typeof row.CvData === 'string' ? JSON.parse(row.CvData) : row.CvData;
          next = { title: row.Title || 'CV của tôi', template, isPrimary: !!row.IsPrimary, cvData: normalizeCV(raw, template) };
        } else {
          const { data: response } = await api.get('/candidate/profile');
          const p = response.data || {};
          let bio = {};
          try { bio = typeof p.Bio === 'string' && p.Bio.startsWith('{') ? JSON.parse(p.Bio) : {}; } catch { /* Keep plain profile data. */ }
          const cvData = emptyCV();
          cvData.personal = { ...cvData.personal, fullName: p.FullName || '', headline: p.Headline || '', email: p.Email || '', phone: p.Phone || '', location: p.CurrentLocation || '', ...Object.fromEntries(['linkedin', 'github', 'portfolio'].map(k => [k, bio.links?.[k] || ''])) };
          cvData.summary = bio.bioText || bio.bio || (p.Bio && !p.Bio.startsWith('{') ? p.Bio : '') || '';
          const fromProfile = normalizeCV({ experiences: bio.experiences, educations: bio.educations, skills: bio.skills, ...bio.additionalInfo }, 'minimal');
          for (const key of Object.keys(ITEM_DEFAULTS)) if (fromProfile[key].length) { cvData[key] = fromProfile[key]; cvData.design.hidden = cvData.design.hidden.filter(k => k !== key); }
          cvData.skills = fromProfile.skills;
          next = { title: p.FullName ? `CV ${p.FullName}` : 'CV của tôi', template: 'minimal', cvData, isPrimary: false };
        }
        if (!cancelled) { editor.reset(next); setSaved(serialize(next)); loadedId.current = id; }
      } catch (err) { if (!cancelled) setLoadError(err.response?.data?.message || err.message || 'Không tải được CV.'); }
      finally { if (!cancelled) setLoading(false); }
    }
    load(); return () => { cancelled = true; };
  }, [id, retry]);

  useEffect(() => {
    let cancelled = false;
    setAvatarData('');
    if (!value.cvData.avatar) { setAvatarLoading(false); return; }
    setAvatarLoading(true);
    api.get(value.cvData.avatar.replace(/^\/api/, ''), { responseType: 'blob' }).then(response => asDataURL(response.data)).then(url => { if (!cancelled) setAvatarData(url); }).catch(() => { if (!cancelled) setError('Không tải được ảnh CV. Hãy chọn lại ảnh.'); }).finally(() => { if (!cancelled) setAvatarLoading(false); });
    return () => { cancelled = true; };
  }, [value.cvData.avatar]);

  useEffect(() => {
    if (!drawer) return;
    const previous = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const node = drawerRef.current;
    node?.querySelector('button')?.focus();
    function trap(event) {
      if (event.key === 'Escape') { setDrawer(false); return; }
      if (event.key !== 'Tab') return;
      const elements = [...node.querySelectorAll('button,input,select,[tabindex="0"]')].filter(el => !el.disabled);
      const first = elements[0], last = elements.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
    node?.addEventListener('keydown', trap);
    return () => { node?.removeEventListener('keydown', trap); document.body.style.overflow = previousOverflow; previous?.focus?.(); };
  }, [drawer]);

  function design(key, next) { canvas.current?.flush(); change(v => ({ ...v, cvData: { ...v.cvData, design: { ...v.cvData.design, [key]: next } } })); }
  function updateInline(path, next, inline = true) {
    change(v => ({ ...v, cvData: setPath(v.cvData, path, next) }), { inline, group: inline ? path : null });
  }
  function itemAction(section, action, rawIndex) {
    canvas.current?.flush();
    setSelected(section);
    change(v => {
      const data = JSON.parse(JSON.stringify(v.cvData));
      data.design.hidden = data.design.hidden.filter(k => k !== section);
      if (!ITEM_DEFAULTS[section]) return { ...v, cvData: data };
      const list = data[section];
      const index = Number(rawIndex);
      if (action === 'add') { if (list.length >= 100) { setError('Mỗi mục tối đa 100 dòng.'); return v; } list.push({ ...ITEM_DEFAULTS[section] }); }
      else if (index >= 0 && index < list.length) {
        if (action === 'duplicate' && list.length < 100) list.splice(index + 1, 0, { ...list[index] });
        if (action === 'remove') list.splice(index, 1);
        const target = action === 'up' ? index - 1 : action === 'down' ? index + 1 : index;
        if (target !== index && target >= 0 && target < list.length) [list[index], list[target]] = [list[target], list[index]];
      }
      return { ...v, cvData: data };
    });
  }
  function moveSection(key, target) {
    const data = current.current;
    if (columnFor(data.template, key) !== columnFor(data.template, target) || key === target) return;
    const order = [...data.cvData.design.order];
    order.splice(order.indexOf(key), 1); order.splice(order.indexOf(target), 0, key); design('order', order);
  }
  function toggleSection(key) {
    if (d.hidden.includes(key) && ITEM_DEFAULTS[key] && !value.cvData[key].length) itemAction(key, 'add');
    else design('hidden', d.hidden.includes(key) ? d.hidden.filter(k => k !== key) : [...d.hidden, key]);
  }
  function deleteSection(key) {
    if (!window.confirm(`Xóa nội dung mục “${SECTION_LABELS[key]}”? Bạn có thể hoàn tác.`)) return;
    change(v => ({ ...v, cvData: { ...v.cvData, ...(key === 'skills' ? { skills: { ...v.cvData.skills, hardSkills: [], softSkills: [] } } : { [key]: ITEM_DEFAULTS[key] ? [] : '' }), design: { ...v.cvData.design, hidden: [...new Set([...v.cvData.design.hidden, key])] } } }));
  }
  function payload() {
    canvas.current?.flush();
    const next = current.current;
    if (!next.title.trim()) throw new Error('Vui lòng nhập tên CV.');
    validateCV(next.cvData);
    return { ...next, title: next.title.trim() };
  }
  async function save() {
    setError(''); setNotice('');
    let snapshot;
    try { snapshot = payload(); } catch (err) { setError(err.message); return; }
    setSaving(true);
    try {
      const response = id ? await api.put(`/candidate/cv/online/${id}`, snapshot) : await api.post('/candidate/cv/online', snapshot);
      if (!response.data.success) throw new Error('Lưu CV thất bại.');
      const accepted = { ...snapshot, isPrimary: response.data.data?.IsPrimary !== undefined ? !!response.data.data.IsPrimary : snapshot.isPrimary };
      if (serialize({ ...current.current, title: current.current.title.trim() }) === serialize(snapshot)) change(accepted, { inline: true, group: 'saved' });
      setSaved(serialize(accepted)); setNotice('Đã lưu CV.');
      if (!id && response.data.data?.CVID) { loadedId.current = String(response.data.data.CVID); navigate(`/candidate/cv-builder?id=${response.data.data.CVID}`, { replace: true }); }
    } catch (err) { setError(err.response?.data?.message || err.message || 'Lưu CV thất bại. Nội dung vẫn được giữ trên trang.'); }
    finally { setSaving(false); }
  }
  async function download() {
    setError(''); setNotice('');
    let snapshot;
    try { snapshot = payload(); } catch (err) { setError(err.message); return; }
    setExporting(true);
    try {
      await downloadCV(snapshot); setNotice('Đã tải PDF.');
    } catch (err) {
      setError(err.message);
    } finally { setExporting(false); }
  }
  function selectAvatar(event) {
    const file = event.target.files?.[0]; event.target.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { setError('Chọn ảnh JPG, PNG hoặc WebP.'); return; }
    if (file.size > 5 * 1024 * 1024) { setError('Ảnh tối đa 5 MB.'); return; }
    setError(''); setAvatarFile(file);
  }
  if (loading) return <div className="cv-loading" role="status">Đang mở CV…</div>;
  if (loadError) return <div className="cv-loading"><p role="alert">{loadError}</p><button type="button" onClick={() => setRetry(n => n + 1)}>Thử lại</button><Link to="/candidate/dashboard">Quay lại hồ sơ</Link></div>;
  const d = value.cvData.design;
  return <div className="cv-workspace">
    <header className="cv-topbar">
      <Link className="cv-icon-button" to="/candidate/dashboard" aria-label="Quay lại hồ sơ"><ArrowLeft size={19} /></Link>
      <div className="cv-title-group"><input aria-label="Tên CV" maxLength={200} value={value.title} onChange={event => change(v => ({ ...v, title: event.target.value }), { inline: true, group: 'title' })} /><span aria-live="polite">{dirty ? 'Có thay đổi chưa lưu' : 'Đã lưu / sẵn sàng chỉnh sửa'}</span></div>
      <div className="cv-top-actions">
        <button className="cv-icon-button" type="button" disabled={!editor.canUndo || busy} onClick={editor.undo} title="Hoàn tác" aria-label="Hoàn tác"><Undo2 size={18} /></button>
        <button className="cv-icon-button" type="button" disabled={!editor.canRedo || busy} onClick={editor.redo} title="Làm lại" aria-label="Làm lại"><Redo2 size={18} /></button>
        <button type="button" onClick={save} disabled={busy}><Save size={16} /><span>{saving ? 'Đang lưu…' : 'Lưu CV'}</span></button>
        <button type="button" className="cv-primary" onClick={download} disabled={busy || avatarLoading}><Download size={17} /><span>{exporting ? 'Đang tạo PDF…' : 'Tải về'}</span></button>
      </div>
    </header>
    {(error || notice) && <div className={`cv-message ${error ? 'cv-error' : ''}`} role={error ? 'alert' : 'status'}>{error || notice}<button type="button" aria-label="Đóng thông báo" onClick={() => { setError(''); setNotice(''); }}><X size={15} /></button></div>}
    <div className="cv-work-area">
      {drawer && <div className="cv-drawer-backdrop" onClick={() => setDrawer(false)} />}
      <aside ref={drawerRef} className={`cv-settings ${drawer ? 'is-open' : ''}`} aria-label="Tinh chỉnh CV" {...(drawer ? { role: 'dialog', 'aria-modal': true } : {})}>
        <div className="cv-settings-heading"><h1>Tinh chỉnh CV</h1><button type="button" className="cv-drawer-close cv-icon-button" onClick={() => setDrawer(false)} aria-label="Đóng tinh chỉnh"><X size={18} /></button></div>
        <section className="cv-setting-section"><h2>Mẫu CV</h2><div className="cv-template-options">{Object.entries(TEMPLATES).map(([key, t]) => <button type="button" key={key} className={key === value.template ? 'is-active' : ''} aria-pressed={key === value.template} onClick={() => { canvas.current?.flush(); change(v => ({ ...v, template: key, cvData: { ...v.cvData, design: { ...defaultDesign(key), hidden: v.cvData.design.hidden, personalFields: v.cvData.design.personalFields } } })); }}>
          <span className={`cv-template-thumb thumb-${key}`} aria-hidden="true"><i /><b /><em /><em /><em /></span><span>{t.name}</span></button>)}</div></section>
        <section className="cv-setting-section"><h2>Chữ và màu sắc</h2>
          <label>Phông chữ<select aria-label="Phông chữ" value={d.font} onChange={event => design('font', event.target.value)}>{Object.entries(FONTS).map(([key, f]) => <option key={key} value={key}>{f.name} · {f.language}</option>)}</select></label>
          <p className="cv-font-sample" style={{ fontFamily: `'${FONTS[d.font].family}',sans-serif` }}>{d.font === 'lato' ? 'The next chapter of your career.' : 'Nghề nghiệp vững bước, tương lai rộng mở.'}</p>
          <div className="cv-color-row"><label>Màu chủ đạo<input type="color" aria-label="Màu chủ đạo" value={d.color} onChange={event => design('color', event.target.value)} /></label>{['#263d50', '#505050', '#5b4141', '#195c50', '#254b88'].map(color => <button key={color} type="button" aria-label={`Chọn màu ${color}`} className="cv-swatch" style={{ backgroundColor: color }} onClick={() => design('color', color)} />)}</div>
          {[['fontSize', 'Cỡ chữ', 11, 17, .5, 'px'], ['lineHeight', 'Giãn dòng', 1.2, 1.9, .05, ''], ['sectionGap', 'Khoảng cách mục', 10, 36, 1, 'px']].map(([key, label, min, max, step, unit]) => <label className="cv-range" key={key}>{label}<output>{Number(d[key]).toFixed(key === 'lineHeight' ? 2 : 1)}{unit}</output><input aria-label={label} type="range" min={min} max={max} step={step} value={d[key]} onChange={event => design(key, Number(event.target.value))} /></label>)}
          <button type="button" className="cv-text-button" onClick={() => change(v => ({ ...v, cvData: { ...v.cvData, design: { ...defaultDesign(v.template), hidden: v.cvData.design.hidden, personalFields: v.cvData.design.personalFields } } }))}><RotateCcw size={14} />Khôi phục bố cục mẫu</button>
        </section>
        <section className="cv-setting-section"><h2>Ảnh đại diện</h2><div className="cv-avatar-setting">{avatarData && <img src={avatarData} alt="Avatar CV hiện tại" />}<div><button type="button" onClick={() => fileInput.current.click()}><ImagePlus size={16} />{value.cvData.avatar ? 'Thay ảnh' : 'Tải ảnh lên'}</button><small>JPG, PNG, WebP · tối đa 5 MB</small>{value.cvData.avatar && <button type="button" className="cv-text-button" onClick={() => change(v => ({ ...v, cvData: { ...v.cvData, avatar: '' } }))}>Bỏ ảnh</button>}</div></div><input type="file" ref={fileInput} hidden accept="image/jpeg,image/png,image/webp" onChange={selectAvatar} /></section>
        <section className="cv-setting-section"><h2>Thông tin tùy chọn</h2><p className="cv-help">Bật trường rồi nhập trực tiếp trên CV.</p><div className="cv-personal-options">{Object.entries({ birthDate: 'Ngày sinh', gender: 'Giới tính', website: 'Website', linkedin: 'LinkedIn', github: 'GitHub', portfolio: 'Portfolio' }).map(([key, label]) => <label key={key}><input type="checkbox" checked={!!value.cvData.personal[key] || (d.personalFields || []).includes(key)} onChange={event => {
          if (event.target.checked) design('personalFields', [...new Set([...(d.personalFields || []), key])]);
          else change(v => ({ ...v, cvData: { ...v.cvData, personal: { ...v.cvData.personal, [key]: '' }, design: { ...v.cvData.design, personalFields: (v.cvData.design.personalFields || []).filter(k => k !== key) } } }));
        }} />{label}</label>)}</div></section>
        <section className="cv-setting-section"><h2>Các mục trong CV</h2><p className="cv-help">Kéo hoặc dùng ↑ ↓ để sắp xếp trong cùng cột. Bấm + để thêm dòng.</p>
          {(value.template === 'minimal' ? ['main'] : ['side', 'main']).map(col => { const order = d.order.filter(key => columnFor(value.template, key) === col); return <div className="cv-section-group" key={col}>{value.template !== 'minimal' && <h3>{col === 'side' ? 'Cột trái' : 'Cột chính'}</h3>}{order.map((key, i) => <div key={key} className={`cv-section-row ${selected === key ? 'is-selected' : ''} ${d.hidden.includes(key) ? 'is-hidden' : ''}`} draggable onDragStart={() => setDragged(key)} onDragEnd={() => setDragged(null)} onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); if (dragged) moveSection(dragged, key); setDragged(null); }}>
            <GripVertical size={13} aria-hidden="true" /><span>{SECTION_LABELS[key]}</span><div className="cv-section-actions">
              <button type="button" title="Thêm dòng / hiện mục" aria-label={`Thêm ${SECTION_LABELS[key]}`} onClick={() => itemAction(key, 'add')}><Plus size={13} /></button>
              <button type="button" title="Lên" aria-label={`Đưa ${SECTION_LABELS[key]} lên`} disabled={!i} onClick={() => moveSection(key, order[i - 1])}><ChevronUp size={13} /></button>
              <button type="button" title="Xuống" aria-label={`Đưa ${SECTION_LABELS[key]} xuống`} disabled={i === order.length - 1} onClick={() => { const target = order[i + 1]; const next = [...d.order]; const a = next.indexOf(key), b = next.indexOf(target); [next[a], next[b]] = [next[b], next[a]]; design('order', next); }}><ChevronDown size={13} /></button>
              <button type="button" title={d.hidden.includes(key) ? 'Hiện' : 'Ẩn'} aria-label={`${d.hidden.includes(key) ? 'Hiện' : 'Ẩn'} ${SECTION_LABELS[key]}`} onClick={() => toggleSection(key)}>{d.hidden.includes(key) ? <EyeOff size={13} /> : <Eye size={13} />}</button>
              <button type="button" title="Xóa mục" aria-label={`Xóa ${SECTION_LABELS[key]}`} onClick={() => deleteSection(key)}><Trash2 size={13} /></button>
            </div></div>)}</div>; })}
          <label className="cv-primary-check"><input type="checkbox" checked={value.isPrimary} onChange={event => change(v => ({ ...v, isPrimary: event.target.checked }))} />Dùng làm CV chính</label>
        </section>
      </aside>
      <section className="cv-preview-area" aria-label="Chỉnh sửa nội dung CV">
        <div className="cv-preview-toolbar"><button ref={drawerTrigger} type="button" className="cv-drawer-trigger" aria-expanded={drawer} onClick={() => setDrawer(true)}><SlidersHorizontal size={16} />Tinh chỉnh</button><div><strong>{TEMPLATES[value.template].name}</strong><span>A4 · Bấm vào chữ để chỉnh sửa</span></div><span className="cv-preview-hint">Nội dung dài sẽ tự chuyển trang khi bạn rời ô nhập.</span><button type="button" aria-label="Thay đổi độ phóng to CV" aria-pressed={zoom === 'actual'} onClick={() => setZoom(v => v === 'fit' ? 'actual' : 'fit')}>{zoom === 'fit' ? '100%' : 'Vừa trang'}</button></div>
        <CVRenderer ref={canvas} template={value.template} cvData={value.cvData} revision={editor.revision} avatarData={avatarData} zoom={zoom} onChange={updateInline} onAction={itemAction} onSelect={setSelected} onReflow={editor.reflow} onUndo={editor.undo} onRedo={editor.redo} />
      </section>
    </div>
    {avatarFile && <CVAvatarDialog file={avatarFile} onClose={() => setAvatarFile(null)} onUploaded={url => change(v => ({ ...v, cvData: { ...v.cvData, avatar: url } }))} />}
  </div>;
}
