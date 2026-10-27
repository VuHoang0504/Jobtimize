const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const db = require('../src/config/db');
const groups = require('../../shared/jobBrowseGroups.json');
const fs = require('fs');
const path = require('path');

// Read-only integration checks. Requires an initialized database and seed:browse.
// Direct connection avoids unrelated startup migrations in getPool().
const poolPromise = new db.sql.ConnectionPool(db.config).connect();
db.executeQuery = async (query, params = {}) => {
  const request = (await poolPromise).request();
  for (const [key, value] of Object.entries(params)) request.input(key, value);
  return request.query(query);
};
const { getJobs } = require('../src/controllers/jobController');
after(async () => (await poolPromise).close());

async function get(query) {
  const response = {
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }
  };
  await getJobs({ query }, response);
  return response;
}

test('every reference menu group has published jobs in its taxonomy', async () => {
  for (const group of [...groups.positions, ...groups.industries]) {
    const response = await get({ group: group.id });
    assert.equal(response.statusCode, 200, group.id);
    assert.equal(response.body.success, true, group.id);
    assert.ok(response.body.data.length >= 1, `No jobs for ${group.id}`);
    for (const job of response.body.data) {
      if (group.categories) assert.ok(group.categories.includes(job.CategoryName), `${group.id}: ${job.Title}`);
      else assert.match(job.Title, /senior|cao cấp/i);
    }
  }
});

test('group filtering finds titles without the menu wording and combines keyword/location', async () => {
  const marketing = await get({ group: 'marketing' });
  assert.ok(marketing.body.data.some(job => job.Title.includes('Content Creator')));
  const combined = await get({ group: 'marketing', keyword: 'Content Creator', location: 'Hà Nội' });
  assert.ok(combined.body.data.length >= 1);
  assert.ok(combined.body.data.every(job => job.CategoryName === 'Marketing / Truyền thông' && job.Location.includes('Hà Nội')));
  const empty = await get({ group: 'marketing', keyword: 'nonexistent-job-847931' });
  assert.deepEqual(empty.body.data, []);
  const invalid = await get({ group: "unknown' OR 1=1--" });
  assert.equal(invalid.statusCode, 400);
});

test('demo listings have distinct persisted company logos with local assets', async () => {
  const result = await db.executeQuery(`
    SELECT jp.JobID, e.CompanyLogoUrl
    FROM JobPostings jp
    JOIN Employers e ON jp.EmployerID = e.EmployerID
    JOIN Users u ON e.UserID = u.UserID
    WHERE u.Email LIKE 'browse-demo-%@jobtimize.example.invalid'
      AND jp.Description LIKE N'[[]Tin tuyển dụng mẫu phục vụ trải nghiệm Jobtimize]%'
  `);
  const fixtures = require('./data/browseJobs');
  assert.equal(result.recordset.length, fixtures.length);
  assert.equal(new Set(result.recordset.map(job => job.CompanyLogoUrl)).size, fixtures.length);
  for (const job of result.recordset) {
    assert.match(job.CompanyLogoUrl, /^\/logos\/demo\/[a-z-]+\.svg$/);
    assert.ok(fs.existsSync(path.resolve(__dirname, '../../client/public' + job.CompanyLogoUrl)));
  }
});
