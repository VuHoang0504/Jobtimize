import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.resolve('.cache/ms-playwright');
const { chromium } = require('playwright');
const service = require('../src/services/cvDocumentService');
const sharp = require('sharp');
const out = path.resolve('.cache/cv-tests');
await fs.mkdir(out, { recursive: true });

test('direct editing, IME, design, history, persistence, PDF and mobile drawer', { timeout: 120000 }, async () => {
  const browser = await chromium.launch();
  let saved;
  let failSave = false;
  let failExport = false;
  let avatarURL;
  let avatarPath;
  const avatar = await sharp({ create: { width: 300, height: 400, channels: 3, background: '#4e779f' } }).png().toBuffer();
  const errors = [];
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1050 }, acceptDownloads: true });
    await context.addInitScript(() => localStorage.setItem('jobtimize_token', 'isolated-test-token'));
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/api/**', async route => {
      const url = new URL(route.request().url()).pathname;
      let data;
      if (url === '/api/auth/me') data = { success: true, data: { userId: 1, fullName: 'Nguyễn Minh Ánh', email: 'candidate@example.org', role: 'Candidate' } };
      else if (url === '/api/candidate/profile') data = { success: true, data: { FullName: 'Nguyễn Minh Ánh', Email: 'candidate@example.org', Headline: 'Chuyên viên kinh doanh' } };
      else if (url === '/api/candidate/cv/online' || url === '/api/candidate/cv/online/900') {
        if (failSave) { await route.fulfill({ status: 503, json: { success: false, message: 'Lỗi lưu thử nghiệm' } }); return; }
        saved = route.request().postDataJSON(); data = { success: true, data: { CVID: 900 } };
      }
      else if (url === '/api/candidate/cv/900') data = { success: true, data: { CVID: 900, Title: saved.title, Template: saved.template, CvData: saved.cvData, IsPrimary: saved.isPrimary } };
      else if (url === '/api/candidate/cv/avatar') {
        assert.ok(route.request().postDataBuffer().includes(Buffer.from('cv-avatar.webp')));
        avatarURL = await service.saveAvatar(avatar, 1); avatarPath = await service.avatarPath(avatarURL, 1);
        data = { success: true, data: { url: avatarURL } };
      } else if (url.startsWith('/api/candidate/cv/avatar/')) { await route.fulfill({ status: 200, body: avatar, contentType: 'image/png' }); return; }
      else if (url === '/api/candidate/cv/export') {
        if (failExport) { await route.fulfill({ status: 503, json: { success: false, message: 'Lỗi PDF thử nghiệm' } }); return; }
        const payload = route.request().postDataJSON();
        const pdf = await service.createPDF(payload, 1);
        await route.fulfill({ status: 200, body: pdf, contentType: 'application/pdf' }); return;
      } else data = { success: true, data: [] };
      await route.fulfill({ status: 200, json: data });
    });
    await page.goto('http://127.0.0.1:3000/candidate/cv-builder');
    const frame = page.frameLocator('iframe[title^="CV"]');
    await frame.locator('html[data-ready="true"]').waitFor();
    const field = key => frame.locator(`[data-path="${key}"]`).first();
    await field('personal.fullName').fill('Trần Hoàng Ánh');
    await field('experiences.0.company').fill('Công ty phát triển Việt Nam');
    await field('experiences.0.description').fill('- Phát triển sản phẩm.\n- Làm việc nhóm.');
    await field('personal.headline').evaluate(el => {
      el.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
      el.textContent = 'Kỹ sư phần mềm';
      el.dispatchEvent(new InputEvent('input', { bubbles: true, isComposing: true }));
      el.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true }));
    });
    await page.getByLabel('Phông chữ', { exact: true }).selectOption('roboto');
    await field('personal.headline').getByText('Kỹ sư phần mềm').count();
    await page.getByRole('button', { name: 'Thêm Danh hiệu và giải thưởng', exact: true }).click();
    await field('awards.0.name').fill('Giải thưởng sáng tạo');
    await page.getByRole('button', { name: 'Lưu CV', exact: true }).click();
    await page.getByRole('status').filter({ hasText: 'Đã lưu CV.' }).waitFor();
    assert.equal(saved.cvData.personal.fullName, 'Trần Hoàng Ánh');
    assert.equal(saved.cvData.personal.headline, 'Kỹ sư phần mềm');
    assert.equal(saved.cvData.experiences[0].company, 'Công ty phát triển Việt Nam');
    assert.equal(saved.cvData.awards[0].name, 'Giải thưởng sáng tạo');
    assert.equal(saved.cvData.design.font, 'roboto');
    await page.getByRole('button', { name: 'Ấn tượng', exact: true }).click();
    await frame.locator('body[data-template="modern"]').waitFor();
    await page.getByRole('button', { name: 'Hoàn tác', exact: true }).click();
    await frame.locator('body[data-template="minimal"]').waitFor();
    await page.getByRole('button', { name: 'Làm lại', exact: true }).click();
    await frame.locator('body[data-template="modern"]').waitFor();
    await page.getByRole('button', { name: 'Lưu CV', exact: true }).click();
    await page.getByText('Đã lưu CV.', { exact: true }).waitFor();
    await page.reload();
    await frame.locator('html[data-ready="true"]').waitFor();
    assert.equal(await field('personal.fullName').textContent(), 'Trần Hoàng Ánh');
    assert.equal(await field('awards.0.name').textContent(), 'Giải thưởng sáng tạo');
    await page.locator('input[type="file"]').setInputFiles({ name: 'avatar.png', mimeType: 'image/png', buffer: avatar });
    await page.getByRole('dialog', { name: 'Căn chỉnh ảnh CV' }).waitFor();
    await page.getByLabel('Phóng to', { exact: true }).fill('1.5');
    await page.getByRole('button', { name: 'Sử dụng ảnh', exact: true }).click();
    await frame.locator('.cv-avatar').waitFor();
    await page.getByRole('button', { name: 'Lưu CV', exact: true }).click();
    await page.getByText('Đã lưu CV.', { exact: true }).waitFor();
    assert.equal(saved.cvData.avatar, avatarURL);
    await page.reload();
    await frame.locator('.cv-avatar').waitFor();
    assert.ok((await frame.locator('.cv-avatar').getAttribute('src')).startsWith('data:image/'));
    await field('personal.phone').fill('0900123456');
    page.once('dialog', dialog => dialog.dismiss());
    await page.getByRole('link', { name: 'Quay lại hồ sơ', exact: true }).click();
    assert.ok(page.url().includes('/cv-builder'));
    failSave = true;
    await page.getByRole('button', { name: 'Lưu CV', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: 'Lỗi lưu thử nghiệm' }).waitFor();
    assert.equal(await field('personal.phone').textContent(), '0900123456');
    failSave = false;
    await page.getByRole('button', { name: 'Lưu CV', exact: true }).click();
    await page.getByText('Đã lưu CV.', { exact: true }).waitFor();
    failExport = true;
    await page.getByRole('button', { name: 'Tải về', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: 'Lỗi PDF thử nghiệm' }).waitFor();
    failExport = false;
    const downloading = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Tải về', exact: true }).click();
    const download = await downloading;
    assert.ok(download.suggestedFilename().endsWith('.pdf'));
    await download.saveAs(path.join(out, 'editor-download.pdf'));
    await page.screenshot({ path: path.join(out, 'editor-desktop.png'), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole('button', { name: 'Tinh chỉnh', exact: true }).click();
    await page.getByRole('dialog', { name: 'Tinh chỉnh CV' }).waitFor();
    await page.screenshot({ path: path.join(out, 'editor-mobile-drawer.png'), fullPage: true });
    await page.getByRole('button', { name: 'Đóng tinh chỉnh', exact: true }).click();
    await page.getByRole('button', { name: 'Thay đổi độ phóng to CV', exact: true }).click();
    assert.equal(await page.getByRole('button', { name: 'Thay đổi độ phóng to CV', exact: true }).getAttribute('aria-pressed'), 'true');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
    assert.deepEqual(errors, []);
  } finally { await browser.close(); if (avatarPath) await fs.unlink(avatarPath); }
});
after(async () => service.closeBrowser());
