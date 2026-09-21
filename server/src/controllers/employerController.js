const { executeQuery } = require('../config/db');

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

// Post New Job (UC-E05)
const postJob = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { title, categoryId, description, requirements, salaryRange, location, skills } = req.body;

    if (!title || !description || !requirements) {
      return res.status(400).json({ success: false, message: 'Vui lòng điền đầy đủ Tiêu đề, Mô tả và Yêu cầu công việc' });
    }

    const empRes = await executeQuery('SELECT EmployerID FROM Employers WHERE UserID = @UserID', { UserID: userId });
    if (!empRes.recordset || empRes.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ nhà tuyển dụng' });
    }
    const employerId = empRes.recordset[0].EmployerID;

    // Insert JobPosting
    const jobInsert = await executeQuery(
      `INSERT INTO JobPostings (EmployerID, CategoryID, Title, Description, Requirements, SalaryRange, Location, Status, CreatedAt)
       OUTPUT INSERTED.JobID, INSERTED.Title, INSERTED.Status, INSERTED.CreatedAt
       VALUES (@EmployerID, @CategoryID, @Title, @Description, @Requirements, @SalaryRange, @Location, 'Published', GETDATE())`,
      {
        EmployerID: employerId,
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

    // Insert JobSkillRequirements if provided
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

    return res.status(201).json({
      success: true,
      message: 'Đăng tin tuyển dụng thành công!',
      data: newJob
    });
  } catch (error) {
    console.error('postJob error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Get all jobs posted by current Employer
const getMyJobPostings = async (req, res) => {
  try {
    const userId = req.user.userId;
    const empRes = await executeQuery('SELECT EmployerID FROM Employers WHERE UserID = @UserID', { UserID: userId });
    if (!empRes.recordset || empRes.recordset.length === 0) {
      return res.json({ success: true, data: [] });
    }
    const employerId = empRes.recordset[0].EmployerID;

    const query = `
      SELECT jp.JobID, jp.Title, jp.SalaryRange, jp.Location, jp.Status, jp.CreatedAt,
             jc.CategoryName,
             (SELECT COUNT(*) FROM JobApplications WHERE JobID = jp.JobID) AS TotalApplicants,
             (SELECT COUNT(*) FROM JobApplications WHERE JobID = jp.JobID AND Status = 'Interviewing') AS TotalInterviewing
      FROM JobPostings jp
      LEFT JOIN JobCategories jc ON jp.CategoryID = jc.CategoryID
      WHERE jp.EmployerID = @EmployerID
      ORDER BY jp.CreatedAt DESC
    `;

    const result = await executeQuery(query, { EmployerID: employerId });
    return res.json({
      success: true,
      data: result.recordset
    });
  } catch (error) {
    console.error('getMyJobPostings error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ATS - Get Applicants for a specific job sorted by AI MatchScore (UC-E08)
const getJobApplicantsATS = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { jobId } = req.params;

    // Verify ownership
    const empRes = await executeQuery('SELECT EmployerID FROM Employers WHERE UserID = @UserID', { UserID: userId });
    if (!empRes.recordset || empRes.recordset.length === 0) {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền truy cập' });
    }
    const employerId = empRes.recordset[0].EmployerID;

    const jobCheck = await executeQuery('SELECT JobID, Title FROM JobPostings WHERE JobID = @JobID AND EmployerID = @EmployerID', {
      JobID: jobId,
      EmployerID: employerId
    });
    if (!jobCheck.recordset || jobCheck.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy tin tuyển dụng hoặc bạn không sở hữu tin này' });
    }

    const jobInfo = jobCheck.recordset[0];

    const applicantsQuery = `
      SELECT ja.ApplicationID, ja.JobID, ja.ProfileID, ja.CVID, ja.MatchScore, ja.Status, ja.AppliedAt,
             cp.Headline, cp.DesiredSalary, cp.CurrentLocation, cp.Bio,
             u.FullName, u.Email, u.Phone, u.AvatarUrl,
             cv.Title AS CVTitle, cv.FileUrl AS CVFileUrl
      FROM JobApplications ja
      JOIN CandidateProfiles cp ON ja.ProfileID = cp.ProfileID
      JOIN Users u ON cp.UserID = u.UserID
      LEFT JOIN CVs cv ON ja.CVID = cv.CVID
      WHERE ja.JobID = @JobID
      ORDER BY ja.MatchScore DESC, ja.AppliedAt DESC
    `;

    const applicantsRes = await executeQuery(applicantsQuery, { JobID: jobId });

    return res.json({
      success: true,
      data: {
        job: jobInfo,
        applicants: applicantsRes.recordset
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
    const { applicationId } = req.params;
    const { status } = req.body;

    const validStatuses = ['Applied', 'Screening', 'Interviewing', 'Offered', 'Rejected'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Trạng thái tuyển dụng không hợp lệ' });
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

// Schedule Interview (UC-E10)
const scheduleInterview = async (req, res) => {
  try {
    const { applicationId, interviewDate, locationOrLink, notes } = req.body;

    if (!applicationId || !interviewDate || !locationOrLink) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp ngày phỏng vấn và địa điểm / link họp' });
    }

    const insertRes = await executeQuery(
      `INSERT INTO Interviews (ApplicationID, InterviewDate, LocationOrLink, Notes)
       OUTPUT INSERTED.InterviewID, INSERTED.InterviewDate, INSERTED.LocationOrLink
       VALUES (@ApplicationID, @InterviewDate, @LocationOrLink, @Notes)`,
      {
        ApplicationID: applicationId,
        InterviewDate: interviewDate,
        LocationOrLink: locationOrLink,
        Notes: notes || null
      }
    );

    // Also update application status to 'Interviewing'
    await executeQuery(
      `UPDATE JobApplications SET Status = 'Interviewing' WHERE ApplicationID = @ApplicationID`,
      { ApplicationID: applicationId }
    );

    return res.status(201).json({
      success: true,
      message: 'Đã lên lịch phỏng vấn và gửi thông báo tới ứng viên!',
      data: insertRes.recordset[0]
    });
  } catch (error) {
    console.error('scheduleInterview error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getEmployerProfile,
  updateEmployerProfile,
  postJob,
  getMyJobPostings,
  getJobApplicantsATS,
  updateApplicationStatus,
  scheduleInterview
};
