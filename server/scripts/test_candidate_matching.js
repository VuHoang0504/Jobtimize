const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const matching = require('../src/services/aiMatchingService');

function controller(query, access = true) {
  const module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src/controllers/candidateMatchingController.js'), 'utf8'), {
    module, console, require(name) {
      if (name === '../config/db') return { executeQuery: query };
      if (name === '../services/applicantMatchingAccess') return { canViewApplicantMatching: async () => access };
      if (name === '../services/aiMatchingService') return matching;
      throw new Error(`Unexpected dependency ${name}`);
    }
  });
  return module.exports;
}
const response = () => ({ code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } });
const criteria = [{ SkillID: 1, SkillName: 'React', IsMandatory: true }, { SkillID: 2, SkillName: 'SQL', IsMandatory: false }];
function cv(id, skills, overrides = {}) {
  return { ProfileID: id, CVID: id, CVTitle: 'CV', VersionStatus: 'Ready', VersionID: id, VersionNumber: 1,
    ConfirmedJson: JSON.stringify({ skills: skills.map(([skillId, name, verified = true]) => ({ skillId, name, verified })) }), ...overrides };
}

test('rank uses verified CV skills and mandatory weights, excludes unreadable and zero-match CVs', () => {
  const rank = controller(() => {}).rankCandidates;
  const result = rank([cv(1, [[2, 'SQL']]), cv(2, [[1, 'React']]), cv(3, [[1, 'React', false]]),
    cv(4, [[1, 'React'], [2, 'SQL']]), cv(5, [], { ConfirmedJson: 'invalid' }), cv(6, [[1, 'React']], { VersionStatus: 'Failed' })], criteria);
  assert.equal(result.map(row => row.ProfileID).join(','), '4,2,1');
  assert.equal(result[1].analysis.matchScore, 67);
  assert.equal(result[2].analysis.matchScore, 33);
  assert.equal(result[0].ConfirmedJson, undefined);
});

test('free account cannot run matching or query candidate data', async () => {
  let queries = 0;
  const c = controller(async () => { queries++; return { recordset: [{ EmployerID: 1 }] }; }, false);
  const res = response();
  await c.findCandidates({ user: { userId: 1 }, params: { jobId: '1' }, query: {} }, res);
  assert.equal(res.code, 403); assert.equal(queries, 1);
});

test('foreign or closed job cannot query the CV pool', async () => {
  let queries = 0;
  const c = controller(async (sql, params) => {
    queries++;
    if (queries === 1) return { recordset: [{ EmployerID: 10 }] };
    assert.match(sql, /EmployerID=@EmployerID/); assert.match(sql, /Status='Published'/);
    assert.match(sql, /ExpiresAt>GETDATE/); assert.equal(params.EmployerID, 10);
    return { recordset: [] };
  });
  const res = response();
  await c.findCandidates({ user: { userId: 1 }, params: { jobId: '9' }, query: {} }, res);
  assert.equal(res.code, 404); assert.equal(queries, 2);
});

test('job without recognizable criteria returns direction and does not scan CVs', async () => {
  let queries = 0;
  const c = controller(async () => ({ recordset: [
    [{ EmployerID: 1 }], [{ JobID: 1, Title: 'Generic role' }], [], []
  ][queries++] }));
  const res = response();
  await c.findCandidates({ user: { userId: 1 }, params: { jobId: '1' }, query: {} }, res);
  assert.equal(res.code, 200); assert.equal(res.body.data.total, 0);
  assert.ok(res.body.data.message); assert.equal(queries, 4);
});

test('candidate query restricts search to active job seekers and latest primary CV version', async () => {
  let queries = 0;
  const c = controller(async sql => {
    queries++;
    if (queries === 1) return { recordset: [{ EmployerID: 1 }] };
    if (queries === 2) return { recordset: [{ JobID: 1, Title: 'React' }] };
    if (queries === 3) return { recordset: criteria };
    assert.match(sql, /IsLookingForJob=1/); assert.match(sql, /u.Status='Active'/);
    assert.match(sql, /IsPrimary=1 AND IsArchived=0/); assert.match(sql, /ORDER BY VersionNumber DESC/);
    return { recordset: [cv(1, [[1, 'React']])] };
  });
  const res = response();
  await c.findCandidates({ user: { userId: 1 }, params: { jobId: '1' }, query: {} }, res);
  assert.equal(res.body.data.total, 1); assert.equal(res.body.data.candidates[0].analysis.matchScore, 67);
});
