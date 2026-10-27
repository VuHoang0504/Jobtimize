const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const service = require('../src/services/aiService');
const openai = require('../src/services/openaiService');
const { runChecks } = require('./check_ai');

const withEnv = (t, values) => {
  const original = Object.fromEntries(Object.keys(values).map(key => [key, process.env[key]]));
  Object.assign(process.env, values);
  t.after(() => Object.entries(original).forEach(([key, value]) => {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }));
};
const completed = value => ({ ok: true, json: async () => ({
  status: 'completed', output: [
    { type: 'reasoning', summary: [] },
    { type: 'message', content: [{ type: 'output_text', text: JSON.stringify(value) }] }
  ]
}) });

test('all generated features use server-side Responses API with text and image input', async t => {
  withEnv(t, { AI_PROVIDER: 'openai', OPENAI_API_KEY: 'isolated-openai-key', OPENAI_MODEL: 'test-model', OPENAI_TIMEOUT_MS: '1500' });
  let responseData;
  const requests = [];
  t.mock.method(global, 'fetch', async (url, options) => {
    requests.push({ url, ...options, body: JSON.parse(options.body) });
    return completed(responseData);
  });
  responseData = { description: 'Mô tả công việc', requirements: 'Yêu cầu ứng viên', benefits: 'Quyền lợi' };
  assert.deepEqual(await service.generateJD({ title: 'Kế toán' }), responseData);
  responseData = { fullName: 'Nguyễn Minh Anh', skills: { hardSkills: ['Excel'] } };
  assert.deepEqual(await service.parseCVWithAI('CV giả lập cho kiểm thử'), responseData);
  const folder = path.resolve('.cache/openai-tests');
  fs.mkdirSync(folder, { recursive: true });
  const imagePath = path.join(folder, 'synthetic-cv.png');
  const imageData = Buffer.from('synthetic-image-input');
  fs.writeFileSync(imagePath, imageData);
  try {
    assert.deepEqual(await service.parseCVFromImage(imagePath, 'image/png'), responseData);
  } finally {
    fs.unlinkSync(imagePath);
  }
  responseData = { jobTitle: 'Kế toán', questions: [{ id: 1, question: 'Bạn đối soát công nợ thế nào?', type: 'Technical', hint: 'Ví dụ thực tế' }] };
  assert.deepEqual(await service.generateInterviewQuestions({ jobTitle: 'Kế toán' }), responseData);
  responseData = { overallScore: 80, detailedFeedback: [], summary: 'Đạt yêu cầu' };
  assert.deepEqual(await service.evaluateInterview({ jobTitle: 'Kế toán', qaList: [] }), responseData);

  assert.equal(requests.length, 5);
  for (const request of requests) {
    assert.equal(request.url, 'https://api.openai.com/v1/responses');
    assert.equal(request.headers.Authorization, 'Bearer isolated-openai-key');
    assert.equal(request.body.model, 'test-model');
    assert.equal(request.body.store, false);
    assert.deepEqual(request.body.text, { format: { type: 'json_object' } });
    assert.equal(request.body.input[0].role, 'user');
    assert.ok(request.signal instanceof AbortSignal);
  }
  const image = requests[2].body.input[0].content.find(item => item.type === 'input_image');
  assert.equal(image.image_url, 'data:image/png;base64,' + imageData.toString('base64'));
});

test('automatic provider selection preserves existing configuration', t => {
  withEnv(t, { AI_PROVIDER: 'auto', OPENAI_API_KEY: '', GEMINI_API_KEY: 'existing-gemini-key' });
  assert.equal(openai.getProvider(), 'gemini');
  process.env.OPENAI_API_KEY = 'openai-key';
  assert.equal(openai.getProvider(), 'openai');
  process.env.AI_PROVIDER = 'gemini';
  assert.equal(openai.getProvider(), 'gemini');
  process.env.AI_PROVIDER = 'local';
  assert.equal(openai.getProvider(), 'local');
  process.env.AI_PROVIDER = 'invalid';
  assert.throws(openai.getProvider, { code: 'AI_CONFIG_ERROR' });
});

test('diagnostic reports both providers and continues after an OpenAI failure', async t => {
  withEnv(t, { AI_PROVIDER: 'openai', OPENAI_API_KEY: 'private-openai-test', GEMINI_API_KEY: 'private-gemini-test' });
  const messages = [];
  const calls = [];
  const result = await runChecks({ args: ['--live'], log: value => messages.push(value), checks: {
    openai: async () => { calls.push('openai'); throw Object.assign(new Error('private error'), { code: 'OPENAI_BILLING_REQUIRED' }); },
    gemini: async () => { calls.push('gemini'); }
  } });
  assert.equal(result, 1);
  assert.deepEqual(calls, ['openai', 'gemini']);
  assert.ok(messages.includes('Gemini key: configured'));
  assert.ok(messages.includes('Gemini live check: passed'));
  assert.doesNotMatch(messages.join('\n'), /private/);
  calls.length = 0;
  assert.equal(await runChecks({ args: ['--live', '--provider=gemini'], log: () => {}, checks: {
    openai: async () => { calls.push('openai'); }, gemini: async () => { calls.push('gemini'); }
  } }), 0);
  assert.deepEqual(calls, ['gemini']);
});

