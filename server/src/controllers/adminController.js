const { withTransaction, enqueue } = require('../services/notificationStore');
const { executeQuery } = require('../config/db');
const emailService = require('../services/emailService');


async function saveKYCReview(employerId, status, note) {
  return withTransaction(async query => {
    const emp = (await query('SELECT EmployerID,CompanyName,KYCStatus FROM Employers WITH(UPDLOCK,ROWLOCK) WHERE EmployerID=@ID', { ID: employerId })).recordset[0];
    if (!emp) throw Object.assign(new Error('Không tìm thấy hồ sơ doanh nghiệp'), { status: 404 });
    const doc = (await query('SELECT TOP 1 DocumentID,RejectionReason FROM KYCDocuments WHERE EmployerID=@ID ORDER BY SubmittedAt DESC,DocumentID DESC', { ID: employerId })).recordset[0];
    const reason = status === 'Rejected' ? (typeof note === 'string' ? note.trim() : '') : '';
    if (doc) await query('UPDATE KYCDocuments SET RejectionReason=@Note WHERE DocumentID=@ID', { Note: reason || null, ID: doc.DocumentID });
    await query('UPDATE Employers SET KYCStatus=@Status WHERE EmployerID=@ID', { Status: status, ID: employerId });
    if (emp.KYCStatus !== status || (doc?.RejectionReason || '') !== reason) await enqueue(query, 'kyc_reviewed', { employerId, status, note: reason });
    return emp;
  });
}

