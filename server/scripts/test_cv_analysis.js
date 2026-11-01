// Integration suite: creates and drops ONLY a uniquely named, empty test database.
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('crypto');
const { execFileSync } = require('child_process');
const fs = require('fs/promises');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const database = `JobtimizeCVTest_${randomUUID().slice(0, 8)}`;
if (!/^JobtimizeCVTest_[a-f0-9]{8}$/.test(database) || database === process.env.DB_NAME) throw new Error('Unsafe test database name');
if (process.platform !== 'win32') throw new Error('This SQL integration harness requires local Windows sqlcmd.');
const login = process.env.DB_USER;
if (!/^[a-zA-Z0-9_]+$/.test(login)) throw new Error('Unsupported test login');
execFileSync('sqlcmd', ['-S', 'localhost', '-E', '-C', '-b', '-Q', `CREATE DATABASE [${database}]`]);
let created = true;
process.env.DB_NAME = database;
process.env.JWT_SECRET = 'isolated-cv-analysis-regression';
// No external model calls: deterministic responses exercise the real persistence and API.
process.env.AI_PROVIDER = 'gemini';
process.env.GEMINI_API_KEY = 'isolated-test-key';
const sql = require('mssql');
const express = require('express');
const jwt = require('jsonwebtoken');
const sharp = require('sharp');
const { GoogleGenerativeAI } = require('@google/generative-ai');
let modelOutput, rejectModel = false, seenImage = false, modelCalls = 0, lastModelInput;
const originalModel = GoogleGenerativeAI.prototype.getGenerativeModel;
GoogleGenerativeAI.prototype.getGenerativeModel = () => ({ generateContent: async parts => {
  modelCalls++; lastModelInput = parts;
  seenImage = parts.some(part => part.inlineData);
  if (rejectModel) throw new Error('Synthetic provider outage');
  return { response: { candidates: [{ finishReason: 'STOP' }], text: () => JSON.stringify(modelOutput) } };
} });
const db = require('../src/config/db');
const service = require('../src/services/cvAnalysisService');
const matching = require('../src/services/aiMatchingService');
const documents = require('../src/services/cvDocumentService');
let pool, server, base;
const storedFiles = new Set();
const tokens = {};
async function call(method, route, user = 'owner', body) {
  const headers = tokens[user] ? { Authorization: `Bearer ${tokens[user]}` } : {};
  if (body && !(body instanceof FormData)) headers['Content-Type'] = 'application/json';
  const response = await fetch(base + route, { method, headers, body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined });
  return { status: response.status, data: await response.json() };
}
async function upload(buffer, filename, route = '') {
  const body = new FormData(); body.append('title', 'CV synthetic'); body.append('cvFile', new Blob([buffer]), filename);
  return call('POST', '/cv-documents' + route, 'owner', body);
}
async function version(cvId) {
  const row = await service.latest(cvId, 1);
  if (row?.FileName) storedFiles.add(row.FileName);
  return row;
}
test('CV upload, parsing, review, chosen-CV matching and application snapshots', { timeout: 120000 }, async t => {
  if (login !== 'sa') execFileSync('sqlcmd', ['-S', 'localhost', '-E', '-C', '-b', '-d', database, '-Q', `CREATE USER [${login}] FOR LOGIN [${login}]; ALTER ROLE db_owner ADD MEMBER [${login}];`]);
  pool = await new sql.ConnectionPool(db.config).connect();
  assert.equal((await pool.request().query('SELECT COUNT(*) n FROM sys.tables')).recordset[0].n, 0);
  for (const file of ['schema.sql', 'seed.sql']) {
    const source = (await fs.readFile(path.resolve(__dirname, '../../database', file), 'utf8')).replace(/\bJobtimizeDB\b/g, database);
    for (const batch of source.split(/^\s*GO\s*$/im).filter(s => s.trim())) await pool.request().query(batch);
  }
  await service.initialize(); await service.initialize();
  await require('../src/services/notificationService').initialize();
  const users = {};
  for (const [key, role] of [['owner', 'Candidate'], ['other', 'Candidate'], ['employer', 'Employer']]) {
    users[key] = (await db.executeQuery(`INSERT Users(Email,PasswordHash,FullName,Status,IsEmailVerified) OUTPUT INSERTED.UserID VALUES(@Email,'unused',@Name,'Active',1)`, { Email: `${key}@cv-test.invalid`, Name: key })).recordset[0].UserID;
    await db.executeQuery('INSERT UserRoles SELECT @ID,RoleID FROM Roles WHERE RoleName=@Role', { ID: users[key], Role: role });
    tokens[key] = jwt.sign({ userId: users[key] }, process.env.JWT_SECRET);
  }
  const profileId = (await db.executeQuery('INSERT CandidateProfiles(UserID,IsLookingForJob,Bio) OUTPUT INSERTED.ProfileID VALUES(@ID,1,\'Python Java\')', { ID: users.owner })).recordset[0].ProfileID;
  await db.executeQuery('INSERT CandidateProfiles(UserID) VALUES(@ID)', { ID: users.other });
  const employerId = (await db.executeQuery("INSERT Employers(UserID,CompanyName) OUTPUT INSERTED.EmployerID VALUES(@ID,'Test Employer')", { ID: users.employer })).recordset[0].EmployerID;
  const jobId = (await db.executeQuery("INSERT JobPostings(EmployerID,Title,Description,Requirements,Status) OUTPUT INSERTED.JobID VALUES(@ID,'React Developer','React.js and Python','React.js and Python','Published')", { ID: employerId })).recordset[0].JobID;
  const react = (await db.executeQuery("SELECT TOP 1 SkillID FROM SkillTaxonomy WHERE SkillName='React.js'")).recordset[0].SkillID;
  const python = (await db.executeQuery("SELECT TOP 1 SkillID FROM SkillTaxonomy WHERE SkillName='Python'")).recordset[0].SkillID;
  await db.executeQuery('INSERT JobSkillRequirements(JobID,SkillID,IsMandatory) VALUES(@ID,@React,1),(@ID,@Python,0)', { ID: jobId, React: react, Python: python });
  const app = express(); app.use(express.json({ limit: '320kb' }));
  app.use('/cv-documents', require('../src/routes/cvAnalysisRoutes'));
  app.use('/candidate', require('../src/routes/candidateRoutes'));
  app.use('/jobs', require('../src/routes/jobRoutes'));
  app.use((error, req, res, next) => res.status(error.status || 500).json({ success: false, message: error.message }));
  server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
  let cvId, readyVersion, pdf;
  const analysis = { personal: { fullName: 'Nguyễn Minh An', email: 'an@example.org' }, skills: [{ name: 'ReactJS', evidence: 'Built applications using ReactJS.' }] };
  await t.test('invalid files, unauthenticated requests and wrong roles are rejected', async () => {
    assert.equal((await call('GET', '/cv-documents', 'anonymous')).status, 401);
    assert.equal((await call('GET', '/cv-documents', 'employer')).status, 403);
    assert.equal((await upload(Buffer.from('renamed malicious content'), 'CV.pdf')).status, 400);
    assert.equal((await upload(Buffer.from('legacy'), 'CV.doc')).status, 400);
  });
  await t.test('selectable PDF retains Vietnamese content; upload remains unscored before review', async () => {
    const payload = await documents.normalizePayload({ title: 'Synthetic', template: 'minimal', cvData: { personal: analysis.personal, summary: 'Built applications using ReactJS. Experienced frontend developer working on accessible customer applications.', skills: { hardSkills: ['ReactJS'] } } }, users.owner);
    pdf = await documents.createPDF(payload, users.owner);
    const extracted = await service.readDocument(pdf, 'pdf');
    assert.ok(extracted.text.includes('Nguyễn Minh An')); assert.ok(extracted.text.includes('ReactJS'));
    const response = await upload(pdf, 'CV.pdf'); assert.equal(response.status, 201, JSON.stringify(response)); cvId = response.data.data.CVID;
    await version(cvId);
    assert.equal((await matching.calculateMatchScore(profileId, jobId, cvId)).matchScore, null);
    assert.equal((await call('GET', '/cv-documents/' + cvId, 'other')).status, 404);
    const denied = await fetch(base + `/cv-documents/${cvId}/file`, { headers: { Authorization: `Bearer ${tokens.other}` } }); assert.equal(denied.status, 404);
    modelOutput = analysis; await service.processNext();
    const row = await version(cvId); assert.equal(row.Status, 'NeedsReview'); assert.equal(row.ParseMethod, 'text'); assert.equal(seenImage, false);
    assert.equal((await matching.calculateMatchScore(profileId, jobId, cvId)).matchScore, null);
  });
  await t.test('confirmation canonicalizes skills, ignores profile bio and other CVs, freezes applications', async () => {
    const row = await version(cvId);
    assert.equal((await call('PUT', `/cv-documents/${cvId}/analysis`, 'owner', { versionId: -1, analysis })).status, 409);
    assert.equal((await call('PUT', `/cv-documents/${cvId}/analysis`, 'owner', { versionId: row.VersionID, analysis })).status, 200);
    readyVersion = await version(cvId);
    const second = await call('POST', '/candidate/cv/online', 'owner', { title: 'Other CV', template: 'minimal', cvData: { personal: { fullName: 'Nguyễn Minh An' }, skills: { hardSkills: ['Python'] } } });
    assert.equal(second.status, 201, JSON.stringify(second));
    assert.equal((await matching.calculateMatchScore(profileId, jobId, second.data.data.CVID)).matchScore, 33);
    const stale = (await db.executeQuery('SELECT * FROM CVs WHERE CVID=@ID', { ID: second.data.data.CVID })).recordset[0];
    const builderBefore = await version(stale.CVID);
    const updated = await call('PUT', `/candidate/cv/online/${stale.CVID}`, 'owner', { title: 'Other CV updated', template: 'minimal', cvData: { personal: { fullName: 'Nguyễn Minh An' }, skills: { hardSkills: ['Python', 'Docker'] } } });
    assert.equal(updated.status, 200, JSON.stringify(updated));
    const builderAfter = await version(stale.CVID);
    assert.notEqual(builderAfter.VersionID, builderBefore.VersionID);
    assert.equal((await service.ensureVersion(stale)).VersionID, builderAfter.VersionID, 'A stale reader must never recreate an older builder snapshot');
    const noCriteriaJob = (await db.executeQuery("INSERT JobPostings(EmployerID,Title,Description,Requirements,Status) OUTPUT INSERTED.JobID VALUES(@ID,'General role','General role','General role','Published')", { ID: employerId })).recordset[0].JobID;
    const noCriteria = await call('POST', '/jobs/apply', 'owner', { jobId: noCriteriaJob, cvId: stale.CVID });
    assert.equal(noCriteria.status, 201, JSON.stringify(noCriteria)); assert.equal(noCriteria.data.data.application.MatchScore, null);
    const match = await matching.calculateMatchScore(profileId, jobId, cvId);
    assert.equal(match.matchScore, 67); assert.equal(match.matchedSkills[0].skillId, react); assert.equal(match.missingSkills[0].skillId, python);
    const applied = await call('POST', '/jobs/apply', 'owner', { jobId, cvId }); assert.equal(applied.status, 201, JSON.stringify(applied));
    const applicationId = applied.data.data.application.ApplicationID;
    assert.equal(applied.data.data.application.CVVersionID, readyVersion.VersionID);
    const edited = { ...analysis, skills: [{ name: 'Python', evidence: 'Manually confirmed' }] };
    assert.equal((await call('PUT', `/cv-documents/${cvId}/analysis`, 'owner', { versionId: readyVersion.VersionID, analysis: edited })).status, 200);
    assert.notEqual((await version(cvId)).VersionID, readyVersion.VersionID);
    assert.equal(JSON.parse((await db.executeQuery('SELECT ConfirmedJson FROM CVDocumentVersions WHERE VersionID=@ID', { ID: readyVersion.VersionID })).recordset[0].ConfirmedJson).skills[0].canonicalName, 'React.js');
    const replaced = await upload(Buffer.concat([pdf, Buffer.from('\n')]), 'updated.pdf', `/${cvId}/versions`);
    assert.equal(replaced.status, 201); assert.notEqual((await version(cvId)).FileName, readyVersion.FileName);
    assert.equal((await call('DELETE', '/cv-documents/' + cvId)).status, 200);
    assert.equal((await call('GET', '/cv-documents/' + cvId)).status, 404);
    const download = await fetch(base + `/cv-documents/applications/${applicationId}/file`, { headers: { Authorization: `Bearer ${tokens.employer}` } });
    assert.equal(download.status, 200); assert.deepEqual(Buffer.from(await download.arrayBuffer()), pdf);
    assert.equal((await fetch(base + `/cv-documents/applications/${applicationId}/file`, { headers: { Authorization: `Bearer ${tokens.other}` } })).status, 404);
  });
  await t.test('scanned content uses image input; provider failure has no fabricated data and can be retried', async () => {
    const image = await sharp({ create: { width: 300, height: 500, channels: 3, background: '#ffffff' } }).png().toBuffer();
    const result = await upload(image, 'CV.png'); assert.equal(result.status, 201); const id = result.data.data.CVID; await version(id);
    rejectModel = true; await service.processNext();
    const failed = await version(id); assert.equal(failed.Status, 'Failed'); assert.equal(failed.ConfirmedJson, null); assert.equal(failed.ParsedJson, null);
    assert.equal((await matching.calculateMatchScore(profileId, jobId, id)).matchScore, null);
    assert.equal((await call('POST', `/cv-documents/${id}/retry`)).status, 200);
    rejectModel = false; modelOutput = { ...analysis, transcript: 'Nguyễn Minh An\nan@example.org\nBuilt applications using ReactJS.' }; await service.processNext();
    assert.equal(seenImage, true); assert.equal((await version(id)).Status, 'NeedsReview');
  });
  await t.test('job recommendations reuse confirmed CV versions, rank consistently and exclude unavailable jobs', async () => {
    const createCV = async skills => {
      const result = await call('POST', '/candidate/cv/online', 'owner', { title: 'Recommendation CV', template: 'minimal', cvData: { personal: { fullName: 'Test Candidate' }, skills: { hardSkills: skills } } });
      assert.equal(result.status, 201, JSON.stringify(result)); return result.data.data.CVID;
    };
    const reactCV = await createCV(['React.js']), pythonCV = await createCV(['Python']), emptyCV = await createCV([]);
    const category = (await db.executeQuery('SELECT TOP 1 CategoryID FROM JobCategories ORDER BY CategoryID')).recordset[0].CategoryID;
    const createJob = async (title, status = 'Published', expired = false) => {
      const row = (await db.executeQuery(`INSERT JobPostings(EmployerID,Title,Description,Requirements,Status,ExpiresAt,Location,CategoryID)
        OUTPUT INSERTED.JobID VALUES(@Employer,@Title,'React.js','React.js',@Status,CASE WHEN @Expired=1 THEN DATEADD(day,-1,GETDATE()) ELSE NULL END,N'Hà Nội',@Category)`, { Employer: employerId, Title: title, Status: status, Expired: expired, Category: category })).recordset[0];
      await db.executeQuery('INSERT JobSkillRequirements(JobID,SkillID,IsMandatory) VALUES(@Job,@React,1)', { Job: row.JobID, React: react });
      return row.JobID;
    };
    const perfect = await createJob('Recommendation React'), expired = await createJob('Expired React', 'Published', true), draft = await createJob('Draft React', 'Draft');
    const noCriteria = (await db.executeQuery("INSERT JobPostings(EmployerID,Title,Description,Requirements,Status) OUTPUT INSERTED.JobID VALUES(@Employer,'Unspecified role','General tasks','General experience','Published')", { Employer: employerId })).recordset[0].JobID;
    const before = (await db.executeQuery('SELECT COUNT(*) n FROM CVDocumentVersions')).recordset[0].n;
    const oldEnsure = service.ensureVersion, oldRead = service.readDocument;
    service.ensureVersion = () => { throw new Error('Recommendations must not capture or read CV files'); };
    service.readDocument = () => { throw new Error('Recommendations must not parse CV files'); };
    try {
      const first = await call('POST', '/candidate/skill-gap', 'owner', { cvId: reactCV, jobId });
      assert.equal(first.status, 200, JSON.stringify(first)); const result = first.data.data;
      assert.equal(result.status, 'Ready'); assert.equal(result.analysis.matchScore, 67);
      assert.equal(result.selectedCV.cvId, reactCV); assert.equal(result.analysis.cvVersionId, result.selectedCV.versionId);
      assert.ok(result.jobs.find(job => job.JobID === perfect));
      assert.ok(!result.jobs.some(job => [expired, draft, noCriteria].includes(job.JobID)));
      assert.ok(result.jobs.every((job, i, jobs) => !i || jobs[i - 1].matchScore >= job.matchScore));
      assert.ok(result.analysis.recommendedCourses.some(course => course.Language === 'vi' && course.skills.some(skill => skill.skillId === python)));
      assert.ok(result.analysis.recommendedCourses.some(course => course.Language === 'en'));
      assert.ok(result.analysis.recommendedCourses.every(course => course.skills.every(skill => result.analysis.missingSkills.some(missing => missing.skillId === skill.skillId))));
      const changed = await call('POST', '/candidate/skill-gap', 'owner', { cvId: pythonCV, jobId });
      assert.equal(changed.data.data.analysis.matchScore, 33);
      const filtered = await call('POST', '/candidate/skill-gap', 'owner', { cvId: reactCV, categoryId: category, keyword: 'Recommendation React', location: 'Hà Nội' });
      assert.deepEqual(filtered.data.data.jobs.map(job => job.JobID), [perfect]);
      const outsideFilter = await call('POST', '/candidate/skill-gap', 'owner', { cvId: reactCV, jobId, keyword: 'No such result' });
      assert.equal(outsideFilter.data.data.jobs.length, 0); assert.equal(outsideFilter.data.data.analysis.job.JobID, jobId);
      const zero = await call('POST', '/candidate/skill-gap', 'owner', { cvId: pythonCV, jobId: perfect });
      assert.equal(zero.data.data.analysis.matchScore, 0);
      assert.ok(zero.data.data.jobs.some(job => job.JobID === perfect && job.matchScore === 0));
      const emptyResult = (await call('POST', '/candidate/skill-gap', 'owner', { cvId: emptyCV })).data.data;
      assert.equal(emptyResult.status, 'Ready'); assert.equal(emptyResult.verifiedSkillCount, 0);
      const all = (await call('POST', '/candidate/skill-gap', 'owner', { cvId: emptyCV, scope: 'all' })).data.data;
      assert.ok(all.jobs.some(job => job.JobID === perfect && job.matchScore === 0));
      const unready = (await db.executeQuery("SELECT TOP 1 CVID FROM CVDocumentVersions WHERE Status='NeedsReview' AND ProfileID=@Profile ORDER BY VersionID DESC", { Profile: profileId })).recordset[0];
      assert.ok(unready); assert.equal((await call('POST', '/candidate/skill-gap', 'owner', { cvId: unready.CVID })).data.data.status, 'NotReady');
      assert.equal((await call('POST', '/candidate/skill-gap', 'owner', { cvId: reactCV, jobId: noCriteria })).data.data.analysis.status, 'NoCriteria');
      for (const invalid of [expired, draft, 2147483647]) assert.equal((await call('POST', '/candidate/skill-gap', 'owner', { cvId: reactCV, jobId: invalid })).status, 404);
      assert.equal((await call('POST', '/candidate/skill-gap', 'other', { cvId: reactCV })).status, 404);
      assert.equal((await call('POST', '/candidate/skill-gap', 'employer', { cvId: reactCV })).status, 403);
      assert.equal((await call('POST', '/candidate/skill-gap', 'anonymous', {})).status, 401);
      assert.equal((await call('POST', '/candidate/skill-gap', 'owner', { cvId: '1 OR 1=1' })).status, 400);
      assert.equal((await call('POST', '/candidate/skill-gap/insights', 'other', { cvId: reactCV, jobId })).status, 404);
      assert.equal((await call('POST', '/candidate/skill-gap/insights', 'employer', { cvId: reactCV, jobId })).status, 403);
      assert.equal((await call('POST', '/candidate/skill-gap/insights', 'owner', {})).status, 400);
      await db.executeQuery("UPDATE Users SET Status='Inactive' WHERE UserID=@ID", { ID: users.employer });
      assert.equal((await call('POST', '/candidate/skill-gap', 'owner', { cvId: reactCV, jobId })).status, 404);
    } finally {
      service.ensureVersion = oldEnsure; service.readDocument = oldRead;
      await db.executeQuery("UPDATE Users SET Status='Active' WHERE UserID=@ID", { ID: users.employer });
    }
    assert.equal((await db.executeQuery('SELECT COUNT(*) n FROM CVDocumentVersions')).recordset[0].n, before);
    assert.equal((await call('GET', `/jobs/${jobId}/match?cvId=${reactCV}`)).data.data.matchScore, 67);
  });
  await t.test('AI job insights use saved CV data, cache by CV version and job requirements, and fail independently', async () => {
    const created = await call('POST', '/candidate/cv/online', 'owner', { title: 'AI insights CV', template: 'minimal', cvData: { personal: { fullName: 'Private Candidate', email: 'private-insights@example.invalid' }, skills: { hardSkills: ['React.js'] } } });
    assert.equal(created.status, 201); const insightCV = created.data.data.CVID;
    const previousOutput = modelOutput, oldEnsure = service.ensureVersion, oldRead = service.readDocument;
    service.ensureVersion = service.readDocument = () => { throw new Error('Insights must reuse saved data'); };
    modelOutput = { summary: 'CV có React.js; cần bổ sung bằng chứng Python.', requirements: [
      { skillName: 'React.js', jobEvidence: 'React.js and Python', cvEvidence: 'React.js', reason: 'Có kỹ năng đã xác nhận.' },
      { skillName: 'Python', jobEvidence: 'React.js and Python', cvEvidence: '', reason: 'Chưa có bằng chứng.', nextStep: 'Xây dựng một API nhỏ với Python.' }
    ] };
    const beforeCalls = modelCalls;
    try {
      const responses = await Promise.all([1, 2].map(() => call('POST', '/candidate/skill-gap/insights', 'owner', { cvId: insightCV, jobId })));
      for (const response of responses) { assert.equal(response.status, 200, JSON.stringify(response)); assert.equal(response.data.data.status, 'Ready', JSON.stringify(response)); }
      assert.equal(modelCalls, beforeCalls + 1, 'Concurrent requests share one model call');
      assert.ok(!JSON.stringify(lastModelInput).includes('private-insights@example.invalid'));
      assert.ok(!JSON.stringify(lastModelInput).includes('Private Candidate'));
      const first = responses[0].data.data;
      assert.equal(first.requirements.find(skill => skill.skillId === react).status, 'matched');
      assert.equal(first.requirements.find(skill => skill.skillId === python).status, 'missing');
      assert.ok(first.recommendedCourses.some(course => course.skills.some(skill => skill.skillId === python)));
      const cached = await call('POST', '/candidate/skill-gap/insights', 'owner', { cvId: insightCV, jobId });
      assert.equal(cached.data.data.cached, true); assert.equal(modelCalls, beforeCalls + 1);
      assert.equal((await call('POST', '/candidate/skill-gap/insights', 'owner', { cvId: insightCV, jobId, cvVersionId: 2147483647 })).data.data.status, 'Stale');
      assert.equal((await call('POST', '/candidate/skill-gap/insights', 'owner', { cvId: insightCV, jobId, criteriaHash: 'outdated' })).data.data.status, 'Stale');
      assert.equal(modelCalls, beforeCalls + 1);
      await db.executeQuery("UPDATE JobPostings SET Requirements=Requirements+' Docker' WHERE JobID=@Job", { Job: jobId });
      assert.equal((await call('POST', '/candidate/skill-gap/insights', 'owner', { cvId: insightCV, jobId })).data.data.cached, false);
      assert.equal(modelCalls, beforeCalls + 2);
      const row = await version(insightCV);
      await db.executeQuery('UPDATE CVDocumentVersions SET ConfirmedJson=REPLACE(ConfirmedJson,@Old,@New) WHERE VersionID=@ID', { Old: 'React.js', New: 'ReactJS', ID: row.VersionID });
      assert.equal((await call('POST', '/candidate/skill-gap/insights', 'owner', { cvId: insightCV, jobId })).data.data.cached, false);
      assert.equal(modelCalls, beforeCalls + 3);
      modelOutput = {};
      await db.executeQuery("UPDATE JobPostings SET Requirements=Requirements+' Git' WHERE JobID=@Job", { Job: jobId });
      assert.equal((await call('POST', '/candidate/skill-gap/insights', 'owner', { cvId: insightCV, jobId })).data.data.status, 'Unavailable');
      const ordinary = await call('POST', '/candidate/skill-gap', 'owner', { cvId: insightCV, jobId });
      assert.equal(ordinary.status, 200); assert.equal(ordinary.data.data.analysis.matchScore, 67);
    } finally {
      modelOutput = previousOutput; service.ensureVersion = oldEnsure; service.readDocument = oldRead;
      await db.executeQuery("UPDATE JobPostings SET Requirements='React.js and Python' WHERE JobID=@Job", { Job: jobId });
    }
  });
  await t.test('DOCX extraction reads real document text and deduplicates identical uploads', async () => {
    const JSZip = require('jszip'); const zip = new JSZip();
    zip.file('[Content_Types].xml', '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
    zip.file('_rels/.rels', '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
    zip.file('word/document.xml', '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Nguyễn Minh An — Built applications using ReactJS.</w:t></w:r></w:p></w:body></w:document>');
    const buffer = await zip.generateAsync({ type: 'nodebuffer' });
    assert.ok((await service.readDocument(buffer, 'docx')).text.includes('Nguyễn Minh An'));
    const result = await upload(buffer, 'CV.docx'); assert.equal(result.status, 201); const id = result.data.data.CVID; const before = await version(id);
    const duplicate = await upload(buffer, 'CV.docx', `/${id}/versions`); assert.equal(duplicate.status, 201);
    assert.equal((await version(id)).VersionID, before.VersionID);
    modelOutput = analysis; await service.processNext(); assert.equal((await version(id)).Status, 'NeedsReview'); assert.equal(seenImage, false);
  });
});
after(async () => {
  GoogleGenerativeAI.prototype.getGenerativeModel = originalModel;
  if (server) await new Promise(resolve => server.close(resolve));
  await documents.closeBrowser();
  await Promise.all([...storedFiles].map(name => fs.unlink(service.filePath(name)).catch(() => {})));
  await (await db.getPool()).close().catch(() => {}); if (pool) await pool.close();
  if (created) { execFileSync('sqlcmd', ['-S', 'localhost', '-E', '-C', '-b', '-Q', `ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}];`]); created = false; }
});
