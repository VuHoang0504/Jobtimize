export const TEMPLATES = {
  minimal: { name: 'Đơn giản', color: '#263d50', font: 'be-vietnam-pro' },
  professional: { name: 'Chuyên nghiệp', color: '#505050', font: 'roboto-condensed' },
  modern: { name: 'Ấn tượng', color: '#5b4141', font: 'be-vietnam-pro' }
};
export const FONTS = {
  'be-vietnam-pro': { name: 'Be Vietnam Pro', language: 'Tiếng Việt', family: 'CV Be Vietnam Pro' },
  roboto: { name: 'Roboto', language: 'Tiếng Việt', family: 'CV Roboto' },
  'roboto-condensed': { name: 'Roboto Condensed', language: 'Tiếng Việt', family: 'CV Roboto Condensed' },
  lato: { name: 'Lato', language: 'Tiếng Anh', family: 'CV Lato' }
};
export const SECTION_LABELS = {
  summary: 'Mục tiêu nghề nghiệp', experiences: 'Kinh nghiệm làm việc', educations: 'Học vấn',
  skills: 'Kỹ năng', languages: 'Ngoại ngữ', projects: 'Dự án', certifications: 'Chứng chỉ',
  awards: 'Danh hiệu và giải thưởng', interests: 'Sở thích', activities: 'Hoạt động',
  references: 'Người giới thiệu', additional: 'Thông tin thêm'
};
export const DEFAULT_ORDER = {
  minimal: ['summary', 'educations', 'activities', 'experiences', 'skills', 'languages', 'projects', 'certifications', 'awards', 'references', 'additional', 'interests'],
  professional: ['summary', 'certifications', 'awards', 'interests', 'additional', 'references', 'educations', 'experiences', 'activities', 'skills', 'languages', 'projects'],
  modern: ['educations', 'skills', 'languages', 'interests', 'references', 'summary', 'experiences', 'projects', 'awards', 'certifications', 'activities', 'additional']
};
export const ITEM_DEFAULTS = {
  experiences: { company: '', role: '', location: '', startDate: '', endDate: '', current: false, description: '' },
  educations: { school: '', degree: '', year: '', gpa: '', description: '' },
  projects: { name: '', techStack: '', link: '', description: '' },
  certifications: { name: '', issuer: '', year: '' },
  awards: { name: '', issuer: '', year: '', description: '' },
  interests: { name: '' }, activities: { name: '', role: '', year: '', description: '' },
  references: { name: '', role: '', company: '', contact: '' },
  languages: { language: '', proficiency: '' }
};
const text = value => typeof value === 'string' ? value : (typeof value === 'number' ? String(value) : '');
const list = value => Array.isArray(value) ? value : [];
export function defaultDesign(template = 'minimal') {
  const t = TEMPLATES[template] || TEMPLATES.minimal;
  return { font: t.font, color: t.color, fontSize: 13, lineHeight: 1.55, sectionGap: 20,
    order: [...(DEFAULT_ORDER[template] || DEFAULT_ORDER.minimal)], hidden: [] };
}
export function columnFor(template, section) {
  if (template === 'minimal') return 'main';
  const side = template === 'modern'
    ? ['educations', 'skills', 'languages', 'interests', 'references']
    : ['summary', 'certifications', 'awards', 'interests', 'additional', 'references'];
  return side.includes(section) ? 'side' : 'main';
}
export function normalizeCV(raw = {}, template = 'minimal') {
  if (!Object.hasOwn(TEMPLATES, template)) template = 'minimal';
  if (typeof raw === 'string') { try { raw = JSON.parse(raw); } catch { raw = {}; } }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) raw = {};
  const defaults = defaultDesign(template);
  const design = raw.design || {};
  const personal = Object.fromEntries(['fullName', 'headline', 'email', 'phone', 'location', 'linkedin', 'github', 'portfolio', 'website', 'birthDate', 'gender'].map(k => [k, text(raw.personal?.[k])]));
  const result = { ...raw, version: 2, personal, summary: text(raw.summary), additional: text(raw.additional),
    avatar: typeof raw.avatar === 'string' ? raw.avatar : '',
    design: { ...defaults, font: Object.hasOwn(FONTS, design.font) ? design.font : defaults.font,
      color: /^#[0-9a-f]{6}$/i.test(design.color) ? design.color : defaults.color,
      fontSize: clamp(design.fontSize, 11, 17, 13), lineHeight: clamp(design.lineHeight, 1.2, 1.9, 1.55),
      sectionGap: clamp(design.sectionGap, 10, 36, 20),
      order: [...new Set([...list(design.order).filter(k => Object.hasOwn(SECTION_LABELS, k)), ...defaults.order])],
      hidden: (Array.isArray(design.hidden) ? design.hidden : ['additional'].filter(k => !hasContent(raw[k]))).filter(k => Object.hasOwn(SECTION_LABELS, k)),
      personalFields: list(design.personalFields).filter(k => ['birthDate', 'gender', 'website', 'linkedin', 'github', 'portfolio'].includes(k)) },
    skills: { ...raw.skills, hardSkills: list(raw.skills?.hardSkills).map(v => typeof v === 'string' ? v : text(v?.name)),
      softSkills: list(raw.skills?.softSkills).map(v => typeof v === 'string' ? v : text(v?.name)) }
  };
  for (const [key, fields] of Object.entries(ITEM_DEFAULTS)) {
    const source = key === 'languages' ? (raw.languages || raw.skills?.languages) : raw[key];
    result[key] = list(source).map(value => {
      const v = typeof value === 'string' ? { [key === 'languages' ? 'language' : 'name']: value } : (value || {});
      const item = { ...v, ...Object.fromEntries(Object.keys(fields).map(k => [k, k === 'current' ? !!v[k] : text(v[k])])) };
      if (key === 'experiences') {
        item.role ||= text(v.position);
        if (!item.startDate && v.duration) {
          const dates = text(v.duration).split(/\s+[-–—]\s+/u);
          item.startDate = dates[0];
          if (dates[1]) { item.endDate ||= dates[1]; item.current ||= /^(nay|hiện tại|present|current)$/iu.test(dates[1]); }
        }
      }
      if (key === 'educations') { item.school ||= text(v.institution); item.degree ||= text(v.major); item.year ||= text(v.duration); }
      if (['projects', 'certifications'].includes(key)) item.name ||= text(v.title);
      return item;
    });
  }
  return result;
}
function clamp(value, min, max, fallback) { const n = Number(value); return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback; }
export function setPath(data, path, value) {
  const copy = JSON.parse(JSON.stringify(data));
  const keys = path.split('.');
  if (keys.some(k => ['__proto__', 'constructor', 'prototype'].includes(k))) return copy;
  let target = copy;
  for (const k of keys.slice(0, -1)) { if (target[k] == null) return copy; target = target[k]; }
  target[keys.at(-1)] = value;
  return copy;
}
export function hasContent(value) {
  if (typeof value === 'string') return !!value.trim();
  if (Array.isArray(value)) return value.some(hasContent);
  if (value && typeof value === 'object') return Object.entries(value).some(([k, v]) => k !== 'current' && hasContent(v));
  return false;
}
export function validateCV(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Dữ liệu CV không hợp lệ.');
  if (JSON.stringify(raw).length > 250000) throw new Error('CV quá dài (tối đa 250.000 ký tự).');
  const walk = (value, depth = 0) => {
    if (depth > 10) throw new Error('Cấu trúc CV không hợp lệ.');
    if (typeof value === 'string' && value.length > 16000) throw new Error('Mỗi trường tối đa 16.000 ký tự.');
    if (Array.isArray(value) && value.length > 100) throw new Error('Mỗi mục tối đa 100 dòng.');
    if (value && typeof value === 'object') for (const [key, v] of Object.entries(value)) {
      if (['__proto__', 'constructor', 'prototype'].includes(key)) throw new Error('Dữ liệu CV không hợp lệ.');
      walk(v, depth + 1);
    }
  };
  walk(raw);
}
