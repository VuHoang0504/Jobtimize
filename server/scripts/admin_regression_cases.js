const assert = require('node:assert/strict');
const { PayOS } = require('@payos/node');
const reports = require('../src/services/adminAnalyticsService');
const payment = require('../src/services/paymentService');
const payos = require('../src/services/payosService');

module.exports = async function adminCases({ t, call, executeQuery: query, seedUser, admin, candidate, employer, base, headers }) {
  let userId, employerId, packageId;
  await t.test('date filters validate leap dates, calendar comparisons, Vietnam midnight and bounded ranges', () => {
    const leap = reports.resolvePeriod({ timeRange: 'month', month: '2024-02' });
    assert.equal(leap.buckets.length, 29); assert.equal(leap.toExclusive, '2024-03-01'); assert.equal(leap.previousFrom, '2024-01-01');
    assert.equal(reports.resolvePeriod({ timeRange: 'year', year: '2024' }).buckets.length, 12);
    assert.equal(reports.resolvePeriod({ timeRange: 'day', date: '2024-02-29' }).toDate, '2024-02-29');
    assert.equal(reports.resolvePeriod({ timeRange: '7d' }, new Date('2024-02-29T18:00:00Z')).toDate, '2024-03-01');
    for (const input of [{ timeRange: 'day', date: '2023-02-29' }, { timeRange: 'month', month: '2024-13' }, { timeRange: 'custom', fromDate: '2024-03-01', toDate: '2024-02-29' }, { timeRange: 'custom', fromDate: '2000-01-01', toDate: '2026-01-01' }, { timeRange: 'invalid' }]) assert.throws(() => reports.resolvePeriod(input), error => error.status === 400);
    assert.equal(reports.csv([['=SUM(1,2)', 'A"B', 'line\nbreak', 42]]), '\uFEFF"\'=SUM(1,2)","A""B","line\nbreak","42"');
  });

  await t.test('analytics and full export use successful payment dates; pagination, zero periods and access restrictions', async () => {
    userId = await seedUser('admin-regression-employer@example.org', 'Employer');
    employerId = (await query(`INSERT Employers(UserID,CompanyName,KYCStatus) OUTPUT INSERTED.EmployerID VALUES(@ID,N'=SUM(1,2) "Company"','Approved')`, { ID: userId })).recordset[0].EmployerID;
    packageId = (await query('SELECT TOP 1 PackageID FROM SubscriptionPackages WHERE Price>0 ORDER BY PackageID')).recordset[0].PackageID;
    for (let i = 0; i < 25; i++) await query(`INSERT PaymentTransactions(TransactionRef,EmployerID,PackageID,Amount,Status,PaymentMethod,CreatedAt,PaidAt) VALUES(@Ref,@Employer,@Package,1000,'Success','PayOS','2030-01-01',@Paid)`, { Ref: `ADMIN_REPORT_${i}`, Employer: employerId, Package: packageId, Paid: i === 24 ? '2024-02-29T23:59:59.997' : '2024-02-01T00:00:00' });
    await query(`INSERT PaymentTransactions(TransactionRef,EmployerID,PackageID,Amount,Status,PaymentMethod,PaidAt) VALUES('ADMIN_MARCH',@Employer,@Package,9000,'Success','PayOS','2024-03-01'),('ADMIN_PENDING',@Employer,@Package,8000,'Pending','PayOS','2024-02-15'),('ADMIN_MISSING_PAID',@Employer,@Package,7000,'Success','PayOS',NULL)`, { Employer: employerId, Package: packageId });
    const filter = 'timeRange=month&month=2024-02';
    assert.equal((await call('GET', `/admin/analytics?${filter}`, candidate)).status, 403);
    assert.equal((await call('GET', '/admin/analytics?timeRange=day&date=2024-02-31', admin)).status, 400);
    const response = await call('GET', `/admin/analytics?${filter}`, admin); assert.equal(response.status, 200, JSON.stringify(response.body));
    const data = response.body.data;
    assert.equal(data.kpi.periodRevenue, 25000); assert.equal(data.kpi.periodOrders, 25); assert.equal(data.kpi.revenueGrowthRate, null);
    assert.equal(data.timeline.length, 29); assert.equal(data.timeline.at(-1).revenue, 1000);
    assert.equal(data.packagesBreakdown.reduce((sum, row) => sum + row.totalRevenue, 0), 25000);
    assert.equal(data.paymentMethodsBreakdown[0].totalAmount, 25000);
    const page2 = (await call('GET', `/admin/transactions?${filter}&page=2&search=ADMIN_REPORT&paymentMethod=PayOS`, admin)).body.data;
    assert.equal(page2.pagination.total, 25); assert.equal(page2.transactions.length, 5);
    assert.equal((await call('GET', `/admin/transactions?${filter}&paymentMethod=MoMo`, admin)).body.data.pagination.total, 0);
    const exported = await fetch(`${base}/admin/analytics/export?${filter}&kind=transactions`, { headers: headers(admin) });
    assert.equal(exported.status, 200); const csv = await exported.text(); assert.equal(csv.match(/ADMIN_REPORT_/g).length, 25); assert.ok(csv.includes("'=SUM(1,2)"));
    assert.ok(!csv.includes('ADMIN_MARCH')); assert.match(exported.headers.get('content-disposition'), /2024-02-01-2024-02-29/);
    const summary = await fetch(`${base}/admin/analytics/export?${filter}`, { headers: headers(admin) }); assert.equal(summary.status, 200); assert.ok((await summary.text()).includes('25000'));
    const zero = (await call('GET', '/admin/analytics?timeRange=day&date=2001-01-01', admin)).body.data;
    assert.equal(zero.kpi.periodRevenue, 0); assert.equal(zero.kpi.periodNewUsers, 0); assert.equal(zero.kpi.periodApplications, 0);
    assert.equal((await call('GET', '/admin/payments/pending', admin)).status, 404);
    assert.equal((await call('POST', '/admin/payments/ADMIN_REPORT_0/verify', admin, {})).status, 404);
    assert.equal((await call('POST', '/employer/payment/confirm', employer, {})).status, 410);
    const demoEmployer = (await query('SELECT EmployerID FROM Employers WHERE UserID=@ID', { ID: employer })).recordset[0].EmployerID;
    await query(`INSERT EmployerSubscriptions(EmployerID,PackageID,StartDate,EndDate,RemainingPosts,RemainingSearches,AmountPaid,PaymentStatus,PaymentMethod,TransactionCode)
      VALUES(@Employer,@Package,'2024-02-15','2024-03-15',1,1,4990000,'Completed','VNPay','TXN-202605-FPT01'),
      (@Employer,@Package,'2024-02-15','2024-03-15',1,1,9999999,'Completed','VNPay','UNVERIFIED_LEGACY')`, { Employer: demoEmployer, Package: packageId });
    const real = (await call('GET', `/admin/analytics?${filter}`, admin)).body.data;
    assert.equal(real.kpi.periodRevenue, 25000, 'Demo subscriptions never become actual paid revenue');
    assert.equal(real.demoAvailable.count, 1); assert.equal(real.demoAvailable.amount, 4990000);
    const demo = (await call('GET', `/admin/analytics?${filter}&dataSource=demo`, admin)).body.data;
    assert.equal(demo.source.isDemo, true); assert.equal(demo.kpi.periodRevenue, 4990000); assert.equal(demo.kpi.periodOrders, 1);
    assert.equal(demo.timeline.reduce((sum, row) => sum + row.revenue, 0), 4990000);
    const demoTx = (await call('GET', `/admin/transactions?${filter}&dataSource=demo`, admin)).body.data;
    assert.equal(demoTx.transactions.length, 1); assert.equal(demoTx.transactions[0].paymentStatus, 'Demo');
    for (const kind of ['summary', 'transactions']) {
      const file = await fetch(`${base}/admin/analytics/export?${filter}&dataSource=demo&kind=${kind}`, { headers: headers(admin) });
      assert.equal(file.status, 200); assert.match(file.headers.get('content-disposition'), /jobtimize-demo-/);
      const content = await file.text(); assert.ok(content.includes('DỮ LIỆU MẪU')); assert.ok(!content.includes('ADMIN_REPORT_'));
    }
    assert.equal((await call('GET', `/admin/analytics?${filter}&dataSource=invalid`, admin)).status, 400);
  });

  await t.test('automatic payments require signatures, exact amounts and owner; duplicate callbacks credit once', async () => {
    const code = 880000001;
    await query(`INSERT PaymentTransactions(TransactionRef,EmployerID,PackageID,Amount,Status,PaymentMethod,OrderCode) VALUES('ADMIN_PAYOS',@Employer,@Package,1000,'Pending','PayOS',@Code)`, { Employer: employerId, Package: packageId, Code: code });
    const data = { orderCode: code, amount: 1000, reference: 'TEST_SIGNED_REFERENCE', code: '00', desc: 'success' };
    const unsigned = { code: '00', success: true, data };
    assert.equal((await call('POST', '/payments/payos-webhook', null, unsigned)).status, 400);
    assert.equal((await call('GET', `/payments/${code}/status`, null)).status, 401);
    assert.equal((await call('GET', `/payments/${code}/status`, employer)).status, 404);
    const saved = { clientId: payos.clientId, apiKey: payos.apiKey, checksumKey: payos.checksumKey, payos: payos.payos };
    Object.assign(payos, { clientId: 'isolated-test-client', apiKey: 'isolated-test-api', checksumKey: 'isolated-test-checksum' });
    payos.payos = new PayOS({ clientId: payos.clientId, apiKey: payos.apiKey, checksumKey: payos.checksumKey });
    try {
      const signed = async payload => ({ code: '00', success: true, data: payload, signature: await payos.payos.crypto.createSignatureFromObj(payload, payos.checksumKey) });
      assert.equal((await call('POST', '/payments/payos-webhook', null, { ...await signed(data), signature: 'bad' })).status, 400);
      assert.equal((await call('POST', '/payments/payos-webhook', null, await signed({ ...data, amount: 1001 }))).status, 400);
      assert.equal((await call('POST', '/payments/payos-webhook', null, await signed({ ...data, code: '01' }))).status, 400);
      const body = await signed(data);
      const responses = await Promise.all([call('POST', '/payments/payos-webhook', null, body), call('POST', '/payments/payos-webhook', null, body)]);
      assert.ok(responses.every(row => row.status === 200), JSON.stringify(responses));
      const quota = (await query('SELECT RemainingPosts,RemainingSearches FROM EmployerSubscriptions WHERE EmployerID=@ID', { ID: employerId })).recordset;
      const pack = (await query('SELECT PostLimit,SearchLimit FROM SubscriptionPackages WHERE PackageID=@ID', { ID: packageId })).recordset[0];
      assert.equal(quota.length, 1); assert.equal(quota[0].RemainingPosts, pack.PostLimit); assert.equal(quota[0].RemainingSearches, pack.SearchLimit);
      assert.equal((await call('GET', `/payments/${code}/status`, userId)).body.data.isSuccess, true);
      assert.equal((await call('POST', '/payments/payos-webhook', null, await signed({ ...data, orderCode: 880009999 }))).body.ignored, true);
      const pollCode = code + 1;
      await query(`INSERT PaymentTransactions(TransactionRef,EmployerID,PackageID,Amount,Status,PaymentMethod,OrderCode) VALUES('ADMIN_POLL',@Employer,@Package,1000,'Pending','PayOS',@Code)`, { Employer: employerId, Package: packageId, Code: pollCode });
      payos.payos.paymentRequests.get = async () => ({ orderCode: pollCode, status: 'PAID', amount: 999, amountPaid: 999 });
      assert.equal((await call('GET', `/payments/${pollCode}/status`, userId)).body.data.isSuccess, false);
      payos.payos.paymentRequests.get = async () => ({ orderCode: pollCode, status: 'PAID', amount: 1000, amountPaid: 1000 });
      assert.equal((await call('GET', `/payments/${pollCode}/status`, userId)).body.data.isSuccess, true);
    } finally { Object.assign(payos, saved); }
  });

  await t.test('quota write failure rolls payment back; independent simultaneous payments both credit', async () => {
    const params = { Employer: employerId, Package: packageId };
    await query(`INSERT PaymentTransactions(TransactionRef,EmployerID,PackageID,Amount,Status) VALUES('ADMIN_ROLLBACK',@Employer,@Package,1000,'Pending')`, params);
    await query('ALTER TABLE EmployerSubscriptions ADD CONSTRAINT CK_Admin_Test_Quota CHECK(RemainingPosts<1000000)');
    const pack = (await query('SELECT PostLimit FROM SubscriptionPackages WHERE PackageID=@ID', { ID: packageId })).recordset[0];
    await query('UPDATE SubscriptionPackages SET PostLimit=1000000 WHERE PackageID=@ID', { ID: packageId });
    try { await assert.rejects(payment.activateSubscription({ transactionRef: 'ADMIN_ROLLBACK' })); }
    finally { await query('ALTER TABLE EmployerSubscriptions DROP CONSTRAINT CK_Admin_Test_Quota'); await query('UPDATE SubscriptionPackages SET PostLimit=@Posts WHERE PackageID=@ID', { Posts: pack.PostLimit, ID: packageId }); }
    assert.equal((await query("SELECT Status FROM PaymentTransactions WHERE TransactionRef='ADMIN_ROLLBACK'")).recordset[0].Status, 'Pending');
    await query(`INSERT PaymentTransactions(TransactionRef,EmployerID,PackageID,Amount,Status) VALUES('ADMIN_CONCURRENT',@Employer,@Package,1000,'Pending')`, params);
    const before = (await query('SELECT RemainingPosts FROM EmployerSubscriptions WHERE EmployerID=@ID', { ID: employerId })).recordset[0].RemainingPosts;
    await Promise.all([payment.activateSubscription({ transactionRef: 'ADMIN_ROLLBACK' }), payment.activateSubscription({ transactionRef: 'ADMIN_CONCURRENT' })]);
    assert.equal((await query('SELECT RemainingPosts FROM EmployerSubscriptions WHERE EmployerID=@ID', { ID: employerId })).recordset[0].RemainingPosts, before + pack.PostLimit * 2);
  });

  await t.test('only confirmed violations ban the correct owner; audit, immediate JWT revocation, idempotency and manual appeal', async () => {
    const jobs = [];
    for (const status of ['Published', 'PendingApproval']) jobs.push((await query(`INSERT JobPostings(EmployerID,Title,Description,Requirements,Status) OUTPUT INSERTED.JobID VALUES(@ID,N'Moderation fixture',N'Evidence',N'Example',@Status)`, { ID: employerId, Status: status })).recordset[0].JobID);
    const created = await call('POST', '/reports', candidate, { targetType: 'JobPosting', targetId: jobs[0], reason: 'Thông tin giả mạo đã có bằng chứng để xác minh.' });
    const id = created.body.data.ReportID;
    assert.equal((await call('GET', '/employer/profile', userId)).status, 200, 'An unverified report must not ban');
    const note = 'Đã đối chiếu chứng cứ và xác nhận hành vi giả mạo.';
    assert.equal((await call('PATCH', `/admin/reports/${id}`, admin, { status: 'Resolved', adminNote: '' })).status, 400);
    const body = { status: 'Resolved', adminNote: note };
    const responses = await Promise.all([call('PATCH', `/admin/reports/${id}`, admin, body), call('PATCH', `/admin/reports/${id}`, admin, body)]);
    assert.ok(responses.every(row => row.status === 200), JSON.stringify(responses));
    assert.equal((await call('GET', '/employer/profile', userId)).status, 401);
    assert.equal((await call('GET', `/jobs/${jobs[0]}`, candidate)).status, 404);
    assert.equal((await call('PATCH', `/admin/jobs/${jobs[0]}/moderate`, admin, { status: 'Published' })).status, 409);
    assert.equal((await query("SELECT COUNT(*) n FROM JobPostings WHERE EmployerID=@ID AND Status<>'Closed'", { ID: employerId })).recordset[0].n, 0);
    assert.equal((await query('SELECT COUNT(*) n FROM AccountModerationActions WHERE ReportID=@ID', { ID: id })).recordset[0].n, 1);
    const history = (await call('GET', `/admin/reports?reportId=${id}`, admin)).body.data[0];
    assert.equal(history.LockedUserID, userId); assert.equal(history.ResolvedByUserID, admin);
    assert.equal((await call('PATCH', `/admin/reports/${id}`, admin, { status: 'Dismissed', adminNote: note })).status, 409);
    assert.equal((await call('PATCH', `/admin/users/${userId}/status`, admin, { status: 'Active', reason: 'Đã xem xét khiếu nại và cho phép mở khóa.' })).status, 200);
    assert.equal((await call('PATCH', `/admin/reports/${id}`, admin, body)).body.data.alreadyProcessed, true);
    assert.equal((await call('GET', '/employer/profile', userId)).status, 200, 'Replaying resolved report cannot reban after appeal');
    assert.equal((await query("SELECT COUNT(*) n FROM JobPostings WHERE EmployerID=@ID AND Status='Published'", { ID: employerId })).recordset[0].n, 0, 'Unban must not republish unsafe jobs');
    assert.equal((await call('PATCH', `/admin/users/${admin}/status`, admin, { status: 'Locked' })).status, 403);
    assert.equal((await call('POST', '/reports', candidate, { targetType: 'Candidate', targetId: admin, reason: 'Invalid target must never match administrator.' })).status, 404);
    const dismissed = await call('POST', '/reports', candidate, { targetType: 'Employer', targetId: employerId, reason: 'Báo cáo cần được kiểm tra và bác bỏ nếu không đúng.' });
    assert.equal((await call('PATCH', `/admin/reports/${dismissed.body.data.ReportID}`, admin, { status: 'Dismissed', adminNote: 'Không đủ bằng chứng, bác bỏ phản ánh.', actionTaken: 'lock_target' })).status, 200);
    assert.equal((await call('GET', '/employer/profile', userId)).status, 200);
  });

  await t.test('candidate ban disables discovery; audit failure rolls back all effects; Admin targets remain protected', async () => {
    const target = await seedUser('admin-regression-candidate@example.org', 'Candidate');
    await query('INSERT CandidateProfiles(UserID,IsLookingForJob) VALUES(@ID,1)', { ID: target });
    const report = await call('POST', '/reports', candidate, { targetType: 'Candidate', targetId: target, reason: 'Báo cáo hành vi spam cần được xác minh với bằng chứng.' });
    const id = report.body.data.ReportID;
    await query("ALTER TABLE AccountModerationActions ADD CONSTRAINT CK_Admin_Audit_Failure CHECK(Reason<>N'ROLLBACK_CONFIRMED_REASON')");
    try { assert.equal((await call('PATCH', `/admin/reports/${id}`, admin, { status: 'Resolved', adminNote: 'ROLLBACK_CONFIRMED_REASON' })).status, 500); }
    finally { await query('ALTER TABLE AccountModerationActions DROP CONSTRAINT CK_Admin_Audit_Failure'); }
    assert.equal((await query('SELECT Status FROM Users WHERE UserID=@ID', { ID: target })).recordset[0].Status, 'Active');
    assert.equal((await query('SELECT IsLookingForJob FROM CandidateProfiles WHERE UserID=@ID', { ID: target })).recordset[0].IsLookingForJob, true);
    assert.equal((await query('SELECT Status FROM UserReports WHERE ReportID=@ID', { ID: id })).recordset[0].Status, 'Pending');
    assert.equal((await call('PATCH', `/admin/reports/${id}`, admin, { status: 'Resolved', adminNote: 'Đã xác minh bằng chứng spam và xác nhận vi phạm.' })).status, 200);
    assert.equal((await call('GET', '/candidate/profile', target)).status, 401);
    assert.equal((await query('SELECT IsLookingForJob FROM CandidateProfiles WHERE UserID=@ID', { ID: target })).recordset[0].IsLookingForJob, false);
    // Even corrupt/legacy target data must never ban a privileged account.
    const adminEmployer = (await query("INSERT Employers(UserID,CompanyName) OUTPUT INSERTED.EmployerID VALUES(@ID,'Protected administrator fixture')", { ID: admin })).recordset[0].EmployerID;
    const protectedReport = (await query("INSERT UserReports(ReporterUserID,TargetType,TargetID,Reason,Status) OUTPUT INSERTED.ReportID VALUES(@Actor,'Employer',@Target,N'Legacy invalid report fixture','Pending')", { Actor: candidate, Target: adminEmployer })).recordset[0].ReportID;
    assert.equal((await call('PATCH', `/admin/reports/${protectedReport}`, admin, { status: 'Resolved', adminNote: 'Kiểm tra bảo vệ tài khoản quản trị viên.' })).status, 403);
    assert.equal((await query('SELECT Status FROM UserReports WHERE ReportID=@ID', { ID: protectedReport })).recordset[0].Status, 'Pending');
  });
};
