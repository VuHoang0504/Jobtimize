const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('crypto');
const { execFileSync } = require('child_process');
const fs = require('fs/promises');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const originalDatabase = process.env.DB_NAME;
const database = process.env.NOTIFICATION_TEST_DB || `JobtimizeNotificationsTest_${randomUUID().slice(0, 8)}`;
if (!/^JobtimizeNotificationsTest_[a-f0-9]{8}$/.test(database) || database === originalDatabase) throw new Error('Use a separate JobtimizeNotificationsTest_<8 hex> database.');
let created = false;
if (!process.env.NOTIFICATION_TEST_DB) {
  if (process.platform !== 'win32') throw new Error('Provision a disposable SQL database and set NOTIFICATION_TEST_DB.');
  const login = process.env.DB_USER;
  if (!/^[a-zA-Z0-9_]+$/.test(login)) throw new Error('Provision a disposable test database manually for this login name.');
  execFileSync('sqlcmd', ['-S', 'localhost', '-E', '-C', '-b', '-Q', `CREATE DATABASE [${database}];`]);
  if (login !== 'sa') execFileSync('sqlcmd', ['-S', 'localhost', '-E', '-C', '-b', '-d', database, '-Q', `CREATE USER [${login}] FOR LOGIN [${login}]; ALTER ROLE db_owner ADD MEMBER [${login}];`]);
  created = true;
}
process.env.DB_NAME = database;
process.env.JWT_SECRET = 'notification-isolated-regression-secret';
for (const key of ['EMAIL_USER', 'EMAIL_PASS', 'SMTP_HOST', 'SMTP_USER', 'SMTP_PASS']) process.env[key] = '';
const sql = require('mssql');
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { config, executeQuery, getPool } = require('../src/config/db');
const store = require('../src/services/notificationStore');
const worker = require('../src/services/notificationService');
const recommendations = require('../src/services/notificationRecommendations');
let pool, server, base, candidate, otherCandidate, admin, secondAdmin, employer, jobId, profileId, cvId, applicationId, invitationId;
const tokens = new Map();
const headers = userId => ({ Authorization: `Bearer ${tokens.get(userId)}`, 'Content-Type': 'application/json' });
async function call(method, route, userId, body) {
  const response = await fetch(`${base}${route}`, { method, headers: userId ? headers(userId) : { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: response.status, body: await response.json() };
}
async function inbox(userId, query = '') {
  const r = await call('GET', `/notifications${query}`, userId); assert.equal(r.status, 200, JSON.stringify(r.body)); return r.body;
}
async function seedUser(email, role) {
  const hash = await bcrypt.hash('TestPassword1!', 4);
  const u = (await executeQuery(`INSERT Users(Email,PasswordHash,FullName,Status,IsEmailVerified) OUTPUT INSERTED.UserID VALUES(@Email,@Hash,@Name,'Active',1)`, { Email: email, Hash: hash, Name: email.split('@')[0] })).recordset[0].UserID;
  await executeQuery('INSERT UserRoles(UserID,RoleID) SELECT @UserID,RoleID FROM Roles WHERE RoleName=@Role', { UserID: u, Role: role });
  tokens.set(u, jwt.sign({ userId: u, role }, process.env.JWT_SECRET)); return u;
}

test('notification workflows on an isolated SQL Server database', { timeout: 180000 }, async t => {
  pool = await new sql.ConnectionPool(config).connect();
  const tableCount = (await pool.request().query('SELECT COUNT(*) n FROM sys.tables')).recordset[0].n;
  assert.equal(tableCount, 0, 'Never initialize over an existing database');
  for (const name of ['schema.sql', 'seed.sql']) {
    const source = (await fs.readFile(path.resolve(__dirname, '../../database', name), 'utf8')).replace(/\bJobtimizeDB\b/g, database);
    for (const batch of source.split(/^\s*GO\s*$/im).filter(s => s.trim())) await pool.request().query(batch);
  }
  await t.test('migration upgrades legacy Interviews without InterviewType and remains repeatable', async () => {
    // Reproduce the older deployed schema inside this disposable test database only.
    await pool.request().query(`DECLARE @constraint SYSNAME, @dropSQL NVARCHAR(MAX);
      SELECT @constraint=d.name FROM sys.default_constraints d
      JOIN sys.columns c ON c.object_id=d.parent_object_id AND c.column_id=d.parent_column_id
      WHERE d.parent_object_id=OBJECT_ID('Interviews') AND c.name='InterviewType';
      IF @constraint IS NOT NULL
      BEGIN
        SET @dropSQL='ALTER TABLE Interviews DROP CONSTRAINT '+QUOTENAME(@constraint);
        EXEC(@dropSQL);
      END;
      ALTER TABLE Interviews DROP COLUMN InterviewType;`);
    await worker.initialize(); await worker.initialize();
    const column = (await pool.request().query("SELECT COL_LENGTH('Interviews','InterviewType') AS Size")).recordset[0];
    assert.equal(column.Size, 40);
  });
  const seeded = (await executeQuery("SELECT UserID,Email FROM Users WHERE Email IN ('admin@jobtimize.vn','hr@fpt-software.com')")).recordset;
  admin = seeded.find(u => u.Email.startsWith('admin')).UserID; employer = seeded.find(u => u.Email.startsWith('hr')).UserID;
  tokens.set(admin, jwt.sign({ userId: admin }, process.env.JWT_SECRET)); tokens.set(employer, jwt.sign({ userId: employer }, process.env.JWT_SECRET));
  candidate = await seedUser('notify-candidate@example.org', 'Candidate');
  otherCandidate = await seedUser('notify-other@example.org', 'Candidate');
  secondAdmin = await seedUser('notify-admin@example.org', 'Admin');
  profileId = (await executeQuery('INSERT CandidateProfiles(UserID,Headline,IsLookingForJob) OUTPUT INSERTED.ProfileID VALUES(@ID,\'Engineer\',1)', { ID: candidate })).recordset[0].ProfileID;
  await executeQuery('INSERT CandidateProfiles(UserID,IsLookingForJob) VALUES(@ID,1)', { ID: otherCandidate });
  const cvData = JSON.stringify({ personal: { fullName: 'Notify Candidate' }, skills: { technical: ['React', 'Node.js', 'SQL Server'] } });
  cvId = (await executeQuery(`INSERT CVs(ProfileID,Title,FileUrl,CvType,CvData,IsPrimary) OUTPUT INSERTED.CVID VALUES(@ID,'Current CV','online','OnlineBuilder',@Data,1)`, { ID: profileId, Data: cvData })).recordset[0].CVID;
  const app = express(); app.use(express.json());
  app.use('/auth', require('../src/routes/authRoutes'));
  app.use('/jobs', require('../src/routes/jobRoutes'));
  app.use('/employer', require('../src/routes/employerRoutes'));
  app.use('/admin', require('../src/routes/adminRoutes'));
  app.use('/candidate/invitations', require('../src/routes/candidateInvitationRoutes'));
  app.use('/candidate', require('../src/routes/candidateRoutes'));
  app.use('/notifications', require('../src/routes/notificationRoutes'));
  app.use('/reports', require('../src/routes/reportRoutes'));
  app.use('/payments', require('../src/routes/paymentRoutes'));
  app.use((req, res) => res.status(404).json({ success: false }));
  server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;

  await t.test('login success never enters inbox history, including legacy clients and queued events', async () => {
    assert.equal((await call('GET', '/notifications')).status, 401);
    assert.equal((await call('POST', '/notifications/session', candidate, { userId: otherCandidate })).status, 200);
    await call('POST', '/notifications/session', candidate, {});
    await Promise.all([worker.drainOutbox(), worker.drainOutbox()]);
    assert.equal((await inbox(candidate)).total, 0);
    assert.equal((await executeQuery("SELECT COUNT(*) n FROM NotificationOutbox WHERE EventType='login'")).recordset[0].n, 0);
    await store.withTransaction(async query => {
      await store.enqueue(query, 'login', { userId: candidate }, 'test:legacy-login');
      await store.putNotification(query, { userId: candidate, role: 'Candidate', key: 'test:old-login', type: 'login', title: 'Legacy login', body: 'Old login', href: '/' });
    });
    assert.equal((await inbox(candidate)).total, 0, 'Legacy login rows are excluded from counts and items');
    await worker.drainOutbox();
    assert.equal((await executeQuery("SELECT COUNT(*) n FROM Notifications WHERE Type='login'")).recordset[0].n, 1, 'Queued login cannot create another item');
    await worker.initialize();
    assert.equal((await executeQuery("SELECT COUNT(*) n FROM Notifications WHERE Type='login'")).recordset[0].n, 0);
    assert.equal((await executeQuery("SELECT COUNT(*) n FROM NotificationOutbox WHERE EventType='login'")).recordset[0].n, 0);
  });

  await t.test('recruitment notices are JWT-owned, private, and read state persists', async () => {
    await store.withTransaction(query => store.putNotification(query, { userId: candidate, role: 'Candidate', key: 'test:private', type: 'invitation', title: 'Test invitation', body: 'Private', href: '/candidate/dashboard?tab=invitations' }));
    const list = await inbox(candidate);
    assert.equal((await inbox(otherCandidate)).total, 0);
    const id = list.data[0].id;
    assert.equal((await call('PATCH', `/notifications/${id}/read`, otherCandidate)).status, 404);
    assert.equal((await call('PATCH', `/notifications/${id}/read`, candidate)).status, 200);
    assert.equal((await inbox(candidate, '?filter=unread')).data.length, 0);
    assert.equal((await inbox(candidate)).data[0].id, id);
    assert.equal((await call('GET', '/notifications?page=-1', candidate)).status, 400);
    assert.equal((await call('PATCH', '/notifications/1%20OR%201=1/read', candidate)).status, 400);
    await executeQuery("DELETE FROM Notifications WHERE EventKey='test:private'");
  });

  await t.test('unread and role priorities apply before pagination, with newest first inside each group', async () => {
    const cases = [
      [candidate, 'Candidate', ['invitation', 'invitation', 'application_status'], ['invitation', 'invitation', 'application_status']],
      [employer, 'Employer', ['application', 'job_status', 'invitation_response'], ['job_status', 'application', 'invitation_response']]
    ];
    for (const [userId, role, types, expected] of cases) {
      await store.withTransaction(async query => {
        for (const [index, type] of types.entries()) await store.putNotification(query, { userId, role, key: `test:priority:${role}:${index}`, type, title: 'Priority test', body: 'Test', href: '/' });
      });
      const list = await inbox(userId);
      assert.deepEqual(list.data.map(n => n.type), expected);
      if (role === 'Candidate') assert.ok(list.data[0].id > list.data[1].id, 'Newest invitation leads its priority group');
      await call('PATCH', `/notifications/${list.data[0].id}/read`, userId);
      const updated = await inbox(userId);
      assert.equal(updated.data.at(-1).id, list.data[0].id, 'Read items follow all unread items');
      assert.equal((await inbox(userId, '?filter=unread')).data.length, 2);
      await executeQuery("DELETE FROM Notifications WHERE UserID=@ID AND EventKey LIKE 'test:priority:%'", { ID: userId });
    }
  });

  const jobBody = { title: 'Notification React Role', description: 'React Node.js SQL Server', requirements: 'React Node.js SQL Server', location: 'Hà Nội', skills: [] };
  await t.test('post -> pending -> revision -> rejection -> published, exact recipients and notes', async () => {
    const created = await call('POST', '/employer/jobs', employer, jobBody);
    assert.equal(created.status, 201, JSON.stringify(created.body)); jobId = created.body.data.JobID;
    await worker.initialize(); // Backfill must use the same key as the committed event.
    await worker.drainOutbox();
    assert.ok((await inbox(employer)).data.some(n => n.type === 'job_status' && n.title.includes('chờ duyệt')));
    assert.ok((await inbox(admin)).data.some(n => n.href.includes(`jobId=${jobId}`)));
    assert.equal((await call('PATCH', `/admin/jobs/${jobId}/moderate`, employer, { status: 'Published' })).status, 403);
    for (const [status, note] of [['RequiresRevision', 'Cần bổ sung mô tả'], ['Rejected', 'Thiếu thông tin công ty'], ['Published', 'Đã kiểm tra']]) {
      const r = await call('PATCH', `/admin/jobs/${jobId}/moderate`, admin, { status, adminNote: note }); assert.equal(r.status, 200, JSON.stringify(r.body));
      await worker.drainOutbox(); assert.ok((await inbox(employer)).data.some(n => n.body.includes(note)));
      const before = (await inbox(employer)).total;
      await call('PATCH', `/admin/jobs/${jobId}/moderate`, admin, { status, adminNote: note }); await worker.drainOutbox();
      assert.equal((await inbox(employer)).total, before, 'Repeating an unchanged review cannot notify twice');
    }
    assert.equal((await call('PATCH', `/admin/jobs/${jobId}/moderate`, admin, { status: 'Rejected' })).status, 400);
  });

  await t.test('failure after a job insert rolls back both job and notification', async () => {
    const count = (await executeQuery('SELECT COUNT(*) n FROM JobPostings')).recordset[0].n;
    const r = await call('POST', '/employer/jobs', employer, { ...jobBody, title: 'Should Roll Back', skills: [{ skillId: -9999 }] });
    assert.equal(r.status, 500);
    assert.equal((await executeQuery('SELECT COUNT(*) n FROM JobPostings')).recordset[0].n, count);
    assert.equal((await executeQuery("SELECT COUNT(*) n FROM NotificationOutbox WHERE Payload LIKE '%Should Roll Back%'")).recordset[0].n, 0);
  });

  await t.test('recommendation uses primary CV, threshold, top three, caches and removes unavailable/applied jobs', async () => {
    await recommendations.refreshRecommendations();
    let list = (await inbox(candidate)).data.filter(n => n.type === 'job_match');
    assert.ok(list.length > 0 && list.length <= 3); assert.ok(list.some(n => n.href === `/jobs/${jobId}`));
    const count = (await inbox(candidate)).total;
    await recommendations.refreshRecommendations(); assert.equal((await inbox(candidate)).total, count);
    await executeQuery(`INSERT CVs(ProfileID,Title,FileUrl,CvType,CvData,IsPrimary) VALUES(@ID,'Unrelated CV','online','OnlineBuilder',N'{"skills":["Figma"]}',0)`, { ID: profileId });
    await recommendations.refreshRecommendations(); assert.equal((await inbox(candidate)).total, count, 'Non-primary CV must not affect recommendations');
    await call('PATCH', `/admin/jobs/${jobId}/moderate`, admin, { status: 'Closed' });
    assert.ok(!(await inbox(candidate)).data.some(n => n.type === 'job_match' && n.href === `/jobs/${jobId}`));
    await call('PATCH', `/admin/jobs/${jobId}/moderate`, admin, { status: 'Published' });
  });

  await t.test('primary CV switch, disabled job search and expired jobs never expose stale recommendations', async () => {
    const alternate = (await executeQuery(`SELECT TOP 1 CVID FROM CVs WHERE ProfileID=@ID AND CVID<>@CV ORDER BY CVID DESC`, { ID: profileId, CV: cvId })).recordset[0].CVID;
    assert.equal((await call('PUT', `/candidate/cv/${alternate}/primary`, candidate)).status, 200);
    await recommendations.refreshRecommendations();
    assert.ok(!(await inbox(candidate)).data.some(n => n.type === 'job_match' && n.href === `/jobs/${jobId}`));
    assert.equal((await call('PUT', `/candidate/cv/${cvId}/primary`, otherCandidate)).status, 404);
    assert.equal((await call('PUT', `/candidate/cv/${cvId}/primary`, candidate)).status, 200);
    await recommendations.refreshRecommendations();
    assert.ok((await inbox(candidate)).data.some(n => n.type === 'job_match' && n.href === `/jobs/${jobId}`));
    await executeQuery('UPDATE CandidateProfiles SET IsLookingForJob=0 WHERE ProfileID=@ID', { ID: profileId });
    await recommendations.refreshRecommendations(); assert.equal((await inbox(candidate)).data.filter(n => n.type === 'job_match').length, 0);
    await executeQuery('UPDATE CandidateProfiles SET IsLookingForJob=1 WHERE ProfileID=@ID', { ID: profileId });
    await recommendations.refreshRecommendations(); assert.ok((await inbox(candidate)).data.some(n => n.type === 'job_match'));
    await executeQuery('UPDATE JobPostings SET ExpiresAt=DATEADD(DAY,-1,GETDATE()) WHERE JobID=@ID', { ID: jobId });
    assert.ok(!(await inbox(candidate)).data.some(n => n.type === 'job_match' && n.href === `/jobs/${jobId}`));
    await executeQuery('UPDATE JobPostings SET ExpiresAt=NULL WHERE JobID=@ID', { ID: jobId });
    const originalCV = (await executeQuery('SELECT CvData,FileUrl FROM CVs WHERE CVID=@ID', { ID: cvId })).recordset[0];
    await executeQuery("UPDATE CVs SET CvData=NULL,FileUrl='/uploads/nonexistent-notification-test.pdf' WHERE CVID=@ID", { ID: cvId });
    await require('../src/services/cvAnalysisService').capture((await executeQuery('SELECT * FROM CVs WHERE CVID=@ID', { ID: cvId })).recordset[0]);
    await recommendations.refreshRecommendations(); assert.equal((await inbox(candidate)).data.filter(n => n.type === 'job_match').length, 0);
    await executeQuery('UPDATE CVs SET CvData=@Data,FileUrl=@Url WHERE CVID=@ID', { Data: originalCV.CvData, Url: originalCV.FileUrl, ID: cvId });
    await require('../src/services/cvAnalysisService').capture((await executeQuery('SELECT * FROM CVs WHERE CVID=@ID', { ID: cvId })).recordset[0]);
    await recommendations.refreshRecommendations(); assert.ok((await inbox(candidate)).data.some(n => n.type === 'job_match'), 'A corrected CV must bypass the failed-source backoff');
  });

  await t.test('apply -> employer inbox and ATS; duplicate/foreign CV rejected', async () => {
    const bad = await call('POST', '/jobs/apply', candidate, { jobId, cvId: -999 }); assert.equal(bad.status, 400);
    const r = await call('POST', '/jobs/apply', candidate, { jobId, cvId }); assert.equal(r.status, 201, JSON.stringify(r.body));
    applicationId = r.body.data.application.ApplicationID;
    await worker.drainOutbox();
    assert.ok((await inbox(employer)).data.some(n => n.type === 'application' && n.href.includes(`applicationId=${applicationId}`)));
    assert.equal((await call('POST', '/jobs/apply', candidate, { jobId, cvId })).status, 400);
    assert.ok(!(await inbox(candidate)).data.some(n => n.type === 'job_match' && n.href === `/jobs/${jobId}`));
    assert.equal((await call('GET', `/employer/jobs/${jobId}/ats`, employer)).status, 200);
  });

  await t.test('invitation retry is durable and cannot leak to another candidate', async () => {
    const r = await call('POST', '/employer/invite-candidate', employer, { profileId, jobId, message: 'Mời bạn trao đổi về vị trí mới.' }); assert.equal(r.status, 200, JSON.stringify(r.body));
    invitationId = (await executeQuery('SELECT InvitationID FROM CandidateInvitations WHERE ProfileID=@ID', { ID: profileId })).recordset[0].InvitationID;
    await executeQuery("ALTER TABLE Notifications ADD CONSTRAINT CK_Test_DeliveryFailure CHECK(Type<>'invitation')");
    await worker.drainOutbox();
    const queued = (await executeQuery("SELECT TOP 1 * FROM NotificationOutbox WHERE EventType='invitation' ORDER BY OutboxID DESC")).recordset[0];
    assert.equal(queued.ProcessedAt, null); assert.ok(queued.Attempts > 0);
    await executeQuery('ALTER TABLE Notifications DROP CONSTRAINT CK_Test_DeliveryFailure; UPDATE NotificationOutbox SET AvailableAt=SYSUTCDATETIME() WHERE ProcessedAt IS NULL');
    await worker.drainOutbox(); await worker.drainOutbox();
    const notices = (await inbox(candidate)).data.filter(n => n.type === 'invitation'); assert.equal(notices.length, 1); assert.ok(notices[0].body.includes('Mời bạn'));
    assert.equal((await call('GET', `/candidate/invitations?id=${invitationId}`, candidate)).body.data.length, 1);
    assert.equal((await call('GET', `/candidate/invitations?id=${invitationId}`, otherCandidate)).body.data.length, 0);
    assert.equal((await call('GET', '/candidate/invitations', employer)).status, 403);
  });

  await t.test('recruitment: invitation responses, interview confirmation, rescheduling, review emails and ownership', async () => {
    const invites = await call('GET', '/employer/invitations', employer);
    assert.equal(invites.status, 200, JSON.stringify(invites.body));
    assert.ok(invites.body.data.some(i => i.InvitationID === invitationId));
    assert.ok((await inbox(employer)).data.some(n => n.type === 'invitation' && n.href.includes(`invitationId=${invitationId}`)), 'Sender also sees the sent invitation');
    let invitation = (await call('GET', `/candidate/invitations?id=${invitationId}`, candidate)).body.data[0];
    assert.equal((await call('PATCH', `/candidate/invitations/${invitationId}/respond`, candidate, { status: 'Declined', version: invitation.Version })).status, 200);
    assert.equal((await call('POST', '/employer/invite-candidate', employer, { profileId, jobId, message: 'Lời mời mới sau khi trao đổi lại.' })).status, 200);
    assert.equal((await call('PATCH', `/candidate/invitations/${invitationId}/respond`, candidate, { status: 'Accepted', version: invitation.Version })).status, 409, 'Resent invitation invalidates old responses');
    invitation = (await call('GET', `/candidate/invitations?id=${invitationId}`, candidate)).body.data[0];
    assert.equal(invitation.RespondedAt, null); assert.equal(invitation.Version, 2);
    const reply = { status: 'Accepted', version: invitation.Version };
    assert.equal((await call('PATCH', `/candidate/invitations/${invitationId}/respond`, otherCandidate, reply)).status, 404);
    const schedule = { invitationId, interviewDate: new Date(Date.now() + 86400000).toISOString(), interviewType: 'Online', locationOrLink: 'https://example.org/interview', notes: 'Liên hệ hr@example.org để hẹn lại.' };
    assert.equal((await call('POST', '/employer/interviews', employer, schedule)).status, 409, 'Interest is required');
    const responses = await Promise.all([call('PATCH', `/candidate/invitations/${invitationId}/respond`, candidate, reply), call('PATCH', `/candidate/invitations/${invitationId}/respond`, candidate, reply)]);
    assert.deepEqual(responses.map(r => r.status).sort(), [200, 409]);
    assert.equal((await call('POST', '/employer/invite-candidate', employer, { profileId, jobId })).status, 409, 'Do not erase accepted interest on resend');
    const foreignEmployer = await seedUser('recruitment-employer@example.org', 'Employer');
    await executeQuery("INSERT Employers(UserID,CompanyName,KYCStatus) VALUES(@ID,N'Other company','Approved')", { ID: foreignEmployer });
    assert.equal((await call('POST', '/employer/interviews', foreignEmployer, schedule)).status, 404);
    assert.equal((await call('POST', '/employer/interviews', employer, { ...schedule, interviewType: 'Other' })).status, 400);
    assert.equal((await call('POST', '/employer/interviews', employer, { ...schedule, locationOrLink: 'javascript:alert(1)' })).status, 400);
    assert.equal((await call('POST', '/employer/interviews', employer, { ...schedule, interviewDate: '2020-01-01T10:00:00Z' })).status, 400);
    let created = await call('POST', '/employer/interviews', employer, schedule);
    assert.equal(created.status, 201, JSON.stringify(created.body)); assert.equal(created.body.emailSent, false, 'No simulated email success');
    const interviewId = created.body.data.InterviewID;
    assert.equal((await call('GET', '/candidate/interviews', otherCandidate)).body.data.length, 0);
    assert.equal((await call('GET', '/employer/interviews', foreignEmployer)).body.data.length, 0);
    assert.ok((await call('GET', '/candidate/interviews', candidate)).body.data.some(i => i.InterviewID === interviewId && i.EmployerEmail));
    assert.equal((await call('PATCH', `/candidate/interviews/${interviewId}/respond`, otherCandidate, { status: 'Confirmed', version: 1 })).status, 409);
    assert.equal((await call('PATCH', `/candidate/interviews/${interviewId}/respond`, candidate, { status: 'Confirmed', version: 1 })).status, 200);
    assert.equal((await call('PATCH', `/candidate/interviews/${interviewId}/respond`, candidate, { status: 'Declined', version: 1 })).status, 409);
    assert.equal((await call('POST', '/employer/interviews', employer, schedule)).status, 409, 'Concurrent scheduler cannot overwrite');
    created = await call('POST', '/employer/interviews', employer, { ...schedule, version: 1, interviewType: 'Offline', locationOrLink: 'Phòng 201, văn phòng công ty' });
    assert.equal(created.status, 201, JSON.stringify(created.body)); assert.equal(created.body.data.InterviewID, interviewId); assert.equal(created.body.data.Version, 2); assert.equal(created.body.data.Status, 'Pending'); assert.equal(created.body.data.RespondedAt, null);
    assert.equal((await call('PATCH', `/candidate/interviews/${interviewId}/respond`, candidate, { status: 'Confirmed', version: 1 })).status, 409, 'Stale email/page cannot confirm new schedule');
    assert.equal((await call('PATCH', `/candidate/interviews/${interviewId}/respond`, candidate, { status: 'Declined', version: 2 })).status, 200);
    await worker.drainOutbox();
    const employerInbox = await inbox(employer);
    assert.ok(employerInbox.data.some(n => n.type === 'invitation_response'));
    assert.ok(employerInbox.data.some(n => n.type === 'interview_response'));
    assert.ok((await inbox(candidate)).data.some(n => n.type === 'interview_scheduled' && n.href.includes(`interviewId=${interviewId}`)));
    assert.equal((await call('GET', `/employer/jobs/${jobId}/ats`, employer)).body.data.applicants.length, 1, 'Interest never creates an application');
    const review = await call('PATCH', `/employer/applications/${applicationId}/status`, employer, { status: 'Screening' });
    assert.equal(review.status, 200, JSON.stringify(review.body)); assert.equal(review.body.emailSent, false);
    assert.equal((await call('PATCH', `/employer/applications/${applicationId}/status`, foreignEmployer, { status: 'Rejected' })).status, 404);
    const applicationSchedule = await call('POST', '/employer/interviews', employer, { ...schedule, invitationId: undefined, applicationId });
    assert.equal(applicationSchedule.status, 201, JSON.stringify(applicationSchedule.body));
    assert.equal((await call('GET', '/employer/jobs', employer)).body.data.find(j => j.JobID === jobId).TotalApplicants, 1);
    const ats = await call('GET', `/employer/jobs/${jobId}/ats`, employer);
    assert.equal(ats.body.data.applicants[0].interview.Status, 'Pending'); assert.equal(ats.body.data.applicants[0].interview.Version, 1);
    assert.equal((await call('PATCH', `/employer/applications/${applicationId}/status`, employer, { status: 'Rejected' })).status, 200);
    assert.equal((await call('PATCH', `/candidate/interviews/${applicationSchedule.body.data.InterviewID}/respond`, candidate, { status: 'Confirmed', version: 1 })).status, 409, 'Rejected applications cancel pending interviews');
    assert.equal((await call('PATCH', `/employer/applications/${applicationId}/status`, employer, { status: 'Screening' })).status, 409);
    await worker.drainOutbox();
    assert.ok((await inbox(candidate)).data.some(n => n.type === 'application_status' && n.title.includes('phù hợp')));
  });

  await t.test('follow-up email is limited to confirmed applications and their owning employer', async () => {
    const service = require('../src/services/emailService');
    const original = service.sendApplicationNoticeEmail;
    const sent = [];
    let mailSuccess = true;
    service.sendApplicationNoticeEmail = async payload => { sent.push(payload); return { success: mailSuccess }; };
    const confirmed = (await executeQuery(`INSERT JobApplications(JobID,ProfileID,Status)
      OUTPUT INSERTED.ApplicationID SELECT TOP 1 j.JobID,@ProfileID,'Offered' FROM JobPostings j
      JOIN Employers e ON e.EmployerID=j.EmployerID WHERE e.UserID=@UserID AND j.JobID<>@JobID
      AND NOT EXISTS(SELECT 1 FROM JobApplications a WHERE a.JobID=j.JobID AND a.ProfileID=@ProfileID)`,
    { ProfileID: profileId, UserID: employer, JobID: jobId })).recordset[0];
    assert.ok(confirmed);
    const url = `/employer/applications/${confirmed.ApplicationID}/email`;
    const body = { subject: 'Các bước tiếp theo', message: 'Vui lòng liên hệ công ty.' };
    try {
      assert.equal((await call('POST', url, candidate, body)).status, 403);
      assert.equal((await call('POST', url, secondAdmin, body)).status, 403);
      const foreign = (await executeQuery("SELECT UserID FROM Users WHERE Email='recruitment-employer@example.org'")).recordset[0].UserID;
      assert.equal((await call('POST', url, foreign, body)).status, 404);
      assert.equal((await call('POST', `/employer/applications/${applicationId}/email`, employer, body)).status, 409);
      for (const invalid of [{ ...body, subject: ' ' }, { ...body, subject: 'Header\r\nInjected' }, { ...body, message: ' ' }, { ...body, message: 'x'.repeat(5001) }]) {
        assert.equal((await call('POST', url, employer, invalid)).status, 400);
      }
      assert.equal(sent.length, 0);
      const result = await call('POST', url, employer, { ...body, toEmail: 'wrong@example.org' });
      assert.equal(result.status, 200, JSON.stringify(result.body));
      const recipient = (await executeQuery('SELECT Email FROM Users WHERE UserID=@ID', { ID: candidate })).recordset[0].Email;
      assert.equal(sent[0].toEmail, recipient, 'Recipient must come from the application, never the request');
      assert.equal(sent[0].subject, body.subject); assert.equal(sent[0].message, body.message);
      assert.ok(sent[0].employerEmail);
      mailSuccess = false;
      assert.equal((await call('POST', url, employer, body)).status, 502, 'Failed SMTP must not report success');
    } finally {
      service.sendApplicationNoticeEmail = original;
      await executeQuery('DELETE FROM JobApplications WHERE ApplicationID=@ID', { ID: confirmed.ApplicationID });
    }
  });

  await t.test('KYC submission and both review endpoints notify and save rejection reason', async () => {
    const form = new FormData(); form.append('taxCode', '1234567890'); form.append('businessLicense', new Blob([Buffer.from('%PDF-1.4\nnotification test')], { type: 'application/pdf' }), 'test.pdf');
    const r = await fetch(`${base}/employer/kyc`, { method: 'POST', headers: { Authorization: headers(employer).Authorization }, body: form });
    const body = await r.json(); assert.equal(r.status, 200, JSON.stringify(body));
    await worker.drainOutbox(); assert.ok((await inbox(admin)).data.some(n => n.type === 'kyc_submitted'));
    const employerId = (await executeQuery('SELECT EmployerID FROM Employers WHERE UserID=@ID', { ID: employer })).recordset[0].EmployerID;
    const rejected = await call('POST', `/admin/kyc/${employerId}/review`, admin, { status: 'Rejected', rejectionReason: 'Cần bổ sung giấy tờ hợp lệ' }); assert.equal(rejected.status, 200, JSON.stringify(rejected.body));
    await worker.drainOutbox(); assert.ok((await inbox(employer)).data.some(n => n.type === 'kyc_reviewed' && n.body.includes('Cần bổ sung')));
    assert.equal((await call('PATCH', `/admin/employers/${employerId}/kyc`, admin, { kycStatus: 'Approved' })).status, 200);
    await worker.drainOutbox();
    const approved = (await inbox(employer)).data.find(n => n.title.includes('KYC đã được duyệt'));
    assert.ok(approved); assert.ok(!approved.body.includes('Cần bổ sung'));
    assert.equal((await executeQuery('SELECT TOP 1 RejectionReason FROM KYCDocuments WHERE EmployerID=@ID ORDER BY SubmittedAt DESC,DocumentID DESC', { ID: employerId })).recordset[0].RejectionReason, null);
  });

  await t.test('report creation, duplicate submission, resolution and admin deep link', async () => {
    const r = await call('POST', '/reports', candidate, { targetType: 'JobPosting', targetId: jobId, reason: 'Thông tin tuyển dụng cần được kiểm tra lại.' }); assert.equal(r.status, 201, JSON.stringify(r.body));
    const reportId = r.body.data.ReportID;
    const duplicate = await call('POST', '/reports', candidate, { targetType: 'JobPosting', targetId: jobId, reason: 'Thông tin tuyển dụng cần được kiểm tra lại.' }); assert.equal(duplicate.body.data.ReportID, reportId);
    await worker.drainOutbox(); assert.ok((await inbox(admin)).data.some(n => n.type === 'report_created' && n.href.includes(`reportId=${reportId}`)));
    assert.equal((await call('GET', `/admin/reports?reportId=${reportId}`, admin)).body.data.length, 1);
    assert.equal((await call('PATCH', `/admin/reports/${reportId}`, admin, { status: 'Dismissed', adminNote: 'Đã xác minh, chưa đủ bằng chứng.' })).status, 200);
    await worker.drainOutbox(); assert.ok((await inbox(secondAdmin)).data.some(n => n.type === 'report_resolved'));
    assert.ok(!(await inbox(admin)).data.some(n => n.type === 'report_resolved'), 'Actor already receives the action toast');
  });

  await t.test('pagination, read all, role changes and login regression', async () => {
    await store.withTransaction(async query => { for (let i = 0; i < 23; i++) await store.putNotification(query, { userId: otherCandidate, role: 'Candidate', key: `pagination:${i}`, type: 'invitation', title: 'Thông báo thử nghiệm', body: 'Test', href: '/candidate/dashboard' }); });
    assert.equal((await inbox(otherCandidate)).data.length, 20); assert.equal((await inbox(otherCandidate, '?page=2')).data.length, 3);
    await call('PATCH', '/notifications/read-all', otherCandidate); assert.equal((await inbox(otherCandidate)).unread, 0);
    assert.ok((await inbox(candidate)).total > 0);
    await executeQuery("UPDATE ur SET RoleID=(SELECT RoleID FROM Roles WHERE RoleName='Employer') FROM UserRoles ur WHERE UserID=@ID", { ID: otherCandidate });
    assert.equal((await inbox(otherCandidate)).total, 0, 'Old-role notifications cannot appear under the new role');
    const login = await call('POST', '/auth/login', null, { email: 'notify-candidate@example.org', password: 'TestPassword1!' }); assert.equal(login.status, 200, JSON.stringify(login.body));
  });

  await t.test('concurrent application requests create one application and one inbox event', async () => {
    const posted = await call('POST', '/employer/jobs', employer, { ...jobBody, title: 'Concurrency Role' });
    const id = posted.body.data.JobID;
    await call('PATCH', `/admin/jobs/${id}/moderate`, admin, { status: 'Published' });
    const responses = await Promise.all([call('POST', '/jobs/apply', candidate, { jobId: id, cvId }), call('POST', '/jobs/apply', candidate, { jobId: id, cvId })]);
    assert.equal(responses.filter(r => r.status === 201).length, 1);
    assert.ok(responses.every(r => [201, 400, 409].includes(r.status)), JSON.stringify(responses));
    assert.equal((await executeQuery('SELECT COUNT(*) n FROM JobApplications WHERE JobID=@ID AND ProfileID=@Profile', { ID: id, Profile: profileId })).recordset[0].n, 1);
    await worker.drainOutbox();
    assert.equal((await inbox(employer)).data.filter(n => n.type === 'application' && n.href.startsWith(`/employer/ats/${id}?`)).length, 1);
  });
  await require('./admin_regression_cases')({ t, call, executeQuery, seedUser, admin, candidate, employer, base, headers });
});

test('ranking uses exact threshold, mandatory weights, stable top three and applied exclusion', () => {
  const jobs = Array.from({ length: 5 }, (_, i) => ({ JobID: i + 1, Title: 'React', Description: '', Requirements: '' }));
  const skills = [{ SkillID: 1, SkillName: 'React', NormalizedName: 'react' }];
  assert.equal(recommendations.rankJobs('Figma', jobs, [], skills).length, 0);
  assert.deepEqual(recommendations.rankJobs('React', jobs, [], skills, new Set([5])).map(j => j.JobID), [4, 3, 2]);
  const weighted = [{ JobID: 1, SkillID: 1, SkillName: 'React', NormalizedName: 'react', IsMandatory: true }, { JobID: 1, SkillID: 2, SkillName: 'Figma', NormalizedName: 'figma', IsMandatory: false }];
  assert.equal(recommendations.rankJobs('React', [jobs[0]], weighted, skills).length, 0, '66.7% is below 70%');
  assert.equal(recommendations.hasSkill('JavaScript', { SkillName: 'Java', NormalizedName: 'java' }), false);
  assert.equal(recommendations.hasSkill('Reactive programming', skills[0]), false);
  assert.equal(recommendations.hasSkill('React.js và NODE.JS', skills[0]), true);
  assert.equal(recommendations.hasSkill('React.js', { SkillName: 'React Native', NormalizedName: 'reactnative' }), false);
  assert.equal(recommendations.hasSkill('React Native', { SkillName: 'React Native', NormalizedName: 'reactnative' }), true);
  assert.equal(recommendations.hasSkill('Node.js', { SkillName: 'Node-RED', NormalizedName: 'nodered' }), false);
  assert.equal(recommendations.hasSkill('.NET', { SkillName: 'C', NormalizedName: 'c' }), false);
  assert.equal(recommendations.hasSkill('.NET', { SkillName: 'C# / .NET Core', NormalizedName: 'dotnet' }), true);
  assert.deepEqual(recommendations.rankPreparedJobs('React', recommendations.prepareCatalog(jobs, [], skills)), recommendations.rankJobs('React', jobs, [], skills));
});

after(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
  if (pool) await pool.close();
  try { await (await getPool()).close(); } catch {}
  if (created && /^JobtimizeNotificationsTest_[a-f0-9]{8}$/.test(database)) {
    execFileSync('sqlcmd', ['-S', 'localhost', '-E', '-C', '-b', '-Q', `ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}];`]);
  }
});
