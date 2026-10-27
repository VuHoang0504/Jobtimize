import { normalizeCV, SECTION_LABELS, FONTS, columnFor, hasContent } from './model.mjs';
import { paginateCV } from './paginate.mjs';

export const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function renderCV(raw, { template = 'minimal', editable = false, avatarData = '', fontCSS = '', css = '' } = {}) {
  // Keep the same field boxes / empty hints in both layouts. Export hides hint ink,
  // not its space, so switching to PDF cannot move the content onto different pages.
  const exportMode = !editable;
  editable = true;
  const data = normalizeCV(raw, template);
  const e = escapeHTML;
  function field(path, value, placeholder, { tag = 'span', className = '', multiline = false } = {}) {
    if (!editable && !String(value || '').trim()) return '';
    return `<${tag} class="cv-field ${className}" ${editable ? `contenteditable="true" role="textbox" aria-label="${e(placeholder)}" aria-multiline="${multiline}" spellcheck="false" data-path="${e(path)}" data-placeholder="${e(placeholder)}"` : ''}>${e(value)}</${tag}>`;
  }
  const desc = (path, value, placeholder = 'Nhập mô tả; mỗi dòng là một ý…') => field(path, value, placeholder, { tag: 'div', className: 'cv-description', multiline: true });
  function controls(section, index) {
    if (!editable || ['summary', 'additional', 'skills'].includes(section)) return '';
    return `<div class="cv-item-tools" contenteditable="false">${[['up', '↑', 'Lên'], ['down', '↓', 'Xuống'], ['duplicate', '⧉', 'Nhân bản'], ['remove', '×', 'Xóa']].map(([action, label, title]) => `<button type="button" data-action="${action}" data-section="${section}" data-index="${index}" title="${title}" aria-label="${title}">${label}</button>`).join('')}</div>`;
  }
  const entry = (section, index, html) => `<div class="cv-entry" data-section="${section}" data-index="${index}">${controls(section, index)}${html}</div>`;
  function entries(section) {
    if (section === 'summary' || section === 'additional') return entry(section, 0, desc(section, data[section], section === 'summary' ? 'Viết mục tiêu nghề nghiệp của bạn…' : 'Nhập thông tin bổ sung…'));
    if (section === 'skills') {
      return ['hardSkills', 'softSkills'].map(key => entry(section, key, field(`skills.${key}`, data.skills[key].join('\n'), key === 'hardSkills' ? 'Mỗi dòng một kỹ năng chuyên môn' : 'Mỗi dòng một kỹ năng mềm', { tag: 'div', className: 'cv-description cv-skill-list', multiline: true }))).join('');
    }
    return data[section].map((item, i) => {
      if (!editable && !hasContent(item)) return '';
      const f = (k, hint, opts) => field(`${section}.${i}.${k}`, item[k], hint, opts);
      if (section === 'experiences' && template === 'minimal') return entry(section, i, `<div class="cv-entry-top"><strong>${f('company', 'Tên công ty')} | ${f('role', 'Vị trí công việc')}</strong><span class="cv-dates">${f('startDate', 'Bắt đầu')} – ${item.current ? 'Nay' : f('endDate', 'Kết thúc')}</span></div>${item.location ? `<div class="cv-entry-company">${f('location', 'Địa điểm')}</div>` : ''}${editable ? `<label class="cv-current"><input type="checkbox" data-current="${i}" ${item.current ? 'checked' : ''}> Đang làm việc</label>` : ''}${desc(`${section}.${i}.description`, item.description)}`);
      if (section === 'experiences' && template === 'professional') return entry(section, i, `<div class="cv-entry-top"><strong>${f('company', 'Tên công ty')}</strong><span class="cv-dates">(${f('startDate', 'Bắt đầu')} – ${item.current ? 'Nay' : f('endDate', 'Kết thúc')})</span></div><div class="cv-entry-company"><strong>${f('role', 'Vị trí công việc')}</strong> ${item.location ? f('location', 'Địa điểm') : ''}</div>${editable ? `<label class="cv-current"><input type="checkbox" data-current="${i}" ${item.current ? 'checked' : ''}> Đang làm việc</label>` : ''}${desc(`${section}.${i}.description`, item.description)}`);
      if (section === 'experiences') return entry(section, i, `<div class="cv-entry-top"><strong>${f('role', 'Vị trí công việc')}</strong><span class="cv-dates">${f('startDate', 'Bắt đầu')} <span>–</span> ${item.current ? 'Nay' : f('endDate', 'Kết thúc')}</span></div><div class="cv-entry-company"><strong>${f('company', 'Tên công ty')}</strong> ${f('location', 'Địa điểm')}</div>${editable ? `<label class="cv-current"><input type="checkbox" data-current="${i}" ${item.current ? 'checked' : ''}> Đang làm việc</label>` : ''}${desc(`${section}.${i}.description`, item.description)}`);
      if (section === 'educations') {
        const head = template === 'minimal'
          ? `<div class="cv-entry-top"><strong>${f('school', 'Trường học')} | ${f('degree', 'Ngành học / bằng cấp')}</strong>${f('year', 'Thời gian', { className: 'cv-dates' })}</div>`
          : template === 'modern'
            ? `<strong>${f('degree', 'Ngành học / bằng cấp')}</strong>${f('year', 'Thời gian', { tag: 'div', className: 'cv-dates' })}${f('school', 'Trường học', { tag: 'div' })}`
            : `<div class="cv-entry-top"><strong>${f('school', 'Trường học')}</strong>${f('year', 'Thời gian', { className: 'cv-dates' })}</div><strong>${f('degree', 'Ngành học / bằng cấp')}</strong>`;
        return entry(section, i, `${head}${f('gpa', 'Điểm / GPA', { tag: 'div' })}${desc(`${section}.${i}.description`, item.description, 'Chuyên ngành, thành tích học tập…')}`);
      }
      if (section === 'projects') return entry(section, i, `<strong>${f('name', 'Tên dự án')}</strong>${f('techStack', 'Công nghệ / vai trò', { tag: 'div' })}${f('link', 'Liên kết dự án', { tag: 'div' })}${desc(`${section}.${i}.description`, item.description)}`);
      if (section === 'certifications' || section === 'awards') return entry(section, i, `<div class="cv-entry-top"><strong>${f('name', section === 'awards' ? 'Tên giải thưởng' : 'Tên chứng chỉ')}</strong>${f('year', 'Năm', { className: 'cv-dates' })}</div>${f('issuer', 'Đơn vị cấp / trao', { tag: 'div' })}${section === 'awards' ? desc(`${section}.${i}.description`, item.description) : ''}`);
      if (section === 'interests') return entry(section, i, f('name', 'Sở thích của bạn'));
      if (section === 'activities') return entry(section, i, `<div class="cv-entry-top"><strong>${f('name', 'Tên tổ chức / hoạt động')}</strong>${f('year', 'Thời gian', { className: 'cv-dates' })}</div>${f('role', 'Vai trò', { tag: 'div' })}${desc(`${section}.${i}.description`, item.description)}`);
      if (section === 'references') return entry(section, i, `<strong>${f('name', 'Tên người giới thiệu')}</strong>${f('role', 'Chức vụ', { tag: 'div' })}${f('company', 'Công ty', { tag: 'div' })}${f('contact', 'Email / số điện thoại', { tag: 'div' })}`);
      return entry(section, i, `${f('language', 'Ngôn ngữ')} ${f('proficiency', 'Trình độ')}`);
    }).join('');
  }
  function section(key) {
    if (data.design.hidden.includes(key)) return '';
    const value = key === 'skills' ? [data.skills.hardSkills, data.skills.softSkills] : data[key];
    // Empty optional sections are added deliberately through the sidebar.
    if (!hasContent(value) && (!editable || (Array.isArray(value) && !value.length))) return '';
    const tools = editable ? `<button class="cv-add-inline" type="button" data-action="add" data-section="${key}" title="Thêm dòng">+</button>` : '';
    return `<section class="cv-section" data-section="${key}"><div class="cv-section-heading"><h2>${e(SECTION_LABELS[key])}</h2>${tools}</div>${entries(key)}</section>`;
  }
  const p = data.personal;
  const avatar = avatarData ? `<img class="cv-avatar" src="${e(avatarData)}" alt="Ảnh đại diện CV">` : '';
  const identity = `<div class="cv-identity ${avatar ? 'cv-with-avatar' : ''}">${avatar}<div class="cv-name"><h1>${field('personal.fullName', p.fullName, 'Họ và tên')}</h1><div class="cv-headline">${field('personal.headline', p.headline, 'Vị trí ứng tuyển')}</div></div></div>`;
  const personalHints = { phone: 'Số điện thoại', birthDate: 'Ngày sinh', email: 'Email', gender: 'Giới tính', location: 'Địa chỉ', website: 'Website', linkedin: 'LinkedIn', github: 'GitHub', portfolio: 'Portfolio' };
  const contact = `<div class="cv-contact">${Object.entries(personalHints).filter(([k]) => p[k] || ['phone', 'email', 'location'].includes(k) || data.design.personalFields?.includes(k)).map(([k, hint]) => `<div class="cv-contact-line ${p[k] ? '' : 'cv-empty-contact'}"><span class="cv-contact-icon" aria-hidden="true">${({ phone: '☎', email: '✉', birthDate: '▦', location: '⌖', gender: '◇' })[k] || '↗'}</span>${field(`personal.${k}`, p[k], hint)}</div>`).join('')}</div>`;
  const header = template !== 'modern' ? `<header class="cv-header">${identity}${contact}</header>` : '';
  const columns = template === 'minimal' ? ['main'] : ['side', 'main'];
  const body = columns.map(col => `<div class="cv-column cv-${col}" data-column="${col}">${template === 'modern' && col === 'side' ? `<header class="cv-sidebar-header">${identity}${contact}</header>` : ''}${data.design.order.filter(key => columnFor(template, key) === col).map(section).join('')}</div>`).join('');
  const d = data.design;
  const variables = `--cv-font:'${FONTS[d.font].family}';--cv-color:${d.color};--cv-size:${d.fontSize}px;--cv-line:${d.lineHeight};--cv-gap:${d.sectionGap}px;`;
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>${fontCSS}\n${css}</style></head><body data-template="${e(template)}" class="${exportMode ? 'cv-export' : 'cv-editable'}" style="${variables}"><div class="cv-source cv-${e(template)}">${header}<div class="cv-columns">${body}</div></div><main class="cv-pages"></main><script>(${paginateCV.toString()})().catch(function(){document.documentElement.dataset.error='pagination';});</script></body></html>`;
}