// 1. Review Employer KYC (Admin Only - UC-E04 / UC-A05)
const reviewEmployerKYC = async (req, res) => {
  try {
    const { employerId } = req.params;
    const { status, rejectionReason } = req.body;

    const validStatuses = ['Pending', 'Approved', 'Rejected'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Trạng thái KYC không hợp lệ (Pending, Approved, Rejected)' });
    }

    if (status === 'Rejected' && (typeof rejectionReason !== 'string' || !rejectionReason.trim())) return res.status(400).json({ success: false, message: 'Vui lòng nhập lý do từ chối.' });
    const employer = await saveKYCReview(employerId, status, rejectionReason);

    return res.json({
      success: true,
      message: `Admin đã cập nhật trạng thái KYC của doanh nghiệp ${employer.CompanyName} thành "${status}"!`,
      data: { employerId, status }
    });
  } catch (error) {
    console.error('reviewEmployerKYC error:', error);
    return res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

// 2. Get list of pending KYC submissions (Admin Only)
const getPendingKYCList = async (req, res) => {
  try {
    const result = await executeQuery(
      `SELECT e.EmployerID, e.CompanyName, e.KYCStatus,
              u.Email, u.FullName, u.Phone,
              kd.DocumentID, kd.BusinessLicenseUrl, kd.TaxCertificateUrl, kd.TaxCode, kd.SubmittedAt
       FROM Employers e
       JOIN Users u ON e.UserID = u.UserID
       LEFT JOIN KYCDocuments kd ON e.EmployerID = kd.EmployerID
       WHERE e.KYCStatus = 'Pending'
       ORDER BY kd.SubmittedAt DESC`
    );

    return res.json({
      success: true,
      data: result.recordset
    });
  } catch (error) {
    console.error('getPendingKYCList error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const { hashPassword, validatePasswordStrength } = require('../utils/authHelper');

// 1. Dashboard Summary Stats
const getDashboardStats = async (req, res) => {
  try {
    // Candidate stats
    const candStatsQuery = `
      SELECT 
        COUNT(*) AS totalCandidates,
        SUM(CASE WHEN u.Status = 'Active' THEN 1 ELSE 0 END) AS activeCandidates,
        SUM(CASE WHEN u.Status = 'Locked' THEN 1 ELSE 0 END) AS lockedCandidates
      FROM Users u
      JOIN UserRoles ur ON u.UserID = ur.UserID
      JOIN Roles r ON ur.RoleID = r.RoleID
      WHERE r.RoleName = 'Candidate'
    `;

    // Employer stats
    const empStatsQuery = `
      SELECT 
        COUNT(*) AS totalEmployers,
        SUM(CASE WHEN u.Status = 'Active' THEN 1 ELSE 0 END) AS activeEmployers,
        SUM(CASE WHEN u.Status = 'Locked' THEN 1 ELSE 0 END) AS lockedEmployers,
        SUM(CASE WHEN e.KYCStatus = 'Pending' THEN 1 ELSE 0 END) AS pendingKYC,
        SUM(CASE WHEN e.KYCStatus = 'Approved' THEN 1 ELSE 0 END) AS approvedKYC,
        SUM(CASE WHEN e.KYCStatus = 'Rejected' THEN 1 ELSE 0 END) AS rejectedKYC
      FROM Employers e
      JOIN Users u ON e.UserID = u.UserID
    `;

    // General platform stats
    const jobStatsQuery = `
      SELECT 
        COUNT(*) AS totalJobs,
        SUM(CASE WHEN Status = 'PendingApproval' THEN 1 ELSE 0 END) AS pendingJobs,
        SUM(CASE WHEN Status = 'Published' THEN 1 ELSE 0 END) AS publishedJobs,
        SUM(CASE WHEN Status = 'Rejected' THEN 1 ELSE 0 END) AS rejectedJobs,
        SUM(CASE WHEN Status = 'RequiresRevision' THEN 1 ELSE 0 END) AS revisionJobs
      FROM JobPostings
    `;

    // Applications stats
    const appStatsQuery = `
      SELECT COUNT(*) AS totalApplications FROM JobApplications
    `;

    // Reports stats
    const reportStatsQuery = `
      SELECT 
        COUNT(*) AS totalReports,
        SUM(CASE WHEN Status = 'Pending' THEN 1 ELSE 0 END) AS pendingReports,
        SUM(CASE WHEN Status = 'Resolved' THEN 1 ELSE 0 END) AS resolvedReports,
        SUM(CASE WHEN Status = 'Dismissed' THEN 1 ELSE 0 END) AS dismissedReports
      FROM UserReports
    `;

    // Metadata stats
    const metaStatsQuery = `
      SELECT 
        (SELECT COUNT(*) FROM JobCategories) AS totalCategories,
        (SELECT COUNT(*) FROM SkillTaxonomy) AS totalSkills
    `;

    const [candRes, empRes, jobRes, appRes, repRes, metaRes] = await Promise.all([
      executeQuery(candStatsQuery),
      executeQuery(empStatsQuery),
      executeQuery(jobStatsQuery),
      executeQuery(appStatsQuery),
      executeQuery(reportStatsQuery),
      executeQuery(metaStatsQuery)
    ]);

    const candData = candRes.recordset[0] || {};
    const empData = empRes.recordset[0] || {};
    const jobData = jobRes.recordset[0] || {};
    const totalApplications = appRes.recordset[0]?.totalApplications || 0;
    const repData = repRes.recordset[0] || {};
    const metaData = metaRes.recordset[0] || {};

    return res.json({
      success: true,
      data: {
        candidates: {
          total: candData.totalCandidates || 0,
          active: candData.activeCandidates || 0,
          locked: candData.lockedCandidates || 0
        },
        employers: {
          total: empData.totalEmployers || 0,
          active: empData.activeEmployers || 0,
          locked: empData.lockedEmployers || 0,
          pendingKYC: empData.pendingKYC || 0,
          approvedKYC: empData.approvedKYC || 0,
          rejectedKYC: empData.rejectedKYC || 0
        },
        jobs: {
          total: jobData.totalJobs || 0,
          pending: jobData.pendingJobs || 0,
          published: jobData.publishedJobs || 0,
          rejected: jobData.rejectedJobs || 0,
          revision: jobData.revisionJobs || 0
        },
        reports: {
          total: repData.totalReports || 0,
          pending: repData.pendingReports || 0,
          resolved: repData.resolvedReports || 0,
          dismissed: repData.dismissedReports || 0
        },
        metadata: {
          categories: metaData.totalCategories || 0,
          skills: metaData.totalSkills || 0
        },
        platform: {
          totalJobs: jobData.totalJobs || 0,
          totalApplications
        }
      }
    });
  } catch (error) {
    console.error('getDashboardStats error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi khi lấy dữ liệu thống kê tổng quan' });
  }
};

// 2. Get list of Candidate accounts with pagination & filters
const getCandidates = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search ? req.query.search.trim() : null;
    const status = req.query.status && req.query.status !== 'all' ? req.query.status : null;

    const safeOffset = Math.max(0, offset);
    const safeLimit = Math.max(1, Math.min(100, limit));

    let whereClause = `WHERE r.RoleName = 'Candidate'`;
    const params = {};

    if (search) {
      whereClause += ` AND (u.FullName LIKE @SearchPattern OR u.Email LIKE @SearchPattern OR u.Phone LIKE @SearchPattern)`;
      params.SearchPattern = `%${search}%`;
    }

    if (status) {
      whereClause += ` AND u.Status = @Status`;
      params.Status = status;
    }

    const countQuery = `
      SELECT COUNT(*) AS totalCount
      FROM Users u
      JOIN UserRoles ur ON u.UserID = ur.UserID
      JOIN Roles r ON ur.RoleID = r.RoleID
      ${whereClause}
    `;

    const dataQuery = `
      SELECT 
        u.UserID, u.Email, u.FullName, u.Phone, u.AvatarUrl, u.Status, u.IsEmailVerified, u.CreatedAt,
        cp.ProfileID, cp.Headline, cp.DesiredSalary, cp.CurrentLocation, cp.IsLookingForJob,
        (SELECT COUNT(*) FROM CVs cv WHERE cv.ProfileID = cp.ProfileID) AS TotalCVs,
        (SELECT COUNT(*) FROM JobApplications ja WHERE ja.ProfileID = cp.ProfileID) AS TotalApplications
      FROM Users u
      JOIN UserRoles ur ON u.UserID = ur.UserID
      JOIN Roles r ON ur.RoleID = r.RoleID
      LEFT JOIN CandidateProfiles cp ON u.UserID = cp.UserID
      ${whereClause}
      ORDER BY u.CreatedAt DESC
      OFFSET ${safeOffset} ROWS FETCH NEXT ${safeLimit} ROWS ONLY
    `;

    const [countRes, dataRes] = await Promise.all([
      executeQuery(countQuery, params),
      executeQuery(dataQuery, params)
    ]);

    const totalCount = countRes.recordset[0]?.totalCount || 0;
    const totalPages = Math.ceil(totalCount / limit);

    return res.json({
      success: true,
      data: dataRes.recordset || [],
      pagination: {
        page,
        limit,
        totalCount,
        totalPages
      }
    });
  } catch (error) {
    console.error('getCandidates error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi khi tải danh sách ứng viên' });
  }
};

// 3. Get Candidate Detail by UserID
const getCandidateDetail = async (req, res) => {
  try {
    const { userId } = req.params;

    const userRes = await executeQuery(
      `SELECT u.UserID, u.Email, u.FullName, u.Phone, u.AvatarUrl, u.Status, u.IsEmailVerified, u.CreatedAt,
              cp.ProfileID, cp.Headline, cp.Bio, cp.DesiredSalary, cp.CurrentLocation, cp.IsLookingForJob
       FROM Users u
       JOIN UserRoles ur ON u.UserID = ur.UserID
       JOIN Roles r ON ur.RoleID = r.RoleID
       LEFT JOIN CandidateProfiles cp ON u.UserID = cp.UserID
       WHERE u.UserID = @UserID AND r.RoleName = 'Candidate'`,
      { UserID: userId }
    );

    if (!userRes.recordset || userRes.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản ứng viên' });
    }

    const candidate = userRes.recordset[0];
    let cvs = [];
    let applications = [];

    if (candidate.ProfileID) {
      const [cvsRes, appsRes] = await Promise.all([
        executeQuery(
          `SELECT CVID, Title, FileUrl, IsPrimary, CreatedAt 
           FROM CVs 
           WHERE ProfileID = @ProfileID 
           ORDER BY IsPrimary DESC, CreatedAt DESC`,
          { ProfileID: candidate.ProfileID }
        ),
        executeQuery(
          `SELECT ja.ApplicationID, ja.JobID, ja.MatchScore, ja.Status, ja.AppliedAt,
                  jp.Title AS JobTitle, jp.Location, jp.SalaryRange,
                  e.CompanyName, e.CompanyLogoUrl
           FROM JobApplications ja
           JOIN JobPostings jp ON ja.JobID = jp.JobID
           JOIN Employers e ON jp.EmployerID = e.EmployerID
           WHERE ja.ProfileID = @ProfileID
           ORDER BY ja.AppliedAt DESC`,
          { ProfileID: candidate.ProfileID }
        )
      ]);

      cvs = cvsRes.recordset || [];
      applications = appsRes.recordset || [];
    }

    return res.json({
      success: true,
      data: {
        ...candidate,
        cvs,
        applications
      }
    });
  } catch (error) {
    console.error('getCandidateDetail error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi khi lấy chi tiết ứng viên' });
  }
};

