const { test } = require('node:test');
const assert = require('node:assert/strict');
const alerts = require('../src/services/jobMatchAlerts');

const job = { JobID: 41, Title: 'React Developer', Description: 'Build products', Requirements: 'React', Location: 'Da Nang' };
const skills = [{ JobID: 41, SkillID: 1, SkillName: 'React', NormalizedName: 'react', IsMandatory: true }];
const cv = (names, verified = true) => JSON.stringify({ skills: names.map(name => ({ name, verified })) });

test('job revision ignores whitespace, case and skill ordering, but detects changed requirements and weights', () => {
  const more = [...skills, { ...skills[0], SkillID: 2 }];
  assert.equal(alerts.fingerprint(job, more), alerts.fingerprint({ ...job, Title: ' REACT   Developer ' }, [...more].reverse()));
  assert.notEqual(alerts.fingerprint(job, skills), alerts.fingerprint({ ...job, Requirements: 'Figma' }, skills));
  assert.notEqual(alerts.fingerprint(job, skills), alerts.fingerprint(job, [{ ...skills[0], IsMandatory: false }]));
});

test('matching uses only explicitly verified confirmed skills, including malformed/empty CV handling', () => {
  assert.equal(alerts.verifiedSkills('{broken'), '');
  assert.equal(alerts.verifiedSkills(cv(['React'], false)), '');
  assert.equal(alerts.verifiedSkills(cv(['React'], 'false')), '');
  assert.equal(alerts.verifiedSkills(cv(['React'])), 'React');
});

function queries(profiles, requirements = skills, current = job) {
  return async sql => {
    if (sql.includes('FROM JobPostings j')) return { recordset: current ? [current] : [] };
    if (sql.includes('FROM JobSkillRequirements')) return { recordset: requirements };
    if (sql.includes('UPDATE Notifications')) return { recordset: [] };
    if (sql.includes('FROM CandidateProfiles p')) return { recordset: profiles };
    if (sql.includes('FROM SkillTaxonomy')) return { recordset: skills };
    throw new Error('Unexpected query');
  };
}
const event = (requirements = skills, current = job) => ({ Payload: JSON.stringify({ jobId: job.JobID, fingerprint: alerts.fingerprint(current, requirements) }) });
const profile = (id, names = ['React']) => ({ ProfileID: id, UserID: id, CVID: id, VersionID: id, ConfirmedJson: cv(names) });

test('alerts reach every matching recipient in a batch, not just three, and use stable job/version deduplication keys', async () => {
  const profiles = [...Array.from({ length: 8 }, (_, index) => profile(index + 1)), profile(9, ['Figma'])];
  const a = await alerts.matchBatch(queries(profiles), event());
  const b = await alerts.matchBatch(queries(profiles), event());
  assert.equal(a.notices.length, 8);
  assert.equal(a.done, true);
  assert.deepEqual(a.notices.map(n => n.key), b.notices.map(n => n.key));
  assert.equal(new Set(a.notices.map(n => n.userId)).size, 8);
  assert.ok(a.notices.every(n => n.href === '/jobs/41' && n.type === 'job_match_alert'));
});

test('threshold compares the real weighted percentage, not its rounded presentation', async () => {
  const required = Array.from({ length: 10 }, (_, i) => ({ JobID: 41, SkillID: i + 1, SkillName: `Skill${i}`, NormalizedName: `skill${i}`, IsMandatory: true }));
  const result = await alerts.matchBatch(queries([profile(1, required.slice(0, 7).map(s => s.SkillName)), profile(2, required.slice(0, 6).map(s => s.SkillName))], required), event(required));
  assert.deepEqual(result.notices.map(n => n.userId), [1]);
  assert.match(result.notices[0].body, /70%/);
});

test('superseded or unavailable job revisions cannot produce alerts', async () => {
  assert.equal((await alerts.matchBatch(queries([profile(1)], skills, null), event())).notices.length, 0);
  assert.equal((await alerts.matchBatch(queries([profile(1)], skills, { ...job, Requirements: 'Updated' }), event())).notices.length, 0);
});

test('large fanout persists a cursor and resumes the next batch without losing recipients', async () => {
  const first = await alerts.matchBatch(queries(Array.from({ length: alerts.BATCH_SIZE }, (_, i) => profile(i + 1))), event());
  assert.equal(first.done, false); assert.equal(first.payload.afterProfileId, alerts.BATCH_SIZE);
  const last = await alerts.matchBatch(queries([profile(alerts.BATCH_SIZE + 1)]), { Payload: JSON.stringify(first.payload) });
  assert.equal(last.done, true); assert.equal(last.notices[0].userId, alerts.BATCH_SIZE + 1);
});

test('realtime connections are isolated by authenticated user and role and carry no notification content', () => {
  const { EventEmitter } = require('node:events');
  const realtime = require('../src/services/notificationRealtime');
  class Response extends EventEmitter {
    constructor() { super(); this.frames = []; }
    set() {} flushHeaders() {}
    write(data) { this.frames.push(data); return true; }
    end() { this.emit('close'); }
  }
  const recipients = [[1, 'Candidate'], [2, 'Candidate'], [1, 'Employer']].map(([userId, role]) => {
    const response = new Response(); realtime.stream({ user: { userId, role } }, response); return response;
  });
  try {
    realtime.publish(1, 'Candidate');
    assert.equal(recipients[0].frames.length, 2);
    assert.equal(recipients[1].frames.length, 1); assert.equal(recipients[2].frames.length, 1);
    assert.equal(recipients[0].frames[1], 'event: notifications-changed\ndata: {}\n\n');
    recipients[0].end(); realtime.publish(1, 'Candidate'); assert.equal(recipients[0].frames.length, 2);
  } finally { recipients.forEach(response => response.end()); }
});

test('only committed writes publish realtime changes and wake matching', async () => {
  const db = require('../src/config/db');
  const store = require('../src/services/notificationStore');
  const realtime = require('../src/services/notificationRealtime');
  const originalPool = db.getPool, originalSql = db.sql, originalPublish = realtime.publish;
  let committed = false, broadcasts = 0, wakes = 0;
  class Transaction { async begin() {} async commit() { committed = true; } async rollback() {} }
  class Request { input() { return this; } async query() { return { rowsAffected: [1] }; } }
  db.getPool = async () => ({}); db.sql = { Transaction, Request };
  realtime.publish = () => { assert.equal(committed, true); broadcasts++; };
  const unsubscribe = realtime.onOutbox(() => { assert.equal(committed, true); wakes++; });
  const notice = { userId: 1, role: 'Candidate', key: 'fixture', type: 'job_match_alert', title: 'Job', body: 'Match', href: '/jobs/1' };
  try {
    await assert.rejects(store.withTransaction(async query => {
      await store.enqueue(query, 'job_match_alert', {}); await store.putNotification(query, notice);
      throw new Error('rollback');
    }), /rollback/);
    assert.equal(broadcasts, 0); assert.equal(wakes, 0);
    await store.withTransaction(async query => {
      await store.enqueue(query, 'job_match_alert', {}); await store.putNotification(query, notice);
      assert.equal(broadcasts, 0); assert.equal(wakes, 0);
    });
    assert.equal(broadcasts, 1); assert.equal(wakes, 1);
  } finally { unsubscribe(); realtime.publish = originalPublish; db.getPool = originalPool; db.sql = originalSql; }
});
