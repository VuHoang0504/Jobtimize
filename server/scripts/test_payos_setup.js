const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createHmac } = require('crypto');
const { inspectConfig } = require('./check_payos');

test('setup distinguishes missing keys and rejects local webhook URLs', () => {
  const empty = inspectConfig({});
  assert.ok(Object.values(empty.credentials).every(value => !value));
  assert.equal(empty.webhookValid, false);
  const env = { PAYOS_CLIENT_ID: 'isolated-client', PAYOS_API_KEY: 'isolated-key', PAYOS_CHECKSUM_KEY: 'isolated-checksum', FRONTEND_URL: 'http://localhost:3000' };
  assert.equal(inspectConfig({ ...env, PAYOS_WEBHOOK_URL: 'https://localhost/api/payments/payos-webhook' }).webhookValid, false);
  assert.equal(inspectConfig({ ...env, PAYOS_WEBHOOK_URL: 'https://127.0.0.1/api/payments/payos-webhook' }).webhookValid, false);
  assert.equal(inspectConfig({ ...env, PAYOS_WEBHOOK_URL: 'https://your-domain.com/api/payments/payos-webhook' }).webhookValid, false);
  const valid = inspectConfig({ ...env, PAYOS_WEBHOOK_URL: 'https://backend.jobtimize-test.vn/api/payments/payos-webhook' });
  assert.ok(Object.values(valid.credentials).every(Boolean));
  assert.equal(valid.frontendValid, true);
  assert.equal(valid.webhookValid, true);
});

test('official SDK integration verifies signatures and rejects changed amounts', async t => {
  const keys = ['PAYOS_CLIENT_ID', 'PAYOS_API_KEY', 'PAYOS_CHECKSUM_KEY'];
  const old = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  Object.assign(process.env, { PAYOS_CLIENT_ID: 'isolated-client', PAYOS_API_KEY: 'isolated-api-key', PAYOS_CHECKSUM_KEY: 'isolated-checksum-key' });
  t.after(() => keys.forEach(key => {
    if (old[key] === undefined) delete process.env[key];
    else process.env[key] = old[key];
  }));
  const service = require('../src/services/payosService');
  assert.equal(service.isConfigured(), true);
  const data = { amount: 2000, code: '00', orderCode: 123456, reference: 'isolated-reference' };
  const signature = createHmac('sha256', process.env.PAYOS_CHECKSUM_KEY)
    .update('amount=2000&code=00&orderCode=123456&reference=isolated-reference').digest('hex');
  const webhook = { success: true, code: '00', data, signature };
  assert.deepEqual(await service.verifyWebhook(webhook), data);
  await assert.rejects(service.verifyWebhook({ ...webhook, data: { ...data, amount: 3000 } }));
  await assert.rejects(service.verifyWebhook({ ...webhook, signature: 'forged-signature' }));
  await assert.rejects(service.verifyWebhook({ ...webhook, success: false }));

  t.mock.method(service.payos.paymentRequests, 'create', async body => {
    assert.equal(body.amount, 2000);
    assert.equal(body.orderCode, 123456);
    return { orderCode: body.orderCode, amount: body.amount, checkoutUrl: 'https://pay.example.org/isolated', qrCode: 'data:image/png;base64,isolated', paymentLinkId: 'isolated-link', status: 'PENDING' };
  });
  const payment = await service.createPaymentLink({ orderCode: 123456, amount: 2000, description: 'TEST', returnUrl: 'http://localhost:3000/return', cancelUrl: 'http://localhost:3000/cancel' });
  assert.equal(payment.success, true);
  assert.equal(payment.paymentLinkId, 'isolated-link');
});