// 4. Get list of Employer accounts with pagination & filters
const getEmployers = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search ? req.query.search.trim() : null;
    const status = req.query.status && req.query.status !== 'all' ? req.query.status : null;
    const kycStatus = req.query.kycStatus && req.query.kycStatus !== 'all' ? req.query.kycStatus : null;

    const safeOffset = Math.max(0, offset);
    const safeLimit = Math.max(1, Math.min(100, limit));

    let whereClause = `WHERE 1=1`;
    const params = {};

    if (search) {
      whereClause += ` AND (e.CompanyName LIKE @SearchPattern OR u.FullName LIKE @SearchPattern OR u.Email LIKE @SearchPattern OR u.Phone LIKE @SearchPattern)`;
      params.SearchPattern = `%${search}%`;
    }

    if (status) {
      whereClause += ` AND u.Status = @Status`;
      params.Status = status;
    }

    if (kycStatus) {
      whereClause += ` AND e.KYCStatus = @KYCStatus`;
      params.KYCStatus = kycStatus;
    }

    const countQuery = `
      SELECT COUNT(*) AS totalCount
      FROM Employers e
      JOIN Users u ON e.UserID = u.UserID
      ${whereClause}
    `;

    const dataQuery = `
      SELECT 
        e.EmployerID, e.UserID, e.CompanyName, e.CompanyLogoUrl, e.Website, e.CompanySize,
        e.Address, e.Description, e.KYCStatus,
        u.FullName, u.Email, u.Phone, u.AvatarUrl, u.Status, u.CreatedAt,
        (SELECT COUNT(*) FROM JobPostings jp WHERE jp.EmployerID = e.EmployerID) AS TotalJobs,
        (SELECT COUNT(*) FROM JobApplications ja JOIN JobPostings jp ON ja.JobID = jp.JobID WHERE jp.EmployerID = e.EmployerID) AS TotalApplicants,
        (SELECT TOP 1 kd.BusinessLicenseUrl FROM KYCDocuments kd WHERE kd.EmployerID = e.EmployerID ORDER BY kd.SubmittedAt DESC) AS LatestLicenseUrl
      FROM Employers e
      JOIN Users u ON e.UserID = u.UserID
      ${whereClause}
      ORDER BY e.EmployerID DESC
      OFFSET ${safeOffset} ROWS FETCH NEXT ${safeLimit} ROWS ONLY
    `;

    const [countRes, dataRes] = await Promise.all([
      executeQuery(countQuery, params),
      executeQuery(dataQuery, params)
    ]);

    const totalCount = countRes.recordset[0]?.totalCount || 0;
    const totalPages = Math.ceil(totalCount / limit);

    return res.json({
      success: true,
      data: dataRes.recordset || [],
      pagination: {
        page,
        limit,
        totalCount,
        totalPages
      }
    });
  } catch (error) {
    console.error('getEmployers error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi khi tải danh sách doanh nghiệp' });
  }
};

