const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('crypto');
const { execFileSync, spawn } = require('child_process');
const { createServer } = require('net');
const fs = require('fs/promises');
const path = require('path');
const { sql, config } = require('../src/config/db');
const { applySchema, applySeed } = require('../src/services/databaseSchema');

test('schema runner stops at the first SQL error', async () => {
  let calls = 0;
  await assert.rejects(applySchema(async () => {
    if (++calls === 2) throw new Error('simulated SQL failure');
  }), /schema.sql batch 2: simulated SQL failure/);
  assert.equal(calls, 2);
});

test('unified schema and separate seed initialize a fresh SQL database and safely rerun', { timeout: 120000 }, async t => {
  const name = `JobtimizeSchemaTest_${randomUUID().slice(0, 8)}`;
  assert.match(name, /^JobtimizeSchemaTest_[a-f0-9]{8}$/);
  assert.notEqual(name, config.database);
  assert.match(config.user, /^[A-Za-z0-9_]+$/);
  const sqlcmd = query => execFileSync('sqlcmd', [
    '-S', `tcp:${config.server},${config.port}`, '-E', '-C', '-b', '-l', '5', '-Q', query
  ], { stdio: 'pipe' });
  let created = false, pool;
  try {
    // CREATE (without IF NOT EXISTS) prevents touching an existing database.
    sqlcmd(`CREATE DATABASE [${name}]`);
    created = true;
    if (config.user !== 'sa') sqlcmd(`USE [${name}]; CREATE USER [${config.user}] FOR LOGIN [${config.user}]; ALTER ROLE db_owner ADD MEMBER [${config.user}];`);
    pool = await new sql.ConnectionPool({ ...config, database: name }).connect();
    const query = text => pool.request().query(text);
    const source = (await fs.readFile(path.resolve(__dirname, '../../database/schema.sql'), 'utf8'))
      .replace(/\bJobtimizeDB\b/g, name);
    const runStandalone = async () => {
      for (const batch of source.split(/^\s*GO\s*$/im).filter(value => value.trim())) await query(batch);
    };
    const inventory = async () => (await query(`SELECT t.name AS tableName,c.name AS columnName,ty.name AS typeName,c.max_length,c.is_nullable
      FROM sys.tables t JOIN sys.columns c ON c.object_id=t.object_id JOIN sys.types ty ON ty.user_type_id=c.user_type_id
      ORDER BY t.name,c.column_id`)).recordset;
    await t.test('schema alone creates every feature with zero business data', async () => {
      await runStandalone();
      const columns = await inventory();
      for (const [table, column] of [
        ['CVs', 'IsArchived'], ['CVDocumentVersions', 'ConfirmedJson'], ['JobApplications', 'CVVersionID'],
        ['JobApplications', 'MatchDetailsJson'], ['Interviews', 'InvitationID'], ['Interviews', 'InterviewType'],
        ['Interviews', 'Version'], ['CandidateInvitations', 'RespondedAt'], ['Notifications', 'ReadAt'],
        ['NotificationOutbox', 'EventKey'], ['NotificationRecommendationState', 'Fingerprint'],
        ['AccountModerationActions', 'ActorUserID'], ['UserReports', 'ResolvedByUserID'],
        ['PaymentTransactions', 'OrderCode'], ['EmployerSubscriptions', 'AmountPaid']
      ]) assert.ok(columns.some(c => c.tableName === table && c.columnName === column), `${table}.${column}`);
      for (const table of ['Roles', 'Users', 'SkillTaxonomy', 'SubscriptionPackages', 'JobPostings']) {
        assert.equal((await query(`SELECT COUNT(*) n FROM ${table}`)).recordset[0].n, 0, `${table} must stay empty without seed.sql`);
      }
      assert.equal((await query(`SELECT COUNT(*) n FROM sys.foreign_key_columns f JOIN sys.columns c
        ON c.object_id=f.parent_object_id AND c.column_id=f.parent_column_id
        WHERE f.parent_object_id=OBJECT_ID('JobApplications') AND c.name='CVID'`)).recordset[0].n, 0);
      assert.ok((await query("SELECT COUNT(*) n FROM sys.indexes WHERE name='UX_Payment_OrderCode' AND is_unique=1")).recordset[0].n === 1);
    });
    await t.test('seed.sql separately loads accounts and initial data', async () => {
      const seed = (await fs.readFile(path.resolve(__dirname, '../../database/seed.sql'), 'utf8')).replace(/\bJobtimizeDB\b/g, name);
      for (const batch of seed.split(/^\s*GO\s*$/im).filter(value => value.trim())) await query(batch);
      assert.equal((await query('SELECT COUNT(*) n FROM Roles')).recordset[0].n, 3);
      for (const table of ['Users', 'SkillTaxonomy', 'SubscriptionPackages', 'JobPostings']) {
        assert.ok((await query(`SELECT COUNT(*) n FROM ${table}`)).recordset[0].n > 0, `${table} initial data`);
      }
    });
    await t.test('rerunning SQL and the Node loader preserves schema and existing records', async () => {
      const before = await inventory();
      await query("UPDATE JobPostings SET Title=N'Schema rerun sentinel' WHERE JobID=(SELECT MIN(JobID) FROM JobPostings)");
      const counts = async () => (await query('SELECT (SELECT COUNT(*) FROM Users) users,(SELECT COUNT(*) FROM JobPostings) jobs,(SELECT COUNT(*) FROM Courses) courses')).recordset[0];
      const beforeCounts = await counts();
      await runStandalone();
      await applySchema(query);
      await applySeed(query);
      assert.deepEqual(await inventory(), before);
      assert.deepEqual(await counts(), beforeCounts);
      assert.equal((await query("SELECT COUNT(*) n FROM JobPostings WHERE Title=N'Schema rerun sentinel'")).recordset[0].n, 1);
    });
    await t.test('db:init targets DB_NAME and supports schema-only mode', async () => {
      for (const args of [[], ['--schema-only']]) execFileSync(process.execPath, [path.resolve(__dirname, 'initDb.js'), ...args], {
        env: { ...process.env, DB_NAME: name }, stdio: 'pipe'
      });
      assert.equal((await query("SELECT COUNT(*) n FROM JobPostings WHERE Title=N'Schema rerun sentinel'")).recordset[0].n, 1);
    });
    await t.test('legacy missing columns are restored by the same schema', async () => {
      await query('ALTER TABLE PaymentTransactions DROP COLUMN CheckoutUrl; ALTER TABLE KYCDocuments DROP COLUMN TaxCode;');
      await applySchema(query);
      const row = (await query("SELECT COL_LENGTH('PaymentTransactions','CheckoutUrl') checkout,COL_LENGTH('KYCDocuments','TaxCode') tax")).recordset[0];
      assert.equal(row.checkout, 2000); assert.equal(row.tax, 100);
    });
    await t.test('the actual API starts from this schema and serves jobs and categories', async () => {
      const portProbe = createServer();
      await new Promise(resolve => portProbe.listen(0, '127.0.0.1', resolve));
      const port = portProbe.address().port;
      await new Promise(resolve => portProbe.close(resolve));
      const child = spawn(process.execPath, [path.resolve(__dirname, '../src/server.js')], {
        env: { ...process.env, DB_NAME: name, PORT: String(port), JWT_SECRET: 'schema-startup-isolated-test-secret' },
        windowsHide: true, stdio: 'pipe'
      });
      let output = '';
      child.stdout.on('data', value => { output += value; });
      child.stderr.on('data', value => { output += value; });
      const exited = new Promise(resolve => child.once('exit', resolve));
      try {
        const deadline = Date.now() + 15000;
        let ready = false;
        while (Date.now() < deadline && child.exitCode === null) {
          try { ready = (await fetch(`http://127.0.0.1:${port}/api/health`)).ok; } catch { /* API is still initializing. */ }
          if (ready) break;
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        assert.ok(ready, `API did not start: ${output}`);
        for (const route of ['/api/jobs', '/api/metadata/categories']) {
          const response = await fetch(`http://127.0.0.1:${port}${route}`);
          assert.equal(response.status, 200, `${route}: ${await response.text()}`);
        }
        assert.doesNotMatch(output, /initialization failed|Invalid column|Invalid object/i);
      } finally {
        child.kill();
        await exited;
      }
    });
    console.log(`Verified schema.sql in isolated ${name}; cleanup follows.`);
  } finally {
    if (pool) await pool.close();
    if (created) sqlcmd(`ALTER DATABASE [${name}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${name}];`);
  }
});
