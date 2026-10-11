const { spawn, spawnSync } = require('child_process');
const http = require('http');
const path = require('path');
const assert = require('assert');
const { executeQuery } = require('../src/config/db');

const TEST_SECRET = 'Jobtimize_Integration_Test_Secret_Key_2026_Secure!';
const PORT = 5055; // Use dedicated test port to avoid conflicts

function sendRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const req = http.request({ ...options, port: PORT, hostname: 'localhost' }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, body });
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

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

let passed = 0;
let failed = 0;

function assertTest(name, condition, details = '') {
  if (condition) {
    console.log(`  ✅ [PASS] ${name}`);
    passed++;
  } else {
    console.error(`  ❌ [FAIL] ${name} ${details ? '(' + details + ')' : ''}`);
    failed++;
  }
}

async function runPart2TestSuite() {
  console.log('========================================================================');
  console.log('   BỘ KIỂM THỬ TỰ ĐỘNG TOÀN DIỆN PHẦN 2 — JOBTIMIZE (UC-E04 -> UC-E12)  ');
  console.log('========================================================================\n');

  // ---------------------------------------------------------------------------
  // 1. KIỂM THỬ KHỞI ĐỘNG VÀ BẢO MẬT JWT FAIL-FAST
  // ---------------------------------------------------------------------------
  console.log('--- 1. KIỂM THỬ BẢO MẬT KHỞI ĐỘNG SERVER & JWT FAIL-FAST ---');
  
  // 1.1 Khởi động thiếu JWT_SECRET phải thoát với code 1
  const serverPath = path.resolve(__dirname, '../src/server.js');
  const missingSecretProc = spawnSync(process.execPath, [serverPath], {
    cwd: path.resolve(__dirname, '..'),
    env: { ...process.env, JWT_SECRET: '', PORT: PORT.toString() },
    encoding: 'utf8'
  });
  assertTest('1.1 Server từ chối chạy và thoát (code 1) khi thiếu JWT_SECRET', missingSecretProc.status === 1);
  assertTest(
    '1.2 Thông báo lỗi cấu hình JWT được in rõ ràng',
    (missingSecretProc.stdout + missingSecretProc.stderr).includes('LỖI KHỞI ĐỘNG SERVER')
  );

  // 1.3 Khởi động server test với JWT_SECRET hợp lệ
  console.log('\n[INFO] Đang khởi động test server tại cổng ' + PORT + '...');
  const serverProcess = spawn(process.execPath, [serverPath], {
    cwd: path.resolve(__dirname, '..'),
    env: { ...process.env, JWT_SECRET: TEST_SECRET, PORT: PORT.toString() },
    stdio: 'pipe'
  });

  serverProcess.stderr.on('data', (d) => {
    // console.error('[Server Err]:', d.toString());
  });

  // Chờ server sẵn sàng
  let serverReady = false;
  for (let i = 0; i < 30; i++) {
    await wait(400);
    try {
      const ping = await sendRequest({ path: '/api/health', method: 'GET' });
      if (ping.status === 200) {
        serverReady = true;
        break;
      }
    } catch (e) {
      // Waiting
    }
  }

  if (!serverReady) {
    console.error('❌ Không thể khởi động test server. Dừng kiểm thử.');
    serverProcess.kill();
    process.exit(1);
  }
  console.log('✅ Test server đã sẵn sàng và kết nối database thành công!\n');

  try {
    // -------------------------------------------------------------------------
    // Đăng nhập các tài khoản: Employer A, Employer B, Admin
    // -------------------------------------------------------------------------
    console.log('--- 2. XÁC THỰC VÀ ĐĂNG NHẬP CÁC ACTOR ---');
    const loginA = await sendRequest({
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { email: 'hr@fpt-software.com', password: 'Admin@123' });
    const tokenA = loginA.body?.data?.token;

    const loginB = await sendRequest({
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { email: 'career@vng.com.vn', password: 'Admin@123' });
    const tokenB = loginB.body?.data?.token;

    const loginAdmin = await sendRequest({
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { email: 'admin@jobtimize.vn', password: 'Admin@123' });
    const tokenAdmin = loginAdmin.body?.data?.token;

    assertTest('2.1 Đăng nhập Employer A (FPT) thành công', !!tokenA);
    assertTest('2.2 Đăng nhập Employer B (VNG) thành công', !!tokenB);
    assertTest('2.3 Đăng nhập Quản trị viên (Admin) thành công', !!tokenAdmin);

    // Lấy EmployerID
    const empARes = await executeQuery('SELECT EmployerID, CompanyName, KYCStatus FROM Employers WHERE UserID = 2');
    const empBRes = await executeQuery('SELECT EmployerID, CompanyName, KYCStatus FROM Employers WHERE UserID = 3');
    const empAId = empARes.recordset[0].EmployerID;
    const empBId = empBRes.recordset[0].EmployerID;
    const initialKycA = empARes.recordset[0].KYCStatus;

    // -------------------------------------------------------------------------
    // 3. UC-E04 — EMPLOYER KYC & BẢO VỆ TÀI LIỆU PHÁP LÝ
    // -------------------------------------------------------------------------
    console.log('\n--- 3. KIỂM THỬ UC-E04: EMPLOYER KYC & BẢO VỆ TÀI LIỆU PHÁP LÝ ---');

    // 3.1 Truy cập file KYC không có token -> 401 Unauthorized
    const publicKycAccess = await sendRequest({
      path: '/uploads/kyc/test-business-license.pdf',
      method: 'GET'
    });
    assertTest('3.1 Truy cập file KYC nặc danh (không auth) bị chặn 401', publicKycAccess.status === 401);

    // 3.2 Nộp KYC với Mã số thuế không đúng định dạng -> 400
    // Tạo multipart data giả lập hoặc nộp dữ liệu
    const boundary = '----JobtimizeFormBoundary' + Date.now();
    const badMstBody = 
      `--${boundary}\r\nContent-Disposition: form-data; name="taxCode"\r\n\r\nABC123INVALID\r\n` +
      `--${boundary}\r\nContent-Disposition: form-data; name="businessLicense"; filename="license.pdf"\r\nContent-Type: application/pdf\r\n\r\n%PDF-1.4 Fake PDF Content\r\n` +
      `--${boundary}--\r\n`;

    const badMstRes = await sendRequest({
      path: '/api/employer/kyc',
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Authorization': `Bearer ${tokenA}`
      }
    }, badMstBody);
    assertTest('3.2 Nộp MST không đúng 10 hoặc 13 chữ số bị từ chối 400', badMstRes.status === 400);

    // 3.3 Nộp KYC hợp lệ với MST 10 chữ số
    const validBoundary = '----JobtimizeValidBoundary' + Date.now();
    const validKycBody = 
      `--${validBoundary}\r\nContent-Disposition: form-data; name="taxCode"\r\n\r\n0101248141\r\n` +
      `--${validBoundary}\r\nContent-Disposition: form-data; name="businessLicense"; filename="license.pdf"\r\nContent-Type: application/pdf\r\n\r\n%PDF-1.4 Real Business License Test\r\n` +
      `--${validBoundary}--\r\n`;

    const validKycRes = await sendRequest({
      path: '/api/employer/kyc',
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${validBoundary}`,
        'Authorization': `Bearer ${tokenA}`
      }
    }, validKycBody);
    assertTest('3.3 Nộp hồ sơ KYC hợp lệ thành công (HTTP 200, status Pending)', validKycRes.status === 200 && validKycRes.body?.data?.kycStatus === 'Pending');

    const uploadedLicenseUrl = validKycRes.body?.data?.businessLicenseUrl;
    const uploadedFilename = uploadedLicenseUrl ? path.basename(uploadedLicenseUrl) : '';

    // 3.4 Employer không được tự gọi API demo-approve (đã loại bỏ khỏi router)
    const demoApproveRes = await sendRequest({
      path: '/api/employer/kyc/demo-approve',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenA}`
      }
    }, { status: 'Approved' });
    assertTest('3.4 Employer không thể tự duyệt KYC qua endpoint demo (HTTP 404)', demoApproveRes.status === 404);

    // 3.5 Employer không được gọi API Admin review KYC -> 403 Forbidden
    const employerCallAdminKyc = await sendRequest({
      path: `/api/admin/kyc/${empAId}/review`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenA}`
      }
    }, { status: 'Approved' });
    assertTest('3.5 Employer gọi API Admin duyệt KYC bị chặn 403 Forbidden', employerCallAdminKyc.status === 403);

    // 3.6 Admin hợp lệ phê duyệt KYC của Employer A
    const adminApproveKyc = await sendRequest({
      path: `/api/admin/kyc/${empAId}/review`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenAdmin}`
      }
    }, { status: 'Approved' });
    assertTest('3.6 Admin phê duyệt KYC thành công (HTTP 200)', adminApproveKyc.status === 200);

    // 3.7 Kiểm tra trạng thái trong DB đã chuyển thành Approved
    const checkDbKyc = await executeQuery('SELECT KYCStatus FROM Employers WHERE EmployerID = @EmployerID', { EmployerID: empAId });
    assertTest('3.7 Trạng thái KYC trong database thực sự là Approved', checkDbKyc.recordset[0]?.KYCStatus === 'Approved');

    // 3.8 Employer B không được phép xem tài liệu KYC của Employer A
    if (uploadedFilename) {
      const crossKycView = await sendRequest({
        path: `/uploads/kyc/${uploadedFilename}`,
        method: 'GET',
        headers: { 'Authorization': `Bearer ${tokenB}` }
      });
      assertTest('3.8 Employer B không thể xem tài liệu pháp lý của Employer A (HTTP 403)', crossKycView.status === 403);

      const ownerKycView = await sendRequest({
        path: `/uploads/kyc/${uploadedFilename}`,
        method: 'GET',
        headers: { 'Authorization': `Bearer ${tokenA}` }
      });
      assertTest('3.9 Chủ sở hữu Employer A xem được tài liệu pháp lý của mình (HTTP 200)', ownerKycView.status === 200);
    }

    // -------------------------------------------------------------------------
    // 4. UC-E06 — JOB MANAGEMENT & PHÒNG CHỐNG IDOR
    // -------------------------------------------------------------------------
    console.log('\n--- 4. KIỂM THỬ UC-E06: QUẢN LÝ TIN TUYỂN DỤNG & IDOR ---');

    // 4.1 Employer A đăng tin tuyển dụng mới
    const postJobRes = await sendRequest({
      path: '/api/employer/jobs',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenA}`
      }
    }, {
      title: 'Senior React Engineer (Test Audit Suite)',
      description: 'Mô tả công việc kiểm thử tự động',
      requirements: 'Yêu cầu kỹ thuật kiểm thử',
      salaryRange: '30 - 45 triệu',
      location: 'Hà Nội'
    });
    assertTest('4.1 Employer A đăng tin tuyển dụng thành công (HTTP 201)', postJobRes.status === 201);
    const testJobId = postJobRes.body?.data?.JobID;

    // 4.2 Employer B cố tình cập nhật nội dung tin của Employer A -> 404 / 403
    const idorUpdateRes = await sendRequest({
      path: `/api/employer/jobs/${testJobId}`,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenB}`
      }
    }, {
      title: 'Tin bị hack bởi Employer B',
      description: 'Hacked',
      requirements: 'Hacked'
    });
    assertTest('4.2 Employer B không thể sửa nội dung tin của Employer A (IDOR Blocked: 404/403)', idorUpdateRes.status === 404 || idorUpdateRes.status === 403);

    // 4.3 Employer B cố tình đóng tin của Employer A -> 404 / 403
    const idorCloseRes = await sendRequest({
      path: `/api/employer/jobs/${testJobId}/status`,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenB}`
      }
    }, { status: 'Closed' });
    assertTest('4.3 Employer B không thể thay đổi trạng thái tin của Employer A', idorCloseRes.status === 404 || idorCloseRes.status === 403);

    // 4.4 Employer A đóng tin thành công
    const closeJobRes = await sendRequest({
      path: `/api/employer/jobs/${testJobId}/status`,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenA}`
      }
    }, { status: 'Closed' });
    assertTest('4.4 Employer A đóng (tạm dừng) tin thành công (Status = Closed)', closeJobRes.status === 200 && closeJobRes.body?.data?.status === 'Closed');

    // 4.5 Employer A mở lại tin thành công
    const reopenJobRes = await sendRequest({
      path: `/api/employer/jobs/${testJobId}/status`,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenA}`
      }
    }, { status: 'Published' });
    assertTest('4.5 Employer A mở lại tin tuyển dụng thành công (Status = Published)', reopenJobRes.status === 200 && reopenJobRes.body?.data?.status === 'Published');

    // 4.6 Employer B cố tình xóa tin của Employer A -> 404 / 403
    const idorDeleteRes = await sendRequest({
      path: `/api/employer/jobs/${testJobId}`,
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${tokenB}` }
    });
    assertTest('4.6 Employer B không thể xóa tin của Employer A (IDOR Blocked)', idorDeleteRes.status === 404 || idorDeleteRes.status === 403);

    // -------------------------------------------------------------------------
    // 5. UC-E07 — BẢNG GIÁ, THANH TOÁN & QUOTA CHỐNG TỰ CẤP
    // -------------------------------------------------------------------------
    console.log('\n--- 5. KIỂM THỬ UC-E07: THANH TOÁN, XÁC MINH & QUOTA ---');

    // 5.1 Lấy danh sách gói
    const packListRes = await sendRequest({
      path: '/api/employer/packages',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${tokenA}` }
    });
    assertTest('5.1 Lấy bảng giá gói dịch vụ thành công (HTTP 200)', packListRes.status === 200 && Array.isArray(packListRes.body?.data));
    const paidPackage = packListRes.body?.data?.find(p => Number(p.Price) > 0) || { PackageID: 2, PackageName: 'Pro' };

    // 5.2 Khởi tạo checkout gói trả phí
    const checkoutRes = await sendRequest({
      path: '/api/employer/checkout',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenA}`
      }
    }, {
      packageId: paidPackage.PackageID,
      paymentMethod: 'MoMo'
    });
    const txnRef = checkoutRes.body?.data?.transactionRef;
    assertTest('5.2 Khởi tạo checkout tạo mã giao dịch Pending (HTTP 200)', checkoutRes.status === 200 && !!txnRef);

    // 5.3 Employer gọi confirmPayment -> Giao dịch vẫn Pending, không được tự cấp quota
    const clientConfirmRes = await sendRequest({
      path: '/api/employer/payment/confirm',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenA}`
      }
    }, {
      transactionRef: txnRef,
      gatewayTransactionNo: 'FAKE_GATEWAY_NO_123'
    });
    assertTest('5.3 Client gọi confirm không được tự động chuyển thành Success (Giao dịch vẫn Pending)', 
      clientConfirmRes.body?.pendingVerification === true && clientConfirmRes.body?.data?.status === 'Pending'
    );

    // 5.4 Employer gọi API Admin verify thanh toán -> 403
    const idorVerifyPay = await sendRequest({
      path: `/api/admin/payments/${txnRef}/verify`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenA}`
      }
    }, {});
    assertTest('5.4 Employer tự gọi API Admin verify thanh toán bị chặn 403 Forbidden', idorVerifyPay.status === 403);

    // Lấy số posts trước khi Admin verify
    const subBefore = await executeQuery('SELECT RemainingPosts, RemainingSearches FROM EmployerSubscriptions WHERE EmployerID = @EmployerID', { EmployerID: empAId });
    const postsBefore = subBefore.recordset[0]?.RemainingPosts || 0;

    // 5.5 Admin verify thanh toán hợp lệ -> Giao dịch thành Success và cấp quota
    const adminVerifyRes = await sendRequest({
      path: `/api/admin/payments/${txnRef}/verify`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenAdmin}`
      }
    }, { gatewayTransactionNo: 'MOMO_REAL_VERIFIED_789' });
    assertTest('5.5 Admin xác nhận thanh toán thành công (HTTP 200, Status = Success)', 
      adminVerifyRes.status === 200 && adminVerifyRes.body?.data?.status === 'Success'
    );

    // Kiểm tra quota sau khi verify
    const subAfter = await executeQuery('SELECT RemainingPosts, RemainingSearches FROM EmployerSubscriptions WHERE EmployerID = @EmployerID', { EmployerID: empAId });
    const postsAfter = subAfter.recordset[0]?.RemainingPosts || 0;
    assertTest('5.6 Quota tin đăng đã được cộng sau khi Admin xác nhận thanh toán', postsAfter > postsBefore);

    // 5.7 Gửi lại callback lặp / Admin verify lần 2 -> Không cộng lặp quota
    const duplicateVerifyRes = await sendRequest({
      path: `/api/admin/payments/${txnRef}/verify`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenAdmin}`
      }
    }, { gatewayTransactionNo: 'MOMO_REAL_VERIFIED_789' });
    const subAfterDup = await executeQuery('SELECT RemainingPosts FROM EmployerSubscriptions WHERE EmployerID = @EmployerID', { EmployerID: empAId });
    const postsAfterDup = subAfterDup.recordset[0]?.RemainingPosts || 0;
    assertTest('5.7 Xác minh lặp lại (idempotency) không cộng dồn quota lần hai', postsAfterDup === postsAfter);

    // -------------------------------------------------------------------------
    // 6. UC-E10 — INTERVIEW SCHEDULING & PHÒNG CHỐNG IDOR TRÊN ỨNG VIÊN
    // -------------------------------------------------------------------------
    console.log('\n--- 6. KIỂM THỬ UC-E10: LÊN LỊCH PHỎNG VẤN & BẢO VỆ ĐƠN ỨNG TUYỂN ---');

    // Tạo đơn ứng tuyển test cho testJobId
    const candProfileRes = await executeQuery('SELECT TOP 1 ProfileID FROM CandidateProfiles WHERE IsLookingForJob = 1');
    const testCandidateProfileId = candProfileRes.recordset[0].ProfileID;

    const createApplicationRes = await executeQuery(`
      INSERT INTO JobApplications (JobID, ProfileID, Status, MatchScore, AppliedAt)
      OUTPUT INSERTED.ApplicationID
      VALUES (@JobID, @ProfileID, 'Applied', 88.5, GETDATE())
    `, { JobID: testJobId, ProfileID: testCandidateProfileId });
    const testApplicationId = createApplicationRes.recordset[0].ApplicationID;

    // 6.1 Lên lịch phỏng vấn vào thời gian quá khứ -> 400
    const pastInterviewRes = await sendRequest({
      path: '/api/employer/interviews',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenA}`
      }
    }, {
      applicationId: testApplicationId,
      interviewDate: '2020-01-01T10:00:00',
      locationOrLink: 'https://meet.google.com/test-audit'
    });
    assertTest('6.1 Lên lịch phỏng vấn thời gian quá khứ bị từ chối 400', pastInterviewRes.status === 400);

    // 6.2 Employer B cố tình lên lịch phỏng vấn cho ứng viên của Employer A -> 403 IDOR
    const futureDate = new Date(Date.now() + 86400000 * 2).toISOString();
    const idorScheduleRes = await sendRequest({
      path: '/api/employer/interviews',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenB}`
      }
    }, {
      applicationId: testApplicationId,
      interviewDate: futureDate,
      locationOrLink: 'https://meet.google.com/hacked'
    });
    assertTest('6.2 Employer B lên lịch phỏng vấn trên đơn của Employer A bị chặn 403 Forbidden', idorScheduleRes.status === 403);

    // 6.3 Employer B cố tình đổi trạng thái đơn ứng tuyển của Employer A -> 403 IDOR
    const idorStatusRes = await sendRequest({
      path: `/api/employer/applications/${testApplicationId}/status`,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenB}`
      }
    }, { status: 'Offered' });
    assertTest('6.3 Employer B đổi trạng thái đơn của Employer A bị chặn 403 Forbidden', idorStatusRes.status === 403);

    // 6.4 Employer A lên lịch phỏng vấn hợp lệ thành công
    const validScheduleRes = await sendRequest({
      path: '/api/employer/interviews',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenA}`
      }
    }, {
      applicationId: testApplicationId,
      interviewDate: futureDate,
      interviewType: 'Online',
      locationOrLink: 'https://meet.google.com/jobtimize-audit',
      notes: 'Ghi chú phỏng vấn kỹ thuật'
    });
    assertTest('6.4 Employer A lên lịch phỏng vấn thành công (HTTP 201)', validScheduleRes.status === 201);
    assertTest('6.5 Trạng thái email được phản hồi trung thực (emailSent boolean)', typeof validScheduleRes.body?.emailSent === 'boolean');

    // 6.6 Trạng thái đơn ứng tuyển tự động chuyển sang Interviewing
    const appCheckDb = await executeQuery('SELECT Status FROM JobApplications WHERE ApplicationID = @ApplicationID', { ApplicationID: testApplicationId });
    assertTest('6.6 Đơn ứng tuyển tự động cập nhật Status = Interviewing', appCheckDb.recordset[0]?.Status === 'Interviewing');

    // 6.7 Tránh tạo lịch trùng lặp cùng một phút cho cùng đơn ứng tuyển
    const duplicateScheduleRes = await sendRequest({
      path: '/api/employer/interviews',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenA}`
      }
    }, {
      applicationId: testApplicationId,
      interviewDate: futureDate,
      locationOrLink: 'https://meet.google.com/jobtimize-audit'
    });
    assertTest('6.7 Thao tác đặt lịch trùng cùng thời điểm bị từ chối 400', duplicateScheduleRes.status === 400);

    // -------------------------------------------------------------------------
    // 7. UC-E11 & UC-E12 — TÌM KIẾM ỨNG VIÊN & MỜI ỨNG TUYỂN
    // -------------------------------------------------------------------------
    console.log('\n--- 7. KIỂM THỬ UC-E11 & UC-E12: TÌM KIẾM & MỜI ỨNG TUYỂN ---');

    // 7.1 Tạo một ứng viên tắt tìm việc (IsLookingForJob = 0) để kiểm thử
    await executeQuery(`
      IF NOT EXISTS (SELECT * FROM Users WHERE Email = 'hidden.candidate@test.vn')
      BEGIN
        INSERT INTO Users (Email, FullName, Status) VALUES ('hidden.candidate@test.vn', N'Ứng Viên Ẩn Hồ Sơ', 'Active');
        DECLARE @NewUID INT = SCOPE_IDENTITY();
        INSERT INTO CandidateProfiles (UserID, Headline, IsLookingForJob) VALUES (@NewUID, N'Lập trình viên không tìm việc', 0);
      END
      ELSE
      BEGIN
        UPDATE cp SET IsLookingForJob = 0
        FROM CandidateProfiles cp JOIN Users u ON cp.UserID = u.UserID
        WHERE u.Email = 'hidden.candidate@test.vn';
      END
    `);

    // 7.2 Candidate Search không được trả về ứng viên tắt tìm việc
    const searchRes = await sendRequest({
      path: '/api/employer/candidates?keyword=hidden',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${tokenA}` }
    });
    const foundHidden = searchRes.body?.data?.some(c => c.Email === 'hidden.candidate@test.vn');
    assertTest('7.1 Candidate Search KHÔNG trả về ứng viên đã tắt tìm việc (IsLookingForJob = 0)', !foundHidden);

    // 7.3 Candidate Search trả về danh sách ứng viên bật tìm việc kèm meta
    const searchAllRes = await sendRequest({
      path: '/api/employer/candidates',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${tokenA}` }
    });
    assertTest('7.2 Candidate Search trả về ứng viên đang bật tìm việc (HTTP 200)', 
      searchAllRes.status === 200 && Array.isArray(searchAllRes.body?.data) && searchAllRes.body?.data.length > 0
    );

    // 7.4 Gửi lời mời tới ứng viên tắt tìm việc -> 400
    const hiddenCandidate = (await executeQuery(`
      SELECT cp.ProfileID FROM CandidateProfiles cp JOIN Users u ON cp.UserID = u.UserID WHERE u.Email = 'hidden.candidate@test.vn'
    `)).recordset[0];

    const inviteHiddenRes = await sendRequest({
      path: '/api/employer/invite-candidate',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenA}`
      }
    }, {
      profileId: hiddenCandidate.ProfileID,
      jobId: testJobId,
      message: 'Mời ứng tuyển'
    });
    assertTest('7.3 Mời ứng viên đã tắt tìm việc bị từ chối 400', inviteHiddenRes.status === 400);

    // 7.5 Employer A gửi lời mời tới ứng viên đang tìm việc thành công
    const inviteValidRes = await sendRequest({
      path: '/api/employer/invite-candidate',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenA}`
      }
    }, {
      profileId: testCandidateProfileId,
      jobId: testJobId,
      message: 'Trân trọng mời bạn tham gia ứng tuyển vị trí Senior React Engineer'
    });
    assertTest('7.4 Gửi lời mời ứng tuyển hợp lệ thành công (HTTP 201)', inviteValidRes.status === 201);

    // 7.6 Gửi lời mời trùng lặp cho cùng ứng viên & tin tuyển dụng -> 400
    const duplicateInviteRes = await sendRequest({
      path: '/api/employer/invite-candidate',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenA}`
      }
    }, {
      profileId: testCandidateProfileId,
      jobId: testJobId
    });
    assertTest('7.5 Ngăn chặn gửi lời mời ứng tuyển trùng lặp (HTTP 400)', duplicateInviteRes.status === 400);

    // 7.7 Employer B cố tình mời ứng viên bằng tin tuyển dụng của Employer A -> 404
    const idorInviteRes = await sendRequest({
      path: '/api/employer/invite-candidate',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenB}`
      }
    }, {
      profileId: testCandidateProfileId,
      jobId: testJobId
    });
    assertTest('7.6 Employer B không thể dùng tin của Employer A để mời ứng viên (IDOR Blocked)', idorInviteRes.status === 404);

    // -------------------------------------------------------------------------
    // DỌN DẸP DỮ LIỆU TEST
    // -------------------------------------------------------------------------
    console.log('\n--- 8. DỌN DẸP DỮ LIỆU TEST (CLEANUP) ---');
    await executeQuery('DELETE FROM Interviews WHERE ApplicationID = @AppID', { AppID: testApplicationId });
    await executeQuery('DELETE FROM JobApplications WHERE ApplicationID = @AppID', { AppID: testApplicationId });
    await executeQuery('DELETE FROM CandidateInvitations WHERE JobID = @JobID', { JobID: testJobId });
    await executeQuery('DELETE FROM JobPostings WHERE JobID = @JobID', { JobID: testJobId });
    await executeQuery('DELETE FROM PaymentTransactions WHERE TransactionRef = @TxnRef', { TxnRef: txnRef });
    await executeQuery('UPDATE Employers SET KYCStatus = @OldStatus WHERE EmployerID = @EmployerID', { 
      OldStatus: initialKycA, 
      EmployerID: empAId 
    });
    console.log('✅ Đã dọn dẹp các bản ghi thử nghiệm sạch sẽ.');

  } finally {
    // Tắt test server
    console.log('\n[INFO] Đang đóng test server...');
    serverProcess.kill();
    await wait(500);
  }

  console.log('\n========================================================================');
  console.log(`🏁 KẾT QUẢ TỔNG KẾT: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runPart2TestSuite().catch(err => {
  console.error('Fatal Test Suite Error:', err);
  process.exit(1);
});