// 5. Get Employer Detail by EmployerID
const getEmployerDetail = async (req, res) => {
  try {
    const { employerId } = req.params;

    const empRes = await executeQuery(
      `SELECT e.EmployerID, e.UserID, e.CompanyName, e.CompanyLogoUrl, e.Website, e.CompanySize,
              e.Address, e.Description, e.KYCStatus,
              u.FullName, u.Email, u.Phone, u.AvatarUrl, u.Status, u.CreatedAt
       FROM Employers e
       JOIN Users u ON e.UserID = u.UserID
       WHERE e.EmployerID = @EmployerID`,
      { EmployerID: employerId }
    );

    if (!empRes.recordset || empRes.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ doanh nghiệp' });
    }

    const employer = empRes.recordset[0];

    const [kycRes, jobsRes] = await Promise.all([
      executeQuery(
        `SELECT DocumentID, BusinessLicenseUrl, SubmittedAt, RejectionReason 
         FROM KYCDocuments 
         WHERE EmployerID = @EmployerID 
         ORDER BY SubmittedAt DESC`,
        { EmployerID: employer.EmployerID }
      ),
      executeQuery(
        `SELECT jp.JobID, jp.Title, jp.SalaryRange, jp.Location, jp.Status, jp.CreatedAt, jp.ExpiresAt,
                (SELECT COUNT(*) FROM JobApplications ja WHERE ja.JobID = jp.JobID) AS ApplicantCount
         FROM JobPostings jp
         WHERE jp.EmployerID = @EmployerID
         ORDER BY jp.CreatedAt DESC`,
        { EmployerID: employer.EmployerID }
      )
    ]);

    return res.json({
      success: true,
      data: {
        ...employer,
        kycDocuments: kycRes.recordset || [],
        jobPostings: jobsRes.recordset || []
      }
    });
  } catch (error) {
    console.error('getEmployerDetail error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi khi lấy chi tiết doanh nghiệp' });
  }
};

// 6. Toggle/Update User Status (Active / Locked)
const updateUserStatus = async (req, res) => {
  try {
    const data = await require('../services/adminModerationService').updateStatus(Number(req.params.userId), req.user.userId, req.body.status, req.body.reason);
    return res.json({ success: true, data, message: req.body.status === 'Active' ? 'Đã mở khóa. Các tin đã đóng cần được xem xét trước khi đăng lại.' : 'Đã khóa tài khoản và đóng các tin tuyển dụng liên quan.' });
  } catch (error) { return res.status(error.status || 500).json({ success: false, message: error.status ? error.message : 'Không thể cập nhật tài khoản.' }); }
};

// 7. Update Employer KYC Status (Approved / Rejected)
const updateEmployerKYC = async (req, res) => {
  try {
    const { employerId } = req.params;
    const { kycStatus, rejectionReason } = req.body;

    if (!['Approved', 'Rejected', 'Pending'].includes(kycStatus)) {
      return res.status(400).json({ success: false, message: 'Trạng thái KYC không hợp lệ' });
    }

    if (kycStatus === 'Rejected' && (typeof rejectionReason !== 'string' || !rejectionReason.trim())) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp lý do từ chối xác thực KYC' });
    }

    await saveKYCReview(employerId, kycStatus, rejectionReason);

    const statusMap = {
      Approved: 'phê duyệt KYC',
      Rejected: 'từ chối KYC',
      Pending: 'chuyển trạng thái KYC về chờ xử lý'
    };

    return res.json({
      success: true,
      message: `Đã ${statusMap[kycStatus]} thành công!`
    });
  } catch (error) {
    console.error('updateEmployerKYC error:', error);
    return res.status(error.status || 500).json({ success: false, message: 'Lỗi khi cập nhật trạng thái KYC doanh nghiệp' });
  }
};

// 8. Admin Reset Password for a User
const resetUserPassword = async (req, res) => {
  try {
    const { userId } = req.params;
    const { newPassword } = req.body;

    const pwdCheck = validatePasswordStrength(newPassword);
    if (!pwdCheck.valid) {
      return res.status(400).json({ success: false, message: pwdCheck.message });
    }

    const newHash = await hashPassword(newPassword);

    const result = await executeQuery(
      `UPDATE Users 
       SET PasswordHash = @PasswordHash, UpdatedAt = GETDATE()
       WHERE UserID = @UserID`,
      {
        PasswordHash: newHash,
        UserID: userId
      }
    );

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản người dùng' });
    }

    return res.json({
      success: true,
      message: 'Đặt lại mật khẩu cho tài khoản thành công!'
    });
  } catch (error) {
    console.error('resetUserPassword error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi khi đặt lại mật khẩu' });
  }
};

