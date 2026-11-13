const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('crypto');
const { execFileSync } = require('child_process');
const fs = require('fs/promises');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const originalDatabase = process.env.DB_NAME;
const database = `JobtimizeKYCTest_${randomUUID().slice(0, 8)}`;
assert.match(database, /^JobtimizeKYCTest_[a-f0-9]{8}$/);
assert.notEqual(database, originalDatabase);
const login = process.env.DB_USER;
assert.match(login, /^[a-zA-Z0-9_]+$/);
process.env.DB_NAME = database;
process.env.JWT_SECRET = 'isolated-kyc-deletion-test-secret';
for (const key of ['EMAIL_USER', 'EMAIL_PASS', 'SMTP_HOST', 'SMTP_USER', 'SMTP_PASS']) process.env[key] = '';
const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('../src/config/db');
const { applySchema } = require('../src/services/databaseSchema');
const worker = require('../src/services/notificationService');
const { kycFilePath } = require('../src/services/kycService');
const root = path.resolve(__dirname, '../uploads/kyc');
const files = new Set();
const publicFiles = new Set();
const sqlcmd = query => execFileSync('sqlcmd', ['-S', 'localhost', '-E', '-C', '-b', '-l', '5', '-Q', query], { stdio: 'pipe' });
let created = false, pool, server, base;
const tokens = {};
let owner, otherOwner, employer, foreignEmployer, admin, job;

async function call(method, route, who, body) {
  const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', ...(who ? { Authorization: `Bearer ${tokens[who]}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: response.status, body: await response.json() };
}
async function user(label, role) {
  const id = (await db.executeQuery(`INSERT Users(Email,PasswordHash,FullName,Status,IsEmailVerified)
    OUTPUT INSERTED.UserID VALUES(@Email,'not-used',@Name,'Active',1)`, { Email: `${label}@kyc-test.invalid`, Name: label })).recordset[0].UserID;
  await db.executeQuery('INSERT UserRoles(UserID,RoleID) SELECT @ID,RoleID FROM Roles WHERE RoleName=@Role', { ID: id, Role: role });
  tokens[label] = jwt.sign({ userId: id }, process.env.JWT_SECRET);
  return id;
}
async function file() {
  const url = `/uploads/kyc/kyc-delete-test-${randomUUID()}.pdf`;
  const target = kycFilePath(url);
  assert.equal(path.dirname(target), root);
  await fs.mkdir(root, { recursive: true });
  await fs.writeFile(target, '%PDF-1.4\nKYC synthetic fixture', { flag: 'wx' });
  files.add(target);
  return url;
}
async function document(id = employer, businessLicense = null, taxCertificate = null) {
  businessLicense ||= await file();
  return (await db.executeQuery(`INSERT KYCDocuments(EmployerID,BusinessLicenseUrl,TaxCertificateUrl,TaxCode)
    OUTPUT INSERTED.* VALUES(@ID,@License,@Tax,'0123456789')`, { ID: id, License: businessLicense, Tax: taxCertificate })).recordset[0];
}
const remove = (id, expectedDocumentId, who = 'admin') => call('DELETE', `/admin/employers/${id}/kyc`, who, { expectedDocumentId });

