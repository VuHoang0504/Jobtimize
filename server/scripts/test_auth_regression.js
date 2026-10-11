const { spawn } = require('child_process');
const http = require('http');
const path = require('path');
const jwt = require('jsonwebtoken');
const { executeQuery } = require('../src/config/db');

const TEST_SECRET = 'Jobtimize_Regression_Audit_Secret_Key_2026!';
const TEST_GOOGLE_CLIENT_ID = 'jobtimize-test-client-id.apps.googleusercontent.com';
process.env.JWT_SECRET = TEST_SECRET;
process.env.GOOGLE_CLIENT_ID = TEST_GOOGLE_CLIENT_ID;
const PORT = 5066;

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

async function runAuthRegression() {
  console.log('========================================================================');
  console.log('       KIỂM THỬ HỒI QUY: ĐĂNG NHẬP THÔNG THƯỜNG & GOOGLE OAUTH          ');
  console.log('========================================================================\n');

  // Khởi động server test với TEST_SECRET
  const serverPath = path.resolve(__dirname, '../src/server.js');
  const serverProcess = spawn(process.execPath, [serverPath], {
    cwd: path.resolve(__dirname, '..'),
    env: { ...process.env, JWT_SECRET: TEST_SECRET, PORT: PORT.toString(), GOOGLE_CLIENT_ID: TEST_GOOGLE_CLIENT_ID },
    stdio: 'pipe'
  });

  let serverOutput = '';
  serverProcess.stdout.on('data', d => serverOutput += d.toString());
  serverProcess.stderr.on('data', d => serverOutput += d.toString());

  let serverReady = false;
  for (let i = 0; i < 35; i++) {
    await wait(300);
    try {
      const ping = await sendRequest({ path: '/api/health', method: 'GET' });
      if (ping.status === 200) {
        serverReady = true;
        break;
      }
    } catch (e) {}
  }

  if (!serverReady) {
    console.error('❌ Server không khởi động được trên cổng ' + PORT);
    console.error('Server Output:\n' + serverOutput);
    serverProcess.kill();
    process.exit(1);
  }

  try {
    // -------------------------------------------------------------------------
    // 1. KIỂM THỬ ĐĂNG NHẬP THÔNG THƯỜNG (EMAIL + PASSWORD)
    // -------------------------------------------------------------------------
    console.log('--- 1. LUỒNG ĐĂNG NHẬP THÔNG THƯỜNG (EMAIL / PASSWORD) ---');

    // 1.1 Đăng nhập hợp lệ Employer
    const loginEmployer = await sendRequest({
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { email: 'hr@fpt-software.com', password: 'Admin@123' });
    assertTest('1.1 Đăng nhập Employer trả về HTTP 200 và token JWT', 
      loginEmployer.status === 200 && typeof loginEmployer.body?.data?.token === 'string'
    );
    const employerToken = loginEmployer.body?.data?.token;

    // 1.2 Đăng nhập hợp lệ Candidate
    const loginCandidate = await sendRequest({
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { email: 'nam.nguyen@talent.vn', password: 'Candidate@123' });
    assertTest('1.2 Đăng nhập Candidate trả về HTTP 200 và thông tin Role = Candidate',
      loginCandidate.status === 200 && loginCandidate.body?.data?.user?.role === 'Candidate'
    );
    const candidateToken = loginCandidate.body?.data?.token;

    // 1.3 Đăng nhập hợp lệ Admin
    const loginAdmin = await sendRequest({
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { email: 'admin@jobtimize.vn', password: 'Admin@123' });
    assertTest('1.3 Đăng nhập Admin trả về HTTP 200 và thông tin Role = Admin',
      loginAdmin.status === 200 && loginAdmin.body?.data?.user?.role === 'Admin'
    );

    // 1.4 Đăng nhập sai mật khẩu -> 401
    const badPassword = await sendRequest({
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { email: 'hr@fpt-software.com', password: 'WrongPassword@999' });
    assertTest('1.4 Đăng nhập sai mật khẩu bị từ chối HTTP 401', badPassword.status === 401);

    // 1.5 Đăng nhập email không tồn tại -> 401
    const notFoundEmail = await sendRequest({
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { email: 'nonexistent.user.test@jobtimize.vn', password: 'Admin@123' });
    assertTest('1.5 Đăng nhập email không tồn tại bị từ chối HTTP 401', notFoundEmail.status === 401);

    // 1.6 Đăng nhập thiếu thông tin -> 400
    const emptyLogin = await sendRequest({
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { email: '' });
    assertTest('1.6 Đăng nhập thiếu email/password bị từ chối HTTP 400', emptyLogin.status === 400);

    // -------------------------------------------------------------------------
    // 2. KIỂM THỬ XÁC THỰC TOKEN QUA /api/auth/me (authMiddleware)
    // -------------------------------------------------------------------------
    console.log('\n--- 2. KIỂM THỬ XÁC THỰC TOKEN VÀ PHIÊN LÀM VIỆC (/api/auth/me) ---');

    // 2.1 Gọi /api/auth/me với token hợp lệ
    const meEmployer = await sendRequest({
      path: '/api/auth/me',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${employerToken}` }
    });
    assertTest('2.1 /api/auth/me trả về đúng thông tin tài khoản Employer',
      meEmployer.status === 200 && meEmployer.body?.data?.email === 'hr@fpt-software.com'
    );

    const meCandidate = await sendRequest({
      path: '/api/auth/me',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${candidateToken}` }
    });
    assertTest('2.2 /api/auth/me trả về đúng thông tin tài khoản Candidate',
      meCandidate.status === 200 && meCandidate.body?.data?.email === 'nam.nguyen@talent.vn'
    );

    // 2.3 Gọi /api/auth/me không có token -> 401
    const noTokenMe = await sendRequest({
      path: '/api/auth/me',
      method: 'GET'
    });
    assertTest('2.3 Gọi API bảo mật không có token bị chặn HTTP 401', noTokenMe.status === 401);

    // 2.4 Token bị giả mạo / ký bằng secret khác -> 401
    const forgedToken = jwt.sign({ userId: 2, email: 'hr@fpt-software.com', role: 'Employer' }, 'Wrong_Attacker_Secret_Key!');
    const tamperedMe = await sendRequest({
      path: '/api/auth/me',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${forgedToken}` }
    });
    assertTest('2.4 Token giả mạo chữ ký bị authMiddleware từ chối HTTP 401', tamperedMe.status === 401);

    // -------------------------------------------------------------------------
    // 3. KIỂM THỬ LUỒNG GOOGLE OAUTH
    // -------------------------------------------------------------------------
    console.log('\n--- 3. KIỂM THỬ LUỒNG GOOGLE OAUTH (BẢO MẬT & XÁC THỰC) ---');

    // 3.1 Gửi request Google login thiếu credential -> 400
    const emptyGoogle = await sendRequest({
      path: '/api/auth/google',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {});
    assertTest('3.1 Google OAuth thiếu credential token trả về HTTP 400', emptyGoogle.status === 400);

    // 3.2 Gửi credential rác/chuỗi không hợp lệ -> 401
    const invalidGoogle = await sendRequest({
      path: '/api/auth/google',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { credential: 'invalid.google.token.format' });
    assertTest('3.2 Google OAuth token rác bị từ chối HTTP 401', invalidGoogle.status === 401);

    // 3.3 Token Google giả mạo / tự ký bằng secret riêng (Attacker Forgery)
    // PHẢI BỊ TỪ CHỐI HTTP 401 bởi OAuth2Client.verifyIdToken, TUYỆT ĐỐI KHÔNG BYPASS bằng jwt.decode
    const forgedGoogleToken = jwt.sign({
      iss: 'https://accounts.google.com',
      sub: 'google_oauth_sub_forged_999999',
      email: 'attacker.forged.google@evil.com',
      name: 'Attacker Forged User',
      picture: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&q=80',
      email_verified: true
    }, 'attacker_secret_simulating_fake_signature', { expiresIn: '1h' });

    const forgedRes = await sendRequest({
      path: '/api/auth/google',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { credential: forgedGoogleToken, roleName: 'Candidate' });

    assertTest('3.3 Token Google tự ký/giả mạo bị reject dứt khoát HTTP 401 (Chặn hoàn toàn Bypass)',
      forgedRes.status === 401
    );

    // 3.4 Xác minh database: không có tài khoản hay dữ liệu nào được tạo/cập nhật cho token giả mạo
    const attackerCheck = await executeQuery(
      'SELECT UserID FROM Users WHERE Email = @Email',
      { Email: 'attacker.forged.google@evil.com' }
    );
    assertTest('3.4 Tuyệt đối không tạo hoặc cập nhật tài khoản DB cho token Google giả mạo',
      attackerCheck.recordset.length === 0
    );

    // 3.5 Kiểm tra từ chối xử lý khi GOOGLE_CLIENT_ID chưa được cấu hình (không âm thầm dùng Client ID demo)
    const { googleLogin } = require('../src/controllers/authController');
    const origClientId = process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_ID;
    let noConfigStatus = 200;
    let noConfigBody = null;
    const noConfigRes = {
      status: (s) => { noConfigStatus = s; return noConfigRes; },
      json: (b) => { noConfigBody = b; return noConfigRes; }
    };
    await googleLogin({
      body: { credential: 'some_credential_token', roleName: 'Candidate' }
    }, noConfigRes);
    process.env.GOOGLE_CLIENT_ID = origClientId;
    assertTest('3.5 Từ chối đăng nhập (HTTP 500) khi GOOGLE_CLIENT_ID chưa cấu hình (không tự dùng Client ID demo)',
      noConfigStatus === 500 && noConfigBody?.success === false
    );

    // 3.6 Kiểm thử token Google sai Audience (Recipient mismatch)
    // verifyIdToken ném lỗi 'Recipient mismatch' khi token được phát hành cho client id khác
    const { OAuth2Client } = require('google-auth-library');
    const origVerify = OAuth2Client.prototype.verifyIdToken;

    try {
      OAuth2Client.prototype.verifyIdToken = async function() {
        throw new Error('Recipient mismatch (audience: wrong-client-id != expected: ' + TEST_GOOGLE_CLIENT_ID + ')');
      };
      const { googleLogin } = require('../src/controllers/authController');
      let wrongAudStatus = 200;
      let wrongAudBody = null;
      const mockRes = {
        status: (s) => { wrongAudStatus = s; return mockRes; },
        json: (b) => { wrongAudBody = b; return mockRes; }
      };
      await googleLogin({
        body: { credential: 'token_with_wrong_audience', roleName: 'Candidate' }
      }, mockRes);

      assertTest('3.6 Token Google sai Audience bị từ chối HTTP 401', wrongAudStatus === 401);
    } finally {
      OAuth2Client.prototype.verifyIdToken = origVerify;
    }

    // 3.7 Kiểm thử token Google hết hạn (Expired token)
    // verifyIdToken ném lỗi 'Token used too late' khi token quá hạn
    try {
      OAuth2Client.prototype.verifyIdToken = async function() {
        throw new Error('Token used too late, 1728567890 < 1728570000');
      };
      const { googleLogin } = require('../src/controllers/authController');
      let expiredStatus = 200;
      let expiredBody = null;
      const mockRes = {
        status: (s) => { expiredStatus = s; return mockRes; },
        json: (b) => { expiredBody = b; return mockRes; }
      };
      await googleLogin({
        body: { credential: 'token_expired_google', roleName: 'Candidate' }
      }, mockRes);

      assertTest('3.7 Token Google hết hạn bị từ chối HTTP 401', expiredStatus === 401);
    } finally {
      OAuth2Client.prototype.verifyIdToken = origVerify;
    }

    // 3.8 Kiểm thử luồng xử lý đăng nhập Google khi Google verifyIdToken thành công
    // Sử dụng cơ chế Mock cô lập (Isolated Test Harness) trong tiến trình kiểm thử, không can thiệp runtime thật
    let isolatedIssuedToken = null;
    const mockIsolatedEmail = 'test.google.isolated.mock@gmail.com';

    try {
      OAuth2Client.prototype.verifyIdToken = async function({ idToken, audience }) {
        if (idToken === 'mock_valid_verified_id_token_for_isolated_test_only') {
          return {
            getPayload: () => ({
              sub: 'google_mock_verified_sub_889900',
              email: mockIsolatedEmail,
              name: 'Nguyen Van Isolated Mock',
              picture: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&q=80',
              email_verified: true
            })
          };
        }
        return origVerify.call(this, { idToken, audience });
      };

      const { googleLogin } = require('../src/controllers/authController');
      let isolatedStatus = 200;
      let isolatedBody = null;
      const mockRes = {
        status: (s) => { isolatedStatus = s; return mockRes; },
        json: (b) => { isolatedBody = b; return mockRes; }
      };

      await googleLogin({
        body: {
          credential: 'mock_valid_verified_id_token_for_isolated_test_only',
          roleName: 'Candidate'
        }
      }, mockRes);

      assertTest('3.8 [Isolated Unit Mock] Xử lý tài khoản và cấp JWT khi Google verifyIdToken thành công (HTTP 200)',
        isolatedStatus === 200 && typeof isolatedBody?.data?.token === 'string'
      );
      isolatedIssuedToken = isolatedBody?.data?.token;

    } finally {
      // Phục hồi prototype ngay lập tức
      OAuth2Client.prototype.verifyIdToken = origVerify;
    }

    // 3.9 Token cấp sau khi Google xác thực thành công hoạt động chuẩn với /api/auth/me
    if (isolatedIssuedToken) {
      const googleMeRes = await sendRequest({
        path: '/api/auth/me',
        method: 'GET',
        headers: { 'Authorization': `Bearer ${isolatedIssuedToken}` }
      });
      assertTest('3.9 Token được cấp sau khi Google xác thực thành công được /api/auth/me công nhận',
        googleMeRes.status === 200 && googleMeRes.body?.data?.email === mockIsolatedEmail
      );
    }

    // 3.10 Dọn dẹp tài khoản test isolated Google OAuth
    await executeQuery(`
      DELETE FROM CandidateProfiles WHERE UserID IN (SELECT UserID FROM Users WHERE Email = '${mockIsolatedEmail}');
      DELETE FROM UserRoles WHERE UserID IN (SELECT UserID FROM Users WHERE Email = '${mockIsolatedEmail}');
      DELETE FROM Users WHERE Email = '${mockIsolatedEmail}';
    `);
    console.log('✅ Đã dọn dẹp tài khoản test isolated Google OAuth.');

  } finally {
    serverProcess.kill();
  }

  console.log('\n========================================================================');
  console.log(`🏁 KẾT QUẢ KIỂM THỬ HỒI QUY: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================================\n');

  if (failed > 0) process.exit(1);
  else process.exit(0);
}

runAuthRegression().catch(err => {
  console.error('Fatal Auth Regression Error:', err);
  process.exit(1);
});