// 9. Get list of Job Postings for moderation
const getModerationJobs = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search ? req.query.search.trim() : null;
    const status = req.query.status && req.query.status !== 'all' ? req.query.status : null;
    const employerId = req.query.employerId ? parseInt(req.query.employerId, 10) : null;

    const safeOffset = Math.max(0, offset);
    const safeLimit = Math.max(1, Math.min(100, limit));

    let whereClause = `WHERE 1=1`;
    const params = {};

    if (search) {
      whereClause += ` AND (jp.Title LIKE @SearchPattern OR e.CompanyName LIKE @SearchPattern OR jp.Location LIKE @SearchPattern)`;
      params.SearchPattern = `%${search}%`;
    }

    if (status) {
      whereClause += ` AND jp.Status = @Status`;
      params.Status = status;
    }

    if (employerId) {
      whereClause += ` AND jp.EmployerID = @EmployerID`;
      params.EmployerID = employerId;
    }

    const countQuery = `
      SELECT COUNT(*) AS totalCount
      FROM JobPostings jp
      JOIN Employers e ON jp.EmployerID = e.EmployerID
      ${whereClause}
    `;

    const dataQuery = `
      SELECT 
        jp.JobID, jp.EmployerID, jp.CategoryID, jp.Title, jp.SalaryRange, jp.Location,
        jp.Status, jp.AdminNote, jp.CreatedAt, jp.ExpiresAt,
        e.CompanyName, e.CompanyLogoUrl, e.KYCStatus,
        jc.CategoryName,
        (SELECT COUNT(*) FROM JobApplications ja WHERE ja.JobID = jp.JobID) AS TotalApplicants
      FROM JobPostings jp
      JOIN Employers e ON jp.EmployerID = e.EmployerID
      LEFT JOIN JobCategories jc ON jp.CategoryID = jc.CategoryID
      ${whereClause}
      ORDER BY 
        CASE WHEN jp.Status = 'PendingApproval' THEN 0 
             WHEN jp.Status = 'RequiresRevision' THEN 1 
             ELSE 2 END,
        jp.CreatedAt DESC
      OFFSET ${safeOffset} ROWS FETCH NEXT ${safeLimit} ROWS ONLY
    `;

    const [countRes, dataRes] = await Promise.all([
      executeQuery(countQuery, params),
      executeQuery(dataQuery, params)
    ]);

    const totalCount = countRes.recordset[0]?.totalCount || 0;
    const totalPages = Math.ceil(totalCount / limit);

    return res.json({
      success: true,
      data: dataRes.recordset || [],
      pagination: {
        page,
        limit,
        totalCount,
        totalPages
      }
    });
  } catch (error) {
    console.error('getModerationJobs error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi khi tải danh sách kiểm duyệt tin tuyển dụng' });
  }
};

// 10. Get Job Detail for moderation
const getJobDetail = async (req, res) => {
  try {
    const { jobId } = req.params;

    const jobRes = await executeQuery(
      `SELECT jp.JobID, jp.EmployerID, jp.CategoryID, jp.Title, jp.Description, jp.Requirements,
              jp.SalaryRange, jp.Location, jp.Status, jp.AdminNote, jp.CreatedAt, jp.ExpiresAt,
              e.CompanyName, e.CompanyLogoUrl, e.Website, e.CompanySize, e.Address, e.KYCStatus,
              u.FullName AS RepresentativeName, u.Email AS RepresentativeEmail, u.Phone AS RepresentativePhone,
              jc.CategoryName,
              (SELECT COUNT(*) FROM JobApplications ja WHERE ja.JobID = jp.JobID) AS TotalApplicants
       FROM JobPostings jp
       JOIN Employers e ON jp.EmployerID = e.EmployerID
       JOIN Users u ON e.UserID = u.UserID
       LEFT JOIN JobCategories jc ON jp.CategoryID = jc.CategoryID
       WHERE jp.JobID = @JobID`,
      { JobID: jobId }
    );

    if (!jobRes.recordset || jobRes.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy tin tuyển dụng' });
    }

    const job = jobRes.recordset[0];

    // Fetch required skills
    const skillsRes = await executeQuery(
      `SELECT st.SkillID, st.SkillName, jsr.IsMandatory
       FROM JobSkillRequirements jsr
       JOIN SkillTaxonomy st ON jsr.SkillID = st.SkillID
       WHERE jsr.JobID = @JobID`,
      { JobID: jobId }
    );

    job.requiredSkills = skillsRes.recordset || [];

    return res.json({
      success: true,
      data: job
    });
  } catch (error) {
    console.error('getJobDetail error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi khi lấy chi tiết tin tuyển dụng' });
  }
};

// 11. Moderate Job Posting (Approve, Reject, Request Revision)
const moderateJob = async (req, res) => {
  try {
    const { jobId } = req.params;
    const { status, adminNote } = req.body;

    const validStatuses = ['Published', 'Rejected', 'RequiresRevision', 'PendingApproval', 'Closed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Trạng thái kiểm duyệt không hợp lệ. Chỉ chấp nhận: Published (Duyệt), Rejected (Từ chối), RequiresRevision (Yêu cầu chỉnh sửa)' 
      });
    }

    if (['Rejected', 'RequiresRevision'].includes(status) && (!adminNote || !adminNote.trim())) {
      return res.status(400).json({ 
        success: false, 
        message: 'Vui lòng nhập lý do hoặc phản hồi cho nhà tuyển dụng khi Từ chối hoặc Yêu cầu chỉnh sửa' 
      });
    }

    const result = await withTransaction(async query => {
      if (status === 'Published') {
        const owner = (await query('SELECT u.Status FROM Users u WITH(UPDLOCK,ROWLOCK) WHERE u.UserID=(SELECT e.UserID FROM Employers e JOIN JobPostings j ON j.EmployerID=e.EmployerID WHERE j.JobID=@ID)', { ID: jobId })).recordset[0];
        if (owner && owner.Status !== 'Active') throw Object.assign(new Error('Không thể đăng tin của tài khoản đã bị khóa.'), { status: 409 });
      }
      const previous = (await query('SELECT Status,AdminNote FROM JobPostings WITH(UPDLOCK,ROWLOCK) WHERE JobID=@ID', { ID: jobId })).recordset[0];
      const result = await query(
        `UPDATE JobPostings
         SET Status = @Status,
             AdminNote = @AdminNote
         WHERE JobID = @JobID`,
        {
          Status: status,
          AdminNote: adminNote ? adminNote.trim() : null,
          JobID: jobId
        }
      );
      if (previous && (previous.Status !== status || (previous.AdminNote || '') !== (adminNote?.trim() || ''))) {
        await enqueue(query, 'job_status', { jobId, status, note: adminNote?.trim() || '' });
      }
      return result;
    });

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy tin tuyển dụng' });
    }

    const statusMessages = {
      Published: 'Phê duyệt tin tuyển dụng thành công! Tin đã được xuất bản công khai.',
      Rejected: 'Đã từ chối tin tuyển dụng và lưu lý do phản hồi cho nhà tuyển dụng.',
      RequiresRevision: 'Đã gửi yêu cầu chỉnh sửa tin tuyển dụng đến doanh nghiệp.'
    };

    return res.json({
      success: true,
      message: statusMessages[status] || 'Cập nhật trạng thái kiểm duyệt thành công!'
    });
  } catch (error) {
    console.error('moderateJob error:', error);
    return res.status(error.status || 500).json({ success: false, message: error.status ? error.message : 'Lỗi khi kiểm duyệt tin tuyển dụng' });
  }
};

