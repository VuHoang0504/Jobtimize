const { executeQuery } = require('../config/db');
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
    const { userId } = req.params;
    const { status } = req.body;

    if (!['Active', 'Locked'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Trạng thái chỉ có thể là "Active" hoặc "Locked"' });
    }

    // Do not allow current admin to lock their own account
    if (parseInt(userId, 10) === req.user.userId) {
      return res.status(400).json({ success: false, message: 'Bạn không thể tự khóa tài khoản Admin đang đăng nhập!' });
    }

    const result = await executeQuery(
      `UPDATE Users 
       SET Status = @Status, UpdatedAt = GETDATE()
       WHERE UserID = @UserID`,
      {
        Status: status,
        UserID: userId
      }
    );

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản người dùng' });
    }

    const actionText = status === 'Active' ? 'mở khóa' : 'khóa';
    return res.json({
      success: true,
      message: `Đã ${actionText} tài khoản thành công!`
    });
  } catch (error) {
    console.error('updateUserStatus error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi khi cập nhật trạng thái tài khoản' });
  }
};

// 7. Update Employer KYC Status (Approved / Rejected)
const updateEmployerKYC = async (req, res) => {
  try {
    const { employerId } = req.params;
    const { kycStatus, rejectionReason } = req.body;

    if (!['Approved', 'Rejected', 'Pending'].includes(kycStatus)) {
      return res.status(400).json({ success: false, message: 'Trạng thái KYC không hợp lệ' });
    }

    if (kycStatus === 'Rejected' && !rejectionReason) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp lý do từ chối xác thực KYC' });
    }

    // Update Employer
    await executeQuery(
      `UPDATE Employers 
       SET KYCStatus = @KYCStatus 
       WHERE EmployerID = @EmployerID`,
      {
        KYCStatus: kycStatus,
        EmployerID: employerId
      }
    );

    // If rejection reason provided, update in latest KYC document
    if (rejectionReason) {
      await executeQuery(
        `UPDATE KYCDocuments
         SET RejectionReason = @RejectionReason
         WHERE DocumentID = (
           SELECT TOP 1 DocumentID FROM KYCDocuments WHERE EmployerID = @EmployerID ORDER BY SubmittedAt DESC
         )`,
        {
          RejectionReason: rejectionReason,
          EmployerID: employerId
        }
      );
    }

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
    return res.status(500).json({ success: false, message: 'Lỗi khi cập nhật trạng thái KYC doanh nghiệp' });
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

    const result = await executeQuery(
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
    return res.status(500).json({ success: false, message: 'Lỗi khi kiểm duyệt tin tuyển dụng' });
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
        ur.Status, ur.AdminNote, ur.ResolvedAt, ur.CreatedAt,
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
    const { reportId } = req.params;
    const { status, adminNote, actionTaken } = req.body;

    if (!['Resolved', 'Dismissed'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Trạng thái xử lý chỉ có thể là "Resolved" hoặc "Dismissed"' });
    }

    const checkRes = await executeQuery('SELECT ReportID, TargetType, TargetID FROM UserReports WHERE ReportID = @ReportID', { ReportID: reportId });
    if (!checkRes.recordset || checkRes.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy báo cáo vi phạm' });
    }

    const report = checkRes.recordset[0];

    await executeQuery(
      `UPDATE UserReports
       SET Status = @Status,
           AdminNote = @AdminNote,
           ResolvedAt = GETDATE()
       WHERE ReportID = @ReportID`,
      {
        Status: status,
        AdminNote: adminNote ? adminNote.trim() : null,
        ReportID: reportId
      }
    );

    if (actionTaken === 'close_job' && report.TargetType === 'JobPosting') {
      await executeQuery(
        `UPDATE JobPostings SET Status = 'Closed', AdminNote = @AdminNote WHERE JobID = @JobID`,
        { JobID: report.TargetID, AdminNote: adminNote || 'Đã đóng do vi phạm chính sách theo báo cáo người dùng.' }
      );
    } else if (actionTaken === 'lock_target') {
      if (report.TargetType === 'JobPosting') {
        await executeQuery(
          `UPDATE JobPostings SET Status = 'Rejected', AdminNote = @AdminNote WHERE JobID = @JobID`,
          { JobID: report.TargetID, AdminNote: adminNote || 'Bị từ chối do vi phạm chính sách cộng đồng.' }
        );
      } else if (report.TargetType === 'Employer') {
        await executeQuery(
          `UPDATE Users SET Status = 'Locked' WHERE UserID = (SELECT UserID FROM Employers WHERE EmployerID = @EmployerID)`,
          { EmployerID: report.TargetID }
        );
      } else if (report.TargetType === 'Candidate') {
        await executeQuery(
          `UPDATE Users SET Status = 'Locked' WHERE UserID = @UserID`,
          { UserID: report.TargetID }
        );
      }
    }

    return res.json({
      success: true,
      message: status === 'Resolved' ? 'Đã xử lý và giải quyết báo cáo vi phạm thành công!' : 'Đã bác bỏ báo cáo vi phạm.'
    });
  } catch (error) {
    console.error('resolveReport error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi khi xử lý báo cáo vi phạm' });
  }
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

// 9. Báo cáo Doanh thu & Thống kê tăng trưởng hệ thống (Analytics Dashboard)
const getAnalyticsReport = async (req, res) => {
  try {
    const timeRange = req.query.timeRange || '6m'; // '7d', '30d', '6m', '1y'

    // 1. Chuẩn bị các mốc thời gian liên tục (Continuous Intervals)
    const now = new Date();
    let intervals = [];
    let isDaily = false;

    if (timeRange === '7d') {
      isDaily = true;
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        intervals.push({
          key: `${yyyy}-${mm}-${dd}`,
          label: `${dd}/${mm}`,
          fullLabel: `${dd}/${mm}/${yyyy}`
        });
      }
    } else if (timeRange === '30d') {
      isDaily = true;
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        intervals.push({
          key: `${yyyy}-${mm}-${dd}`,
          label: `${dd}/${mm}`,
          fullLabel: `${dd}/${mm}/${yyyy}`
        });
      }
    } else {
      // Monthly intervals: 6m or 1y
      const monthCount = timeRange === '1y' ? 12 : 6;
      for (let i = monthCount - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        intervals.push({
          key: `${yyyy}-${mm}`,
          label: `T${d.getMonth() + 1}`,
          fullLabel: `Tháng ${d.getMonth() + 1}/${yyyy}`
        });
      }
    }

    // 2. Query dữ liệu Doanh thu theo thời gian
    const revenueTimelineQuery = isDaily ? `
      SELECT 
        FORMAT(es.StartDate, 'yyyy-MM-dd') AS DateKey,
        SUM(ISNULL(es.AmountPaid, sp.Price)) AS TotalRevenue,
        COUNT(es.SubID) AS OrderCount
      FROM EmployerSubscriptions es
      JOIN SubscriptionPackages sp ON es.PackageID = sp.PackageID
      WHERE (es.PaymentStatus = 'Completed' OR es.PaymentStatus IS NULL)
      GROUP BY FORMAT(es.StartDate, 'yyyy-MM-dd')
    ` : `
      SELECT 
        FORMAT(es.StartDate, 'yyyy-MM') AS DateKey,
        SUM(ISNULL(es.AmountPaid, sp.Price)) AS TotalRevenue,
        COUNT(es.SubID) AS OrderCount
      FROM EmployerSubscriptions es
      JOIN SubscriptionPackages sp ON es.PackageID = sp.PackageID
      WHERE (es.PaymentStatus = 'Completed' OR es.PaymentStatus IS NULL)
      GROUP BY FORMAT(es.StartDate, 'yyyy-MM')
    `;

    // 3. Query Tăng trưởng Người dùng (Candidates & Employers)
    const usersTimelineQuery = isDaily ? `
      SELECT 
        FORMAT(u.CreatedAt, 'yyyy-MM-dd') AS DateKey,
        SUM(CASE WHEN r.RoleName = 'Candidate' THEN 1 ELSE 0 END) AS CandidateCount,
        SUM(CASE WHEN r.RoleName = 'Employer' THEN 1 ELSE 0 END) AS EmployerCount,
        COUNT(u.UserID) AS TotalCount
      FROM Users u
      JOIN UserRoles ur ON u.UserID = ur.UserID
      JOIN Roles r ON ur.RoleID = r.RoleID
      WHERE r.RoleName IN ('Candidate', 'Employer')
      GROUP BY FORMAT(u.CreatedAt, 'yyyy-MM-dd')
    ` : `
      SELECT 
        FORMAT(u.CreatedAt, 'yyyy-MM') AS DateKey,
        SUM(CASE WHEN r.RoleName = 'Candidate' THEN 1 ELSE 0 END) AS CandidateCount,
        SUM(CASE WHEN r.RoleName = 'Employer' THEN 1 ELSE 0 END) AS EmployerCount,
        COUNT(u.UserID) AS TotalCount
      FROM Users u
      JOIN UserRoles ur ON u.UserID = ur.UserID
      JOIN Roles r ON ur.RoleID = r.RoleID
      WHERE r.RoleName IN ('Candidate', 'Employer')
      GROUP BY FORMAT(u.CreatedAt, 'yyyy-MM')
    `;

    // 4. Query Tin tuyển dụng theo thời gian
    const jobsTimelineQuery = isDaily ? `
      SELECT 
        FORMAT(CreatedAt, 'yyyy-MM-dd') AS DateKey,
        COUNT(JobID) AS JobCount
      FROM JobPostings
      GROUP BY FORMAT(CreatedAt, 'yyyy-MM-dd')
    ` : `
      SELECT 
        FORMAT(CreatedAt, 'yyyy-MM') AS DateKey,
        COUNT(JobID) AS JobCount
      FROM JobPostings
      GROUP BY FORMAT(CreatedAt, 'yyyy-MM')
    `;

    // 5. Query Lượt ứng tuyển theo thời gian
    const appsTimelineQuery = isDaily ? `
      SELECT 
        FORMAT(AppliedAt, 'yyyy-MM-dd') AS DateKey,
        COUNT(ApplicationID) AS ApplicationCount
      FROM JobApplications
      GROUP BY FORMAT(AppliedAt, 'yyyy-MM-dd')
    ` : `
      SELECT 
        FORMAT(AppliedAt, 'yyyy-MM') AS DateKey,
        COUNT(ApplicationID) AS ApplicationCount
      FROM JobApplications
      GROUP BY FORMAT(AppliedAt, 'yyyy-MM')
    `;

    // 6. Cơ cấu Doanh thu theo Gói dịch vụ
    const packagesQuery = `
      SELECT 
        sp.PackageID,
        sp.PackageName,
        sp.Price,
        COUNT(es.SubID) AS SubscriptionCount,
        SUM(CASE WHEN (es.PaymentStatus = 'Completed' OR es.PaymentStatus IS NULL) THEN ISNULL(es.AmountPaid, sp.Price) ELSE 0 END) AS TotalRevenue
      FROM SubscriptionPackages sp
      LEFT JOIN EmployerSubscriptions es ON sp.PackageID = es.PackageID
      GROUP BY sp.PackageID, sp.PackageName, sp.Price
      ORDER BY TotalRevenue DESC
    `;

    // 7. Cơ cấu theo Phương thức thanh toán
    const paymentsQuery = `
      SELECT 
        ISNULL(es.PaymentMethod, 'VNPay') AS PaymentMethod,
        COUNT(es.SubID) AS TransactionCount,
        SUM(ISNULL(es.AmountPaid, sp.Price)) AS TotalAmount
      FROM EmployerSubscriptions es
      JOIN SubscriptionPackages sp ON es.PackageID = sp.PackageID
      WHERE (es.PaymentStatus = 'Completed' OR es.PaymentStatus IS NULL)
      GROUP BY ISNULL(es.PaymentMethod, 'VNPay')
      ORDER BY TotalAmount DESC
    `;

    // 8. Phân bố Việc làm theo Ngành nghề
    const categoriesQuery = `
      SELECT TOP 8
        c.CategoryID,
        c.CategoryName,
        COUNT(jp.JobID) AS JobCount
      FROM JobCategories c
      LEFT JOIN JobPostings jp ON c.CategoryID = jp.CategoryID
      GROUP BY c.CategoryID, c.CategoryName
      ORDER BY JobCount DESC
    `;

    // 9. Phân bố Việc làm theo Địa điểm
    const locationsQuery = `
      SELECT 
        CASE 
          WHEN Location LIKE N'%Hà Nội%' THEN N'Hà Nội'
          WHEN Location LIKE N'%Hồ Chí Minh%' OR Location LIKE N'%TP.HCM%' THEN N'TP. Hồ Chí Minh'
          WHEN Location LIKE N'%Đà Nẵng%' THEN N'Đà Nẵng'
          ELSE N'Khác'
        END AS LocationCity,
        COUNT(JobID) AS JobCount
      FROM JobPostings
      GROUP BY 
        CASE 
          WHEN Location LIKE N'%Hà Nội%' THEN N'Hà Nội'
          WHEN Location LIKE N'%Hồ Chí Minh%' OR Location LIKE N'%TP.HCM%' THEN N'TP. Hồ Chí Minh'
          WHEN Location LIKE N'%Đà Nẵng%' THEN N'Đà Nẵng'
          ELSE N'Khác'
        END
      ORDER BY JobCount DESC
    `;

    // 10. Giao dịch mới nhất
    const recentTxQuery = `
      SELECT TOP 10
        es.SubID,
        ISNULL(es.TransactionCode, CONCAT('TXN-', es.SubID, '-', FORMAT(es.StartDate, 'yyyyMMdd'))) AS TransactionCode,
        e.EmployerID,
        e.CompanyName,
        e.CompanyLogoUrl,
        sp.PackageID,
        sp.PackageName,
        ISNULL(es.AmountPaid, sp.Price) AS Amount,
        ISNULL(es.PaymentMethod, 'VNPay') AS PaymentMethod,
        ISNULL(es.PaymentStatus, 'Completed') AS PaymentStatus,
        es.StartDate,
        es.EndDate,
        ISNULL(es.CreatedAt, es.StartDate) AS CreatedAt
      FROM EmployerSubscriptions es
      JOIN SubscriptionPackages sp ON es.PackageID = sp.PackageID
      JOIN Employers e ON es.EmployerID = e.EmployerID
      ORDER BY es.StartDate DESC
    `;

    // Tổng hợp KPI tổng
    const overallKpiQuery = `
      SELECT 
        (SELECT ISNULL(SUM(ISNULL(es.AmountPaid, sp.Price)), 0) 
         FROM EmployerSubscriptions es 
         JOIN SubscriptionPackages sp ON es.PackageID = sp.PackageID 
         WHERE es.PaymentStatus = 'Completed' OR es.PaymentStatus IS NULL) AS TotalRevenue,
        (SELECT COUNT(DISTINCT EmployerID) FROM EmployerSubscriptions WHERE AmountPaid > 0 OR PackageID IN (SELECT PackageID FROM SubscriptionPackages WHERE Price > 0)) AS PayingEmployers,
        (SELECT COUNT(*) FROM Users u JOIN UserRoles ur ON u.UserID = ur.UserID JOIN Roles r ON ur.RoleID = r.RoleID WHERE r.RoleName = 'Candidate') AS TotalCandidates,
        (SELECT COUNT(*) FROM Employers) AS TotalEmployers,
        (SELECT COUNT(*) FROM JobPostings) AS TotalJobs,
        (SELECT COUNT(*) FROM JobApplications) AS TotalApplications,
        (SELECT ISNULL(AVG(MatchScore), 0) FROM JobApplications WHERE MatchScore IS NOT NULL) AS AvgMatchScore
    `;

    const [
      revTimelineRes,
      usersTimelineRes,
      jobsTimelineRes,
      appsTimelineRes,
      packagesRes,
      paymentsRes,
      categoriesRes,
      locationsRes,
      recentTxRes,
      kpiRes
    ] = await Promise.all([
      executeQuery(revenueTimelineQuery),
      executeQuery(usersTimelineQuery),
      executeQuery(jobsTimelineQuery),
      executeQuery(appsTimelineQuery),
      executeQuery(packagesQuery),
      executeQuery(paymentsQuery),
      executeQuery(categoriesQuery),
      executeQuery(locationsQuery),
      executeQuery(recentTxQuery),
      executeQuery(overallKpiQuery)
    ]);

    // Map dữ liệu vào intervals liên tục
    const revMap = new Map();
    revTimelineRes.recordset.forEach(r => revMap.set(r.DateKey, { revenue: Number(r.TotalRevenue || 0), orders: Number(r.OrderCount || 0) }));

    const usersMap = new Map();
    usersTimelineRes.recordset.forEach(u => usersMap.set(u.DateKey, { candidates: Number(u.CandidateCount || 0), employers: Number(u.EmployerCount || 0), total: Number(u.TotalCount || 0) }));

    const jobsMap = new Map();
    jobsTimelineRes.recordset.forEach(j => jobsMap.set(j.DateKey, Number(j.JobCount || 0)));

    const appsMap = new Map();
    appsTimelineRes.recordset.forEach(a => appsMap.set(a.DateKey, Number(a.ApplicationCount || 0)));

    let runningCandidates = 0;
    let runningEmployers = 0;

    const timeline = intervals.map(item => {
      const revData = revMap.get(item.key) || { revenue: 0, orders: 0 };
      const uData = usersMap.get(item.key) || { candidates: 0, employers: 0, total: 0 };
      const jobCount = jobsMap.get(item.key) || 0;
      const appCount = appsMap.get(item.key) || 0;

      runningCandidates += uData.candidates;
      runningEmployers += uData.employers;

      return {
        key: item.key,
        label: item.label,
        fullLabel: item.fullLabel,
        revenue: revData.revenue,
        orders: revData.orders,
        newCandidates: uData.candidates,
        newEmployers: uData.employers,
        newUsers: uData.total,
        cumulativeUsers: runningCandidates + runningEmployers,
        jobs: jobCount,
        applications: appCount
      };
    });

    // Tính KPI tổng và tỷ lệ tăng trưởng trong kỳ so với kỳ trước
    const kpiData = kpiRes.recordset[0] || {};
    const totalRev = Number(kpiData.TotalRevenue || 0);
    const payingEmployers = Number(kpiData.PayingEmployers || 0);
    const arpu = payingEmployers > 0 ? Math.round(totalRev / payingEmployers) : 0;

    // Tổng trong kỳ được chọn (period total)
    const periodRevenue = timeline.reduce((acc, cur) => acc + cur.revenue, 0);
    const periodOrders = timeline.reduce((acc, cur) => acc + cur.orders, 0);
    const periodNewUsers = timeline.reduce((acc, cur) => acc + cur.newUsers, 0);
    const periodNewJobs = timeline.reduce((acc, cur) => acc + cur.jobs, 0);
    const periodApps = timeline.reduce((acc, cur) => acc + cur.applications, 0);

    // Tính % tăng trưởng nửa sau kỳ so với nửa đầu kỳ
    const half = Math.floor(timeline.length / 2);
    const firstHalfRev = timeline.slice(0, half).reduce((acc, cur) => acc + cur.revenue, 0);
    const secondHalfRev = timeline.slice(half).reduce((acc, cur) => acc + cur.revenue, 0);
    const revenueGrowthRate = firstHalfRev > 0 ? Math.round(((secondHalfRev - firstHalfRev) / firstHalfRev) * 100) : (secondHalfRev > 0 ? 100 : 0);

    const firstHalfUsers = timeline.slice(0, half).reduce((acc, cur) => acc + cur.newUsers, 0);
    const secondHalfUsers = timeline.slice(half).reduce((acc, cur) => acc + cur.newUsers, 0);
    const userGrowthRate = firstHalfUsers > 0 ? Math.round(((secondHalfUsers - firstHalfUsers) / firstHalfUsers) * 100) : (secondHalfUsers > 0 ? 100 : 0);

    const firstHalfJobs = timeline.slice(0, half).reduce((acc, cur) => acc + cur.jobs, 0);
    const secondHalfJobs = timeline.slice(half).reduce((acc, cur) => acc + cur.jobs, 0);
    const jobGrowthRate = firstHalfJobs > 0 ? Math.round(((secondHalfJobs - firstHalfJobs) / firstHalfJobs) * 100) : (secondHalfJobs > 0 ? 100 : 0);

    return res.json({
      success: true,
      data: {
        timeRange,
        kpi: {
          totalRevenue: totalRev,
          periodRevenue,
          revenueGrowthRate,
          periodOrders,
          payingEmployers,
          arpu,
          totalUsers: Number(kpiData.TotalCandidates || 0) + Number(kpiData.TotalEmployers || 0),
          totalCandidates: Number(kpiData.TotalCandidates || 0),
          totalEmployers: Number(kpiData.TotalEmployers || 0),
          periodNewUsers,
          userGrowthRate,
          totalJobs: Number(kpiData.TotalJobs || 0),
          periodNewJobs,
          jobGrowthRate,
          totalApplications: Number(kpiData.TotalApplications || 0),
          periodApplications: periodApps,
          avgMatchScore: Math.round(Number(kpiData.AvgMatchScore || 0) * 10) / 10
        },
        timeline,
        packagesBreakdown: packagesRes.recordset.map(p => ({
          packageId: p.PackageID,
          packageName: p.PackageName,
          price: Number(p.Price || 0),
          subscriptionCount: Number(p.SubscriptionCount || 0),
          totalRevenue: Number(p.TotalRevenue || 0),
          percentage: totalRev > 0 ? Math.round((Number(p.TotalRevenue || 0) / totalRev) * 100) : 0
        })),
        paymentMethodsBreakdown: paymentsRes.recordset.map(m => ({
          method: m.PaymentMethod,
          count: Number(m.TransactionCount || 0),
          totalAmount: Number(m.TotalAmount || 0),
          percentage: totalRev > 0 ? Math.round((Number(m.TotalAmount || 0) / totalRev) * 100) : 0
        })),
        jobsByCategory: categoriesRes.recordset.map(c => ({
          categoryId: c.CategoryID,
          categoryName: c.CategoryName,
          jobCount: Number(c.JobCount || 0)
        })),
        jobsByLocation: locationsRes.recordset.map(l => ({
          location: l.LocationCity,
          jobCount: Number(l.JobCount || 0)
        })),
        recentTransactions: recentTxRes.recordset.map(tx => ({
          subId: tx.SubID,
          transactionCode: tx.TransactionCode,
          employerId: tx.EmployerID,
          companyName: tx.CompanyName,
          companyLogoUrl: tx.CompanyLogoUrl,
          packageId: tx.PackageID,
          packageName: tx.PackageName,
          amount: Number(tx.Amount || 0),
          paymentMethod: tx.PaymentMethod,
          paymentStatus: tx.PaymentStatus,
          startDate: tx.StartDate,
          endDate: tx.EndDate,
          createdAt: tx.CreatedAt
        }))
      }
    });
  } catch (error) {
    console.error('getAnalyticsReport error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi khi lấy dữ liệu báo cáo thống kê' });
  }
};

