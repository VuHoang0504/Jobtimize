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
  console.log('       TEST SUITE UC-E10: QUẢN LÝ LỊCH PHỎNG VẤN & ATS          ');
  console.log('================================================================\n');

  // 1. Authenticate Employer A (FPT) and Employer B (VNG)
  console.log('1. Đăng nhập 2 tài khoản Nhà tuyển dụng:');
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

  if (!tokenA || !tokenB) {
    throw new Error('Đăng nhập thất bại, không lấy được JWT token');
  }
  console.log('   Employer A (FPT Software) Token: OK');
  console.log('   Employer B (VNG Corporation) Token: OK\n');

  // Setup test job and application for Employer A
  const jobARes = await executeQuery('SELECT TOP 1 JobID FROM JobPostings WHERE EmployerID = 1');
  const candRes = await executeQuery('SELECT TOP 1 ProfileID FROM CandidateProfiles');
  const jobA = jobARes.recordset[0];
  const cand = candRes.recordset[0];

  const appRes = await executeQuery(`
    INSERT INTO JobApplications (JobID, ProfileID, MatchScore, Status, AppliedAt)
    OUTPUT INSERTED.ApplicationID
    VALUES (@JobID, @ProfileID, 85.5, 'Applied', GETDATE())
  `, { JobID: jobA.JobID, ProfileID: cand.ProfileID });
  const testAppId = appRes.recordset[0].ApplicationID;
  console.log(`[SETUP] Đã tạo đơn ứng tuyển thử nghiệm ID: ${testAppId} thuộc JobID: ${jobA.JobID} (Employer A: FPT)\n`);

  try {
    // TEST CASE 1: IDOR Attack - Employer B cố tình đổi trạng thái đơn của Employer A
    console.log('--- TEST CASE 1: Chống can thiệp trạng thái đơn (IDOR Guard) ---');
    const updateResB = await sendRequest({
      hostname: 'localhost',
      port: 5000,
      path: `/api/employer/applications/${testAppId}/status`,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenB}`
      }
    }, { status: 'Rejected' });

    console.log(`   Employer B gửi PATCH đổi status sang 'Rejected' -> HTTP Status: ${updateResB.status}`);
    console.log(`   Phản hồi:`, updateResB.body);
    const dbAppCheck1 = (await executeQuery('SELECT Status FROM JobApplications WHERE ApplicationID = @AppID', { AppID: testAppId })).recordset[0];
    const isStatusProtected = updateResB.status === 403 && dbAppCheck1.Status === 'Applied';
    console.log(`   Trạng thái trong DB vẫn là: "${dbAppCheck1.Status}" -> ${isStatusProtected ? '✅ ĐẠT: IDOR BỊ CHẶN HOÀN TOÀN' : '❌ THẤT BẠI'}\n`);

    // TEST CASE 2: IDOR Attack - Employer B cố tình lên lịch phỏng vấn cho ứng viên của Employer A
    console.log('--- TEST CASE 2: Chống đặt lịch phỏng vấn trái phép (IDOR Guard) ---');
    const scheduleResB = await sendRequest({
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
      interviewDate: '2026-10-25T09:30',
      interviewType: 'Online',
      locationOrLink: 'https://meet.google.com/hacker-call',
      notes: 'Hacking attempt'
    });

    console.log(`   Employer B gửi POST lên lịch phỏng vấn -> HTTP Status: ${scheduleResB.status}`);
    console.log(`   Phản hồi:`, scheduleResB.body);
    const dbInterviewCount1 = (await executeQuery('SELECT COUNT(*) AS Cnt FROM Interviews WHERE ApplicationID = @AppID', { AppID: testAppId })).recordset[0].Cnt;
    const isScheduleProtected = scheduleResB.status === 403 && dbInterviewCount1 === 0;
    console.log(`   Số bản ghi phỏng vấn trong DB: ${dbInterviewCount1} -> ${isScheduleProtected ? '✅ ĐẠT: YÊU CẦU ĐẶT LỊCH TRÁI PHÉP BỊ CHẶN' : '❌ THẤT BẠI'}\n`);

    // TEST CASE 3: Request với ApplicationID không tồn tại
    console.log('--- TEST CASE 3: Kiểm tra đơn ứng tuyển không tồn tại (404 Not Found) ---');
    const notFoundRes = await sendRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/employer/interviews',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenA}`
      }
    }, {
      applicationId: 99999999,
      interviewDate: '2026-10-25T09:30',
      interviewType: 'Online',
      locationOrLink: 'https://meet.google.com/test-404'
    });
    console.log(`   Gửi ApplicationID 99999999 -> HTTP Status: ${notFoundRes.status} (Body: ${JSON.stringify(notFoundRes.body)})`);
    console.log(`   Kết quả: ${notFoundRes.status === 404 ? '✅ ĐẠT (404 Not Found)' : '❌ THẤT BẠI'}\n`);

    // TEST CASE 4: Định dạng interviewDate không hợp lệ từ datetime-local
    console.log('--- TEST CASE 4: Kiểm tra định dạng ngày giờ phỏng vấn không hợp lệ ---');
    const invalidDateRes = await sendRequest({
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
      interviewDate: 'invalid-date-string-xyz',
      interviewType: 'Online',
      locationOrLink: 'https://meet.google.com/test'
    });
    console.log(`   Gửi chuỗi ngày 'invalid-date-string-xyz' -> HTTP Status: ${invalidDateRes.status} (Body: ${JSON.stringify(invalidDateRes.body)})`);
    console.log(`   Kết quả: ${invalidDateRes.status === 400 ? '✅ ĐẠT (400 Bad Request)' : '❌ THẤT BẠI'}\n`);

    // TEST CASE 5: Employer A (Chính chủ) lên lịch phỏng vấn hợp lệ với chuỗi datetime-local
    console.log('--- TEST CASE 5: Employer chính chủ lên lịch phỏng vấn thành công (Chuỗi datetime-local) ---');
    const validDateLocal = '2026-10-28T14:30'; // Chuỗi chuẩn HTML5 datetime-local
    const scheduleResA = await sendRequest({
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
      interviewDate: validDateLocal,
      interviewType: 'Online',
      locationOrLink: 'https://meet.google.com/fpt-interview-room',
      notes: 'Phỏng vấn kỹ thuật vòng 1 với Tech Lead'
    });

    console.log(`   Employer A gửi POST đặt lịch hợp lệ -> HTTP Status: ${scheduleResA.status}`);
    console.log(`   Phản hồi:`, scheduleResA.body);

    const dbAppCheck2 = (await executeQuery('SELECT Status FROM JobApplications WHERE ApplicationID = @AppID', { AppID: testAppId })).recordset[0];
    const dbInterviewRes = (await executeQuery('SELECT * FROM Interviews WHERE ApplicationID = @AppID', { AppID: testAppId })).recordset;
    const interviewRow = dbInterviewRes[0];

    const isScheduleSuccess = scheduleResA.status === 201 &&
                              dbAppCheck2.Status === 'Interviewing' &&
                              dbInterviewRes.length === 1 &&
                              interviewRow.InterviewType === 'Online' &&
                              interviewRow.LocationOrLink === 'https://meet.google.com/fpt-interview-room' &&
                              interviewRow.Notes === 'Phỏng vấn kỹ thuật vòng 1 với Tech Lead';

    console.log(`   Bản ghi trong DB:`);
    console.log(`     - InterviewID: ${interviewRow?.InterviewID}`);
    console.log(`     - InterviewDate: ${interviewRow?.InterviewDate}`);
    console.log(`     - Trạng thái JobApplications: ${dbAppCheck2.Status}`);
    console.log(`   Kết quả: ${isScheduleSuccess ? '✅ ĐẠT: ĐẶT LỊCH THÀNH CÔNG VÀ LƯU CHÍNH XÁC VÀO DB' : '❌ THẤT BẠI'}\n`);

    // TEST CASE 6: Employer A (Chính chủ) cập nhật trạng thái đơn sang 'Offered'
    console.log('--- TEST CASE 6: Employer chính chủ cập nhật trạng thái đơn tuyển dụng ---');
    const updateResA = await sendRequest({
      hostname: 'localhost',
      port: 5000,
      path: `/api/employer/applications/${testAppId}/status`,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenA}`
      }
    }, { status: 'Offered' });

    console.log(`   Employer A gửi PATCH cập nhật sang 'Offered' -> HTTP Status: ${updateResA.status}`);
    const dbAppCheck3 = (await executeQuery('SELECT Status FROM JobApplications WHERE ApplicationID = @AppID', { AppID: testAppId })).recordset[0];
    const isUpdateSuccess = updateResA.status === 200 && dbAppCheck3.Status === 'Offered';
    console.log(`   Trạng thái sau khi cập nhật: "${dbAppCheck3.Status}" -> ${isUpdateSuccess ? '✅ ĐẠT' : '❌ THẤT BẠI'}\n`);

  } finally {
    // CLEANUP
    console.log('[CLEANUP] Dọn dẹp dữ liệu kiểm thử testAppId:', testAppId);
    await executeQuery('DELETE FROM Interviews WHERE ApplicationID = @AppID', { AppID: testAppId });
    await executeQuery('DELETE FROM JobApplications WHERE ApplicationID = @AppID', { AppID: testAppId });
    console.log('[CLEANUP] Hoàn tất dọn dẹp sạch sẽ dữ liệu DB!\n');
  }

  console.log('================================================================');
  console.log('           HOÀN TẤT KIỂM THỬ UC-E10 THÀNH CÔNG RỰC RỠ!          ');
  console.log('================================================================');
}

run().catch(err => {
  console.error('Lỗi khi chạy test:', err);
  process.exit(1);
});

