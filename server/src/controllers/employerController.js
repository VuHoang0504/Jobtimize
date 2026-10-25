const { executeQuery } = require('../config/db');
const emailService = require('../services/emailService');

// Helper to get EmployerID from authenticated UserID
const getEmployerId = async (userId) => {
  const empRes = await executeQuery('SELECT EmployerID, CompanyName, KYCStatus FROM Employers WHERE UserID = @UserID', { UserID: userId });
  if (!empRes.recordset || empRes.recordset.length === 0) {
    return null;
  }
  return empRes.recordset[0];
};

// ==========================================
// 1. PROFILE MANAGEMENT
// ==========================================

// Get Employer Profile
const getEmployerProfile = async (req, res) => {
  try {
    const userId = req.user.userId;

    const empRes = await executeQuery(
      `SELECT e.EmployerID, e.UserID, e.CompanyName, e.CompanyLogoUrl, e.Website, e.CompanySize,
              e.Address, e.Description, e.KYCStatus,
              u.FullName, u.Email, u.Phone
       FROM Employers e
       JOIN Users u ON e.UserID = u.UserID
       WHERE e.UserID = @UserID`,
      { UserID: userId }
    );

    if (!empRes.recordset || empRes.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Chưa tìm thấy hồ sơ doanh nghiệp' });
    }

    return res.json({
      success: true,
      data: empRes.recordset[0]
    });
  } catch (error) {
    console.error('getEmployerProfile error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Update Employer Profile
const updateEmployerProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { companyName, companyLogoUrl, website, companySize, address, description, fullName, phone } = req.body;

    // Update Users
    await executeQuery(
      `UPDATE Users
       SET FullName = COALESCE(@FullName, FullName),
           Phone = COALESCE(@Phone, Phone),
           UpdatedAt = GETDATE()
       WHERE UserID = @UserID`,
      {
        UserID: userId,
        FullName: fullName || null,
        Phone: phone || null
      }
    );

    // Update Employers
    await executeQuery(
      `UPDATE Employers
       SET CompanyName = COALESCE(@CompanyName, CompanyName),
           CompanyLogoUrl = COALESCE(@CompanyLogoUrl, CompanyLogoUrl),
           Website = COALESCE(@Website, Website),
           CompanySize = COALESCE(@CompanySize, CompanySize),
           Address = COALESCE(@Address, Address),
           Description = COALESCE(@Description, Description)
       WHERE UserID = @UserID`,
      {
        UserID: userId,
        CompanyName: companyName || null,
        CompanyLogoUrl: companyLogoUrl || null,
        Website: website || null,
        CompanySize: companySize || null,
        Address: address || null,
        Description: description || null
      }
    );

    return res.json({
      success: true,
      message: 'Cập nhật thông tin doanh nghiệp thành công!'
    });
  } catch (error) {
    console.error('updateEmployerProfile error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// 2. KYC - DOANH NGHIỆP XÁC THỰC (UC-E04)
// ==========================================

// Submit KYC documents (business license, tax code, optional tax certificate)
const submitKYC = async (req, res) => {
  try {
    const userId = req.user.userId;
    const emp = await getEmployerId(userId);
    if (!emp) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ nhà tuyển dụng' });
    }

    const { taxCode } = req.body;
    const businessLicenseFile = req.files?.businessLicense?.[0];
    const taxCertificateFile = req.files?.taxCertificate?.[0];

    const taxCodeClean = (taxCode || '').trim();
    const taxCodeRegex = /^[0-9]{10}(-[0-9]{3})?$/;
    if (!taxCodeClean || !taxCodeRegex.test(taxCodeClean)) {
      return res.status(400).json({
        success: false,
        message: 'Mã số thuế không hợp lệ. Vui lòng nhập MST doanh nghiệp gồm 10 chữ số (hoặc 13 chữ số dạng xxxxxxxxxx-xxx).'
      });
    }

    if (!businessLicenseFile) {
      return res.status(400).json({ success: false, message: 'Vui lòng tải lên ảnh hoặc file PDF Giấy phép đăng ký kinh doanh' });
    }

    const businessLicenseUrl = `/uploads/kyc/${businessLicenseFile.filename}`;
    const taxCertificateUrl = taxCertificateFile ? `/uploads/kyc/${taxCertificateFile.filename}` : null;

    // Insert into KYCDocuments
    await executeQuery(
      `INSERT INTO KYCDocuments (EmployerID, BusinessLicenseUrl, TaxCertificateUrl, TaxCode, SubmittedAt, RejectionReason)
       VALUES (@EmployerID, @BusinessLicenseUrl, @TaxCertificateUrl, @TaxCode, GETDATE(), NULL)`,
      {
        EmployerID: emp.EmployerID,
        BusinessLicenseUrl: businessLicenseUrl,
        TaxCertificateUrl: taxCertificateUrl,
        TaxCode: taxCode.trim()
      }
    );

    // Update Employer KYCStatus to 'Pending'
    await executeQuery(
      `UPDATE Employers SET KYCStatus = 'Pending' WHERE EmployerID = @EmployerID`,
      { EmployerID: emp.EmployerID }
    );

    return res.status(200).json({
      success: true,
      message: 'Hồ sơ pháp lý doanh nghiệp đã được nộp thành công! Hệ thống đang tiến hành xét duyệt.',
      data: {
        kycStatus: 'Pending',
        taxCode: taxCode.trim(),
        businessLicenseUrl,
        taxCertificateUrl
      }
    });
  } catch (error) {
    console.error('submitKYC error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Get current KYC status and latest document
const getKYCStatus = async (req, res) => {
  try {
    const userId = req.user.userId;
    const emp = await getEmployerId(userId);
    if (!emp) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ nhà tuyển dụng' });
    }

    const docRes = await executeQuery(
      `SELECT TOP 1 DocumentID, EmployerID, BusinessLicenseUrl, TaxCertificateUrl, TaxCode, SubmittedAt, RejectionReason
       FROM KYCDocuments
       WHERE EmployerID = @EmployerID
       ORDER BY SubmittedAt DESC`,
      { EmployerID: emp.EmployerID }
    );

    return res.json({
      success: true,
      data: {
        kycStatus: emp.KYCStatus || 'Pending',
        document: docRes.recordset[0] || null
      }
    });
  } catch (error) {
    console.error('getKYCStatus error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// 3. JOB MANAGEMENT (UC-E05, UC-E06)
// ==========================================

// Post New Job (UC-E05)
const postJob = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { title, categoryId, description, requirements, salaryRange, location, skills } = req.body;

    if (!title || !description || !requirements) {
      return res.status(400).json({ success: false, message: 'Vui lòng điền đầy đủ Tiêu đề, Mô tả và Yêu cầu công việc' });
    }

    const emp = await getEmployerId(userId);
    if (!emp) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ nhà tuyển dụng' });
    }

    // Check post quota if employer has an active subscription (UC-E06, UC-E07)
    const activeSubRes = await executeQuery(
      `SELECT TOP 1 SubID, RemainingPosts, EndDate
       FROM EmployerSubscriptions
       WHERE EmployerID = @EmployerID AND EndDate >= GETDATE()
       ORDER BY EndDate DESC`,
      { EmployerID: emp.EmployerID }
    );

    if (activeSubRes.recordset && activeSubRes.recordset.length > 0) {
      const activeSub = activeSubRes.recordset[0];
      if (activeSub.RemainingPosts <= 0) {
        return res.status(403).json({
          success: false,
          message: 'Bạn đã sử dụng hết số lượng tin đăng trong gói dịch vụ hiện tại. Vui lòng nâng cấp hoặc mua thêm gói để tiếp tục đăng tin.'
        });
      }
    }

    // Insert JobPosting (Mặc định ở trạng thái Chờ Admin Phê Duyệt)
    const jobInsert = await executeQuery(
      `INSERT INTO JobPostings (EmployerID, CategoryID, Title, Description, Requirements, SalaryRange, Location, Status, CreatedAt)
       OUTPUT INSERTED.JobID, INSERTED.Title, INSERTED.Status, INSERTED.CreatedAt
       VALUES (@EmployerID, @CategoryID, @Title, @Description, @Requirements, @SalaryRange, @Location, 'PendingApproval', GETDATE())`,
      {
        EmployerID: emp.EmployerID,
        CategoryID: categoryId ? parseInt(categoryId, 10) : null,
        Title: title,
        Description: description,
        Requirements: requirements,
        SalaryRange: salaryRange || 'Thỏa thuận',
        Location: location || 'Hà Nội / TP.HCM'
      }
    );

    const newJob = jobInsert.recordset[0];
    const jobId = newJob.JobID;

    // Insert JobSkillRequirements
    if (Array.isArray(skills) && skills.length > 0) {
      for (const skill of skills) {
        const skillId = typeof skill === 'object' ? skill.skillId : skill;
        const isMandatory = typeof skill === 'object' && skill.isMandatory !== undefined ? (skill.isMandatory ? 1 : 0) : 1;

        if (skillId) {
          await executeQuery(
            `INSERT INTO JobSkillRequirements (JobID, SkillID, IsMandatory)
             VALUES (@JobID, @SkillID, @IsMandatory)`,
            {
              JobID: jobId,
              SkillID: skillId,
              IsMandatory: isMandatory
            }
          );
        }
      }
    }

    // Deduct remaining posts if active subscription exists
    await executeQuery(
      `UPDATE EmployerSubscriptions
       SET RemainingPosts = CASE WHEN RemainingPosts > 0 THEN RemainingPosts - 1 ELSE 0 END
       WHERE EmployerID = @EmployerID AND EndDate >= GETDATE()`,
      { EmployerID: emp.EmployerID }
    );

    return res.status(201).json({
      success: true,
      message: 'Đăng tin tuyển dụng thành công! Tin đang chờ Admin kiểm duyệt trước khi xuất bản.',
      data: newJob
    });
  } catch (error) {
    console.error('postJob error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Get single job details for editing (UC-E06)
const getJobDetailsForEdit = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { jobId } = req.params;

    const emp = await getEmployerId(userId);
    if (!emp) {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền truy cập' });
    }

    const jobRes = await executeQuery(
      `SELECT jp.JobID, jp.EmployerID, jp.CategoryID, jp.Title, jp.Description, jp.Requirements,
              jp.SalaryRange, jp.Location, jp.Status, jp.CreatedAt,
              jc.CategoryName
       FROM JobPostings jp
       LEFT JOIN JobCategories jc ON jp.CategoryID = jc.CategoryID
       WHERE jp.JobID = @JobID AND jp.EmployerID = @EmployerID`,
      { JobID: jobId, EmployerID: emp.EmployerID }
    );

    if (!jobRes.recordset || jobRes.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy tin tuyển dụng hoặc bạn không có quyền sửa tin này' });
    }

    const job = jobRes.recordset[0];

    // Fetch required skills
    const skillsRes = await executeQuery(
      `SELECT jsr.SkillID, jsr.IsMandatory, st.SkillName, st.NormalizedName
       FROM JobSkillRequirements jsr
       JOIN SkillTaxonomy st ON jsr.SkillID = st.SkillID
       WHERE jsr.JobID = @JobID`,
      { JobID: jobId }
    );

    job.skills = skillsRes.recordset.map(s => ({
      skillId: s.SkillID,
      skillName: s.SkillName,
      isMandatory: Boolean(s.IsMandatory)
    }));

    return res.json({
      success: true,
      data: job
    });
  } catch (error) {
    console.error('getJobDetailsForEdit error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Update Job Content (UC-E06)
const updateJob = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { jobId } = req.params;
    const { title, categoryId, description, requirements, salaryRange, location, skills } = req.body;

    if (!title || !description || !requirements) {
      return res.status(400).json({ success: false, message: 'Vui lòng điền đầy đủ Tiêu đề, Mô tả và Yêu cầu công việc' });
    }

    const emp = await getEmployerId(userId);
    if (!emp) {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền thao tác' });
    }

    const checkJob = await executeQuery(
      'SELECT JobID FROM JobPostings WHERE JobID = @JobID AND EmployerID = @EmployerID',
      { JobID: jobId, EmployerID: emp.EmployerID }
    );
    if (!checkJob.recordset || checkJob.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy tin tuyển dụng' });
    }

    // Update JobPostings
    await executeQuery(
      `UPDATE JobPostings
       SET Title = @Title,
           CategoryID = @CategoryID,
           Description = @Description,
           Requirements = @Requirements,
           SalaryRange = @SalaryRange,
           Location = @Location
       WHERE JobID = @JobID AND EmployerID = @EmployerID`,
      {
        JobID: jobId,
        EmployerID: emp.EmployerID,
        Title: title,
        CategoryID: categoryId ? parseInt(categoryId, 10) : null,
        Description: description,
        Requirements: requirements,
        SalaryRange: salaryRange || 'Thỏa thuận',
        Location: location || 'Toàn quốc'
      }
    );

    // Refresh JobSkillRequirements
    await executeQuery('DELETE FROM JobSkillRequirements WHERE JobID = @JobID', { JobID: jobId });

    if (Array.isArray(skills) && skills.length > 0) {
      for (const skill of skills) {
        const skillId = typeof skill === 'object' ? skill.skillId : skill;
        const isMandatory = typeof skill === 'object' && skill.isMandatory !== undefined ? (skill.isMandatory ? 1 : 0) : 1;

        if (skillId) {
          await executeQuery(
            `INSERT INTO JobSkillRequirements (JobID, SkillID, IsMandatory)
             VALUES (@JobID, @SkillID, @IsMandatory)`,
            {
              JobID: jobId,
              SkillID: skillId,
              IsMandatory: isMandatory
            }
          );
        }
      }
    }

    return res.json({
      success: true,
      message: 'Cập nhật nội dung tin tuyển dụng thành công!'
    });
  } catch (error) {
    console.error('updateJob error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Update Job Status: Đóng tin (Tạm dừng) / Mở lại (UC-E06)
const updateJobStatus = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { jobId } = req.params;
    const { status } = req.body;

    const validStatuses = ['Published', 'Closed', 'Draft'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Trạng thái tin tuyển dụng không hợp lệ' });
    }

    const emp = await getEmployerId(userId);
    if (!emp) {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền thao tác' });
    }

    const checkJob = await executeQuery(
      'SELECT JobID FROM JobPostings WHERE JobID = @JobID AND EmployerID = @EmployerID',
      { JobID: jobId, EmployerID: emp.EmployerID }
    );
    if (!checkJob.recordset || checkJob.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy tin tuyển dụng' });
    }

    await executeQuery(
      `UPDATE JobPostings SET Status = @Status WHERE JobID = @JobID AND EmployerID = @EmployerID`,
      { JobID: jobId, EmployerID: emp.EmployerID, Status: status }
    );

    const message = status === 'Closed'
      ? 'Đã đóng (tạm dừng) tin tuyển dụng thành công!'
      : 'Đã mở lại tin tuyển dụng thành công!';

    return res.json({
      success: true,
      message,
      data: { jobId, status }
    });
  } catch (error) {
    console.error('updateJobStatus error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Delete Job Posting (UC-E06)
const deleteJob = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { jobId } = req.params;

    const emp = await getEmployerId(userId);
    if (!emp) {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền thao tác' });
    }

    const checkJob = await executeQuery(
      'SELECT JobID, Title FROM JobPostings WHERE JobID = @JobID AND EmployerID = @EmployerID',
      { JobID: jobId, EmployerID: emp.EmployerID }
    );
    if (!checkJob.recordset || checkJob.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy tin tuyển dụng hoặc bạn không có quyền xóa' });
    }

    // Delete related child records cleanly before deleting job
    await executeQuery('DELETE FROM CandidateInvitations WHERE JobID = @JobID', { JobID: jobId });
    await executeQuery('DELETE FROM SavedJobs WHERE JobID = @JobID', { JobID: jobId });
    await executeQuery('DELETE FROM JobSkillRequirements WHERE JobID = @JobID', { JobID: jobId });
    await executeQuery(`
      DELETE FROM Interviews 
      WHERE ApplicationID IN (SELECT ApplicationID FROM JobApplications WHERE JobID = @JobID)
    `, { JobID: jobId });
    await executeQuery('DELETE FROM JobApplications WHERE JobID = @JobID', { JobID: jobId });
    await executeQuery('DELETE FROM JobPostings WHERE JobID = @JobID AND EmployerID = @EmployerID', {
      JobID: jobId,
      EmployerID: emp.EmployerID
    });

    return res.json({
      success: true,
      message: 'Đã xóa tin tuyển dụng thành công!'
    });
  } catch (error) {
    console.error('deleteJob error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Get all jobs posted by current Employer
const getMyJobPostings = async (req, res) => {
  try {
    const userId = req.user.userId;
    const emp = await getEmployerId(userId);
    if (!emp) {
      return res.json({ success: true, data: [] });
    }

    const query = `
      SELECT jp.JobID, jp.Title, jp.SalaryRange, jp.Location, jp.Status, jp.AdminNote, jp.CreatedAt,
             jc.CategoryName,
             (SELECT COUNT(*) FROM JobApplications WHERE JobID = jp.JobID) AS TotalApplicants,
             (SELECT COUNT(*) FROM JobApplications WHERE JobID = jp.JobID AND Status = 'Interviewing') AS TotalInterviewing
      FROM JobPostings jp
      LEFT JOIN JobCategories jc ON jp.CategoryID = jc.CategoryID
      WHERE jp.EmployerID = @EmployerID
      ORDER BY jp.CreatedAt DESC
    `;

    const result = await executeQuery(query, { EmployerID: emp.EmployerID });
    return res.json({
      success: true,
      data: result.recordset
    });
  } catch (error) {
    console.error('getMyJobPostings error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// 4. ATS & INTERVIEW SCHEDULING (UC-E08, UC-E10)
// ==========================================

// ATS - Get Applicants for a specific job sorted by AI MatchScore (UC-E08)
const getJobApplicantsATS = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { jobId } = req.params;

    const emp = await getEmployerId(userId);
    if (!emp) {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền truy cập' });
    }

    const jobCheck = await executeQuery('SELECT JobID, Title FROM JobPostings WHERE JobID = @JobID AND EmployerID = @EmployerID', {
      JobID: jobId,
      EmployerID: emp.EmployerID
    });
    if (!jobCheck.recordset || jobCheck.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy tin tuyển dụng hoặc bạn không sở hữu tin này' });
    }

    const jobInfo = jobCheck.recordset[0];

    const applicantsQuery = `
      SELECT ja.ApplicationID, ja.JobID, ja.ProfileID, ja.CVID, ja.MatchScore, ja.Status, ja.AppliedAt,
             cp.Headline, cp.DesiredSalary, cp.CurrentLocation, cp.Bio,
             u.FullName, u.Email, u.Phone, u.AvatarUrl,
             cv.Title AS CVTitle, cv.FileUrl AS CVFileUrl,
             (
               SELECT TOP 1 iv.InterviewID, iv.InterviewDate, iv.InterviewType, iv.LocationOrLink, iv.Notes
               FROM Interviews iv
               WHERE iv.ApplicationID = ja.ApplicationID
               ORDER BY iv.InterviewID DESC
               FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
             ) AS InterviewJson
      FROM JobApplications ja
      JOIN CandidateProfiles cp ON ja.ProfileID = cp.ProfileID
      JOIN Users u ON cp.UserID = u.UserID
      LEFT JOIN CVs cv ON ja.CVID = cv.CVID
      WHERE ja.JobID = @JobID
      ORDER BY ja.MatchScore DESC, ja.AppliedAt DESC
    `;

    const applicantsRes = await executeQuery(applicantsQuery, { JobID: jobId });

    const applicants = applicantsRes.recordset.map(a => {
      let interview = null;
      try {
        if (a.InterviewJson) interview = JSON.parse(a.InterviewJson);
      } catch (e) {
        interview = null;
      }
      return {
        ...a,
        interview,
        InterviewJson: undefined
      };
    });

    return res.json({
      success: true,
      data: {
        job: jobInfo,
        applicants
      }
    });
  } catch (error) {
    console.error('getJobApplicantsATS error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Update Application Status (Applied, Screening, Interviewing, Offered, Rejected)
const updateApplicationStatus = async (req, res) => {
  try {
    const userId = req.user.userId;
    const emp = await getEmployerId(userId);
    if (!emp) {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền thực hiện thao tác này' });
    }

    const { applicationId } = req.params;
    const { status } = req.body;

    const validStatuses = ['Applied', 'Screening', 'Interviewing', 'Offered', 'Rejected'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Trạng thái tuyển dụng không hợp lệ' });
    }

    // Verify application exists and belongs to a job posted by the authenticated employer
    const checkApp = await executeQuery(
      `SELECT ja.ApplicationID, ja.JobID, jp.EmployerID, ja.Status
       FROM JobApplications ja
       JOIN JobPostings jp ON ja.JobID = jp.JobID
       WHERE ja.ApplicationID = @ApplicationID`,
      { ApplicationID: applicationId }
    );

    if (!checkApp.recordset || checkApp.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn ứng tuyển' });
    }

    if (checkApp.recordset[0].EmployerID !== emp.EmployerID) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền thao tác trên đơn ứng tuyển của doanh nghiệp khác'
      });
    }

    await executeQuery(
      `UPDATE JobApplications
       SET Status = @Status
       WHERE ApplicationID = @ApplicationID`,
      {
        Status: status,
        ApplicationID: applicationId
      }
    );

    return res.json({
      success: true,
      message: `Đã chuyển trạng thái ứng viên sang "${status}"!`
    });
  } catch (error) {
    console.error('updateApplicationStatus error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Schedule Interview & Send Automated Email Notification (UC-E10)
const scheduleInterview = async (req, res) => {
  try {
    const userId = req.user.userId;
    const emp = await getEmployerId(userId);
    if (!emp) {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền thực hiện thao tác này' });
    }

    const { applicationId, interviewDate, interviewType = 'Online', locationOrLink, notes } = req.body;

    if (!applicationId || !interviewDate || !locationOrLink || !locationOrLink.trim()) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp ngày phỏng vấn và địa điểm / link họp' });
    }

    // Parse and validate interviewDate from input (handles ISO string from datetime-local cleanly)
    const parsedDate = new Date(interviewDate);
    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({ success: false, message: 'Định dạng ngày giờ phỏng vấn không hợp lệ' });
    }

    if (parsedDate < new Date()) {
      return res.status(400).json({ success: false, message: 'Thời gian phỏng vấn không thể ở trong quá khứ' });
    }

    // Prevent duplicate interview at the exact same minute for the same application
    const dupCheck = await executeQuery(
      `SELECT TOP 1 InterviewID FROM Interviews 
       WHERE ApplicationID = @ApplicationID 
         AND DATEDIFF(minute, InterviewDate, @InterviewDate) = 0`,
      { ApplicationID: applicationId, InterviewDate: parsedDate }
    );
    if (dupCheck.recordset && dupCheck.recordset.length > 0) {
      return res.status(400).json({ success: false, message: 'Đã có lịch phỏng vấn vào cùng thời điểm này cho ứng viên' });
    }

    // Verify application exists and belongs to a job posted by the authenticated employer
    const appCheck = await executeQuery(
      `SELECT ja.ApplicationID, ja.JobID, ja.Status,
              jp.EmployerID, jp.Title AS JobTitle,
              cp.ProfileID, u.FullName AS CandidateName, u.Email AS CandidateEmail,
              e.CompanyName
       FROM JobApplications ja
       JOIN JobPostings jp ON ja.JobID = jp.JobID
       JOIN Employers e ON jp.EmployerID = e.EmployerID
       JOIN CandidateProfiles cp ON ja.ProfileID = cp.ProfileID
       JOIN Users u ON cp.UserID = u.UserID
       WHERE ja.ApplicationID = @ApplicationID`,
      { ApplicationID: applicationId }
    );

    if (!appCheck.recordset || appCheck.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn ứng tuyển' });
    }

    const appInfo = appCheck.recordset[0];
    // Verify job ownership: jp.EmployerID = emp.EmployerID
    if (appInfo.EmployerID !== emp.EmployerID) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền lên lịch phỏng vấn cho đơn ứng tuyển của doanh nghiệp khác'
      });
    }

    const type = interviewType === 'Offline' ? 'Offline' : 'Online';

    // Insert interview record with properly parsed DATETIME parameter
    const insertRes = await executeQuery(
      `INSERT INTO Interviews (ApplicationID, InterviewDate, InterviewType, LocationOrLink, Notes)
       OUTPUT INSERTED.InterviewID, INSERTED.InterviewDate, INSERTED.InterviewType, INSERTED.LocationOrLink, INSERTED.Notes
       VALUES (@ApplicationID, @InterviewDate, @InterviewType, @LocationOrLink, @Notes)`,
      {
        ApplicationID: applicationId,
        InterviewDate: parsedDate,
        InterviewType: type,
        LocationOrLink: locationOrLink.trim(),
        Notes: notes ? notes.trim() : null
      }
    );

    const interviewData = insertRes.recordset[0];

    // Update application status to 'Interviewing'
    await executeQuery(
      `UPDATE JobApplications SET Status = 'Interviewing' WHERE ApplicationID = @ApplicationID`,
      { ApplicationID: applicationId }
    );

    // Send automated notification email to candidate
    let emailSent = false;
    let emailMessage = '';

    if (appInfo.CandidateEmail) {
      const emailResult = await emailService.sendInterviewEmail({
        toEmail: appInfo.CandidateEmail,
        candidateName: appInfo.CandidateName,
        companyName: appInfo.CompanyName,
        jobTitle: appInfo.JobTitle,
        interviewDate: parsedDate,
        interviewType: type,
        locationOrLink: locationOrLink.trim(),
        notes: notes ? notes.trim() : null
      });
      emailSent = emailResult.success;
      emailMessage = emailResult.success
        ? 'Email thông báo đã được gửi thành công đến ứng viên!'
        : `Lưu ý: Không gửi được email (${emailResult.error || 'chưa cấu hình SMTP'}). Lịch phỏng vấn vẫn được lưu trên hệ thống.`;
    }

    return res.status(201).json({
      success: true,
      message: `Đã lên lịch phỏng vấn thành công! ${emailMessage}`,
      data: interviewData,
      emailSent
    });
  } catch (error) {
    console.error('scheduleInterview error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Get all scheduled interviews for employer
const getScheduledInterviews = async (req, res) => {
  try {
    const userId = req.user.userId;
    const emp = await getEmployerId(userId);
    if (!emp) {
      return res.json({ success: true, data: [] });
    }

    const interviewsRes = await executeQuery(
      `SELECT iv.InterviewID, iv.InterviewDate, iv.InterviewType, iv.LocationOrLink, iv.Notes,
              ja.ApplicationID, ja.MatchScore, ja.Status AS ApplicationStatus,
              jp.JobID, jp.Title AS JobTitle,
              u.FullName AS CandidateName, u.Email AS CandidateEmail, u.Phone AS CandidatePhone, u.AvatarUrl AS CandidateAvatar
       FROM Interviews iv
       JOIN JobApplications ja ON iv.ApplicationID = ja.ApplicationID
       JOIN JobPostings jp ON ja.JobID = jp.JobID
       JOIN CandidateProfiles cp ON ja.ProfileID = cp.ProfileID
       JOIN Users u ON cp.UserID = u.UserID
       WHERE jp.EmployerID = @EmployerID
       ORDER BY iv.InterviewDate ASC`,
      { EmployerID: emp.EmployerID }
    );

    return res.json({
      success: true,
      data: interviewsRes.recordset
    });
  } catch (error) {
    console.error('getScheduledInterviews error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// 5. THANH TOÁN & GÓI DỊCH VỤ (UC-E07)
// ==========================================

// Get available subscription packages
const getSubscriptionPackages = async (req, res) => {
  try {
    const packagesRes = await executeQuery(
      `SELECT PackageID, PackageName, Price, DurationDays, PostLimit, SearchLimit
       FROM SubscriptionPackages
       ORDER BY Price ASC`
    );

    return res.json({
      success: true,
      data: packagesRes.recordset
    });
  } catch (error) {
    console.error('getSubscriptionPackages error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Get current active subscription for employer
const getEmployerSubscription = async (req, res) => {
  try {
    const userId = req.user.userId;
    const emp = await getEmployerId(userId);
    if (!emp) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ nhà tuyển dụng' });
    }

    const subRes = await executeQuery(
      `SELECT TOP 1 es.SubID, es.EmployerID, es.PackageID, es.StartDate, es.EndDate,
              es.RemainingPosts, es.RemainingSearches,
              sp.PackageName, sp.Price, sp.PostLimit, sp.SearchLimit,
              CASE WHEN es.EndDate < GETDATE() THEN 1 ELSE 0 END AS IsExpired
       FROM EmployerSubscriptions es
       JOIN SubscriptionPackages sp ON es.PackageID = sp.PackageID
       WHERE es.EmployerID = @EmployerID
       ORDER BY es.SubID DESC`,
      { EmployerID: emp.EmployerID }
    );

    const subscription = subRes.recordset[0] || null;

    // Tính toán cấp bậc gói cao nhất đã mở khóa (Tier Inheritance)
    // Người mua gói giá cao hơn có thể sử dụng gói đó và tất cả các gói có giá thấp hơn
    let maxUnlockedPrice = 0;
    let unlockedPackageIds = [1]; // Gói Starter (0 VND) luôn mở khóa

    const maxPaidRes = await executeQuery(
      `SELECT COALESCE(MAX(sp.Price), 0) AS MaxPaidPrice
       FROM PaymentTransactions pt
       JOIN SubscriptionPackages sp ON pt.PackageID = sp.PackageID
       WHERE pt.EmployerID = @EmployerID AND pt.Status = 'Success'`,
      { EmployerID: emp.EmployerID }
    );

    const maxPaid = Number(maxPaidRes.recordset[0]?.MaxPaidPrice || 0);
    const currentPrice = subscription && !subscription.IsExpired ? Number(subscription.Price || 0) : 0;
    maxUnlockedPrice = Math.max(maxPaid, currentPrice);

    const unlockedRes = await executeQuery(
      `SELECT PackageID FROM SubscriptionPackages WHERE Price <= @MaxPrice OR PackageID = 1`,
      { MaxPrice: maxUnlockedPrice }
    );

    if (unlockedRes.recordset) {
      unlockedPackageIds = unlockedRes.recordset.map(p => p.PackageID);
    }

    const responseData = subscription
      ? {
          ...subscription,
          maxUnlockedPrice,
          unlockedPackageIds
        }
      : null;

    return res.json({
      success: true,
      data: responseData,
      tierInfo: {
        maxUnlockedPrice,
        unlockedPackageIds
      }
    });
  } catch (error) {
    console.error('getEmployerSubscription error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Create Checkout & Payment URL / QR Code (VNPay Sandbox hoặc MoMo QR) (UC-E07)
const createCheckout = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { packageId, paymentMethod = 'MoMo' } = req.body;

    const emp = await getEmployerId(userId);
    if (!emp) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ nhà tuyển dụng' });
    }

    const packRes = await executeQuery(
      'SELECT PackageID, PackageName, Price, DurationDays, PostLimit, SearchLimit FROM SubscriptionPackages WHERE PackageID = @PackageID',
      { PackageID: packageId }
    );
    if (!packRes.recordset || packRes.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Gói dịch vụ không tồn tại' });
    }

    const pack = packRes.recordset[0];
    const transactionRef = 'PAY' + Date.now() + Math.floor(1000 + Math.random() * 9000);

    // If package is free (Starter 0 VND)
    if (Number(pack.Price) === 0) {
      // Record transaction as Success
      await executeQuery(
        `INSERT INTO PaymentTransactions (TransactionRef, EmployerID, PackageID, Amount, Status, PaymentMethod, GatewayTransactionNo, CreatedAt, PaidAt)
         VALUES (@TransactionRef, @EmployerID, @PackageID, 0, 'Success', 'FreeTrial', 'TRIAL_AUTO', GETDATE(), GETDATE())`,
        {
          TransactionRef: transactionRef,
          EmployerID: emp.EmployerID,
          PackageID: pack.PackageID
        }
      );

      // Create / Extend subscription
      await executeQuery(
        `INSERT INTO EmployerSubscriptions (EmployerID, PackageID, StartDate, EndDate, RemainingPosts, RemainingSearches)
         VALUES (@EmployerID, @PackageID, GETDATE(), DATEADD(day, @DurationDays, GETDATE()), @PostLimit, @SearchLimit)`,
        {
          EmployerID: emp.EmployerID,
          PackageID: pack.PackageID,
          DurationDays: pack.DurationDays,
          PostLimit: pack.PostLimit,
          SearchLimit: pack.SearchLimit
        }
      );

      return res.json({
        success: true,
        directSuccess: true,
        message: `Đã kích hoạt ${pack.PackageName} miễn phí thành công!`,
        transactionRef
      });
    }

    // Insert PaymentTransaction with Pending status
    await executeQuery(
      `INSERT INTO PaymentTransactions (TransactionRef, EmployerID, PackageID, Amount, Status, PaymentMethod, CreatedAt)
       VALUES (@TransactionRef, @EmployerID, @PackageID, @Amount, 'Pending', @PaymentMethod, GETDATE())`,
      {
        TransactionRef: transactionRef,
        EmployerID: emp.EmployerID,
        PackageID: pack.PackageID,
        Amount: pack.Price,
        PaymentMethod: paymentMethod
      }
    );

    const amount = Number(pack.Price);
    const transferMemo = `JOBTIMIZE ${transactionRef}`;

    const bankBin = process.env.BANK_BIN || '970422';
    const bankAccount = process.env.BANK_ACCOUNT_NO || '0387887153';
    const bankName = process.env.BANK_NAME || 'MBBank (Ngân hàng Quân Đội)';
    const accountHolder = process.env.BANK_ACCOUNT_NAME || 'MAI XUAN QUY';

    // VietQR Gateway Generation with dynamic amount and transfer memo
    const qrCodeUrl = `https://img.vietqr.io/image/${bankBin}-${bankAccount}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(transferMemo)}&accountName=${encodeURIComponent(accountHolder)}`;

    // VNPay Sandbox Simulation Gateway URL
    const vnpSandboxUrl = `https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_Amount=${amount * 100}&vnp_Command=pay&vnp_CreateDate=${new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14)}&vnp_CurrCode=VND&vnp_Locale=vn&vnp_OrderInfo=${encodeURIComponent(`Thanh toan ${pack.PackageName} Jobtimize`)}&vnp_OrderType=other&vnp_ReturnUrl=${encodeURIComponent('http://localhost:3000/employer/pricing?txn=' + transactionRef)}&vnp_TmnCode=JOBTIMIZE&vnp_TxnRef=${transactionRef}&vnp_Version=2.1.0`;

    return res.json({
      success: true,
      data: {
        transactionRef,
        packageId: pack.PackageID,
        packageName: pack.PackageName,
        amount,
        paymentMethod,
        qrCodeUrl,
        fallbackQrUrl: '/qr-bank.png',
        vnpSandboxUrl,
        bankInfo: {
          bankName,
          accountNumber: bankAccount,
          accountHolder,
          memo: transferMemo
        }
      }
    });
  } catch (error) {
    console.error('createCheckout error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Confirm Payment (Callback / Webhook / Instant verification) (UC-E07)
const confirmPayment = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { transactionRef, gatewayTransactionNo } = req.body;

    if (!transactionRef) {
      return res.status(400).json({ success: false, message: 'Thiếu mã tham chiếu giao dịch (transactionRef)' });
    }

    const emp = await getEmployerId(userId);
    if (!emp) {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền thao tác' });
    }

    const txnRes = await executeQuery(
      `SELECT pt.PaymentID, pt.TransactionRef, pt.EmployerID, pt.PackageID, pt.Amount, pt.Status, pt.PaymentMethod,
              sp.PackageName, sp.DurationDays, sp.PostLimit, sp.SearchLimit
       FROM PaymentTransactions pt
       JOIN SubscriptionPackages sp ON pt.PackageID = sp.PackageID
       WHERE pt.TransactionRef = @TransactionRef AND pt.EmployerID = @EmployerID`,
      { TransactionRef: transactionRef, EmployerID: emp.EmployerID }
    );

    if (!txnRes.recordset || txnRes.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy thông tin giao dịch' });
    }

    const txn = txnRes.recordset[0];

    if (txn.Status === 'Success') {
      return res.json({
        success: true,
        message: 'Giao dịch này đã được xác nhận thanh toán trước đó!',
        data: txn
      });
    }

    // SECURITY ENFORCEMENT (UC-E07): Client request alone CANNOT mark transaction as 'Success'
    // or activate packages/quotas. Real gateway signature verification or Admin verification is required.

    const receiptUrl = req.file ? `/uploads/receipts/${req.file.filename}` : (req.body.receiptUrl || null);
    const receiptNote = req.body.note || req.body.receiptNote || null;

    if (receiptUrl || receiptNote || gatewayTransactionNo) {
      await executeQuery(
        `UPDATE PaymentTransactions 
         SET ReceiptUrl = COALESCE(@ReceiptUrl, ReceiptUrl),
             ReceiptNote = COALESCE(@ReceiptNote, ReceiptNote),
             GatewayTransactionNo = COALESCE(@GatewayTransactionNo, GatewayTransactionNo)
         WHERE TransactionRef = @TransactionRef AND EmployerID = @EmployerID`,
        {
          ReceiptUrl: receiptUrl,
          ReceiptNote: receiptNote,
          GatewayTransactionNo: gatewayTransactionNo || null,
          TransactionRef: transactionRef,
          EmployerID: emp.EmployerID
        }
      );
    }

    // Gửi email tiếp nhận đơn hàng cho nhà tuyển dụng (Cơ chế bán tự động)
    const empUserRes = await executeQuery(
      `SELECT e.CompanyName, u.Email, u.FullName
       FROM Employers e
       JOIN Users u ON e.UserID = u.UserID
       WHERE e.EmployerID = @EmployerID`,
      { EmployerID: emp.EmployerID }
    );
    if (empUserRes.recordset && empUserRes.recordset.length > 0) {
      const empUser = empUserRes.recordset[0];
      await emailService.sendPaymentPendingEmail({
        toEmail: empUser.Email,
        companyName: empUser.CompanyName || empUser.FullName || 'Quý Doanh Nghiệp',
        packageName: txn.PackageName,
        amount: txn.Amount,
        transactionRef: txn.TransactionRef
      });
    }

    return res.status(200).json({
      success: true,
      pendingVerification: true,
      message: 'Yêu cầu thanh toán của bạn đã được gửi thành công! Hệ thống đang đối soát và sẽ kích hoạt gói trong ít phút.',
      data: {
        transactionRef: txn.TransactionRef,
        status: txn.Status, // Keeps 'Pending'
        amount: txn.Amount,
        packageName: txn.PackageName
      }
    });
  } catch (error) {
    console.error('confirmPayment error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Payment History
const getPaymentHistory = async (req, res) => {
  try {
    const userId = req.user.userId;
    const emp = await getEmployerId(userId);
    if (!emp) {
      return res.json({ success: true, data: [] });
    }

    const historyRes = await executeQuery(
      `SELECT pt.PaymentID, pt.TransactionRef, pt.Amount, pt.Status, pt.PaymentMethod,
              pt.GatewayTransactionNo, pt.CreatedAt, pt.PaidAt,
              sp.PackageName
       FROM PaymentTransactions pt
       JOIN SubscriptionPackages sp ON pt.PackageID = sp.PackageID
       WHERE pt.EmployerID = @EmployerID
       ORDER BY pt.CreatedAt DESC`,
      { EmployerID: emp.EmployerID }
    );

    return res.json({
      success: true,
      data: historyRes.recordset
    });
  } catch (error) {
    console.error('getPaymentHistory error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ========================================================
// 6. SĂN HỒ SƠ THỤ ĐỘNG & MỜI ỨNG TUYỂN (UC-E11 & UC-E12)
// ========================================================

// Search Talent Pool (Kho CV Ứng viên đang bật tìm việc) (UC-E11)
const searchCandidates = async (req, res) => {
  try {
    const { keyword, skill, location, salaryRange } = req.query;

    let query = `
      SELECT cp.ProfileID, cp.Headline, cp.Bio, cp.DesiredSalary, cp.CurrentLocation, cp.IsLookingForJob,
             u.UserID, u.FullName, u.Email, u.Phone, u.AvatarUrl,
             cv.CVID AS PrimaryCVID, cv.Title AS CVTitle, cv.FileUrl AS CVFileUrl
      FROM CandidateProfiles cp
      JOIN Users u ON cp.UserID = u.UserID
      LEFT JOIN CVs cv ON cp.ProfileID = cv.ProfileID AND cv.IsPrimary = 1
      WHERE cp.IsLookingForJob = 1
    `;

    const params = {};

    if (keyword && keyword.trim()) {
      query += ` AND (u.FullName LIKE '%' + @Keyword + '%' OR cp.Headline LIKE '%' + @Keyword + '%' OR cp.Bio LIKE '%' + @Keyword + '%')`;
      params.Keyword = keyword.trim();
    }

    if (location && location.trim()) {
      query += ` AND cp.CurrentLocation LIKE '%' + @Location + '%'`;
      params.Location = location.trim();
    }

    if (salaryRange) {
      if (salaryRange === 'under15') {
        query += ` AND cp.DesiredSalary <= 15000000`;
      } else if (salaryRange === '15to25') {
        query += ` AND cp.DesiredSalary > 15000000 AND cp.DesiredSalary <= 25000000`;
      } else if (salaryRange === '25to40') {
        query += ` AND cp.DesiredSalary > 25000000 AND cp.DesiredSalary <= 40000000`;
      } else if (salaryRange === 'over40') {
        query += ` AND cp.DesiredSalary > 40000000`;
      }
    }

    query += ` ORDER BY cp.ProfileID DESC`;

    const candidatesRes = await executeQuery(query, params);

    // Parse candidate skills from Bio JSON
    let candidates = candidatesRes.recordset.map(c => {
      let hardSkills = [];
      let softSkills = [];
      let bioText = '';
      try {
        if (c.Bio) {
          const parsed = JSON.parse(c.Bio);
          hardSkills = parsed.skills?.hardSkills || [];
          softSkills = parsed.skills?.softSkills || [];
          bioText = parsed.bioText || parsed.bio || '';
        }
      } catch (e) {
        bioText = c.Bio || '';
      }

      return {
        ...c,
        bioText,
        skills: { hardSkills, softSkills }
      };
    });

    // If skill query provided, filter candidates whose skills include the search term
    if (skill && skill.trim()) {
      const lowerSkill = skill.trim().toLowerCase();
      candidates = candidates.filter(c => {
        const inHard = c.skills.hardSkills.some(s => s.toLowerCase().includes(lowerSkill));
        const inHeadline = (c.Headline || '').toLowerCase().includes(lowerSkill);
        const inBio = (c.bioText || '').toLowerCase().includes(lowerSkill);
        return inHard || inHeadline || inBio;
      });
    }

    // Fetch remaining searches quota for employer if active (UC-E07, UC-E11)
    let remainingSearches = null;
    try {
      const userId = req.user?.userId;
      if (userId) {
        const emp = await getEmployerId(userId);
        if (emp) {
          const subRes = await executeQuery(
            `SELECT TOP 1 RemainingSearches FROM EmployerSubscriptions
             WHERE EmployerID = @EmployerID AND EndDate >= GETDATE()
             ORDER BY EndDate DESC`,
            { EmployerID: emp.EmployerID }
          );
          if (subRes.recordset && subRes.recordset.length > 0) {
            remainingSearches = subRes.recordset[0].RemainingSearches;
          }
        }
      }
    } catch (e) {
      // Non-blocking
    }

    return res.json({
      success: true,
      data: candidates,
      meta: {
        total: candidates.length,
        remainingSearches
      }
    });
  } catch (error) {
    console.error('searchCandidates error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Send Direct Invitation to Candidate (UC-E12)
const inviteCandidate = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { profileId, jobId, message } = req.body;

    if (!profileId || !jobId) {
      return res.status(400).json({ success: false, message: 'Vui lòng chọn ứng viên và vị trí công việc cần mời' });
    }

    const emp = await getEmployerId(userId);
    if (!emp) {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền thao tác' });
    }

    // Verify job belongs to employer and is currently Published
    const jobCheck = await executeQuery(
      'SELECT JobID, Title, Status FROM JobPostings WHERE JobID = @JobID AND EmployerID = @EmployerID',
      { JobID: jobId, EmployerID: emp.EmployerID }
    );
    if (!jobCheck.recordset || jobCheck.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Tin tuyển dụng không tồn tại hoặc bạn không sở hữu tin này' });
    }
    const job = jobCheck.recordset[0];
    if (job.Status !== 'Published') {
      return res.status(400).json({ success: false, message: 'Chỉ có thể mời ứng viên vào tin tuyển dụng đang mở (Published)' });
    }
    const jobTitle = job.Title;

    // Verify candidate exists and is looking for job (UC-E11, UC-E12)
    const candCheck = await executeQuery(
      `SELECT cp.ProfileID, cp.IsLookingForJob, u.FullName, u.Email
       FROM CandidateProfiles cp
       JOIN Users u ON cp.UserID = u.UserID
       WHERE cp.ProfileID = @ProfileID`,
      { ProfileID: profileId }
    );
    if (!candCheck.recordset || candCheck.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ ứng viên' });
    }
    const candidate = candCheck.recordset[0];

    if (!candidate.IsLookingForJob) {
      return res.status(400).json({
        success: false,
        message: 'Ứng viên này hiện đã tắt chế độ tìm việc và không nhận lời mời mới.'
      });
    }

    // Check quota if employer has an active subscription (UC-E07, UC-E12)
    const activeSubRes = await executeQuery(
      `SELECT TOP 1 SubID, RemainingSearches, EndDate
       FROM EmployerSubscriptions
       WHERE EmployerID = @EmployerID AND EndDate >= GETDATE()
       ORDER BY EndDate DESC`,
      { EmployerID: emp.EmployerID }
    );

    if (activeSubRes.recordset && activeSubRes.recordset.length > 0) {
      const activeSub = activeSubRes.recordset[0];
      if (activeSub.RemainingSearches <= 0) {
        return res.status(403).json({
          success: false,
          message: 'Bạn đã sử dụng hết số lượt mời ứng viên trong gói dịch vụ hiện tại. Vui lòng mua thêm hoặc nâng cấp gói để tiếp tục gửi lời mời.'
        });
      }
    }

    // Check if already invited for this job
    const existingInv = await executeQuery(
      'SELECT InvitationID FROM CandidateInvitations WHERE ProfileID = @ProfileID AND JobID = @JobID',
      { ProfileID: profileId, JobID: jobId }
    );
    if (existingInv.recordset && existingInv.recordset.length > 0) {
      return res.status(400).json({ success: false, message: 'Bạn đã gửi lời mời ứng tuyển vị trí này tới ứng viên rồi!' });
    }

    // Insert CandidateInvitations
    await executeQuery(
      `INSERT INTO CandidateInvitations (EmployerID, ProfileID, JobID, Message, Status, SentAt)
       VALUES (@EmployerID, @ProfileID, @JobID, @Message, 'Sent', GETDATE())`,
      {
        EmployerID: emp.EmployerID,
        ProfileID: profileId,
        JobID: jobId,
        Message: message ? message.trim() : `Chúng tôi nhận thấy hồ sơ của bạn rất phù hợp với vị trí ${jobTitle} và trân trọng mời bạn ứng tuyển!`
      }
    );

    // Deduct remaining searches safely if active subscription exists
    if (activeSubRes.recordset && activeSubRes.recordset.length > 0) {
      await executeQuery(
        `UPDATE EmployerSubscriptions
         SET RemainingSearches = RemainingSearches - 1
         WHERE SubID = @SubID AND RemainingSearches > 0`,
        { SubID: activeSubRes.recordset[0].SubID }
      );
    }

    // Send invitation email
    const emailRes = await emailService.sendInvitationEmail({
      toEmail: candidate.Email,
      candidateName: candidate.FullName,
      companyName: emp.CompanyName,
      jobTitle,
      message
    });

    const emailNote = emailRes.success
      ? 'Hệ thống đã tự động gửi email thông báo trực tiếp đến hòm thư của ứng viên.'
      : 'Lời mời đã được ghi nhận vào hệ thống của ứng viên.';

    return res.status(201).json({
      success: true,
      message: `Đã gửi lời mời ứng tuyển thành công tới ${candidate.FullName}! ${emailNote}`,
      emailSent: emailRes.success
    });
  } catch (error) {
    console.error('inviteCandidate error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Get sent invitations list
const getCandidateInvitations = async (req, res) => {
  try {
    const userId = req.user.userId;
    const emp = await getEmployerId(userId);
    if (!emp) {
      return res.json({ success: true, data: [] });
    }

    const invRes = await executeQuery(
      `SELECT ci.InvitationID, ci.Message, ci.Status, ci.SentAt,
              jp.JobID, jp.Title AS JobTitle,
              u.FullName AS CandidateName, u.Email AS CandidateEmail, u.AvatarUrl AS CandidateAvatar,
              cp.ProfileID, cp.Headline
       FROM CandidateInvitations ci
       JOIN JobPostings jp ON ci.JobID = jp.JobID
       JOIN CandidateProfiles cp ON ci.ProfileID = cp.ProfileID
       JOIN Users u ON cp.UserID = u.UserID
       WHERE ci.EmployerID = @EmployerID
       ORDER BY ci.SentAt DESC`,
      { EmployerID: emp.EmployerID }
    );

    return res.json({
      success: true,
      data: invRes.recordset
    });
  } catch (error) {
    console.error('getCandidateInvitations error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};


// Switch active package between unlocked / purchased packages
const switchSubscriptionPackage = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { packageId } = req.body;

    if (!packageId) {
      return res.status(400).json({ success: false, message: 'Vui lòng chọn gói muốn chuyển đổi.' });
    }

    const emp = await getEmployerId(userId);
    if (!emp) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ nhà tuyển dụng' });
    }

    // Get current active subscription
    const subRes = await executeQuery(
      `SELECT TOP 1 es.SubID, es.PackageID, es.EndDate
       FROM EmployerSubscriptions es
       WHERE es.EmployerID = @EmployerID
       ORDER BY es.SubID DESC`,
      { EmployerID: emp.EmployerID }
    );

    if (!subRes.recordset || subRes.recordset.length === 0) {
      return res.status(400).json({ success: false, message: 'Bạn chưa có gói đăng ký nào đang hoạt động.' });
    }

    const currentSub = subRes.recordset[0];
    if (new Date(currentSub.EndDate) < new Date()) {
      return res.status(400).json({ success: false, message: 'Gói đăng ký của bạn đã hết hạn. Vui lòng gia hạn gói để tiếp tục sử dụng.' });
    }

    // Target package details
    const targetPackRes = await executeQuery(
      `SELECT PackageID, PackageName, Price FROM SubscriptionPackages WHERE PackageID = @PackageID`,
      { PackageID: Number(packageId) }
    );

    if (!targetPackRes.recordset || targetPackRes.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Gói dịch vụ không tồn tại.' });
    }

    const targetPack = targetPackRes.recordset[0];

    // Check maximum unlocked tier
    const maxPaidRes = await executeQuery(
      `SELECT COALESCE(MAX(sp.Price), 0) AS MaxPaidPrice
       FROM PaymentTransactions pt
       JOIN SubscriptionPackages sp ON pt.PackageID = sp.PackageID
       WHERE pt.EmployerID = @EmployerID AND pt.Status = 'Success'`,
      { EmployerID: emp.EmployerID }
    );

    const currentPackRes = await executeQuery(
      `SELECT Price FROM SubscriptionPackages WHERE PackageID = @PackageID`,
      { PackageID: currentSub.PackageID }
    );

    const maxUnlockedPrice = Math.max(
      Number(maxPaidRes.recordset[0]?.MaxPaidPrice || 0),
      Number(currentPackRes.recordset[0]?.Price || 0)
    );

    if (Number(targetPack.Price) > maxUnlockedPrice && targetPack.PackageID !== 1) {
      return res.status(403).json({
        success: false,
        message: `Bạn chưa sở hữu ${targetPack.PackageName}. Vui lòng mua hoặc nâng cấp gói để sử dụng.`
      });
    }

    // Update active package in EmployerSubscriptions
    await executeQuery(
      `UPDATE EmployerSubscriptions
       SET PackageID = @PackageID
       WHERE SubID = @SubID`,
      {
        PackageID: targetPack.PackageID,
        SubID: currentSub.SubID
      }
    );

    return res.json({
      success: true,
      message: `Đã chuyển sang sử dụng ${targetPack.PackageName} thành công!`,
      data: {
        packageId: targetPack.PackageID,
        packageName: targetPack.PackageName
      }
    });
  } catch (error) {
    console.error('switchSubscriptionPackage error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  // Profile
  getEmployerProfile,
  updateEmployerProfile,

  // KYC (UC-E04)
  submitKYC,
  getKYCStatus,

  // Jobs (UC-E05, UC-E06)
  postJob,
  getJobDetailsForEdit,
  updateJob,
  updateJobStatus,
  deleteJob,
  getMyJobPostings,

  // ATS & Interviews (UC-E08, UC-E10)
  getJobApplicantsATS,
  updateApplicationStatus,
  scheduleInterview,
  getScheduledInterviews,

  // Subscription & Payments (UC-E07)
  getSubscriptionPackages,
  getEmployerSubscription,
  switchSubscriptionPackage,
  createCheckout,
  confirmPayment,
  getPaymentHistory,

  // Passive Talent Hunt & Invitations (UC-E11 & UC-E12)
  searchCandidates,
  inviteCandidate,
  getCandidateInvitations
};
