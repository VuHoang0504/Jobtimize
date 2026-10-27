import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { normalizeCV, defaultDesign, FONTS, TEMPLATES, setPath, validateCV } from '../../shared/cv/model.mjs';
import { renderCV } from '../../shared/cv/render.mjs';
import { fontStyles, fontFiles } from '../../shared/cv/fonts.mjs';
const require = createRequire(import.meta.url);
const service = require('../src/services/cvDocumentService');
const { PDFParse } = require('pdf-parse');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.join(root, '.cache/ms-playwright');
const { chromium } = require('playwright');
const out = path.join(root, '.cache/cv-tests');
await fs.mkdir(out, { recursive: true });
const fixture = {
  personal: { fullName: 'Nguyễn Minh Ánh', headline: 'Chuyên viên kinh doanh', email: 'candidate@example.org', phone: '0900000000', location: 'Đà Nẵng', birthDate: '18/12/1997', gender: 'Nữ', website: 'example.org' },
  summary: 'Với hơn ba năm kinh nghiệm tư vấn khách hàng, tôi mong muốn phát triển chuyên môn và đóng góp vào sự phát triển bền vững của doanh nghiệp.',
  experiences: Array.from({ length: 3 }, (_, i) => ({ role: 'Chuyên viên kinh doanh', company: `Công ty thử nghiệm ${i + 1}`, startDate: '2022', endDate: '2024', description: '- Tư vấn và chăm sóc khách hàng.\n- Phối hợp với đồng nghiệp xây dựng kế hoạch phát triển sản phẩm.\n- Phân tích nhu cầu, đề xuất giải pháp phù hợp và theo dõi kết quả.\n'.repeat(3) })),
  educations: [{ school: 'Đại học Kinh tế', degree: 'Quản trị kinh doanh', year: '2017 – 2021', description: 'Chuyên ngành Quản trị doanh nghiệp' }],
  skills: { hardSkills: ['Giao tiếp', 'Tin học', 'Ngoại ngữ'], softSkills: ['Làm việc nhóm', 'Quản lý thời gian'] },
  certifications: [{ name: 'Chuyên viên bán hàng chuyên nghiệp', issuer: 'Tổ chức đào tạo', year: '2022' }],
  awards: [{ name: 'Nhân viên xuất sắc', issuer: 'Công ty', year: '2024', description: 'Hoàn thành vượt mục tiêu.' }],
  interests: [{ name: 'Đọc sách' }, { name: 'Đi bộ 30 phút/ngày' }],
  activities: [{ name: 'Câu lạc bộ tình nguyện', role: 'Tình nguyện viên', year: '2020 – 2021', description: 'Hỗ trợ các chương trình cộng đồng.' }],
  references: [{ name: 'Người giới thiệu được cung cấp khi có yêu cầu.' }]
};
test('normalizes legacy fields without losing content; new CV has no invented experience', () => {
  const cv = normalizeCV({ personal: { fullName: 'Ánh' }, experiences: [{ position: 'Dev', duration: '2020 - 2022', custom: 'keep' }], educations: [{ institution: 'ĐH', major: 'IT', duration: '2018' }], skills: { languages: ['Tiếng Anh'], hardSkills: [{ name: 'React' }] }, projects: [{ title: 'Dự án' }] }, 'professional');
  assert.equal(cv.experiences[0].role, 'Dev'); assert.equal(cv.experiences[0].custom, 'keep');
  assert.equal(cv.educations[0].school, 'ĐH'); assert.equal(cv.languages[0].language, 'Tiếng Anh'); assert.equal(cv.projects[0].name, 'Dự án');
  assert.equal(normalizeCV().experiences.length, 0);
  assert.equal(setPath(cv, 'personal.fullName', 'Bình').personal.fullName, 'Bình'); assert.equal(cv.personal.fullName, 'Ánh');
});
test('validates limits and treats HTML as text', async () => {
  assert.throws(() => validateCV({ summary: 'x'.repeat(16001) }));
  assert.throws(() => validateCV({ interests: Array(101).fill({}) }));
  assert.throws(() => validateCV(JSON.parse('{"__proto__":{}}')));
  const html = renderCV({ personal: { fullName: '<img src=x onerror=alert(1)>' } });
  assert.ok(html.includes('&lt;img')); assert.ok(!html.includes('<img src=x'));
  await assert.rejects(service.normalizePayload({ title: 'CV', cvData: {}, template: 'toString' }, 1));
  await assert.rejects(service.avatarPath('/api/candidate/cv/avatar/2/00000000-0000-0000-0000-000000000000.webp', 1));
  await assert.rejects(service.saveAvatar(Buffer.from('fake image'), 1));
});