test('Gemini diagnostic uses a single request and masks provider errors', async t => {
  withEnv(t, { GEMINI_API_KEY: 'private-gemini-test', GEMINI_MODEL: 'test-gemini' });
  const { GoogleGenerativeAI } = require('@google/generative-ai');
  let calls = 0;
  t.mock.method(GoogleGenerativeAI.prototype, 'getGenerativeModel', options => {
    assert.equal(options.model, 'test-gemini');
    return { generateContent: async () => {
      calls++;
      throw Object.assign(new Error('private credential information'), { status: 429 });
    } };
  });
  await assert.rejects(service.checkGeminiConnection(), error => {
    assert.equal(error.code, 'GEMINI_RATE_LIMITED');
    assert.doesNotMatch(error.message, /private/);
    return true;
  });
  assert.equal(calls, 1);
});

test('missing key, throttling, timeout and malformed output never become fake success', async t => {
  withEnv(t, { AI_PROVIDER: 'openai', OPENAI_API_KEY: '' });
  let calls = 0;
  const mockedFetch = t.mock.method(global, 'fetch', async () => { calls++; return { ok: false, status: 429, json: async () => ({ error: { code: 'rate_limit_exceeded' } }) }; });
  await assert.rejects(service.generateJD({ title: 'Kế toán' }), { code: 'OPENAI_NOT_CONFIGURED' });
  assert.equal(calls, 0);
  process.env.OPENAI_API_KEY = 'isolated-key';
  await assert.rejects(service.parseCVWithAI('CV giả lập'), { code: 'OPENAI_RATE_LIMITED' });
  assert.equal(calls, 1);
  mockedFetch.mock.mockImplementation(async () => { throw Object.assign(new Error('Bearer isolated-key'), { name: 'TimeoutError' }); });
  await assert.rejects(service.generateInterviewQuestions({ jobTitle: 'Kế toán' }), error => {
    assert.equal(error.code, 'OPENAI_TIMEOUT');
    assert.doesNotMatch(error.message, /isolated-key|Bearer|OpenAI|Gemini/);
    return true;
  });
  mockedFetch.mock.mockImplementation(async () => completed({}));
  await assert.rejects(service.evaluateInterview({ jobTitle: 'Kế toán', qaList: [] }), { code: 'INVALID_GENERATED_CONTENT' });
  mockedFetch.mock.mockImplementation(async () => ({ ok: true, json: async () => ({ status: 'incomplete', output: [] }) }));
  await assert.rejects(service.generateJD({ title: 'Kế toán' }), { code: 'OPENAI_INCOMPLETE' });
  mockedFetch.mock.mockImplementation(async () => ({ ok: true, json: async () => ({ status: 'completed', output: [{ type: 'message', content: [{ type: 'refusal' }] }] }) }));
  await assert.rejects(service.generateJD({ title: 'Kế toán' }), { code: 'OPENAI_REFUSED' });
  mockedFetch.mock.mockImplementation(async () => ({ ok: true, json: async () => ({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: 'not json' }] }] }) }));
  await assert.rejects(service.generateJD({ title: 'Kế toán' }), { code: 'OPENAI_INVALID_RESPONSE' });
});

test('distinguish billing, spend limits, authentication and actual throttling', async t => {
  withEnv(t, { AI_PROVIDER: 'openai', OPENAI_API_KEY: 'isolated-key' });
  let failure;
  t.mock.method(global, 'fetch', async () => ({ ok: false, status: failure.status, json: async () => ({ error: { code: failure.code, message: 'private provider details' } }) }));
  for (const [status, code, expected] of [
    [429, 'insufficient_quota', 'OPENAI_BILLING_REQUIRED'],
    [429, 'credit_balance_exhausted', 'OPENAI_BILLING_REQUIRED'],
    [429, 'project_spend_limit_exceeded', 'OPENAI_SPEND_LIMIT'],
    [429, 'rate_limit_exceeded', 'OPENAI_RATE_LIMITED'],
    [401, 'invalid_api_key', 'OPENAI_INVALID_KEY'],
    [403, 'permission_denied', 'OPENAI_ACCESS_DENIED']
  ]) {
    failure = { status, code };
    await assert.rejects(openai.generateJSON('Return JSON'), error => {
      assert.equal(error.code, expected);
      assert.doesNotMatch(error.message, /private provider details|isolated-key/);
      return true;
    });
  }
});