// 10. Danh sách toàn bộ giao dịch / Đăng ký dịch vụ với phân trang & tìm kiếm
const getTransactions = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search ? req.query.search.trim() : null;
    const paymentMethod = req.query.paymentMethod && req.query.paymentMethod !== 'all' ? req.query.paymentMethod : null;

    const safeOffset = Math.max(0, offset);
    const safeLimit = Math.max(1, Math.min(100, limit));

    let whereClauses = [];
    let params = {};

    if (search) {
      whereClauses.push('(e.CompanyName LIKE @search OR es.TransactionCode LIKE @search)');
      params.search = `%${search}%`;
    }

    if (paymentMethod) {
      whereClauses.push('es.PaymentMethod = @paymentMethod');
      params.paymentMethod = paymentMethod;
    }

    const whereSQL = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countQuery = `
      SELECT COUNT(*) AS total
      FROM EmployerSubscriptions es
      JOIN SubscriptionPackages sp ON es.PackageID = sp.PackageID
      JOIN Employers e ON es.EmployerID = e.EmployerID
      ${whereSQL}
    `;

    const dataQuery = `
      SELECT 
        es.SubID,
        ISNULL(es.TransactionCode, CONCAT('TXN-', es.SubID, '-', FORMAT(es.StartDate, 'yyyyMMdd'))) AS TransactionCode,
        e.EmployerID,
        e.CompanyName,
        e.CompanyLogoUrl,
        sp.PackageID,
        sp.PackageName,
        ISNULL(es.AmountPaid, sp.Price) AS Amount,
        ISNULL(es.PaymentMethod, 'VNPay') AS PaymentMethod,
        ISNULL(es.PaymentStatus, 'Completed') AS PaymentStatus,
        es.StartDate,
        es.EndDate,
        ISNULL(es.CreatedAt, es.StartDate) AS CreatedAt
      FROM EmployerSubscriptions es
      JOIN SubscriptionPackages sp ON es.PackageID = sp.PackageID
      JOIN Employers e ON es.EmployerID = e.EmployerID
      ${whereSQL}
      ORDER BY es.StartDate DESC
      OFFSET ${safeOffset} ROWS FETCH NEXT ${safeLimit} ROWS ONLY
    `;

    const [countRes, dataRes] = await Promise.all([
      executeQuery(countQuery, params),
      executeQuery(dataQuery, params)
    ]);

    const total = countRes.recordset[0]?.total || 0;

    return res.json({
      success: true,
      data: {
        transactions: dataRes.recordset.map(tx => ({
          subId: tx.SubID,
          transactionCode: tx.TransactionCode,
          employerId: tx.EmployerID,
          companyName: tx.CompanyName,
          companyLogoUrl: tx.CompanyLogoUrl,
          packageId: tx.PackageID,
          packageName: tx.PackageName,
          amount: Number(tx.Amount || 0),
          paymentMethod: tx.PaymentMethod,
          paymentStatus: tx.PaymentStatus,
          startDate: tx.StartDate,
          endDate: tx.EndDate,
          createdAt: tx.CreatedAt
        })),
        pagination: {
          page,
          limit: safeLimit,
          total,
          totalPages: Math.ceil(total / safeLimit)
        }
      }
    });
  } catch (error) {
    console.error('getTransactions error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi khi lấy danh sách giao dịch' });
  }
};

module.exports = {
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
  getAnalyticsReport,
  getTransactions
};

