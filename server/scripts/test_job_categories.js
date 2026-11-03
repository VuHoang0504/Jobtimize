const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { executeQuery, getPool } = require('../src/config/db');
const { applyCategories } = require('../src/services/databaseSchema');
const groups = require('../../shared/jobBrowseGroups.json');
const { getCategories } = require('../src/controllers/categoryController');

// Requires a local initialized database. Adds missing reference categories only.
// Existing categories and job references are never removed or updated.
after(async () => (await getPool()).close());

test('posting metadata covers every browse category and migration preserves existing IDs', async () => {
  const expected = [...new Set([...groups.positions, ...groups.industries].flatMap(group => group.categories || []))];
  const select = () => executeQuery('SELECT CategoryID, CategoryName, Description FROM JobCategories ORDER BY CategoryID');
  const before = (await select()).recordset;
  await applyCategories(executeQuery);
  const first = (await select()).recordset;
  await applyCategories(executeQuery);
  assert.deepEqual((await select()).recordset, first);
  for (const row of before) assert.deepEqual(first.find(item => item.CategoryID === row.CategoryID), row);
  const res = {
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }
  };
  await getCategories({}, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
  for (const name of expected) {
    const rows = res.body.data.filter(row => row.CategoryName === name);
    assert.equal(rows.length, 1, name);
    assert.ok(Number.isInteger(rows[0].CategoryID) && rows[0].CategoryID > 0, name);
  }
});
