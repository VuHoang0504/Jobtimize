import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.resolve('.cache/ms-playwright');
const { chromium } = require('playwright');
const browseGroups = require('../../shared/jobBrowseGroups.json');
const baseURL = process.env.JOB_CATEGORY_TEST_URL || 'http://127.0.0.1:3000';

// Run against Vite with isolated API fixtures; no database writes or login required.
test('browse jobs by category on desktop and mobile', { timeout: 60000 }, async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const categories = [
      { CategoryID: 12, CategoryName: 'Công nghệ thông tin / Phần mềm' },
      { CategoryID: 35, CategoryName: 'Marketing / Truyền thông' },
      { CategoryID: 91, CategoryName: 'Kế toán / Kiểm toán' }
    ];
    const jobs = [
      { JobID: 1, CategoryID: 12, Title: 'React Frontend Developer', CompanyName: 'Test Company', Location: 'Hà Nội' },
      { JobID: 2, CategoryID: 12, Title: 'Backend Engineer', CompanyName: 'Test Company', Location: 'Đà Nẵng' },
      { JobID: 3, CategoryID: 35, Title: 'Content Creator', CompanyName: 'Test Company', Location: 'Hà Nội' }
    ];
    let lastQuery;
    let failJobs = false;
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/api/**', async route => {
      const url = new URL(route.request().url());
      if (url.pathname === '/api/metadata/categories') {
        return route.fulfill({ json: { success: true, data: categories } });
      }
      if (url.pathname === '/api/jobs') {
        lastQuery = url.searchParams;
        if (failJobs) return route.fulfill({ status: 503, json: { success: false } });
        const group = [...browseGroups.positions, ...browseGroups.industries].find(item => item.id === lastQuery.get('group'));
        const data = jobs.filter(job =>
          (!group || group.categories?.includes(categories.find(category => category.CategoryID === job.CategoryID)?.CategoryName) || (group.level === 'senior' && job.Title.includes('Senior'))) &&
          (!lastQuery.has('categoryId') || String(job.CategoryID) === lastQuery.get('categoryId')) &&
          (!lastQuery.has('keyword') || job.Title.includes(lastQuery.get('keyword'))) &&
          (!lastQuery.has('location') || job.Location.includes(lastQuery.get('location')))
        );
        return route.fulfill({ json: { success: true, data } });
      }
      return route.fulfill({ json: { success: true, data: [] } });
    });

    await fs.mkdir('.cache/job-category-tests', { recursive: true });
    await page.goto(baseURL);
    await page.getByRole('button', { name: 'Việc làm', exact: true }).click();
    assert.equal(await page.locator('a[href^="/?group="]').count(), 19);
    await page.getByRole('link', { name: 'Việc làm Nhân viên kinh doanh', exact: true }).hover();
    await page.screenshot({ path: '.cache/job-category-tests/desktop-menu.png' });
    await page.getByRole('link', { name: 'Việc làm IT', exact: true }).click();
    await page.waitForURL('**/?group=it');
    await page.waitForFunction(() => document.querySelectorAll('article').length === 2);
    await page.getByRole('heading', { name: jobs[1].Title, exact: true }).waitFor();
    assert.equal(lastQuery.get('group'), 'it');
    assert.equal(lastQuery.has('categoryId'), false);
    assert.equal(lastQuery.has('keyword'), false);
    assert.equal(await page.locator('article').count(), 2);
    assert.equal(await page.locator('#search-keyword').inputValue(), '');

    await page.locator('#search-keyword').fill('React');
    await page.locator('#search-location').fill('Hà Nội');
    await page.locator('form').evaluate(form => form.requestSubmit());
    await page.waitForURL('**/*keyword=React*');
    await page.waitForFunction(() => document.querySelectorAll('article').length === 1);
    assert.equal(lastQuery.get('group'), 'it');
    assert.equal(lastQuery.has('categoryId'), false);
    assert.equal(lastQuery.get('location'), 'Hà Nội');
    await page.reload();
    await page.getByRole('heading', { name: jobs[0].Title, exact: true }).waitFor();
    assert.equal(await page.locator('#job-category').inputValue(), 'group:it');

    await page.getByRole('button', { name: 'Bỏ lọc nghề' }).click();
    await page.waitForURL(url => !url.searchParams.has('group'));
    assert.equal(new URL(page.url()).searchParams.get('keyword'), 'React');
    await page.goBack();
    await page.getByRole('button', { name: 'Bỏ lọc nghề' }).waitFor();
    assert.equal(await page.locator('#job-category').inputValue(), 'group:it');

    await page.getByRole('button', { name: 'Đặt lại', exact: true }).click();
    await page.getByRole('heading', { name: jobs[2].Title, exact: true }).waitFor();
    await page.locator('#job-category').selectOption('35');
    await page.getByRole('heading', { name: jobs[2].Title, exact: true }).waitFor();
    await page.waitForFunction(() => document.querySelectorAll('article').length === 1);
    assert.equal(lastQuery.get('categoryId'), '35');

    await page.locator('#job-category').selectOption('91');
    await page.getByText('Không tìm thấy công việc phù hợp', { exact: true }).waitFor();
    assert.equal(await page.locator('article').count(), 0);
    failJobs = true;
    await page.reload();
    await page.getByRole('alert').filter({ hasText: 'Không tải được danh sách việc làm' }).waitFor();
    assert.equal(await page.locator('article').count(), 0);
    failJobs = false;

    await page.goto(baseURL);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('nav').getByRole('button').last().click();
    await page.getByRole('button', { name: 'Việc làm & Danh mục', exact: true }).click();
    await page.getByRole('link', { name: 'Việc làm Marketing', exact: true }).click();
    await page.getByRole('heading', { name: jobs[2].Title, exact: true }).waitFor();
    assert.equal(lastQuery.get('group'), 'marketing');
    assert.equal(lastQuery.has('keyword'), false);
    assert.equal(await page.getByRole('link', { name: 'Việc làm Marketing', exact: true }).count(), 0);
    assert.deepEqual(errors, []);
    await fs.mkdir('.cache/job-category-tests', { recursive: true });
    await page.screenshot({ path: '.cache/job-category-tests/mobile.png', fullPage: true });
  } finally {
    await browser.close();
  }
});