// ========================================================
// 12. Quản lý Báo cáo vi phạm (UserReports)
// ========================================================
const getReports = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const offset = (page - 1) * limit;
    const status = req.query.status && req.query.status !== 'all' ? req.query.status : null;
    const targetType = req.query.targetType && req.query.targetType !== 'all' ? req.query.targetType : null;

    const safeOffset = Math.max(0, offset);
    const safeLimit = Math.max(1, Math.min(100, limit));

    let whereClause = `WHERE 1=1`;
    const params = {};
    if (req.query.reportId !== undefined) {
      const requestedId = Number(req.query.reportId);
      if (!Number.isSafeInteger(requestedId) || requestedId < 1) return res.status(400).json({ success: false, message: 'Mã báo cáo không hợp lệ.' });
      whereClause += ' AND ur.ReportID=@RequestedReportID';
      params.RequestedReportID = requestedId;
    }

    if (status) {
      whereClause += ` AND ur.Status = @Status`;
      params.Status = status;
    }

    if (targetType) {
      whereClause += ` AND ur.TargetType = @TargetType`;
      params.TargetType = targetType;
    }

    const countQuery = `
      SELECT COUNT(*) AS totalCount
      FROM UserReports ur
      ${whereClause}
    `;

    const dataQuery = `
      SELECT 
        ur.ReportID, ur.ReporterUserID, ur.TargetType, ur.TargetID, ur.Reason,
        ur.Status, ur.AdminNote, ur.ResolvedAt, ur.CreatedAt, ur.ResolvedByUserID,
        reviewer.FullName AS ResolvedByName,ma.TargetUserID AS LockedUserID,ma.Action AS ModerationAction,
        u.FullName AS ReporterName, u.Email AS ReporterEmail,
        CASE 
          WHEN ur.TargetType = 'JobPosting' THEN (SELECT jp.Title FROM JobPostings jp WHERE jp.JobID = ur.TargetID)
          WHEN ur.TargetType = 'Employer' THEN (SELECT e.CompanyName FROM Employers e WHERE e.EmployerID = ur.TargetID)
          WHEN ur.TargetType = 'Candidate' THEN (SELECT cu.FullName FROM Users cu WHERE cu.UserID = ur.TargetID)
          ELSE 'N/A'
        END AS TargetName,
        CASE 
          WHEN ur.TargetType = 'JobPosting' THEN (SELECT e.CompanyName FROM JobPostings jp JOIN Employers e ON jp.EmployerID = e.EmployerID WHERE jp.JobID = ur.TargetID)
          ELSE NULL
        END AS TargetSubInfo
      FROM UserReports ur
      LEFT JOIN Users u ON ur.ReporterUserID = u.UserID
      LEFT JOIN Users reviewer ON reviewer.UserID=ur.ResolvedByUserID
      LEFT JOIN AccountModerationActions ma ON ma.ReportID=ur.ReportID
      ${whereClause}
      ORDER BY 
        CASE WHEN ur.Status = 'Pending' THEN 0 ELSE 1 END,
        ur.CreatedAt DESC
      OFFSET ${safeOffset} ROWS FETCH NEXT ${safeLimit} ROWS ONLY
    `;

    const [countRes, dataRes] = await Promise.all([
      executeQuery(countQuery, params),
      executeQuery(dataQuery, params)
    ]);

    const totalCount = countRes.recordset[0]?.totalCount || 0;
    const totalPages = Math.ceil(totalCount / limit);

    return res.json({
      success: true,
      data: dataRes.recordset || [],
      pagination: {
        page,
        limit,
        totalCount,
        totalPages
      }
    });
  } catch (error) {
    console.error('getReports error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi khi lấy danh sách báo cáo vi phạm' });
  }
};

const resolveReport = async (req, res) => {
  try {
    const data = await require('../services/adminModerationService').resolveReport(Number(req.params.reportId), req.user.userId, req.body.status, req.body.adminNote);
    return res.json({ success: true, data, message: req.body.status === 'Resolved' ? 'Đã xác nhận vi phạm, khóa tài khoản và đóng các tin liên quan.' : 'Đã bác bỏ báo cáo; tài khoản không bị khóa.' });
  } catch (error) { return res.status(error.status || 500).json({ success: false, message: error.status ? error.message : 'Không thể xử lý báo cáo.' }); }
};

