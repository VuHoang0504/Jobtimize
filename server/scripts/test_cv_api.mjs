import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
process.env.JWT_SECRET = 'cv-isolated-test-secret';
const express = require('express');
const jwt = require('jsonwebtoken');
const sharp = require('sharp');
let writes = 0;
require.cache[require.resolve('../src/config/db')] = { exports: {
  executeQuery: async (query, params) => {
    if (/SELECT u.UserID/.test(query)) return { recordset: [{ UserID: params.UserID, RoleName: params.UserID === 3 ? 'Employer' : 'Candidate', Status: 'Active' }] };
    if (/IF COL_LENGTH/.test(query)) return { recordset: [] }; // Simulate already-present columns.
    if (/SELECT ProfileID FROM CandidateProfiles/.test(query)) return { recordset: [{ ProfileID: params.UserID * 100 }] };
    if (/SELECT CVID FROM CVs/.test(query)) return { recordset: [] }; // No CV owned by this test user.
    if (/INSERT|UPDATE|DELETE|ALTER/.test(query)) writes++;
    throw new Error('Unexpected database operation in isolated CV test');
  }
} };
const service = require('../src/services/cvDocumentService');
const app = express(); app.use(express.json({ limit: '320kb' }));
app.use('/api/candidate', require('../src/routes/candidateRoutes'));
app.use((err, req, res, next) => res.status(err.status || 500).json({ success: false, message: err.message }));
const server = app.listen(0, '127.0.0.1');
await new Promise(resolve => server.once('listening', resolve));
const base = `http://127.0.0.1:${server.address().port}/api/candidate`;
const headers = userId => ({ Authorization: `Bearer ${jwt.sign({ userId }, process.env.JWT_SECRET)}` });
const payload = { title: 'CV thử nghiệm', template: 'minimal', cvData: { personal: { fullName: 'Ánh' } } };
const created = [];
function post(url, body, userId = 1) { return fetch(`${base}${url}`, { method: 'POST', headers: { ...headers(userId), 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); }
test('PDF endpoints require an authenticated Candidate and validate input before rendering', async () => {
  assert.equal((await fetch(`${base}/cv/export`, { method: 'POST' })).status, 401);
  assert.equal((await post('/cv/export', payload, 3)).status, 403);
  assert.equal((await post('/cv/export', { ...payload, cvData: null })).status, 400);
  assert.equal((await post('/cv/export', { ...payload, template: 'unknown' })).status, 400);
  assert.equal((await post('/cv/export', { ...payload, title: '' })).status, 400);
  assert.equal((await post('/cv/export', { ...payload, cvData: { avatar: 'http://127.0.0.1:1/private' } })).status, 400);
});
test('updating an unowned CV cannot reset the owner profile primary flags', async () => {
  const response = await fetch(`${base}/cv/online/900`, { method: 'PUT', headers: { ...headers(2), 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payload, isPrimary: true }) });
  assert.equal(response.status, 404); assert.equal(writes, 0);
});
test('avatar upload checks content, limit, ownership; valid avatar survives PDF export', { timeout: 60000 }, async () => {
  const upload = async (buffer, type, user = 1) => {
    const body = new FormData(); body.append('avatar', new Blob([buffer], { type }), 'avatar.png');
    return fetch(`${base}/cv/avatar`, { method: 'POST', headers: headers(user), body });
  };
  assert.equal((await upload(Buffer.from('not a picture'), 'image/png')).status, 400);
  assert.equal((await upload(Buffer.alloc(5 * 1024 * 1024 + 1), 'image/png')).status, 400);
  assert.equal((await upload(Buffer.from('not a picture'), 'text/plain')).status, 400);
  const image = await sharp({ create: { width: 300, height: 400, channels: 3, background: '#235c9b' } }).png().toBuffer();
  const response = await upload(image, 'image/png'); assert.equal(response.status, 201);
  const { data } = await response.json(); created.push(await service.avatarPath(data.url, 1));
  assert.equal((await fetch(`${base.replace('/api/candidate', '')}${data.url}`, { headers: headers(1) })).status, 200);
  assert.equal((await fetch(`${base.replace('/api/candidate', '')}${data.url}`, { headers: headers(2) })).status, 400);
  assert.equal((await post('/cv/export', { ...payload, cvData: { ...payload.cvData, avatar: data.url } }, 2)).status, 400);
  const pdf = await post('/cv/export', { ...payload, cvData: { ...payload.cvData, avatar: data.url } });
  assert.equal(pdf.status, 200); assert.equal(pdf.headers.get('content-type'), 'application/pdf');
  assert.ok(pdf.headers.get('content-disposition').startsWith('attachment;'));
  assert.ok(Buffer.from(await pdf.arrayBuffer()).subarray(0, 4).toString() === '%PDF');
  assert.equal(writes, 0, 'export and avatars must not save a CV or change the database');
});
after(async () => { await service.closeBrowser(); await Promise.all(created.map(file => fs.unlink(file))); await new Promise(resolve => server.close(resolve)); });
