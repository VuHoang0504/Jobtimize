const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

function inspectConfig(env = process.env) {
  const credentials = Object.fromEntries(['PAYOS_CLIENT_ID', 'PAYOS_API_KEY', 'PAYOS_CHECKSUM_KEY'].map(key => [
    key, Boolean(env[key]?.trim()) && !/^(your[_-]|changeme|replace[_-])/i.test(env[key].trim())
  ]));
  let frontendValid = false;
  let webhookValid = false;
  try {
    const url = new URL(env.FRONTEND_URL || '');
    frontendValid = ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password;
  } catch {}
  try {
    const url = new URL(env.PAYOS_WEBHOOK_URL || '');
    const local = /^(localhost|127\.|0\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|\[::1\]$)/i.test(url.hostname);
    const placeholder = /(^your[-.]|(^|\.)example\.(com|net|org)$)/i.test(url.hostname);
    webhookValid = url.protocol === 'https:' && !local && !placeholder && !url.username && !url.password &&
      url.pathname === '/api/payments/payos-webhook' && !url.search && !url.hash;
  } catch {}
  return { credentials, frontendValid, webhookValid };
}

async function main() {
  const { PayOS } = require('@payos/node');
  console.log('PayOS SDK: installed');
  const result = inspectConfig();
  for (const [key, present] of Object.entries(result.credentials)) console.log(`${key}: ${present ? 'configured' : 'missing'}`);
  console.log('FRONTEND_URL:', result.frontendValid ? 'valid' : 'missing/invalid');
  console.log('PAYOS_WEBHOOK_URL:', result.webhookValid ? 'valid HTTPS endpoint' : 'missing/invalid (needs public HTTPS)');
  if (Object.values(result.credentials).every(Boolean)) {
    new PayOS({ clientId: process.env.PAYOS_CLIENT_ID.trim(), apiKey: process.env.PAYOS_API_KEY.trim(), checksumKey: process.env.PAYOS_CHECKSUM_KEY.trim() });
    console.log('PayOS client: initialized (credentials not yet verified online)');
  }
  if (process.argv.includes('--db')) {
    const { sql, config } = require('../src/config/db');
    const pool = await new sql.ConnectionPool({ ...config, connectionTimeout: 5000 }).connect();
    try {
      const schema = await pool.request().query(`
        SELECT COL_LENGTH('PaymentTransactions','OrderCode') orderCode,
          COL_LENGTH('PaymentTransactions','PaymentLinkId') paymentLink,
          COL_LENGTH('PaymentTransactions','CheckoutUrl') checkout,
          COL_LENGTH('PaymentTransactions','QrCode') qr,
          COL_LENGTH('EmployerSubscriptions','TransactionCode') subscriptionTransaction;
        SELECT COUNT(*) paidPackages FROM SubscriptionPackages WHERE Price > 0;
      `);
      const ready = Object.values(schema.recordsets[0][0]).every(value => value !== null);
      console.log('Payment database schema:', ready ? 'ready' : 'incomplete');
      console.log('Paid packages:', schema.recordsets[1][0].paidPackages);
      if (!ready) process.exitCode = 1;
    } finally {
      await pool.close();
    }
  }
  if (process.argv.includes('--local')) {
    const response = await fetch(`http://127.0.0.1:${Number(process.env.PORT) || 5000}/api/payments/payos-webhook`, { signal: AbortSignal.timeout(5000) });
    console.log('Local webhook route:', response.status === 200 ? 'ready' : `HTTP ${response.status}`);
    if (!response.ok) process.exitCode = 1;
  }
  console.log('No payment order created; no funds moved.');
  if (!Object.values(result.credentials).every(Boolean) || !result.frontendValid || !result.webhookValid) process.exitCode = 1;
}

if (require.main === module) main().catch(() => {
  console.error('PayOS setup check failed. Check SDK, database and local backend configuration.');
  process.exitCode = 1;
});
module.exports = { inspectConfig };
