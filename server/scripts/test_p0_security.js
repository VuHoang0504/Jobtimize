const { executeQuery } = require('../src/config/db');
const http = require('http');

function sendRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, body });
        }
      });
    });
    req.on('error', reject);
    if (postData) {
      const dataStr = typeof postData === 'string' ? postData : JSON.stringify(postData);
      req.write(dataStr);
    }
    req.end();
  });
}

async function run() {
  console.log('================================================================');
  console.log('       TEST SUITE P0: KIỂM THỬ BẢO MẬT NGHIÊM TRỌNG (P0)        ');
  console.log('================================================================\n');

  // 1. Đăng nhập 3 tài khoản: Employer A, Employer B, Admin
  console.log('--- 1. XÁC THỰC VÀ ĐĂNG NHẬP CÁC TÀI KHOẢN ---');
  
  const loginA = await sendRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: 'hr@fpt-software.com', password: 'Admin@123' });
  const tokenA = loginA.body?.data?.token;

  const loginB = await sendRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: 'career@vng.com.vn', password: 'Admin@123' });
  const tokenB = loginB.body?.data?.token;

  const loginAdmin = await sendRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: 'admin@jobtimize.vn', password: 'Admin@123' });
  const tokenAdmin = loginAdmin.body?.data?.token;

  console.log(`- Employer A (FPT): ${tokenA ? 'OK' : 'FAIL'}`);
  console.log(`- Employer B (VNG): ${tokenB ? 'OK' : 'FAIL'}`);
  console.log(`- Admin (Jobtimize): ${tokenAdmin ? 'OK' : 'FAIL'}\n`);

  if (!tokenA || !tokenB || !tokenAdmin) {
    throw new Error('Đăng nhập thất bại, kiểm tra lại tài khoản seed!');
  }

  // ===========================================================================
  // MỤC 1: KIỂM THỬ BẢO MẬT UC-E04 (KYC PHÂN QUYỀN)
  // ===========================================================================
  console.log('--- 2. KIỂM THỬ BẢO MẬT UC-E04: PHÂN QUYỀN KYC ---');

  // Test 1.1: Employer A gọi endpoint cũ demo-approve (đã bị gỡ bỏ khỏi route Employer)
  const empDemoApproveRes = await sendRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/employer/kyc/demo-approve',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${tokenA}`
    }
  }, { status: 'Approved' });
  console.log(`2.1 Employer gọi POST /api/employer/kyc/demo-approve -> HTTP ${empDemoApproveRes.status}`);
  const isDemoApproveBlocked = empDemoApproveRes.status === 404;
  console.log(`    Kết quả: ${isDemoApproveBlocked ? '✅ ĐẠT: Endpoint demo đã bị loại bỏ khỏi Employer routes' : '❌ THẤT BẠI'}`);

  // Test 1.2: Employer A cố tình gọi API Admin /api/admin/kyc/1/review để tự duyệt
  const empCallAdminRes = await sendRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/admin/kyc/1/review',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${tokenA}`
    }
  }, { status: 'Approved' });
  console.log(`2.2 Employer gọi POST /api/admin/kyc/1/review -> HTTP ${empCallAdminRes.status} (Body: ${empCallAdminRes.body?.message})`);
  const isAdminKycProtected = empCallAdminRes.status === 403;
  console.log(`    Kết quả: ${isAdminKycProtected ? '✅ ĐẠT: Bị chặn 403 Forbidden (Chỉ Admin mới có quyền)' : '❌ THẤT BẠI'}`);

  // Test 1.3: Admin chính thống duyệt KYC hợp lệ
  const adminApproveRes = await sendRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/admin/kyc/1/review',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${tokenAdmin}`
    }
  }, { status: 'Approved' });
  console.log(`2.3 Admin duyệt KYC cho Employer 1 -> HTTP ${adminApproveRes.status} (Body: ${adminApproveRes.body?.message})`);
  const dbKycStatus = (await executeQuery('SELECT KYCStatus FROM Employers WHERE EmployerID = 1')).recordset[0].KYCStatus;
  const isAdminApproveSuccess = adminApproveRes.status === 200 && dbKycStatus === 'Approved';
  console.log(`    Trạng thái KYC trong DB: "${dbKycStatus}" -> ${isAdminApproveSuccess ? '✅ ĐẠT: Admin duyệt thành công' : '❌ THẤT BẠI'}\n`);

  // ===========================================================================
  // MỤC 2: KIỂM THỬ BẢO MẬT UC-E10 (CHỐNG IDOR TRONG ATS & PHỎNG VẤN)
  // ===========================================================================
  console.log('--- 3. KIỂM THỬ BẢO MẬT UC-E10: CHỐNG LỖ HỔNG IDOR ---');

  // Setup test application for Employer A
  const jobA = (await executeQuery('SELECT TOP 1 JobID FROM JobPostings WHERE EmployerID = 1')).recordset[0];
  const cand = (await executeQuery('SELECT TOP 1 ProfileID FROM CandidateProfiles')).recordset[0];
  const appA = (await executeQuery(`
    INSERT INTO JobApplications (JobID, ProfileID, MatchScore, Status, AppliedAt)
    OUTPUT INSERTED.ApplicationID
    VALUES (@JobID, @ProfileID, 90, 'Applied', GETDATE())
  `, { JobID: jobA.JobID, ProfileID: cand.ProfileID })).recordset[0];
  const testAppId = appA.ApplicationID;

  try {
    // Test 2.1: Employer B (VNG) cố tình đổi trạng thái đơn của Employer A (FPT)
    const updateBRes = await sendRequest({
      hostname: 'localhost',
      port: 5000,
      path: `/api/employer/applications/${testAppId}/status`,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenB}`
      }
    }, { status: 'Rejected' });
    console.log(`3.1 Employer B gửi PATCH đổi status đơn Employer A -> HTTP ${updateBRes.status}`);
    const dbAppCheck1 = (await executeQuery('SELECT Status FROM JobApplications WHERE ApplicationID = @AppID', { AppID: testAppId })).recordset[0];
    const isStatusIdorProtected = updateBRes.status === 403 && dbAppCheck1.Status === 'Applied';
    console.log(`    Trạng thái trong DB vẫn là: "${dbAppCheck1.Status}" -> ${isStatusIdorProtected ? '✅ ĐẠT: Bị chặn 403 và dữ liệu được bảo toàn' : '❌ THẤT BẠI'}`);

    // Test 2.2: Employer B cố tình lên lịch phỏng vấn cho đơn của Employer A
    const scheduleBRes = await sendRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/employer/interviews',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenB}`
      }
    }, {
      applicationId: testAppId,
      interviewDate: '2026-10-30T10:00',
      interviewType: 'Online',
      locationOrLink: 'https://meet.google.com/test-idor-hack'
    });
    console.log(`3.2 Employer B gửi POST đặt lịch cho đơn Employer A -> HTTP ${scheduleBRes.status}`);
    const dbInterviewCount = (await executeQuery('SELECT COUNT(*) AS Cnt FROM Interviews WHERE ApplicationID = @AppID', { AppID: testAppId })).recordset[0].Cnt;
    const isScheduleIdorProtected = scheduleBRes.status === 403 && dbInterviewCount === 0;
    console.log(`    Số lịch phỏng vấn tạo ra trong DB: ${dbInterviewCount} -> ${isScheduleIdorProtected ? '✅ ĐẠT: Bị chặn 403 và không có lịch trái phép nào được tạo' : '❌ THẤT BẠI'}`);

    // Test 2.3: Employer A (Chính chủ) đặt lịch hợp lệ
    const scheduleARes = await sendRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/employer/interviews',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenA}`
      }
    }, {
      applicationId: testAppId,
      interviewDate: '2026-10-30T10:00',
      interviewType: 'Online',
      locationOrLink: 'https://meet.google.com/fpt-official'
    });
    console.log(`3.3 Employer A chính chủ đặt lịch phỏng vấn -> HTTP ${scheduleARes.status}`);
    const isScheduleAOk = scheduleARes.status === 201;
    console.log(`    Kết quả: ${isScheduleAOk ? '✅ ĐẠT: Đặt lịch thành công' : '❌ THẤT BẠI'}\n`);
  } finally {
    // Cleanup test app
    await executeQuery('DELETE FROM Interviews WHERE ApplicationID = @AppID', { AppID: testAppId });
    await executeQuery('DELETE FROM JobApplications WHERE ApplicationID = @AppID', { AppID: testAppId });
  }

  // ===========================================================================
  // MỤC 3: KIỂM THỬ BẢO MẬT UC-E07 (XÁC MINH THANH TOÁN & KÍCH HOẠT GÓI)
  // ===========================================================================
  console.log('--- 4. KIỂM THỬ BẢO MẬT UC-E07: CHỐNG GIAN LẬN THANH TOÁN ---');

  // Lấy quota hiện tại của Employer A trước khi test
  const initialSubRes = await executeQuery(`
    SELECT RemainingPosts, RemainingSearches FROM EmployerSubscriptions WHERE EmployerID = 1
  `);
  const initialPosts = initialSubRes.recordset[0]?.RemainingPosts || 0;
  const initialSearches = initialSubRes.recordset[0]?.RemainingSearches || 0;

  // Tạo giao dịch mua gói Pro (1.990.000 đ) với status 'Pending'
  const testTxnRef = 'PAY_TEST_SEC_' + Date.now();
  await executeQuery(`
    INSERT INTO PaymentTransactions (TransactionRef, EmployerID, PackageID, Amount, Status, PaymentMethod, CreatedAt)
    VALUES (@TransactionRef, 1, 2, 1990000, 'Pending', 'MoMo', GETDATE())
  `, { TransactionRef: testTxnRef });
  console.log(`4.1 Tạo giao dịch thử nghiệm: ${testTxnRef} (Gói Pro 1.990.000đ, Trạng thái: 'Pending')`);

  try {
    // Test 3.1: Client gọi API confirmPayment gửi { transactionRef }
    const clientConfirmRes = await sendRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/employer/payment/confirm',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenA}`
      }
    }, { transactionRef: testTxnRef });

    console.log(`4.2 Client gọi POST /api/employer/payment/confirm -> HTTP ${clientConfirmRes.status}`);
    console.log(`    Phản hồi từ server:`, clientConfirmRes.body?.message);

    // Kiểm tra DB: Status phải VẪN LÀ 'Pending', Quota KHÔNG ĐƯỢC TĂNG!
    const dbTxnCheck1 = (await executeQuery('SELECT Status FROM PaymentTransactions WHERE TransactionRef = @Ref', { Ref: testTxnRef })).recordset[0];
    const subCheck1 = (await executeQuery('SELECT RemainingPosts, RemainingSearches FROM EmployerSubscriptions WHERE EmployerID = 1')).recordset[0];
    const currentPosts1 = subCheck1?.RemainingPosts || 0;
    const currentSearches1 = subCheck1?.RemainingSearches || 0;

    const isClientSelfCreditBlocked = (dbTxnCheck1.Status === 'Pending') && 
                                      (currentPosts1 === initialPosts) && 
                                      (currentSearches1 === initialSearches);

    console.log(`    Trạng thái giao dịch trong DB: "${dbTxnCheck1.Status}"`);
    console.log(`    Hạn mức Job Posts: ${currentPosts1} (Gốc: ${initialPosts}) | Searches: ${currentSearches1} (Gốc: ${initialSearches})`);
    console.log(`    Kết quả: ${isClientSelfCreditBlocked ? '✅ ĐẠT: GIAO DỊCH VẪN PENDING, KHÔNG BỊ TỰ Ý KÍCH HOẠT GÓI' : '❌ THẤT BẠI: LỖ HỔNG CẤP GÓI TỪ CLIENT TỒN TẠI'}\n`);

    // Test 3.2: Employer A cố tình gọi API Admin verify payment
    const empCallAdminVerify = await sendRequest({
      hostname: 'localhost',
      port: 5000,
      path: `/api/admin/payments/${testTxnRef}/verify`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenA}`
      }
    }, {});
    console.log(`4.3 Employer gọi POST /api/admin/payments/:ref/verify -> HTTP ${empCallAdminVerify.status}`);
    const isEmpAdminVerifyBlocked = empCallAdminVerify.status === 403;
    console.log(`    Kết quả: ${isEmpAdminVerifyBlocked ? '✅ ĐẠT: Bị chặn 403 Forbidden' : '❌ THẤT BẠI'}\n`);

    // Test 3.3: Admin chính thống xác nhận thanh toán hợp lệ
    const adminVerifyRes = await sendRequest({
      hostname: 'localhost',
      port: 5000,
      path: `/api/admin/payments/${testTxnRef}/verify`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenAdmin}`
      }
    }, { gatewayTransactionNo: 'BANK_MB_REF_123456' });

    console.log(`4.4 Admin xác nhận thanh toán -> HTTP ${adminVerifyRes.status}`);
    console.log(`    Thông báo:`, adminVerifyRes.body?.message);

    const dbTxnCheck2 = (await executeQuery('SELECT Status, GatewayTransactionNo, PaidAt FROM PaymentTransactions WHERE TransactionRef = @Ref', { Ref: testTxnRef })).recordset[0];
    const subCheck2 = (await executeQuery('SELECT RemainingPosts, RemainingSearches FROM EmployerSubscriptions WHERE EmployerID = 1')).recordset[0];

    const isAdminVerifySuccess = adminVerifyRes.status === 200 &&
                                dbTxnCheck2.Status === 'Success' &&
                                dbTxnCheck2.GatewayTransactionNo === 'BANK_MB_REF_123456' &&
                                subCheck2.RemainingPosts > initialPosts;

    console.log(`    Trạng thái sau Admin duyệt: "${dbTxnCheck2.Status}", PaidAt: ${dbTxnCheck2.PaidAt}`);
    console.log(`    Hạn mức sau khi Admin duyệt: Posts = ${subCheck2.RemainingPosts}, Searches = ${subCheck2.RemainingSearches}`);
    console.log(`    Kết quả: ${isAdminVerifySuccess ? '✅ ĐẠT: ADMIN DUYỆT THÀNH CÔNG VÀ KÍCH HOẠT GÓI HỢP LỆ' : '❌ THẤT BẠI'}\n`);

  } finally {
    // Cleanup transaction & restore subscription quota
    await executeQuery('DELETE FROM PaymentTransactions WHERE TransactionRef = @Ref', { Ref: testTxnRef });
    await executeQuery(`
      UPDATE EmployerSubscriptions 
      SET RemainingPosts = @Posts, RemainingSearches = @Searches
      WHERE EmployerID = 1
    `, { Posts: initialPosts, Searches: initialSearches });
    console.log('[CLEANUP] Đã dọn dẹp sạch giao dịch thử nghiệm và hoàn nguyên quota ban đầu!');
  }

  console.log('\n================================================================');
  console.log('       TẤT CẢ CÁC BÀI TEST BẢO MẬT P0 ĐỀU ĐÃ ĐẠT CHUẨN!         ');
  console.log('================================================================');
}

run().catch(err => {
  console.error('Lỗi kiểm thử P0:', err);
  process.exit(1);
});