test('KYC delete and resubmission use an isolated SQL database', { timeout: 120000 }, async t => {
  sqlcmd(`CREATE DATABASE [${database}]`); created = true;
  if (login !== 'sa') sqlcmd(`USE [${database}]; CREATE USER [${login}] FOR LOGIN [${login}]; ALTER ROLE db_owner ADD MEMBER [${login}];`);
  pool = await db.getPool();
  await applySchema(text => pool.request().query(text));
  await db.executeQuery("INSERT Roles(RoleName) VALUES('Admin'),('Employer'),('Candidate')");
  admin = await user('admin', 'Admin'); owner = await user('owner', 'Employer');
  otherOwner = await user('other', 'Employer'); await user('candidate', 'Candidate');
  employer = (await db.executeQuery("INSERT Employers(UserID,CompanyName,KYCStatus) OUTPUT INSERTED.EmployerID VALUES(@ID,N'KYC test company','Approved')", { ID: owner })).recordset[0].EmployerID;
  foreignEmployer = (await db.executeQuery("INSERT Employers(UserID,CompanyName,KYCStatus) OUTPUT INSERTED.EmployerID VALUES(@ID,N'Other company','Pending')", { ID: otherOwner })).recordset[0].EmployerID;
  job = (await db.executeQuery("INSERT JobPostings(EmployerID,Title,Description,Requirements,Status) OUTPUT INSERTED.JobID VALUES(@ID,N'Keep this job',N'Description',N'Requirements','Published')", { ID: employer })).recordset[0].JobID;
  const pack = (await db.executeQuery("INSERT SubscriptionPackages(PackageName,Price,DurationDays,PostLimit,SearchLimit) OUTPUT INSERTED.PackageID VALUES(N'Keep package',1000,30,5,10)")).recordset[0].PackageID;
  await db.executeQuery(`INSERT EmployerSubscriptions(EmployerID,PackageID,StartDate,EndDate,RemainingPosts,RemainingSearches)
    VALUES(@ID,@Package,GETDATE(),DATEADD(day,30,GETDATE()),4,9)`, { ID: employer, Package: pack });
  const app = express(); app.use(express.json());
  app.use('/admin', require('../src/routes/adminRoutes'));
  app.use('/employer', require('../src/routes/employerRoutes'));
  app.use('/notifications', require('../src/routes/notificationRoutes'));
  app.use('/uploads/kyc', require('../src/routes/kycFileRoutes'));
  app.use('/uploads', require('../src/middleware/publicUploadGuard'), express.static(path.dirname(root)));
  app.use((err, _req, res, _next) => res.status(err.status || 500).json({ success: false, message: err.message }));
  server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;

  await t.test('only Admin may delete and request ids must be valid', async () => {
    const doc = await document();
    for (const who of [null, 'owner', 'other', 'candidate']) assert.equal((await remove(employer, doc.DocumentID, who)).status, who ? 403 : 401);
    for (const value of [0, -1, 'invalid', true, [1], {}, 1.5]) assert.equal((await remove(employer, value)).status, 400);
    assert.equal((await call('DELETE', `/admin/employers/${employer}/kyc`, 'admin', {})).status, 400);
    assert.equal((await remove(employer, null)).status, 409);
    assert.equal((await remove(99999999, doc.DocumentID)).status, 404);
    assert.equal((await db.executeQuery('SELECT COUNT(*) n FROM KYCDocuments WHERE EmployerID=@ID', { ID: employer })).recordset[0].n, 1);
  });
  await t.test('a submission arriving after the confirmation opened is not deleted', async () => {
    const old = (await db.executeQuery('SELECT TOP 1 DocumentID FROM KYCDocuments WHERE EmployerID=@ID ORDER BY SubmittedAt DESC,DocumentID DESC', { ID: employer })).recordset[0];
    const newer = await document();
    assert.equal((await remove(employer, old.DocumentID)).status, 409);
    assert.equal((await db.executeQuery('SELECT COUNT(*) n FROM KYCDocuments WHERE DocumentID=@ID', { ID: newer.DocumentID })).recordset[0].n, 1);
  });
  await t.test('KYC files are private before deletion', async () => {
    const doc = (await db.executeQuery('SELECT TOP 1 BusinessLicenseUrl FROM KYCDocuments WHERE EmployerID=@ID', { ID: employer })).recordset[0];
    for (const [who, expected] of [[null,401],['candidate',403],['other',403],['owner',200],['admin',200]]) {
      const response = await fetch(base + doc.BusinessLicenseUrl, { headers: who ? { Authorization: `Bearer ${tokens[who]}` } : {} });
      assert.equal(response.status, expected); await response.arrayBuffer();
    }
  });
  await t.test('encoded private paths cannot fall through to public uploads while ordinary files still work', async () => {
    const doc = (await db.executeQuery('SELECT TOP 1 BusinessLicenseUrl FROM KYCDocuments WHERE EmployerID=@ID', { ID: employer })).recordset[0];
    const filename = path.basename(doc.BusinessLicenseUrl);
    for (const route of [`/uploads//kyc/${filename}`, `/uploads/%6byc/${filename}`, `/uploads/kyc%2F${filename}`, `/uploads/%5ckyc%5c${filename}`]) {
      const response = await fetch(base + route); assert.equal(response.status, 404, route); await response.arrayBuffer();
    }
    const name = `kyc-delete-public-${randomUUID()}.txt`;
    const target = path.resolve(root, '..', name); assert.equal(path.dirname(target), path.dirname(root));
    await fs.writeFile(target, 'Synthetic public fixture', { flag: 'wx' }); publicFiles.add(target);
    const publicResponse = await fetch(base + '/uploads/' + name); assert.equal(publicResponse.status, 200); assert.equal(await publicResponse.text(), 'Synthetic public fixture');
  });
  await t.test('database failure rolls deletion, verification and audit back before file removal', async () => {
    const latest = (await db.executeQuery('SELECT TOP 1 * FROM KYCDocuments WHERE EmployerID=@ID ORDER BY SubmittedAt DESC,DocumentID DESC', { ID: employer })).recordset[0];
    await db.executeQuery(`CREATE TRIGGER KYC_Test_Outbox_Failure ON NotificationOutbox AFTER INSERT AS
      BEGIN IF EXISTS(SELECT 1 FROM inserted WHERE EventType='kyc_deleted') THROW 51000,'Synthetic outbox failure',1; END`);
    try {
      assert.equal((await remove(employer, latest.DocumentID)).status, 500);
      assert.equal((await db.executeQuery('SELECT KYCStatus FROM Employers WHERE EmployerID=@ID', { ID: employer })).recordset[0].KYCStatus, 'Approved');
      assert.equal((await db.executeQuery('SELECT COUNT(*) n FROM KYCDocuments WHERE EmployerID=@ID', { ID: employer })).recordset[0].n, 2);
      assert.equal((await db.executeQuery("SELECT COUNT(*) n FROM SystemLogs WHERE Action LIKE 'KYC_DELETE%'")).recordset[0].n, 0);
      await fs.access(kycFilePath(latest.BusinessLicenseUrl));
    } finally { await db.executeQuery('DROP TRIGGER KYC_Test_Outbox_Failure'); }
  });
  await t.test('approved KYC deletion clears all submissions while preserving account jobs and package', async () => {
    const tax = await file(); const latest = await document(employer, null, tax);
    const removedFiles = (await db.executeQuery('SELECT BusinessLicenseUrl,TaxCertificateUrl FROM KYCDocuments WHERE EmployerID=@ID', { ID: employer })).recordset
      .flatMap(doc => [doc.BusinessLicenseUrl,doc.TaxCertificateUrl]).filter(Boolean);
    const subscription = (await db.executeQuery('SELECT * FROM EmployerSubscriptions WHERE EmployerID=@ID', { ID: employer })).recordset;
    const result = await remove(employer, latest.DocumentID);
    assert.equal(result.status, 200, JSON.stringify(result.body)); assert.equal(result.body.data.deletedDocuments, 3);
    const status = await call('GET','/employer/kyc-status','owner');
    assert.equal(status.body.data.kycStatus,'Pending'); assert.equal(status.body.data.document,null);
    assert.equal((await db.executeQuery('SELECT Status FROM Users WHERE UserID=@ID',{ID:owner})).recordset[0].Status,'Active');
    assert.equal((await db.executeQuery('SELECT Status FROM JobPostings WHERE JobID=@ID',{ID:job})).recordset[0].Status,'Published');
    assert.deepEqual((await db.executeQuery('SELECT * FROM EmployerSubscriptions WHERE EmployerID=@ID',{ID:employer})).recordset,subscription);
    const log=(await db.executeQuery("SELECT * FROM SystemLogs WHERE Action LIKE 'KYC_DELETE%'")).recordset;
    assert.equal(log.length,1); assert.equal(log[0].UserID,admin);
    for(const url of removedFiles) await assert.rejects(fs.access(kycFilePath(url)), {code:'ENOENT'});
    assert.equal((await remove(employer,latest.DocumentID)).status,404);
    // An orphan recreated on disk is still not downloadable even by Admin.
    const orphan=kycFilePath(latest.BusinessLicenseUrl); await fs.writeFile(orphan,'orphan fixture');
    assert.equal((await fetch(base+latest.BusinessLicenseUrl,{headers:{Authorization:`Bearer ${tokens.admin}`}})).status,404);
    assert.equal((await call('PATCH',`/admin/employers/${employer}/kyc`,'admin',{kycStatus:'Approved'})).status,409);
  });
  await t.test('deleted profiles are unsubmitted rather than pending review and stale events stay hidden', async () => {
    const pending=await call('GET','/admin/kyc/pending','admin'); assert.equal(pending.status,200); assert.equal(pending.body.data.length,0);
    const list=await call('GET','/admin/employers?kycStatus=Pending','admin');assert.equal(list.status,200);assert.equal(list.body.data.length,0);
    const unsubmitted=await call('GET','/admin/employers?kycStatus=NotSubmitted','admin');assert.ok(unsubmitted.body.data.some(row=>row.EmployerID===employer && !row.LatestKycDocumentID));
    const stats=await call('GET','/admin/stats','admin');assert.equal(stats.status,200);
    await worker.drainOutbox();
    const notices=await call('GET','/notifications','owner');assert.ok(notices.body.data.some(n=>n.type==='kyc_deleted'));
    for(const type of ['kyc_submitted','kyc_reviewed']) {
      assert.deepEqual(await worker.eventNotifications(db.executeQuery,{OutboxID:991,EventType:type,Payload:JSON.stringify({employerId:employer,status:'Approved'})}),[]);
    }
  });
  await t.test('the employer can submit a new KYC after deletion and be reviewed again', async () => {
    const form=new FormData();form.append('taxCode','0123456789');form.append('businessLicense',new Blob(['%PDF-1.4\nnew submission'],{type:'application/pdf'}),'business.pdf');
    const response=await fetch(base+'/employer/kyc',{method:'POST',headers:{Authorization:`Bearer ${tokens.owner}`},body:form});
    assert.equal(response.status,200,await response.text());
    const status=await call('GET','/employer/kyc-status','owner');const doc=status.body.data.document;assert.ok(doc.DocumentID);files.add(kycFilePath(doc.BusinessLicenseUrl));
    assert.equal((await call('PATCH',`/admin/employers/${employer}/kyc`,'admin',{kycStatus:'Approved'})).status,200);
    await worker.drainOutbox(); const inbox=await call('GET','/notifications','owner');assert.ok(inbox.body.data.some(n=>n.title.includes('KYC đã được duyệt')));
  });
  await t.test('shared files referenced by another employer survive cleanup', async () => {
    const shared=await file();const other=await document(foreignEmployer,shared);const latest=await document(employer,shared);
    assert.equal((await remove(employer,latest.DocumentID)).status,200); await fs.access(kycFilePath(shared));
    assert.equal((await db.executeQuery('SELECT COUNT(*) n FROM KYCDocuments WHERE DocumentID=@ID',{ID:other.DocumentID})).recordset[0].n,1);
  });
  await t.test('path traversal and non-KYC URLs are never filesystem deletion targets', async () => {
    for(const url of ['/uploads/kyc/../sentinel.pdf','/uploads/kyc/%2e%2e%2fsentinel.pdf','https://example.org/file.pdf','/uploads/avatar.png','/uploads/kyc/sub/file.pdf']) assert.equal(kycFilePath(url),null);
  });
  await t.test('legacy approvals without stored documents can be revoked without fabricating a submission', async () => {
    const legacyUser = await user('legacy', 'Employer');
    const id = (await db.executeQuery("INSERT Employers(UserID,CompanyName,KYCStatus) OUTPUT INSERTED.EmployerID VALUES(@ID,N'Legacy company','Approved')", { ID: legacyUser })).recordset[0].EmployerID;
    const result = await remove(id, null); assert.equal(result.status, 200); assert.equal(result.body.data.deletedDocuments, 0);
    const status = await call('GET','/employer/kyc-status','legacy'); assert.equal(status.body.data.kycStatus,'Pending'); assert.equal(status.body.data.document,null);
    assert.equal((await remove(id,null)).status,404);
    assert.equal((await call('PATCH',`/admin/employers/${id}/kyc`,'admin',{kycStatus:'Approved'})).status,409);
  });
});

after(async () => {
  if(server){server.closeAllConnections?.();await new Promise(resolve=>server.close(resolve));}
  if(pool)await pool.close();
  for(const filename of files){assert.equal(path.dirname(filename),root);assert.match(path.basename(filename),/^(kyc-delete-test-|businessLicense-)/);await fs.unlink(filename).catch(err=>{if(err.code!=='ENOENT')throw err;});}
  for(const filename of publicFiles){assert.equal(path.dirname(filename),path.dirname(root));assert.match(path.basename(filename),/^kyc-delete-public-/);await fs.unlink(filename).catch(err=>{if(err.code!=='ENOENT')throw err;});}
  if(created){assert.match(database,/^JobtimizeKYCTest_[a-f0-9]{8}$/);assert.notEqual(database,originalDatabase);sqlcmd(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`);}
});
