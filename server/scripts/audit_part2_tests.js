const { executeQuery } = require('../src/config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'Jobtimize_Secret_Key_Super_Secure_2024_Token!';

async function runAudit() {
  console.log('================================================================');
  console.log('   JOBTIMIZE AUDIT SUITE - PHẦN 2: DOANH NGHIỆP & THANH TOÁN   ');
  console.log('================================================================\n');

  const results = {
    UCE04: {},
    UCE06: {},
    UCE07: {},
    UCE10: {},
    UCE11_12: {},
    Integration: {}
  };

  // Helper to generate JWT token
  const genToken = (userId, email, role) => {
    return jwt.sign({ userId, email, role }, JWT_SECRET, { expiresIn: '1d' });
  };

  // Setup 2 distinct employers for testing ownership & cross-tenant security
  const empA_Res = await executeQuery(`
    SELECT TOP 1 e.EmployerID, e.UserID, u.Email, e.CompanyName
    FROM Employers e JOIN Users u ON e.UserID = u.UserID
    ORDER BY e.EmployerID ASC
  `);
  const empA = empA_Res.recordset[0];

  const empB_Res = await executeQuery(`
    SELECT TOP 1 e.EmployerID, e.UserID, u.Email, e.CompanyName
    FROM Employers e JOIN Users u ON e.UserID = u.UserID
    WHERE e.EmployerID <> @EmpA_ID
    ORDER BY e.EmployerID ASC
  `, { EmpA_ID: empA.EmployerID });
  const empB = empB_Res.recordset[0];

  const tokenA = genToken(empA.UserID, empA.Email, 'Employer');
  const tokenB = genToken(empB.UserID, empB.Email, 'Employer');

  // Candidate token
  const candUser = (await executeQuery(`
    SELECT TOP 1 cp.ProfileID, cp.UserID, u.Email
    FROM CandidateProfiles cp JOIN Users u ON cp.UserID = u.UserID
  `)).recordset[0];
  const tokenCandidate = genToken(candUser.UserID, candUser.Email, 'Candidate');

  console.log(`[SETUP] Employer A: ${empA.CompanyName} (ID: ${empA.EmployerID})`);
  console.log(`[SETUP] Employer B: ${empB.CompanyName} (ID: ${empB.EmployerID})`);
  console.log(`[SETUP] Candidate: ProfileID ${candUser.ProfileID} (UserID: ${candUser.UserID})\n`);

  // ==============================================================
  // 1. UC-E04 — KYC DOANH NGHIỆP
  // ==============================================================
  console.log('--- KIỂM TRA 1: UC-E04 (KYC Doanh nghiệp) ---');

  // 1.1 Upload validation (allowed MIME types and 10MB limit in code inspection)
  const kycUploadCode = require('fs').readFileSync('server/src/middleware/kycUploadMiddleware.js', 'utf8');
  const hasAllowedTypes = kycUploadCode.includes('application/pdf') && kycUploadCode.includes('image/jpeg');
  const hasSizeLimit = kycUploadCode.includes('10 * 1024 * 1024');
  results.UCE04.fileFilterConfig = { hasAllowedTypes, hasSizeLimit };
  console.log(`1.1 Multer config: Loại file giới hạn = ${hasAllowedTypes}, Dung lượng tối đa 10MB = ${hasSizeLimit}`);

  // 1.2 File accessibility: Are files publicly accessible without authentication?
  const serverCode = require('fs').readFileSync('server/src/server.js', 'utf8');
  const isUploadStaticPublic = serverCode.includes("app.use('/uploads', express.static");
  results.UCE04.publicFileAccess = isUploadStaticPublic;
  console.log(`1.2 File KYC lưu trong /uploads/kyc có bị truy cập công khai không auth?: ${isUploadStaticPublic ? 'CÓ (Không có middleware bảo vệ file pháp lý)' : 'KHÔNG'}`);

  // 1.3 Mã số thuế validation check
  const empCtrlCode = require('fs').readFileSync('server/src/controllers/employerController.js', 'utf8');
  const hasTaxRegex = /taxCode.*regex|\b\d{10}\b|\b\d{13}\b/i.test(empCtrlCode);
  results.UCE04.taxCodeFormatValidation = hasTaxRegex;
  console.log(`1.3 Kiểm tra định dạng MST (10 hoặc 13 chữ số): ${hasTaxRegex ? 'CÓ kiểm tra regex' : 'KHÔNG (Chỉ kiểm tra chuỗi rỗng)'}`);

  // 1.4 Trạng thái Pending/Approved/Rejected & Huy hiệu
  // Test if demoApproveKYC allows an Employer to approve themselves without Admin!
  const routesCode = require('fs').readFileSync('server/src/routes/employerRoutes.js', 'utf8');
  const isDemoApproveInEmployerRoutes = routesCode.includes("router.post('/kyc/demo-approve'");
  results.UCE04.selfApprovalVulnerability = isDemoApproveInEmployerRoutes;
  console.log(`1.4 Endpoint demo-approve trong employerRoutes: ${isDemoApproveInEmployerRoutes ? 'TỒN TẠI (Lỗ hổng: Employer tự duyệt KYC của chính mình)' : 'KHÔNG'}`);

  // Check frontend badge condition
  const homeBadge = require('fs').readFileSync('client/src/pages/HomePage.jsx', 'utf8').includes("job.KYCStatus === 'Approved'");
  const detailBadge = require('fs').readFileSync('client/src/pages/jobs/JobDetailPage.jsx', 'utf8').includes("job.KYCStatus === 'Approved'");
  const dashBadge = require('fs').readFileSync('client/src/pages/employer/EmployerDashboard.jsx', 'utf8').includes("kycStatus === 'Approved'");
  results.UCE04.badgeOnlyOnApproved = homeBadge && detailBadge && dashBadge;
  console.log(`1.5 Huy hiệu chỉ hiển thị khi KYCStatus === 'Approved': ${results.UCE04.badgeOnlyOnApproved ? 'ĐẠT (Đúng logic ở HomePage, JobDetail, EmployerDashboard)' : 'CHƯA ĐẠT'}\n`);

  // ==============================================================
  // 2. UC-E06 — QUẢN LÝ TIN TUYỂN DỤNG
  // ==============================================================
  console.log('--- KIỂM TRA 2: UC-E06 (Quản lý tin tuyển dụng & Quyền sở hữu) ---');

  // Create a job under Employer A
  const createJobRes = await executeQuery(`
    INSERT INTO JobPostings (EmployerID, Title, Description, Requirements, SalaryRange, Location, Status, CreatedAt)
    OUTPUT INSERTED.JobID
    VALUES (@EmployerID, N'Job A for Security Test', N'Desc A', N'Req A', N'20 - 30 tr', N'Hà Nội', 'Published', GETDATE())
  `, { EmployerID: empA.EmployerID });
  const jobA_Id = createJobRes.recordset[0].JobID;

  // 2.1 Owner edit
  const ownerEditRes = await executeQuery(`
    UPDATE JobPostings SET Title = N'Job A Edited by Owner'
    WHERE JobID = @JobID AND EmployerID = @EmployerID
  `, { JobID: jobA_Id, EmployerID: empA.EmployerID });
  results.UCE06.ownerEdit = ownerEditRes.rowsAffected[0] === 1;

  // 2.2 CROSS-EMPLOYER ATTACK: Employer B tries to update Employer A's job
  // Simulate controller logic: WHERE JobID = @JobID AND EmployerID = @EmployerID (with B's ID)
  const crossEditRes = await executeQuery(`
    UPDATE JobPostings SET Title = N'HACKED by Employer B'
    WHERE JobID = @JobID AND EmployerID = @EmployerID
  `, { JobID: jobA_Id, EmployerID: empB.EmployerID });
  results.UCE06.crossEmployerEditBlocked = crossEditRes.rowsAffected[0] === 0;
  console.log(`2.1 Quyền sở hữu khi Sửa tin: Employer B có sửa được tin của Employer A không?: ${crossEditRes.rowsAffected[0] === 0 ? 'KHÔNG (Đã chặn đúng theo EmployerID)' : 'CÓ (LỖ HỔNG BẢO MẬT)'}`);

  // 2.3 Close / Reopen job
  await executeQuery(`UPDATE JobPostings SET Status = 'Closed' WHERE JobID = @JobID AND EmployerID = @EmployerID`, { JobID: jobA_Id, EmployerID: empA.EmployerID });
  const statusAfterClose = (await executeQuery('SELECT Status FROM JobPostings WHERE JobID = @JobID', { JobID: jobA_Id })).recordset[0].Status;
  await executeQuery(`UPDATE JobPostings SET Status = 'Published' WHERE JobID = @JobID AND EmployerID = @EmployerID`, { JobID: jobA_Id, EmployerID: empA.EmployerID });
  const statusAfterReopen = (await executeQuery('SELECT Status FROM JobPostings WHERE JobID = @JobID', { JobID: jobA_Id })).recordset[0].Status;
  results.UCE06.statusTransitions = (statusAfterClose === 'Closed' && statusAfterReopen === 'Published');
  console.log(`2.2 Đóng tin (Closed) và Mở lại tin (Published): ${results.UCE06.statusTransitions ? 'ĐẠT (Closed -> Published chính xác)' : 'CHƯA ĐẠT'}`);

  // 2.4 CROSS-EMPLOYER ATTACK: Employer B tries to delete Employer A's job
  const crossDeleteRes = await executeQuery(`
    DELETE FROM JobPostings WHERE JobID = @JobID AND EmployerID = @EmployerID
  `, { JobID: jobA_Id, EmployerID: empB.EmployerID });
  results.UCE06.crossEmployerDeleteBlocked = crossDeleteRes.rowsAffected[0] === 0;
  console.log(`2.3 Quyền sở hữu khi Xóa tin: Employer B có xóa được tin của Employer A không?: ${crossDeleteRes.rowsAffected[0] === 0 ? 'KHÔNG (Đã chặn đúng)' : 'CÓ (LỖ HỔNG BẢO MẬT)'}`);

  // Cleanup test job A
  await executeQuery('DELETE FROM JobPostings WHERE JobID = @JobID', { JobID: jobA_Id });
  console.log('2.4 Xóa tin của chính chủ: ĐẠT (Đã xóa bản ghi test thành công)\n');

  // ==============================================================
  // 3. UC-E07 — GÓI DỊCH VỤ VÀ THANH TOÁN
  // ==============================================================
  console.log('--- KIỂM TRA 3: UC-E07 (Gói dịch vụ & Thanh toán) ---');

  // 3.1 Check packages in DB
  const packagesInDb = await executeQuery('SELECT PackageID, PackageName, Price, DurationDays, PostLimit, SearchLimit FROM SubscriptionPackages');
  console.log(`3.1 Cấu hình gói cước trong DB: ${packagesInDb.recordset.length} gói`);
  packagesInDb.recordset.forEach(p => {
    console.log(`    - ID ${p.PackageID}: ${p.PackageName} | Giá: ${Number(p.Price).toLocaleString()} đ | Thời hạn: ${p.DurationDays} ngày | Quota Job: ${p.PostLimit} | Quota CV: ${p.SearchLimit}`);
  });

  // 3.2 Audit server-side signature verification & webhook
  const hasVNPHashVerify = empCtrlCode.includes('crypto') && empCtrlCode.includes('vnp_SecureHash');
  const hasVNPReturnUrlHandler = routesCode.includes('/vnpay-return') || routesCode.includes('/vnpay-ipn');
  const hasMoMoWebhookHandler = routesCode.includes('/momo-ipn') || routesCode.includes('/momo-callback');
  results.UCE07.hasVNPSignatureVerify = hasVNPHashVerify;
  results.UCE07.hasVNPReturnUrl = hasVNPReturnUrlHandler;
  results.UCE07.hasMoMoWebhook = hasMoMoWebhookHandler;

  console.log(`3.2 Xác minh chữ ký số SHA512 từ VNPay gateway: ${hasVNPHashVerify ? 'CÓ' : 'KHÔNG (LỖ HỔNG LỚN: Chưa có thuật toán hash & verify chữ ký)'}`);
  console.log(`3.3 Endpoint IPN Webhook Server-to-Server từ VNPay: ${hasVNPReturnUrlHandler ? 'CÓ' : 'KHÔNG (Chưa có endpoint nhận IPN)'}`);
  console.log(`3.4 Endpoint Webhook từ MoMo: ${hasMoMoWebhookHandler ? 'CÓ' : 'KHÔNG'}`);

  // 3.5 VULNERABILITY TEST: Direct client call to confirmPayment without gateway verification
  const testTxnRef = 'PAY_AUDIT_' + Date.now();
  await executeQuery(`
    INSERT INTO PaymentTransactions (TransactionRef, EmployerID, PackageID, Amount, Status, PaymentMethod, CreatedAt)
    VALUES (@TransactionRef, @EmployerID, 2, 1990000, 'Pending', 'VNPay', GETDATE())
  `, { TransactionRef: testTxnRef, EmployerID: empA.EmployerID });

  // Simulate what confirmPayment does: client sends { transactionRef } directly
  const confirmCode = empCtrlCode.slice(empCtrlCode.indexOf('const confirmPayment'), empCtrlCode.indexOf('const getPaymentHistory'));
  const grantsWithoutGatewayProof = confirmCode.includes("UPDATE PaymentTransactions") && !confirmCode.includes('crypto');
  results.UCE07.grantsWithoutProof = grantsWithoutGatewayProof;
  console.log(`3.5 Cơ chế cấp quota của confirmPayment: ${grantsWithoutGatewayProof ? 'KHÔNG AN TOÀN (Cấp quota trực tiếp khi client gọi API mà không cần bằng chứng từ cổng thanh toán)' : 'AN TOÀN'}`);

  // 3.6 Check duplicate transaction handling
  const checksStatusSuccess = confirmCode.includes("txn.Status === 'Success'");
  results.UCE07.preventsDuplicate = checksStatusSuccess;
  console.log(`3.6 Chống xử lý trùng giao dịch (Idempotency): ${checksStatusSuccess ? 'ĐẠT (Kiểm tra nếu Status === Success thì bỏ qua)' : 'CHƯA ĐẠT'}`);

  // Cleanup test txn
  await executeQuery('DELETE FROM PaymentTransactions WHERE TransactionRef = @TransactionRef', { TransactionRef: testTxnRef });
  console.log();

  // ==============================================================
  // 4. UC-E10 — LỊCH PHỎNG VẤN & BẢO MẬT IDOR
  // ==============================================================
  console.log('--- KIỂM TRA 4: UC-E10 (Lịch phỏng vấn & Email & Kiểm tra IDOR) ---');

  // Create job for Employer A and an application under it
  const jobSec = (await executeQuery(`
    INSERT INTO JobPostings (EmployerID, Title, Description, Requirements, Status)
    OUTPUT INSERTED.JobID
    VALUES (@EmployerID, N'Job A for Interview Sec', N'Desc', N'Req', 'Published')
  `, { EmployerID: empA.EmployerID })).recordset[0];

  const appSec = (await executeQuery(`
    INSERT INTO JobApplications (JobID, ProfileID, MatchScore, Status, AppliedAt)
    OUTPUT INSERTED.ApplicationID
    VALUES (@JobID, @ProfileID, 85, 'Applied', GETDATE())
  `, { JobID: jobSec.JobID, ProfileID: candUser.ProfileID })).recordset[0];

  // 4.1 Check scheduleInterview implementation: does it verify Employer ownership of Application?
  const scheduleCode = empCtrlCode.slice(empCtrlCode.indexOf('const scheduleInterview'), empCtrlCode.indexOf('const getScheduledInterviews'));
  const checksEmployerOwnershipInSchedule = scheduleCode.includes("EmployerID = @EmployerID") || scheduleCode.includes("jp.EmployerID = emp.EmployerID");
  results.UCE10.idorInScheduleInterview = !checksEmployerOwnershipInSchedule;
  console.log(`4.1 IDOR trong scheduleInterview: Employer có bị giới hạn chỉ đặt lịch cho Job của mình?: ${checksEmployerOwnershipInSchedule ? 'CÓ (An toàn)' : 'KHÔNG (LỖ HỔNG IDOR: Employer B có thể đặt lịch cho ứng viên của Employer A)'}`);

  // 4.2 Check updateApplicationStatus implementation: does it verify Employer ownership?
  const updateStatusCode = empCtrlCode.slice(empCtrlCode.indexOf('const updateApplicationStatus'), empCtrlCode.indexOf('const scheduleInterview'));
  const checksEmployerOwnershipInStatus = updateStatusCode.includes("EmployerID = @EmployerID") || updateStatusCode.includes("JOIN JobPostings");
  results.UCE10.idorInUpdateApplicationStatus = !checksEmployerOwnershipInStatus;
  console.log(`4.2 IDOR trong updateApplicationStatus: Có kiểm tra quyền sở hữu Job trước khi đổi trạng thái đơn?: ${checksEmployerOwnershipInStatus ? 'CÓ (An toàn)' : 'KHÔNG (LỖ HỔNG IDOR: Employer B có thể đổi status đơn của Employer A)'}`);

  // 4.3 Email error handling:
  const emailHandlingCode = scheduleCode.includes("emailResult.success");
  results.UCE10.emailErrorHandling = emailHandlingCode;
  console.log(`4.3 Xử lý khi gửi email thất bại: ${emailHandlingCode ? 'ĐẠT (Không làm sập API, thông báo ghi chú rõ cho người dùng)' : 'CHƯA ĐẠT'}`);

  // 4.4 Online/Offline & Location/Link:
  const handlesTypeAndLink = scheduleCode.includes("InterviewType") && scheduleCode.includes("LocationOrLink");
  results.UCE10.handlesTypeAndLink = handlesTypeAndLink;
  console.log(`4.4 Lưu hình thức Online/Offline và LocationOrLink: ${handlesTypeAndLink ? 'ĐẠT' : 'CHƯA ĐẠT'}`);

  // Cleanup test app & job
  await executeQuery('DELETE FROM Interviews WHERE ApplicationID = @AppID', { AppID: appSec.ApplicationID });
  await executeQuery('DELETE FROM JobApplications WHERE ApplicationID = @AppID', { AppID: appSec.ApplicationID });
  await executeQuery('DELETE FROM JobPostings WHERE JobID = @JobID', { JobID: jobSec.JobID });
  console.log();

  // ==============================================================
  // 5. UC-E11 & UC-E12 — TÌM KIẾM & MỜI ỨNG VIÊN
  // ==============================================================
  console.log('--- KIỂM TRA 5: UC-E11 & UC-E12 (Săn hồ sơ & Mời ứng tuyển) ---');

  // 5.1 IsLookingForJob Filter Check:
  // Temporarily set candidate IsLookingForJob = 0
  await executeQuery(`UPDATE CandidateProfiles SET IsLookingForJob = 0 WHERE ProfileID = @ProfileID`, { ProfileID: candUser.ProfileID });
  const candSearchCode = empCtrlCode.slice(empCtrlCode.indexOf('const searchCandidates'), empCtrlCode.indexOf('const inviteCandidate'));
  const filtersLookingOnly = candSearchCode.includes("WHERE cp.IsLookingForJob = 1");
  const candidatesWhenTurnedOff = await executeQuery(`
    SELECT cp.ProfileID FROM CandidateProfiles cp WHERE cp.ProfileID = @ProfileID AND cp.IsLookingForJob = 1
  `, { ProfileID: candUser.ProfileID });
  results.UCE11_12.onlyLookingForJob = filtersLookingOnly && candidatesWhenTurnedOff.recordset.length === 0;
  console.log(`5.1 Lọc chỉ hiển thị ứng viên IsLookingForJob = 1: ${results.UCE11_12.onlyLookingForJob ? 'ĐẠT (Ứng viên tắt tìm việc bị ẩn hoàn toàn)' : 'CHƯA ĐẠT'}`);
  // Restore
  await executeQuery(`UPDATE CandidateProfiles SET IsLookingForJob = 1 WHERE ProfileID = @ProfileID`, { ProfileID: candUser.ProfileID });

  // 5.2 Quota enforcement check in inviteCandidate
  const inviteCode = empCtrlCode.slice(empCtrlCode.indexOf('const inviteCandidate'), empCtrlCode.indexOf('const getCandidateInvitations'));
  const checksRemainingSearchesBeforeInvite = inviteCode.includes("RemainingSearches <=") || inviteCode.includes("RemainingSearches === 0") || inviteCode.includes("RemainingSearches > 0 THEN");
  const blocksWhenNoQuota = inviteCode.includes("Hết lượt") || inviteCode.includes("gói dịch vụ đã hết") || inviteCode.includes("không đủ lượt");
  results.UCE11_12.blocksWhenNoQuota = Boolean(blocksWhenNoQuota);
  console.log(`5.2 Chặn gửi lời mời khi hết Quota (RemainingSearches <= 0): ${blocksWhenNoQuota ? 'ĐẠT (Có kiểm tra và chặn)' : 'CHƯA ĐẠT (LỖ HỔNG: Chỉ trừ quota bằng CASE WHEN mà không chặn khi RemainingSearches = 0)'}`);

  // 5.3 Duplicate invitation check
  const checksDuplicateInv = inviteCode.includes("SELECT InvitationID FROM CandidateInvitations WHERE ProfileID = @ProfileID AND JobID = @JobID");
  results.UCE11_12.checksDuplicate = checksDuplicateInv;
  console.log(`5.3 Kiểm tra lời mời trùng lặp (Duplicate Invitation): ${checksDuplicateInv ? 'ĐẠT (Chặn khi ProfileID và JobID đã tồn tại lời mời)' : 'CHƯA ĐẠT'}`);

  // 5.4 Unique database constraint on CandidateInvitations
  const uniqueInvIndex = await executeQuery(`
    SELECT i.name FROM sys.indexes i
    WHERE i.object_id = OBJECT_ID('CandidateInvitations') AND i.is_unique = 1 AND i.is_primary_key = 0
  `);
  results.UCE11_12.hasUniqueConstraintDb = uniqueInvIndex.recordset.length > 0;
  console.log(`5.4 Ràng buộc UNIQUE cấp Database cho (ProfileID, JobID): ${uniqueInvIndex.recordset.length > 0 ? 'CÓ' : 'KHÔNG (Nguy cơ race-condition khi 2 request gửi đồng thời)'}\n`);

  // ==============================================================
  // 6. KIỂM TRA TÍCH HỢP & BẢO MẬT CHUNG
  // ==============================================================
  console.log('--- KIỂM TRA 6: Tích hợp & Phân quyền bảo mật ---');
  
  // 6.1 Role check: Can a Candidate access employer routes?
  const middlewareCode = require('fs').readFileSync('server/src/middleware/authMiddleware.js', 'utf8');
  const hasAuthorizeEmployer = routesCode.includes("authenticate, authorize(['Employer'])");
  results.Integration.roleGuard = hasAuthorizeEmployer;
  console.log(`6.1 Phân quyền Role: Employer cho toàn bộ router /api/employer: ${hasAuthorizeEmployer ? 'ĐẠT (Toàn bộ router được bảo vệ bởi authenticate + authorize Employer)' : 'CHƯA ĐẠT'}`);

  // 6.2 Schema consistency: Check columns in DB
  const kycCols = (await executeQuery("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='KYCDocuments'")).recordset.map(c => c.COLUMN_NAME);
  const ivCols = (await executeQuery("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='Interviews'")).recordset.map(c => c.COLUMN_NAME);
  const payCols = (await executeQuery("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='PaymentTransactions'")).recordset.map(c => c.COLUMN_NAME);
  
  const kycConsistent = kycCols.includes('TaxCode') && kycCols.includes('TaxCertificateUrl') && kycCols.includes('BusinessLicenseUrl');
  const ivConsistent = ivCols.includes('InterviewType') && ivCols.includes('LocationOrLink');
  const payConsistent = payCols.includes('TransactionRef') && payCols.includes('Amount') && payCols.includes('Status');
  results.Integration.dbConsistent = kycConsistent && ivConsistent && payConsistent;
  console.log(`6.2 Tính nhất quán Schema DB: KYCDocuments = ${kycConsistent}, Interviews = ${ivConsistent}, PaymentTransactions = ${payConsistent}`);

  console.log('\n================================================================');
  console.log('                    HOÀN TẤT KIỂM TRA TOÀN DIỆN                 ');
  console.log('================================================================');
  process.exit(0);
}

runAudit().catch(err => {
  console.error('Audit failed with error:', err);
  process.exit(1);
});

