const { test } = require('node:test');
const assert = require('node:assert/strict');

// Force the local fallback; never contact a provider or a database.
require.cache[require.resolve('@google/generative-ai')] = {
  exports: {
    GoogleGenerativeAI: class {
      getGenerativeModel() { throw new Error('Provider unavailable in isolated test'); }
    }
  }
};
require.cache[require.resolve('../src/config/db')] = { exports: { executeQuery: async () => ({ recordset: [] }) } };
const service = require('../src/services/aiService');
const controller = require('../src/controllers/aiController');

test('content fallback respects nontechnical roles without adding software skills', async t => {
  const previousProvider = process.env.AI_PROVIDER;
  process.env.AI_PROVIDER = 'local';
  t.after(() => {
    if (previousProvider === undefined) delete process.env.AI_PROVIDER;
    else process.env.AI_PROVIDER = previousProvider;
  });
  t.mock.method(console, 'warn', () => {});
  const result = await service.generateJD({ title: 'Kế toán tổng hợp', categoryName: 'Kế toán / Kiểm toán', level: 'Junior', skills: '' }, 'isolated-test-key');
  assert.match(result.description, /Kế toán/);
  assert.match(result.requirements, /Junior/);
  assert.doesNotMatch(result.description + result.requirements, /JavaScript|React|Agile|mã nguồn|Gemini|\bAI\b/);
  assert.deepEqual(result.suggestedSkills, []);
  assert.ok(result.benefits);
  const withSkills = await service.generateJD({ title: 'Chuyên viên Marketing', categoryName: 'Marketing', skills: 'SEO, Excel' }, 'isolated-test-key');
  assert.deepEqual(withSkills.suggestedSkills, ['SEO', 'Excel']);
});

test('content errors use a functional message without provider branding', async t => {
  t.mock.method(console, 'error', () => {});
  t.mock.method(service, 'generateJD', async () => { throw new Error('Gemini AI provider model failed'); });
  const response = {
    statusCode: 200,
    status(value) { this.statusCode = value; return this; },
    json(value) { this.body = value; return this; }
  };
  await controller.generateJD({ body: { title: 'Kế toán' } }, response);
  assert.equal(response.statusCode, 500);
  assert.doesNotMatch(response.body.message, /Gemini|\bAI\b|provider/i);
  assert.match(response.body.message, /thử lại/);
});
