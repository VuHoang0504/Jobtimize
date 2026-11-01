// Integration tests use a new, uniquely named database and fake Google ID tokens.
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('crypto');
const { execFileSync } = require('child_process');
const fs = require('fs/promises');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(__dirname, '../.env') });
const database = `JobtimizeAccountTest_${randomUUID().slice(0, 8)}`;
if (!/^JobtimizeAccountTest_[a-f0-9]{8}$/.test(database) || database === process.env.DB_NAME) throw Error('Unsafe test database');
const login = process.env.DB_USER;
if (!/^[a-zA-Z0-9_]+$/.test(login)) throw Error('Unsupported test login');
execFileSync('sqlcmd', ['-S', 'localhost', '-E', '-C', '-b', '-Q', `CREATE DATABASE [${database}]`]);
process.env.DB_NAME = database;
process.env.JWT_SECRET = 'isolated-account-settings-test';
const express = require('express');
const db = require('../src/config/db');
const auth = require('../src/utils/authHelper');
const { OAuth2Client } = require('google-auth-library');
let server, pool, base;
const tokens = {};
async function call(method, route, body, who) {
  const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', ...(who ? { Authorization: `Bearer ${tokens[who]}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  return { status: response.status, body: await response.json() };
}

test('employer profile, Google password creation and unverified default', { timeout: 90000 }, async t => {
  // The OAuth controller reloads .env: keep this isolated harness on its test configuration.
  t.mock.method(dotenv, 'config', () => ({}));
  t.mock.method(OAuth2Client.prototype, 'verifyIdToken', async ({ idToken }) => ({ getPayload: () => ({ sub: `test-${idToken}`, email: `${idToken}@account-test.invalid`, name: 'Google Test Account', email_verified: idToken !== 'unverified' }) }));
  if (login !== 'sa') execFileSync('sqlcmd', ['-S', 'localhost', '-E', '-C', '-b', '-d', database, '-Q', `CREATE USER [${login}] FOR LOGIN [${login}]; ALTER ROLE db_owner ADD MEMBER [${login}];`]);
  pool = await db.getPool();
  // getPool's compatibility DDL may warn before the empty schema is initialized.
  for (const file of ['schema.sql', 'seed.sql']) {
    const source = (await fs.readFile(path.resolve(__dirname, '../../database', file), 'utf8')).replace(/\bJobtimizeDB\b/g, database);
    for (const batch of source.split(/^\s*GO\s*$/im).filter(value => value.trim())) await pool.request().query(batch);
  }
  const app = express(); app.use(express.json()); app.use('/auth', require('../src/routes/authRoutes')); app.use('/employer', require('../src/routes/employerRoutes'));
  server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve)); base = `http://127.0.0.1:${server.address().port}`;
  let employerId, candidateId;
  await t.test('Google accounts default to pending company verification and expose only password capability flags', async () => {
    for (const [who, roleName] of [['employer', 'Employer'], ['candidate', 'Candidate']]) {
      const result = await call('POST', '/auth/google', { credential: who, roleName });
      assert.equal(result.status, 200, JSON.stringify(result)); tokens[who] = result.body.data.token;
      assert.equal(result.body.data.user.hasPassword, false);
      assert.equal(result.body.data.user.googleLinked, true);
      if (who === 'employer') { employerId = result.body.data.user.userId; assert.equal(result.body.data.user.profile.KYCStatus, 'Pending'); }
      else candidateId = result.body.data.user.userId;
      const me = await call('GET', '/auth/me', null, who);
      assert.equal(me.body.data.hasPassword, false); assert.equal(me.body.data.PasswordHash, undefined); assert.equal(me.body.data.GoogleID, undefined);
    }
    assert.equal((await call('POST', '/auth/google', { credential: 'attacker', roleName: 'Admin' })).status, 400);
    assert.equal((await call('POST', '/auth/google', { credential: 'unverified', roleName: 'Employer' })).status, 401);
  });
  await t.test('ordinary employer signup also starts unverified', async () => {
    const email = 'regular@account-test.invalid';
    require('../src/utils/otpStore').saveOtp(email, '123456', { email, passwordHash: await auth.hashPassword('SyntheticPass7'), fullName: 'Regular Employer', companyName: 'Regular Company', roleName: 'Employer' });
    const result = await call('POST', '/auth/verify-otp', { email, otp: '123456' });
    assert.equal(result.status, 201, JSON.stringify(result)); assert.equal(result.body.data.user.profile.KYCStatus, 'Pending');
    tokens.regular = result.body.data.token;
  });
  await t.test('profile editing is scoped, validates fields, clears optional values and cannot self-verify', async () => {
    const updated = await call('PUT', '/employer/profile', { fullName: 'Nguyễn Đại Diện', phone: '+84 901234567', companyName: 'Công ty Kiểm thử', website: 'https://example.org', companySize: '50–100', address: 'Hà Nội', description: 'Giới thiệu doanh nghiệp.', KYCStatus: 'Approved', UserID: candidateId }, 'employer');
    assert.equal(updated.status, 200, JSON.stringify(updated)); assert.equal(updated.body.data.FullName, 'Nguyễn Đại Diện'); assert.equal(updated.body.data.KYCStatus, 'Pending'); assert.equal(updated.body.data.HasKycDocument, 0);
    assert.equal((await call('GET', '/auth/me', null, 'employer')).body.data.fullName, 'Nguyễn Đại Diện');
    assert.equal((await call('PUT', '/employer/profile', { website: '', description: '', phone: '' }, 'employer')).body.data.Website, '');
    assert.equal((await call('GET', '/auth/me', null, 'candidate')).body.data.fullName, 'Google Test Account');
    for (const body of [{ website: 'javascript:alert(1)' }, { companyName: '' }, { fullName: '' }, { phone: 'invalid' }, { companyName: 'x'.repeat(201) }]) assert.equal((await call('PUT', '/employer/profile', body, 'employer')).status, 400);
    await db.executeQuery("CREATE TRIGGER AccountTestProfileFailure ON Employers AFTER UPDATE AS BEGIN IF EXISTS(SELECT 1 FROM inserted WHERE CompanyName='ForcedFailure') THROW 50001,'Synthetic profile failure',1; END");
    try {
      assert.equal((await call('PUT', '/employer/profile', { fullName: 'Must roll back', companyName: 'ForcedFailure' }, 'employer')).status, 500);
      assert.equal((await call('GET', '/auth/me', null, 'employer')).body.data.fullName, 'Nguyễn Đại Diện');
    } finally { await db.executeQuery('DROP TRIGGER AccountTestProfileFailure'); }
    assert.equal((await call('PUT', '/employer/profile', { companyName: 'Unauthorized' }, 'candidate')).status, 403);
    assert.equal((await call('PUT', '/employer/profile', { companyName: 'Unauthorized' })).status, 401);
    await db.executeQuery("UPDATE Employers SET KYCStatus='Approved' WHERE UserID=@ID", { ID: employerId });
    assert.equal((await call('PUT', '/employer/profile', { description: 'New description', KYCStatus: 'Rejected' }, 'employer')).body.data.KYCStatus, 'Approved');
    assert.equal((await call('POST', '/auth/google', { credential: 'employer', roleName: 'Employer' })).body.data.user.profile.KYCStatus, 'Approved');
  });
  await t.test('Google-only users can create a password then must provide the current password to change it', async () => {
    for (const who of ['employer', 'candidate']) {
      const created = await call('POST', '/auth/change-password', { newPassword: 'SyntheticPass8' }, who);
      assert.equal(created.status, 200, JSON.stringify(created)); assert.equal(created.body.data.hasPassword, true);
      const id = who === 'employer' ? employerId : candidateId;
      const row = (await db.executeQuery('SELECT PasswordHash,GoogleID FROM Users WHERE UserID=@ID', { ID: id })).recordset[0];
      assert.notEqual(row.PasswordHash, 'SyntheticPass8'); assert.equal(await auth.comparePassword('SyntheticPass8', row.PasswordHash), true); assert.ok(row.GoogleID);
      assert.equal((await call('GET', '/auth/me', null, who)).body.data.hasPassword, true);
      assert.equal((await call('POST', '/auth/change-password', { newPassword: 'SyntheticPass9' }, who)).status, 400);
      assert.equal((await call('POST', '/auth/change-password', { currentPassword: 'wrong', newPassword: 'SyntheticPass9' }, who)).status, 400);
      assert.equal((await call('POST', '/auth/change-password', { currentPassword: 'SyntheticPass8', newPassword: 'SyntheticPass9' }, who)).status, 200);
      const loggedIn = await call('POST', '/auth/login', { email: `${who}@account-test.invalid`, password: 'SyntheticPass9' });
      assert.equal(loggedIn.status, 200); assert.equal(loggedIn.body.data.user.hasPassword, true);
      const google = await call('POST', '/auth/google', { credential: who, roleName: who === 'employer' ? 'Employer' : 'Candidate' });
      assert.equal(google.status, 200); assert.equal(google.body.data.user.hasPassword, true);
    }
    assert.equal((await call('POST', '/auth/change-password', { newPassword: 'weak' }, 'employer')).status, 400);
    assert.equal((await call('POST', '/auth/change-password', { newPassword: 'SyntheticPass8' })).status, 401);
    assert.equal((await call('POST', '/auth/change-password', { newPassword: 'SyntheticPass8' }, 'regular')).status, 400);
  });
  await t.test('concurrent first-password requests cannot silently replace each other', async () => {
    const result = await call('POST', '/auth/google', { credential: 'race', roleName: 'Employer' }); tokens.race = result.body.data.token;
    const responses = await Promise.all(['SyntheticRace1', 'SyntheticRace2'].map(newPassword => call('POST', '/auth/change-password', { newPassword }, 'race')));
    assert.equal(responses.filter(response => response.status === 200).length, 1);
    assert.ok(responses.filter(response => response.status !== 200).every(response => [400, 409].includes(response.status)));
  });
});

after(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
  if (pool) await pool.close();
  execFileSync('sqlcmd', ['-S', 'localhost', '-E', '-C', '-b', '-Q', `ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}];`]);
});
