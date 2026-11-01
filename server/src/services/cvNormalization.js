const crypto = require('crypto');
const text = (value, max = 10000) => typeof value === 'string' ? value.replace(/\u0000/g, '').trim().slice(0, max) : '';
const list = value => Array.isArray(value) ? value : [];
const fold = value => text(value, 200000).normalize('NFKC').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/\s+/g, ' ').trim();
const aliases = name => {
  const value = fold(name);
  const dictionary = {
    'react.js': ['reactjs', 'react.js', 'react'], 'node.js': ['nodejs', 'node.js', 'node'],
    'javascript': ['javascript', 'js'], 'typescript': ['typescript', 'ts'],
    'sql server': ['sql server', 'mssql', 'microsoft sql server'], 'postgresql': ['postgresql', 'postgres'],
    'kubernetes': ['kubernetes', 'k8s'], 'aws cloud': ['aws', 'amazon web services']
  };
  return [...new Set([value, ...(dictionary[value] || [])])];
};
function positiveMention(source, term) {
  const value = fold(source);
  const escaped = fold(term).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (!escaped) return false;
  const pattern = new RegExp(`(^|[^\\p{L}\\p{N}])(${escaped})(?=$|[^\\p{L}\\p{N}])`, 'gu');
  for (const match of value.matchAll(pattern)) {
    const before = value.slice(Math.max(0, match.index - 65), match.index + match[1].length).split(/(?:[;.!?]\s|,|\bnhung\b|\bbut\b|\bhowever\b)/u).at(-1);
    if (/(?:^|[^\p{L}\p{N}])(?:chua|khong|chua tung|khong co|no|not|without|lack|lacking)(?:[\s\p{L}]{0,45})$/u.test(before)) continue;
    if (fold(term) === 'react' && /^\s+native\b/.test(value.slice(match.index + match[0].length))) continue;
    return true;
  }
  return false;
}
function canonicalSkill(name, taxonomy) {
  const value = fold(name);
  return taxonomy.find(skill => aliases(skill.SkillName).includes(value) || (skill.NormalizedName && fold(skill.NormalizedName) === value));
}
function normalizeAnalysis(raw, taxonomy = [], source = '', options = {}) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Dữ liệu trích xuất không hợp lệ.');
  const warnings = [];
  const personal = raw.personal || raw;
  const skills = [];
  const seen = new Set();
  for (const entry of list(raw.skills).slice(0, 100)) {
    const item = typeof entry === 'string' ? { name: entry } : entry || {};
    const name = text(item.name, 100);
    const known = canonicalSkill(name, taxonomy);
    const identity = known ? `skill:${known.SkillID}` : fold(name);
    if (!name || seen.has(identity)) continue;
    seen.add(identity);
    const evidence = text(item.evidence, 1500);
    const inSource = evidence && fold(source).includes(fold(evidence));
    const mention = [...aliases(known?.SkillName || name), name, known?.NormalizedName].filter(Boolean).some(term => positiveMention(evidence, term));
    const verified = Boolean(options.userConfirmed || (inSource && mention));
    if (!verified) warnings.push(`Cần kiểm tra bằng chứng cho kỹ năng ${name}.`);
    skills.push({ name, skillId: known?.SkillID || null, canonicalName: known?.SkillName || name,
      evidence, page: Number.isInteger(item.page) && item.page > 0 ? item.page : null,
      verified, source: options.userConfirmed ? 'user' : options.builder ? 'builder' : 'document' });
  }
  const records = (items, keys) => list(items).slice(0, 50).map(item => Object.fromEntries(keys.map(key => [key, text(item?.[key], key === 'description' || key === 'evidence' ? 5000 : 250)])));
  const personalData = Object.fromEntries(['fullName', 'email', 'phone', 'headline', 'location'].map(key => {
    const value = text(personal[key], 250);
    if (value && !options.userConfirmed && !options.builder && !fold(source).includes(fold(value))) {
      const label = { fullName: 'họ tên', email: 'email', phone: 'số điện thoại', headline: 'chức danh', location: 'địa điểm' }[key];
      warnings.push(`Cần kiểm tra ${label}: không tìm thấy giá trị này trong nội dung gốc.`);
      return [key, ''];
    }
    return [key, value];
  }));
  return {
    schemaVersion: 1,
    personal: personalData,
    summary: text(raw.summary, 10000), skills,
    experiences: records(raw.experiences, ['company', 'role', 'startDate', 'endDate', 'description', 'evidence']),
    educations: records(raw.educations, ['school', 'degree', 'year', 'evidence']),
    certifications: records(raw.certifications, ['name', 'issuer', 'year', 'evidence']),
    languages: records(raw.languages, ['language', 'proficiency']),
    warnings: [...new Set(warnings)],
    confirmed: Boolean(options.userConfirmed || options.builder)
  };
}
function fromBuilder(raw, taxonomy) {
  if (typeof raw === 'string') raw = JSON.parse(raw);
  const hidden = new Set(raw.design?.hidden || []);
  const names = hidden.has('skills') ? [] : [...list(raw.skills?.hardSkills), ...list(raw.skills?.technical), ...list(raw.skills?.softSkills), ...list(raw.skills)];
  const source = names.map(name => typeof name === 'string' ? name : name.name || '').join('\n');
  return normalizeAnalysis({ personal: raw.personal, summary: hidden.has('summary') ? '' : raw.summary,
    skills: names.map(name => ({ name: typeof name === 'string' ? name : name.name, evidence: typeof name === 'string' ? name : name.name })),
    experiences: hidden.has('experiences') ? [] : raw.experiences,
    educations: hidden.has('educations') ? [] : raw.educations,
    certifications: hidden.has('certifications') ? [] : raw.certifications,
    languages: hidden.has('languages') ? [] : raw.languages
  }, taxonomy, source, { builder: true });
}
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
module.exports = { normalizeAnalysis, fromBuilder, positiveMention, canonicalSkill, aliases, fold, text, hash };
