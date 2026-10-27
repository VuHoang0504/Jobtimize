import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.resolve('.cache/ms-playwright');
const { chromium } = require('playwright');
const baseURL = process.env.POST_JOB_TEST_URL || 'http://127.0.0.1:3000';

test('post job: validation, suggestions, skills, preview, error recovery and mobile submission', { timeout: 60000 }, async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1050 } });
    await page.addInitScript(() => localStorage.setItem('jobtimize_token', 'isolated-employer-test'));
    let posted;
    let generation;
    let rejectPost = true;
    let failMetadata = false;
    let rejectGeneration = false;
    const pageErrors = [];
    page.on('pageerror', error => pageErrors.push(error.message));
    await page.route('**/api/**', async route => {
      const url = new URL(route.request().url()).pathname;
      let data = [];
      if (url === '/api/auth/me') data = { userId: 12, role: 'Employer', fullName: 'Nhà tuyển dụng thử nghiệm' };
      if (url.startsWith('/api/metadata/') && failMetadata) return route.fulfill({ status: 503, json: { success: false } });
      if (url === '/api/metadata/categories') data = [{ CategoryID: 35, CategoryName: 'Marketing / Truyền thông' }, { CategoryID: 12, CategoryName: 'Phần mềm' }];
      if (url === '/api/metadata/skills') data = [{ SkillID: 1, SkillName: 'SEO', NormalizedName: 'seo', CategoryID: 35 }, { SkillID: 2, SkillName: 'React.js', NormalizedName: 'react', CategoryID: 12 }];
      if (url === '/api/ai/generate-jd') {
        generation = route.request().postDataJSON();
        if (rejectGeneration) return route.fulfill({ status: 503, json: { success: false, message: 'Gemini AI failed' } });
        data = { description: 'Nội dung gợi ý\nQuyền lợi và nhiệm vụ.', requirements: 'Yêu cầu chuyên môn phù hợp.', benefits: 'Bảo hiểm và nghỉ phép.', suggestedSalaryRange: '20 - 30 triệu VNĐ', suggestedSkills: ['SEO', 'React'] };
      }
      if (url === '/api/employer/jobs') {
        posted = route.request().postDataJSON();
        if (rejectPost) return route.fulfill({ status: 503, json: { success: false } });
        data = { JobID: 123, Status: 'PendingApproval' };
      }
      await route.fulfill({ json: { success: true, data } });
    });
    await page.goto(baseURL + '/employer/post-job');
    await page.getByRole('heading', { name: 'Đăng tin tuyển dụng', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Gửi tin tuyển dụng', exact: true }).click();
    assert.equal(posted, undefined);
    await page.getByText('Gợi ý nội dung', { exact: true }).click();
    await page.getByRole('button', { name: 'Tạo gợi ý', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: 'Nhập tên vị trí' }).waitFor();
    assert.equal(generation, undefined);
    assert.equal(await page.locator('#job-level').inputValue(), 'Middle (2 - 4 năm)');

    await page.getByLabel('Tên vị trí tuyển dụng').fill('Chuyên viên Marketing');
    await page.locator('#job-category').selectOption('35');
    await page.getByLabel('Địa điểm làm việc', { exact: false }).fill('Hà Nội');
    await page.getByLabel('Mức lương', { exact: true }).fill('18 - 25 triệu VNĐ');
    await page.getByLabel('Mô tả công việc và quyền lợi').fill('Nội dung tự viết cần được giữ lại.');
    await page.getByLabel('Yêu cầu ứng viên', { exact: false }).fill('Yêu cầu tự viết.');
    await page.getByRole('button', { name: 'SEO', exact: true }).click();
    await page.getByLabel('Mức độ yêu cầu cho SEO').selectOption('preferred');
    assert.equal(await page.getByRole('button', { name: 'React.js', exact: true }).count(), 0);
    await page.getByLabel('Hiển thị kỹ năng của tất cả ngành nghề').check();
    await page.getByLabel('Tìm kỹ năng', { exact: true }).fill('react');
    assert.equal(await page.getByRole('button', { name: 'React.js', exact: true }).count(), 1);
    await page.getByLabel('Tìm kỹ năng', { exact: true }).fill('');

    rejectGeneration = true;
    await page.getByRole('button', { name: 'Tạo gợi ý', exact: true }).click();
    await page.getByText('Chưa tạo được gợi ý nội dung.', { exact: false }).waitFor();
    assert.equal(await page.locator('#job-description').inputValue(), 'Nội dung tự viết cần được giữ lại.');
    assert.doesNotMatch(await page.locator('body').innerText(), /Gemini|\bAI\b/);
    rejectGeneration = false;
    await page.getByRole('button', { name: 'Tạo gợi ý', exact: true }).click();
    await page.getByRole('heading', { name: 'Xem lại bản gợi ý', exact: true }).waitFor();
    assert.equal(await page.locator('#job-description').inputValue(), 'Nội dung tự viết cần được giữ lại.');
    assert.equal(generation.level, 'Middle (2 - 4 năm)');
    assert.equal(generation.categoryName, 'Marketing / Truyền thông');
    await page.getByRole('button', { name: 'Áp dụng nội dung', exact: true }).click();
    assert.equal(await page.locator('#job-description').inputValue(), 'Nội dung gợi ý\nQuyền lợi và nhiệm vụ.\n\nQuyền lợi\nBảo hiểm và nghỉ phép.');
    assert.equal(await page.locator('#job-salary').inputValue(), '18 - 25 triệu VNĐ');
    assert.equal(await page.getByLabel('Mức độ yêu cầu cho SEO').inputValue(), 'preferred');
    assert.equal(await page.getByLabel('Mức độ yêu cầu cho React.js').inputValue(), 'required');
    await page.getByRole('button', { name: 'Bỏ kỹ năng React.js', exact: true }).click();
    await page.getByRole('button', { name: 'Xem trước tin', exact: true }).first().click();
    const dialog = page.getByRole('dialog');
    await dialog.waitFor();
    assert.match(await dialog.innerText(), /Chuyên viên Marketing/);
    assert.match(await dialog.innerText(), /SEO · Ưu tiên/);
    await page.keyboard.press('Escape');
    assert.equal(await dialog.isVisible(), false);

    await page.locator('details').evaluate(element => element.open = false);
    await page.evaluate(() => window.scrollTo(0, 0));
    await fs.mkdir('.cache/post-job-tests', { recursive: true });
    await page.screenshot({ path: '.cache/post-job-tests/desktop.png', fullPage: true });
    await page.getByRole('button', { name: 'Gửi tin tuyển dụng', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: 'Chưa gửi được tin tuyển dụng' }).waitFor();
    assert.equal(await page.locator('#job-description').inputValue(), 'Nội dung gợi ý\nQuyền lợi và nhiệm vụ.\n\nQuyền lợi\nBảo hiểm và nghỉ phép.');
    assert.deepEqual(posted.skills, [{ skillId: 1, isMandatory: false }]);

    await page.setViewportSize({ width: 390, height: 844 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: '.cache/post-job-tests/mobile.png', fullPage: true });
    await page.getByRole('button', { name: 'Xem trước tin', exact: true }).last().click();
    await dialog.waitFor();
    assert.ok(await dialog.evaluate(element => element.getBoundingClientRect().width <= window.innerWidth));
    await page.getByRole('button', { name: 'Đóng bản xem trước', exact: true }).click();
    rejectPost = false;
    await page.getByRole('button', { name: 'Gửi tin tuyển dụng', exact: true }).click();
    await page.getByRole('heading', { name: 'Tin tuyển dụng đã được gửi duyệt', exact: true }).waitFor();
    assert.equal(posted.title, 'Chuyên viên Marketing');
    assert.equal(posted.categoryId, '35');
    assert.equal(posted.location, 'Hà Nội');

    failMetadata = true;
    await page.goto(baseURL + '/employer/post-job');
    await page.getByRole('alert').filter({ hasText: 'Không tải được danh mục' }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Gửi tin tuyển dụng', exact: true }).isDisabled(), true);
    await page.locator('#job-title').fill('Giữ tên vị trí khi tải lại danh mục');
    failMetadata = false;
    await page.getByRole('button', { name: 'Thử lại', exact: true }).click();
    await page.waitForFunction(() => !document.getElementById('job-category').disabled);
    assert.equal(await page.locator('#job-title').inputValue(), 'Giữ tên vị trí khi tải lại danh mục');
    assert.deepEqual(pageErrors, []);
  } finally {
    await browser.close();
  }
});