// ========================================================
// 13. CRUD Ngành nghề (Job Categories)
// ========================================================
const getCategoriesAdmin = async (req, res) => {
  try {
    const query = `
      SELECT 
        jc.CategoryID, jc.CategoryName, jc.Description,
        (SELECT COUNT(*) FROM JobPostings jp WHERE jp.CategoryID = jc.CategoryID) AS TotalJobs,
        (SELECT COUNT(*) FROM SkillTaxonomy st WHERE st.CategoryID = jc.CategoryID) AS TotalSkills
      FROM JobCategories jc
      ORDER BY jc.CategoryName ASC
    `;
    const result = await executeQuery(query);
    return res.json({
      success: true,
      data: result.recordset || []
    });
  } catch (error) {
    console.error('getCategoriesAdmin error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi khi tải danh sách ngành nghề' });
  }
};

const createCategory = async (req, res) => {
  try {
    const { categoryName, description } = req.body;
    if (!categoryName || !categoryName.trim()) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập tên ngành nghề' });
    }

    const checkRes = await executeQuery('SELECT CategoryID FROM JobCategories WHERE CategoryName = @CategoryName', { CategoryName: categoryName.trim() });
    if (checkRes.recordset && checkRes.recordset.length > 0) {
      return res.status(400).json({ success: false, message: 'Ngành nghề này đã tồn tại trong hệ thống' });
    }

    const insertRes = await executeQuery(
      `INSERT INTO JobCategories (CategoryName, Description)
       OUTPUT INSERTED.CategoryID, INSERTED.CategoryName, INSERTED.Description
       VALUES (@CategoryName, @Description)`,
      {
        CategoryName: categoryName.trim(),
        Description: description ? description.trim() : null
      }
    );

    return res.status(201).json({
      success: true,
      message: 'Thêm mới ngành nghề thành công!',
      data: insertRes.recordset[0]
    });
  } catch (error) {
    console.error('createCategory error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi khi tạo mới ngành nghề' });
  }
};

const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { categoryName, description } = req.body;

    if (!categoryName || !categoryName.trim()) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập tên ngành nghề' });
    }

    const checkRes = await executeQuery(
      'SELECT CategoryID FROM JobCategories WHERE CategoryName = @CategoryName AND CategoryID <> @CategoryID',
      { CategoryName: categoryName.trim(), CategoryID: id }
    );
    if (checkRes.recordset && checkRes.recordset.length > 0) {
      return res.status(400).json({ success: false, message: 'Tên ngành nghề bị trùng với ngành nghề khác' });
    }

    await executeQuery(
      `UPDATE JobCategories
       SET CategoryName = @CategoryName,
           Description = @Description
       WHERE CategoryID = @CategoryID`,
      {
        CategoryName: categoryName.trim(),
        Description: description ? description.trim() : null,
        CategoryID: id
      }
    );

    return res.json({
      success: true,
      message: 'Cập nhật ngành nghề thành công!'
    });
  } catch (error) {
    console.error('updateCategory error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi khi cập nhật ngành nghề' });
  }
};

