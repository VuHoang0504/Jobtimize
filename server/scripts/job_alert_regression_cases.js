const assert = require('node:assert/strict');
const worker = require('../src/services/notificationService');
const store = require('../src/services/notificationStore');
const realtime = require('../src/services/notificationRealtime');

module.exports = async ({ t, call, executeQuery: query, seedUser, admin, base, headers }) => {
  const json = verified => JSON.stringify({ personal: { fullName: 'Job alert fixture' }, skills: [{ name: 'React', canonicalName: 'React', verified }] });
  const owner = await seedUser('alert-employer@example.org', 'Employer');
  await query("INSERT Employers(UserID,CompanyName,KYCStatus) VALUES(@ID,N'Alert test company','Approved')", { ID: owner });
  async function candidate(name, options = {}) {
    const userId = await seedUser(`alert-${name}@example.org`, 'Candidate');
    const profileId = (await query('INSERT CandidateProfiles(UserID,IsLookingForJob) OUTPUT INSERTED.ProfileID VALUES(@ID,@Looking)', { ID: userId, Looking: options.looking !== false })).recordset[0].ProfileID;
    const cvId = (await query("INSERT CVs(ProfileID,Title,FileUrl,CvType,IsPrimary) OUTPUT INSERTED.CVID VALUES(@ID,N'Alert CV','private-test','Upload',@Primary)", { ID: profileId, Primary: options.primary !== false })).recordset[0].CVID;
    await query(`INSERT CVDocumentVersions(CVID,ProfileID,VersionNumber,ContentHash,SourceType,Status,ConfirmedJson)
      VALUES(@CV,@Profile,1,REPLICATE('a',64),'Upload',@Status,@Data)`, { CV: cvId, Profile: profileId, Status: options.status || 'Ready', Data: options.data || json(options.verified !== false) });
    if (options.locked) await query("UPDATE Users SET Status='Locked' WHERE UserID=@ID", { ID: userId });
    return { userId, profileId, cvId };
  }
  const matching = await candidate('matching');
  const excluded = [await candidate('unverified', { verified: false }), await candidate('not-looking', { looking: false }),
    await candidate('locked', { locked: true }), await candidate('no-primary', { primary: false }),
    await candidate('review', { status: 'NeedsReview' }), await candidate('different-skill', { data: JSON.stringify({ skills: [{ name: 'Figma', verified: true }] }) })];
  const applied = await candidate('already-applied'); excluded.push(applied);
  const skill = (await query("SELECT TOP 1 SkillID FROM SkillTaxonomy WHERE SkillName IN ('React','React.js','ReactJS') ORDER BY SkillID")).recordset[0];
  assert.ok(skill);
  const body = { title: 'Immediate React opportunity', description: 'Build React applications', requirements: 'React experience', location: 'Da Nang', skills: [{ skillId: skill.SkillID, isMandatory: true }] };
  let jobId;
  const readAlerts = async userId => (await call('GET', '/notifications', userId)).body.data.filter(n => n.type === 'job_match_alert' && n.href === `/jobs/${jobId}`);

  await t.test('pending jobs never alert candidates; failed edits roll back content, skills and outbox together', async () => {
    const result = await call('POST', '/employer/jobs', owner, body);
    assert.equal(result.status, 201, JSON.stringify(result.body)); jobId = result.body.data.JobID;
    await worker.drainOutbox();
    assert.equal((await readAlerts(matching.userId)).length, 0);
    const failed = await call('PUT', `/employer/jobs/${jobId}`, owner, { ...body, title: 'Must roll back', skills: [{ skillId: -9999 }] });
    assert.equal(failed.status, 500);
    assert.equal((await query('SELECT Title FROM JobPostings WHERE JobID=@ID', { ID: jobId })).recordset[0].Title, body.title);
    assert.equal((await query('SELECT SkillID FROM JobSkillRequirements WHERE JobID=@ID', { ID: jobId })).recordset[0].SkillID, skill.SkillID);
    assert.equal((await query("SELECT COUNT(*) n FROM NotificationOutbox WHERE EventType='job_match_alert' AND JSON_VALUE(Payload,'$.jobId')=@ID", { ID: jobId })).recordset[0].n, 0);
  });

  await query("INSERT JobApplications(JobID,ProfileID,CVID,Status) VALUES(@Job,@Profile,@CV,'Applied')", { Job: jobId, Profile: applied.profileId, CV: applied.cvId });
  // More than one persisted batch, all on the disposable regression database.
  await query(`DECLARE @Users TABLE(UserID INT); DECLARE @Profiles TABLE(ProfileID INT); DECLARE @CVs TABLE(CVID INT,ProfileID INT);
    WITH n AS(SELECT TOP 105 ROW_NUMBER() OVER(ORDER BY object_id) n FROM sys.all_objects)
    INSERT Users(Email,PasswordHash,FullName,Status,IsEmailVerified) OUTPUT INSERTED.UserID INTO @Users
      SELECT CONCAT('alert-bulk-',n,'@example.org'),'not-a-login-password',CONCAT('Alert fixture ',n),'Active',1 FROM n;
    INSERT UserRoles(UserID,RoleID) SELECT u.UserID,r.RoleID FROM @Users u CROSS JOIN Roles r WHERE r.RoleName='Candidate';
    INSERT CandidateProfiles(UserID,IsLookingForJob) OUTPUT INSERTED.ProfileID INTO @Profiles SELECT UserID,1 FROM @Users;
    INSERT CVs(ProfileID,Title,FileUrl,IsPrimary) OUTPUT INSERTED.CVID,INSERTED.ProfileID INTO @CVs SELECT ProfileID,'Bulk fixture','private-test',1 FROM @Profiles;
    INSERT CVDocumentVersions(CVID,ProfileID,VersionNumber,ContentHash,SourceType,Status,ConfirmedJson)
      SELECT CVID,ProfileID,1,REPLICATE('b',64),'Upload','Ready',@Data FROM @CVs;`, { Data: json(true) });

  await t.test('approval wakes matching immediately, persists all batches and pushes only an authenticated inbox signal', async () => {
    assert.equal((await call('GET', '/notifications/stream')).status, 401);
    const controller = new AbortController();
    const response = await fetch(`${base}/notifications/stream`, { headers: headers(matching.userId), signal: controller.signal });
    assert.equal(response.status, 200); assert.match(response.headers.get('content-type'), /text\/event-stream/);
    const reader = response.body.getReader();
    const connected = new TextDecoder().decode((await reader.read()).value);
    assert.match(connected, /event: connected/);
    const stop = worker.startWorker();
    let timeout;
    try {
      assert.equal((await call('PATCH', `/admin/jobs/${jobId}/moderate`, admin, { status: 'Published' })).status, 200);
      const changed = await Promise.race([(async () => {
        while (true) {
          const chunk = await reader.read();
          if (chunk.done) throw new Error('Stream closed before delivery');
          const text = new TextDecoder().decode(chunk.value);
          if (text.includes('event: notifications-changed')) return text;
        }
      })(), new Promise((_, reject) => { timeout = setTimeout(() => reject(new Error('Realtime notice not received')), 8000); })]);
      assert.ok(!changed.includes('React') && !changed.includes('Company') && !changed.includes('Bearer'), 'The signal must contain no private notification details');
      const deadline = Date.now() + 8000;
      let count = 0;
      do {
        count = (await query(`SELECT COUNT(*) n FROM Notifications n JOIN Users u ON u.UserID=n.UserID
          WHERE n.JobID=@Job AND n.Type='job_match_alert' AND u.Email LIKE 'alert-bulk-%'`, { Job: jobId })).recordset[0].n;
        if (count === 105) break;
        await new Promise(resolve => setTimeout(resolve, 40));
      } while (Date.now() < deadline);
      assert.equal(count, 105, 'Every matching candidate must be reached across the batch boundary');
      assert.equal((await readAlerts(matching.userId)).length, 1);
      const firstAlert = (await readAlerts(matching.userId))[0];
      assert.equal((await call('GET', '/notifications?page=2', matching.userId)).body.latestOpportunity.id, firstAlert.id,
        'The latest opportunity must be available independently of inbox pagination');
      assert.equal((await call('GET', '/notifications', owner)).body.latestOpportunity, null, 'An employer cannot receive a candidate preview');
      for (const user of excluded) assert.equal((await query("SELECT COUNT(*) n FROM Notifications WHERE UserID=@User AND JobID=@Job AND Type='job_match_alert'", { User: user.userId, Job: jobId })).recordset[0].n, 0);
    } finally { clearTimeout(timeout); controller.abort(); await reader.cancel().catch(() => {}); await stop(); }
  });

  await t.test('same edits do not duplicate alerts or reset read state; meaningful edits create one replacement', async () => {
    const first = (await readAlerts(matching.userId))[0];
    assert.equal((await call('PATCH', `/notifications/${first.id}/read`, matching.userId)).status, 200);
    const same = await call('PUT', `/employer/jobs/${jobId}`, owner, { ...body, title: ' Immediate   React opportunity ' });
    assert.equal(same.status, 200, JSON.stringify(same.body)); await worker.drainOutbox();
    const unchanged = await readAlerts(matching.userId);
    assert.equal(unchanged.length, 1); assert.equal(unchanged[0].id, first.id); assert.ok(unchanged[0].readAt);
    const updated = await call('PUT', `/employer/jobs/${jobId}`, owner, { ...body, salaryRange: '25-35 million VND' });
    assert.equal(updated.status, 200, JSON.stringify(updated.body)); await worker.drainOutbox();
    const replacement = await readAlerts(matching.userId);
    assert.equal(replacement.length, 1); assert.notEqual(replacement[0].id, first.id); assert.equal(replacement[0].readAt, null);
    assert.equal((await call('PUT', `/employer/jobs/${jobId}`, owner, body)).status, 200);
    await worker.drainOutbox();
    const reverted = await readAlerts(matching.userId);
    assert.equal(reverted.length, 1); assert.equal(reverted[0].id, first.id);
    assert.ok(reverted[0].readAt, 'Returning to an old revision must rescore and preserve its previous read state');
  });

  await t.test('a failed delivery keeps its cursor retryable and restores all recipients without duplicates', async () => {
    await query(`ALTER TABLE Notifications WITH NOCHECK ADD CONSTRAINT CK_Alert_Retry_Fixture CHECK(Type<>'job_match_alert' OR UserID<>${matching.userId})`);
    try {
      assert.equal((await call('PUT', `/employer/jobs/${jobId}`, owner, { ...body, salaryRange: 'Retry fixture salary' })).status, 200);
      await worker.drainOutbox();
      const pending = (await query(`SELECT TOP 1 * FROM NotificationOutbox WHERE EventType='job_match_alert'
        AND JSON_VALUE(Payload,'$.jobId')=@ID ORDER BY OutboxID DESC`, { ID: jobId })).recordset[0];
      assert.equal(pending.ProcessedAt, null); assert.ok(pending.Attempts >= 1);
      assert.equal(JSON.parse(pending.Payload).afterProfileId, 0, 'Failed writes cannot advance the batch cursor');
    } finally { await query('ALTER TABLE Notifications DROP CONSTRAINT CK_Alert_Retry_Fixture'); }
    await query("UPDATE NotificationOutbox SET AvailableAt=SYSUTCDATETIME() WHERE EventType='job_match_alert' AND ProcessedAt IS NULL");
    await worker.drainOutbox();
    assert.equal((await readAlerts(matching.userId)).length, 1);
    const completed = (await query(`SELECT COUNT(*) n FROM NotificationOutbox WHERE EventType='job_match_alert'
      AND JSON_VALUE(Payload,'$.jobId')=@ID AND ProcessedAt IS NULL`, { ID: jobId })).recordset[0].n;
    assert.equal(completed, 0);
  });

  await t.test('closed, expired, applied or changed-CV alerts vanish immediately from the authenticated inbox', async () => {
    await query("UPDATE JobPostings SET Status='Closed' WHERE JobID=@ID", { ID: jobId });
    assert.equal((await readAlerts(matching.userId)).length, 0);
    await query("UPDATE JobPostings SET Status='Published',ExpiresAt=DATEADD(DAY,-1,GETDATE()) WHERE JobID=@ID", { ID: jobId });
    assert.equal((await readAlerts(matching.userId)).length, 0);
    await query('UPDATE JobPostings SET ExpiresAt=NULL WHERE JobID=@ID', { ID: jobId });
    await query(`INSERT CVDocumentVersions(CVID,ProfileID,VersionNumber,ContentHash,SourceType,Status,ConfirmedJson)
      VALUES(@CV,@Profile,2,REPLICATE('c',64),'Upload','NeedsReview',@Data)`, { CV: matching.cvId, Profile: matching.profileId, Data: json(true) });
    assert.equal((await readAlerts(matching.userId)).length, 0, 'A new unconfirmed version invalidates previous-CV alerts');
    await store.withTransaction(transaction => store.putNotification(transaction, {
      userId: matching.userId, role: 'Candidate', type: 'job_match', key: 'test:stale-recommendation-after-cv-change',
      jobId, cvId: matching.cvId, title: 'Old CV recommendation', body: 'Must stay hidden until CV confirmation', href: `/jobs/${jobId}`
    }));
    const inbox = (await call('GET', '/notifications', matching.userId)).body;
    assert.ok(!inbox.data.some(n => n.href === `/jobs/${jobId}` && n.type === 'job_match'), 'Ordinary recommendations must not bypass the unconfirmed-CV guard');
    assert.equal(inbox.latestOpportunity, null);
  });

  await t.test('concurrent job edits, applications and multiple delivery workers preserve the ATS and suppress applied-job alerts', async () => {
    const concurrent = await candidate('concurrent-application');
    const data = JSON.stringify({ personal: { fullName: 'Concurrent applicant' }, skills: [{ skillId: skill.SkillID, name: 'React', canonicalName: 'React', verified: true }] });
    await query('UPDATE CVDocumentVersions SET ConfirmedJson=@Data WHERE CVID=@CV', { Data: data, CV: concurrent.cvId });
    const [edit, application] = await Promise.all([
      call('PUT', `/employer/jobs/${jobId}`, owner, { ...body, location: 'Concurrent location' }),
      call('POST', '/jobs/apply', concurrent.userId, { jobId, cvId: concurrent.cvId }),
      worker.drainOutbox()
    ]);
    assert.equal(edit.status, 200, JSON.stringify(edit.body));
    assert.equal(application.status, 201, JSON.stringify(application.body));
    await Promise.all([worker.drainOutbox(), worker.drainOutbox()]);
    assert.equal((await readAlerts(concurrent.userId)).length, 0, 'An application immediately suppresses matching alerts');
    const count = (await query('SELECT COUNT(*) n FROM JobApplications WHERE JobID=@Job AND ProfileID=@Profile', { Job: jobId, Profile: concurrent.profileId })).recordset[0].n;
    assert.equal(count, 1);
    const employerInbox = (await call('GET', '/notifications', owner)).body;
    assert.ok(employerInbox.data.some(n => n.type === 'application' && n.href.startsWith(`/employer/ats/${jobId}?`)), 'The employer still receives the original ATS event');
    const duplicates = (await query(`SELECT UserID,COUNT(*) n FROM Notifications WHERE JobID=@Job AND Type='job_match_alert' AND IsActive=1
      GROUP BY UserID HAVING COUNT(*)>1`, { Job: jobId })).recordset;
    assert.equal(duplicates.length, 0);
  });

  await t.test('rolled-back transactions cannot wake matching or publish phantom realtime events', async () => {
    let wake = 0; const off = realtime.onOutbox(() => wake++);
    try {
      await assert.rejects(store.withTransaction(async transaction => {
        await store.enqueue(transaction, 'job_match_alert', { jobId }, 'test:job-alert-rollback');
        throw new Error('Rollback fixture');
      }), /Rollback fixture/);
      assert.equal(wake, 0);
      assert.equal((await query("SELECT COUNT(*) n FROM NotificationOutbox WHERE EventKey='test:job-alert-rollback'")).recordset[0].n, 0);
    } finally { off(); }
  });
};