test('all 12 template/font combinations render unclipped pages with selectable Vietnamese PDF text', { timeout: 120000 }, async () => {
  const browser = await chromium.launch();
  try {
    const css = await fs.readFile(path.join(root, 'shared/cv/document.css'), 'utf8');
    const fonts = Object.fromEntries(await Promise.all(fontFiles().map(async ({ file }) => [file, `data:font/woff2;base64,${(await fs.readFile(path.join(root, 'client/public/cv-fonts', file))).toString('base64')}`])));
    for (const template of Object.keys(TEMPLATES)) for (const font of Object.keys(FONTS)) {
      const cvData = normalizeCV({ ...fixture, design: { ...defaultDesign(template), font } }, template);
      const page = await browser.newPage();
      const errors = []; page.on('pageerror', error => errors.push(error.message));
      await page.setContent(renderCV(cvData, { template, css, fontCSS: fontStyles(file => fonts[file]) }));
      await page.waitForFunction(() => document.documentElement.dataset.ready === 'true');
      const metrics = await page.evaluate(() => ({ pages: document.querySelectorAll('.cv-page').length, overflow: [...document.querySelectorAll('.cv-page .cv-column')].map(el => ({ height: el.clientHeight, scroll: el.scrollHeight })).filter(v => v.scroll > v.height + 2), final: document.body.innerText.includes('Hoàn thành vượt mục tiêu.') }));
      assert.deepEqual(errors, [], `${template}/${font} script errors`);
      assert.deepEqual(metrics.overflow, [], `${template}/${font} overflow: ${JSON.stringify(metrics)}`);
      assert.ok(metrics.pages >= 2, `${template}/${font} should flow to multiple pages`); assert.ok(metrics.final);
      if (font === TEMPLATES[template].font) await page.screenshot({ path: path.join(out, `${template}.png`), fullPage: true });
      await page.close();
      const buffer = await service.createPDF({ title: 'CV kiểm thử', template, cvData }, 1);
      const parser = new PDFParse({ data: new Uint8Array(buffer) });
      const text = await parser.getText(); await parser.destroy();
      assert.equal(text.total, metrics.pages, `${template}/${font} PDF page count differs from layout`);
      assert.ok(text.text.includes('Nguyễn Minh Ánh'), `${template}/${font} Vietnamese name missing`);
      assert.ok(text.text.includes('Hoàn thành vượt mục tiêu.'), `${template}/${font} final text missing`);
      assert.ok(!text.text.includes('Tên công ty') && !text.text.includes('Thêm dòng'), 'export must hide editing hints');
      await fs.writeFile(path.join(out, `${template}-${font}.pdf`), buffer);
    }
  } finally { await browser.close(); }
});
test('splits a long description and preserves every word and fragment path', { timeout: 60000 }, async () => {
  const browser = await chromium.launch();
  try {
    const description = Array.from({ length: 650 }, (_, i) => `Nội dung ${i}.`).join(' ');
    const cvData = normalizeCV({ personal: { fullName: 'CV dài' }, experiences: [{ company: 'Công ty', role: 'Chuyên viên', description }] });
    const css = await fs.readFile(path.join(root, 'shared/cv/document.css'), 'utf8');
    const page = await browser.newPage();
    await page.setContent(renderCV(cvData, { template: 'minimal', editable: true, css }));
    await page.waitForFunction(() => document.documentElement.dataset.ready === 'true');
    const text = await page.locator('[data-path="experiences.0.description"]').allTextContents();
    assert.equal(text.join(''), description);
    assert.ok(text.length > 1);
    assert.equal(await page.locator('.cv-page .cv-section-heading + .cv-entry').count(), await page.locator('.cv-page .cv-section').count());
  } finally { await browser.close(); }
});
test('preview and export keep the same page and field positions, including empty fields', { timeout: 60000 }, async () => {
  const browser = await chromium.launch();
  try {
    const css = await fs.readFile(path.join(root, 'shared/cv/document.css'), 'utf8');
    for (const template of Object.keys(TEMPLATES)) {
      const cv = normalizeCV({ ...fixture, awards: [{ name: 'Giải thưởng' }], experiences: [{ company: 'Công ty', role: 'Chuyên viên' }], design: defaultDesign(template) }, template);
      const layouts = [];
      for (const editable of [true, false]) {
        const page = await browser.newPage();
        await page.setContent(renderCV(cv, { template, editable, css }));
        await page.waitForFunction(() => document.documentElement.dataset.ready === 'true');
        layouts.push(await page.evaluate(() => [...document.querySelectorAll('.cv-page')].map(page => [...page.querySelectorAll('[data-path]')].map(el => ({ path: el.dataset.path, y: Math.round(el.getBoundingClientRect().top - page.getBoundingClientRect().top), x: Math.round(el.getBoundingClientRect().left - page.getBoundingClientRect().left) })))));
        await page.close();
      }
      assert.deepEqual(layouts[0], layouts[1], `${template} preview differs from export`);
    }
  } finally { await browser.close(); }
});
after(async () => { await service.closeBrowser(); });