const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const countCheck = await executeQuery(
      `SELECT 
         (SELECT COUNT(*) FROM JobPostings WHERE CategoryID = @CategoryID) AS JobCount,
         (SELECT COUNT(*) FROM SkillTaxonomy WHERE CategoryID = @CategoryID) AS SkillCount`,
      { CategoryID: id }
    );

    const counts = countCheck.recordset[0] || {};
    if (counts.JobCount > 0 || counts.SkillCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Không thể xóa ngành nghề này vì đang liên kết với ${counts.JobCount} tin tuyển dụng và ${counts.SkillCount} kỹ năng. Vui lòng chuyển các mục liên quan trước khi xóa!`
      });
    }

    await executeQuery('DELETE FROM JobCategories WHERE CategoryID = @CategoryID', { CategoryID: id });

    return res.json({
      success: true,
      message: 'Đã xóa ngành nghề thành công!'
    });
  } catch (error) {
    console.error('deleteCategory error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi khi xóa ngành nghề' });
  }
};

// ========================================================
// 14. CRUD Từ điển Kỹ năng (Skill Taxonomy)
// ========================================================
const getSkillsAdmin = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 12;
    const offset = (page - 1) * limit;
    const search = req.query.search ? req.query.search.trim() : null;
    const categoryId = req.query.categoryId && req.query.categoryId !== 'all' ? parseInt(req.query.categoryId, 10) : null;

    const safeOffset = Math.max(0, offset);
    const safeLimit = Math.max(1, Math.min(100, limit));

    let whereClause = `WHERE 1=1`;
    const params = {};

    if (search) {
      whereClause += ` AND (st.SkillName LIKE @SearchPattern OR st.NormalizedName LIKE @SearchPattern)`;
      params.SearchPattern = `%${search}%`;
    }

    if (categoryId) {
      whereClause += ` AND st.CategoryID = @CategoryID`;
      params.CategoryID = categoryId;
    }

    const countQuery = `
      SELECT COUNT(*) AS totalCount
      FROM SkillTaxonomy st
      ${whereClause}
    `;

    const dataQuery = `
      SELECT 
        st.SkillID, st.SkillName, st.NormalizedName, st.CategoryID,
        jc.CategoryName,
        (SELECT COUNT(*) FROM JobSkillRequirements jsr WHERE jsr.SkillID = st.SkillID) AS RequiredJobCount,
        (SELECT COUNT(*) FROM Courses c WHERE c.SkillID = st.SkillID) AS CourseCount
      FROM SkillTaxonomy st
      LEFT JOIN JobCategories jc ON st.CategoryID = jc.CategoryID
      ${whereClause}
      ORDER BY st.SkillName ASC
      OFFSET ${safeOffset} ROWS FETCH NEXT ${safeLimit} ROWS ONLY
    `;

    const [countRes, dataRes] = await Promise.all([
      executeQuery(countQuery, params),
      executeQuery(dataQuery, params)
    ]);

    const totalCount = countRes.recordset[0]?.totalCount || 0;
    const totalPages = Math.ceil(totalCount / limit);

    return res.json({
      success: true,
      data: dataRes.recordset || [],
      pagination: {
        page,
        limit,
        totalCount,
        totalPages
      }
    });
  } catch (error) {
    console.error('getSkillsAdmin error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi khi tải từ điển kỹ năng' });
  }
};

const createSkill = async (req, res) => {
  try {
    const { skillName, normalizedName, categoryId } = req.body;
    if (!skillName || !skillName.trim()) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập tên kỹ năng' });
    }

    const norm = (normalizedName && normalizedName.trim()) 
      ? normalizedName.trim().toLowerCase() 
      : skillName.trim().toLowerCase().replace(/[^a-z0-9]/g, '');

    const checkRes = await executeQuery('SELECT SkillID FROM SkillTaxonomy WHERE SkillName = @SkillName', { SkillName: skillName.trim() });
    if (checkRes.recordset && checkRes.recordset.length > 0) {
      return res.status(400).json({ success: false, message: 'Kỹ năng này đã tồn tại trong từ điển' });
    }

    const insertRes = await executeQuery(
      `INSERT INTO SkillTaxonomy (SkillName, NormalizedName, CategoryID)
       OUTPUT INSERTED.SkillID, INSERTED.SkillName, INSERTED.NormalizedName, INSERTED.CategoryID
       VALUES (@SkillName, @NormalizedName, @CategoryID)`,
      {
        SkillName: skillName.trim(),
        NormalizedName: norm,
        CategoryID: categoryId ? parseInt(categoryId, 10) : null
      }
    );

    return res.status(201).json({
      success: true,
      message: 'Thêm mới kỹ năng vào từ điển thành công!',
      data: insertRes.recordset[0]
    });
  } catch (error) {
    console.error('createSkill error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi khi tạo mới kỹ năng' });
  }
};

const updateSkill = async (req, res) => {
  try {
    const { id } = req.params;
    const { skillName, normalizedName, categoryId } = req.body;

    if (!skillName || !skillName.trim()) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập tên kỹ năng' });
    }

    const norm = (normalizedName && normalizedName.trim()) 
      ? normalizedName.trim().toLowerCase() 
      : skillName.trim().toLowerCase().replace(/[^a-z0-9]/g, '');

    const checkRes = await executeQuery(
      'SELECT SkillID FROM SkillTaxonomy WHERE SkillName = @SkillName AND SkillID <> @SkillID',
      { SkillName: skillName.trim(), SkillID: id }
    );
    if (checkRes.recordset && checkRes.recordset.length > 0) {
      return res.status(400).json({ success: false, message: 'Tên kỹ năng bị trùng với kỹ năng khác' });
    }

    await executeQuery(
      `UPDATE SkillTaxonomy
       SET SkillName = @SkillName,
           NormalizedName = @NormalizedName,
           CategoryID = @CategoryID
       WHERE SkillID = @SkillID`,
      {
        SkillName: skillName.trim(),
        NormalizedName: norm,
        CategoryID: categoryId ? parseInt(categoryId, 10) : null,
        SkillID: id
      }
    );

    return res.json({
      success: true,
      message: 'Cập nhật kỹ năng chuẩn hóa thành công!'
    });
  } catch (error) {
    console.error('updateSkill error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi khi cập nhật kỹ năng' });
  }
};

const deleteSkill = async (req, res) => {
  try {
    const { id } = req.params;

    const checkRes = await executeQuery(
      `SELECT 
         (SELECT COUNT(*) FROM JobSkillRequirements WHERE SkillID = @SkillID) AS JobReqCount,
         (SELECT COUNT(*) FROM Courses WHERE SkillID = @SkillID) AS CourseCount`,
      { SkillID: id }
    );
    const usage = checkRes.recordset[0] || {};
    if (usage.JobReqCount > 0 || usage.CourseCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Kỹ năng này đang được liên kết trong ${usage.JobReqCount} tin JD và ${usage.CourseCount} khóa học. Không thể xóa trực tiếp!`
      });
    }

    await executeQuery('DELETE FROM SkillTaxonomy WHERE SkillID = @SkillID', { SkillID: id });

    return res.json({
      success: true,
      message: 'Đã xóa kỹ năng khỏi từ điển thành công!'
    });
  } catch (error) {
    console.error('deleteSkill error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi khi xóa kỹ năng' });
  }
};

module.exports = {
  // KYC & Payment routes
  reviewEmployerKYC,
  getPendingKYCList,

  // Admin portal routes
  getDashboardStats,
  getCandidates,
  getCandidateDetail,
  getEmployers,
  getEmployerDetail,
  updateUserStatus,
  updateEmployerKYC,
  resetUserPassword,
  getModerationJobs,
  getJobDetail,
  moderateJob,
  getReports,
  resolveReport,
  getCategoriesAdmin,
  createCategory,
  updateCategory,
  deleteCategory,
  getSkillsAdmin,
  createSkill,
  updateSkill,
  deleteSkill,
};

