const { executeQuery } = require('../config/db');
const { withTransaction } = require('../services/notificationStore');
const fs = require('fs');
const path = require('path');

let cvColumnsVerified = false;
const ensureCVTableColumns = async () => {
  if (cvColumnsVerified) return;
  try {
    await executeQuery(`
      IF COL_LENGTH('CVs', 'CvType') IS NULL
          ALTER TABLE CVs ADD CvType NVARCHAR(20) DEFAULT 'Upload' WITH VALUES;
      IF COL_LENGTH('CVs', 'CvData') IS NULL
          ALTER TABLE CVs ADD CvData NVARCHAR(MAX) NULL;
      IF COL_LENGTH('CVs', 'Template') IS NULL
          ALTER TABLE CVs ADD Template NVARCHAR(50) DEFAULT 'modern' WITH VALUES;
      IF COL_LENGTH('CVs', 'UpdatedAt') IS NULL
          ALTER TABLE CVs ADD UpdatedAt DATETIME DEFAULT GETDATE() WITH VALUES;
    `);
    cvColumnsVerified = true;
  } catch (err) {
    console.warn('ensureCVTableColumns warning:', err.message);
  }
};

// Get candidate profile
const getCandidateProfile = async (req, res) => {
  try {
    await ensureCVTableColumns();
    const userId = req.user.userId;

    const candRes = await executeQuery(
      `SELECT cp.ProfileID, cp.UserID, cp.Headline, cp.Bio, cp.DesiredSalary, cp.CurrentLocation, cp.IsLookingForJob,
              u.FullName, u.Email, u.Phone, u.AvatarUrl
       FROM CandidateProfiles cp
       JOIN Users u ON cp.UserID = u.UserID
       WHERE cp.UserID = @UserID`,
      { UserID: userId }
    );

    if (!candRes.recordset || candRes.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Chưa có hồ sơ ứng viên' });
    }

    const profile = candRes.recordset[0];

    // Fetch CVs
    const cvsRes = await executeQuery(
      `SELECT CVID, Title, FileUrl, CvType, CvData, Template, IsPrimary, CreatedAt, UpdatedAt 
       FROM CVs 
       WHERE ProfileID = @ProfileID 
       ORDER BY IsPrimary DESC, CreatedAt DESC`,
      { ProfileID: profile.ProfileID }
    );

    profile.cvs = cvsRes.recordset;

    return res.json({
      success: true,
      data: profile
    });
  } catch (error) {
    console.error('getCandidateProfile error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Update Candidate Profile (UC-C03)
const updateCandidateProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { headline, bio, desiredSalary, currentLocation, fullName, phone, avatarUrl } = req.body;

    // Update Users table
    await executeQuery(
      `UPDATE Users
       SET FullName = COALESCE(@FullName, FullName),
           Phone = COALESCE(@Phone, Phone),
           AvatarUrl = COALESCE(@AvatarUrl, AvatarUrl),
           UpdatedAt = GETDATE()
       WHERE UserID = @UserID`,
      {
        UserID: userId,
        FullName: fullName || null,
        Phone: phone || null,
        AvatarUrl: avatarUrl || null
      }
    );

    // Update CandidateProfiles table
    await executeQuery(
      `UPDATE CandidateProfiles
       SET Headline = COALESCE(@Headline, Headline),
           Bio = COALESCE(@Bio, Bio),
           DesiredSalary = COALESCE(@DesiredSalary, DesiredSalary),
           CurrentLocation = COALESCE(@CurrentLocation, CurrentLocation)
       WHERE UserID = @UserID`,
      {
        UserID: userId,
        Headline: headline || null,
        Bio: bio || null,
        DesiredSalary: desiredSalary || null,
        CurrentLocation: currentLocation || null
      }
    );

    return res.json({
      success: true,
      message: 'Cập nhật hồ sơ thành công!'
    });
  } catch (error) {
    console.error('updateCandidateProfile error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Toggle IsLookingForJob (UC-C04)
const toggleLookingForJob = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { isLookingForJob } = req.body;

    await executeQuery(
      `UPDATE CandidateProfiles
       SET IsLookingForJob = @IsLookingForJob
       WHERE UserID = @UserID`,
      {
        UserID: userId,
        IsLookingForJob: isLookingForJob ? 1 : 0
      }
    );

    return res.json({
      success: true,
      message: isLookingForJob ? 'Đã bật trạng thái Đang tìm việc' : 'Đã tắt trạng thái tìm việc',
      isLookingForJob: !!isLookingForJob
    });
  } catch (error) {
    console.error('toggleLookingForJob error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Upload CV (UC-C05)
const uploadCV = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { title } = req.body;

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Vui lòng chọn file CV để tải lên' });
    }

    const candRes = await executeQuery('SELECT ProfileID FROM CandidateProfiles WHERE UserID = @UserID', { UserID: userId });
    if (!candRes.recordset || candRes.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ ứng viên' });
    }
    const profileId = candRes.recordset[0].ProfileID;

    // Check if first CV, make it primary
    const existingCvs = await executeQuery('SELECT COUNT(*) AS Total FROM CVs WHERE ProfileID = @ProfileID', { ProfileID: profileId });
    const isFirst = existingCvs.recordset[0].Total === 0;

    const fileUrl = `/uploads/${req.file.filename}`;
    const cvTitle = title || req.file.originalname.replace(/\.[^/.]+$/, '');

    const insertRes = await executeQuery(
      `INSERT INTO CVs (ProfileID, Title, FileUrl, IsPrimary, CreatedAt)
       OUTPUT INSERTED.CVID, INSERTED.Title, INSERTED.FileUrl, INSERTED.IsPrimary, INSERTED.CreatedAt
       VALUES (@ProfileID, @Title, @FileUrl, @IsPrimary, GETDATE())`,
      {
        ProfileID: profileId,
        Title: cvTitle,
        FileUrl: fileUrl,
        IsPrimary: isFirst ? 1 : 0
      }
    );

    return res.status(201).json({
      success: true,
      message: 'Tải lên CV thành công!',
      data: insertRes.recordset[0]
    });
  } catch (error) {
    console.error('uploadCV error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Set Primary CV (UC-C06)
const setPrimaryCV = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { cvId } = req.params;

    const candRes = await executeQuery('SELECT ProfileID FROM CandidateProfiles WHERE UserID = @UserID', { UserID: userId });
    if (!candRes.recordset || candRes.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ' });
    }
    const profileId = candRes.recordset[0].ProfileID;

    await withTransaction(async query => {
      await query('SELECT ProfileID FROM CandidateProfiles WITH(UPDLOCK,HOLDLOCK) WHERE ProfileID=@ProfileID', { ProfileID: profileId });
      const target = await query('SELECT CVID FROM CVs WITH(UPDLOCK,HOLDLOCK) WHERE CVID=@CVID AND ProfileID=@ProfileID', { CVID: cvId, ProfileID: profileId });
      if (!target.recordset.length) throw Object.assign(new Error('Không tìm thấy CV của bạn.'), { status: 404 });
      await query('UPDATE CVs SET IsPrimary = CASE WHEN CVID=@CVID THEN 1 ELSE 0 END WHERE ProfileID=@ProfileID', { CVID: cvId, ProfileID: profileId });
    });

    return res.json({
      success: true,
      message: 'Đã đặt làm CV chính mặc định!'
    });
  } catch (error) {
    console.error('setPrimaryCV error:', error);
    return res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

// Delete CV
const deleteCV = async (req, res) => {
  try {
    const userId = req.user.userId;
    const cvId = parseInt(req.params.cvId, 10);
    if (isNaN(cvId)) {
      return res.status(400).json({ success: false, message: 'ID bản CV không hợp lệ' });
    }

    const candRes = await executeQuery('SELECT ProfileID FROM CandidateProfiles WHERE UserID = @UserID', { UserID: userId });
    if (!candRes.recordset || candRes.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ' });
    }
    const profileId = candRes.recordset[0].ProfileID;

    const cvRes = await executeQuery('SELECT CVID, FileUrl, IsPrimary FROM CVs WHERE CVID = @CVID AND ProfileID = @ProfileID', {
      CVID: cvId,
      ProfileID: profileId
    });

    if (!cvRes.recordset || cvRes.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy bản CV để xóa' });
    }

    const cvToDelete = cvRes.recordset[0];

    // Unlink any JobApplications referencing this CV so foreign key constraint never blocks deletion
    try {
      await executeQuery('UPDATE JobApplications SET CVID = NULL WHERE CVID = @CVID', { CVID: cvId });
    } catch (fkErr) {
      console.warn('Unlink JobApplications CVID warning:', fkErr.message);
    }

    // Remove physical file only if it is an uploaded file under /uploads/
    if (cvToDelete.FileUrl && cvToDelete.FileUrl.startsWith('/uploads/')) {
      const filePath = path.join(__dirname, '../../', cvToDelete.FileUrl);
      if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch (e) { console.error(e); }
      }
    }

    await executeQuery('DELETE FROM CVs WHERE CVID = @CVID AND ProfileID = @ProfileID', {
      CVID: cvId,
      ProfileID: profileId
    });

    // If the deleted CV was primary, promote the newest remaining CV (if any) to primary
    if (cvToDelete.IsPrimary) {
      await executeQuery(`
        UPDATE CVs
        SET IsPrimary = 1
        WHERE CVID = (
          SELECT TOP 1 CVID FROM CVs WHERE ProfileID = @ProfileID ORDER BY CreatedAt DESC, CVID DESC
        )
      `, { ProfileID: profileId });
    }

    return res.json({
      success: true,
      message: 'Đã xóa CV thành công!'
    });
  } catch (error) {
    console.error('deleteCV error:', error);
    return res.status(500).json({ success: false, message: 'Không thể xóa CV: ' + error.message });
  }
};

// Get My Applications (UC-C14)
const getMyApplications = async (req, res) => {
  try {
    const userId = req.user.userId;
    const candRes = await executeQuery('SELECT ProfileID FROM CandidateProfiles WHERE UserID = @UserID', { UserID: userId });
    if (!candRes.recordset || candRes.recordset.length === 0) {
      return res.json({ success: true, data: [] });
    }
    const profileId = candRes.recordset[0].ProfileID;

    const appQuery = `
      SELECT ja.ApplicationID, ja.MatchScore, ja.Status, ja.AppliedAt,
             jp.JobID, jp.Title AS JobTitle, jp.SalaryRange, jp.Location,
             e.CompanyName, e.CompanyLogoUrl,
             cv.Title AS CVTitle, cv.FileUrl AS CVFileUrl
      FROM JobApplications ja
      JOIN JobPostings jp ON ja.JobID = jp.JobID
      JOIN Employers e ON jp.EmployerID = e.EmployerID
      LEFT JOIN CVs cv ON ja.CVID = cv.CVID
      WHERE ja.ProfileID = @ProfileID
      ORDER BY ja.AppliedAt DESC
    `;

    const result = await executeQuery(appQuery, { ProfileID: profileId });
    return res.json({
      success: true,
      data: result.recordset
    });
  } catch (error) {
    console.error('getMyApplications error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Get Saved Jobs
const getMySavedJobs = async (req, res) => {
  try {
    const userId = req.user.userId;

    const savedQuery = `
      SELECT sj.SavedAt,
             jp.JobID, jp.Title, jp.SalaryRange, jp.Location, jp.Status, jp.CreatedAt,
             e.EmployerID, e.CompanyName, e.CompanyLogoUrl,
             jc.CategoryName
      FROM SavedJobs sj
      JOIN JobPostings jp ON sj.JobID = jp.JobID
      JOIN Employers e ON jp.EmployerID = e.EmployerID
      LEFT JOIN JobCategories jc ON jp.CategoryID = jc.CategoryID
      WHERE sj.UserID = @UserID
      ORDER BY sj.SavedAt DESC
    `;

    const result = await executeQuery(savedQuery, { UserID: userId });
    return res.json({
      success: true,
      data: result.recordset
    });
  } catch (error) {
    console.error('getMySavedJobs error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Save or Create Online Builder CV (UC-C06)
const saveOnlineCV = async (req, res) => {
  try {
    await ensureCVTableColumns();
    const userId = req.user.userId;
    const { title, template, cvData, isPrimary } = req.body;

    if (!title || !cvData) {
      return res.status(400).json({ success: false, message: 'Tiêu đề CV và dữ liệu CV không được để trống' });
    }

    const candRes = await executeQuery('SELECT ProfileID FROM CandidateProfiles WHERE UserID = @UserID', { UserID: userId });
    if (!candRes.recordset || candRes.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ ứng viên' });
    }
    const profileId = candRes.recordset[0].ProfileID;

    // Check if first CV or requested isPrimary
    const existingCvs = await executeQuery('SELECT COUNT(*) AS Total FROM CVs WHERE ProfileID = @ProfileID', { ProfileID: profileId });
    const isFirst = existingCvs.recordset[0].Total === 0;
    const makePrimary = isPrimary || isFirst;

    if (makePrimary) {
      await executeQuery('UPDATE CVs SET IsPrimary = 0 WHERE ProfileID = @ProfileID', { ProfileID: profileId });
    }

    const cvDataString = typeof cvData === 'string' ? cvData : JSON.stringify(cvData);
    const selectedTemplate = template || 'modern';
    const placeholderUrl = `/candidate/cv-builder?preview=true`;

    const insertRes = await executeQuery(
      `INSERT INTO CVs (ProfileID, Title, FileUrl, CvType, CvData, Template, IsPrimary, CreatedAt, UpdatedAt)
       OUTPUT INSERTED.CVID, INSERTED.Title, INSERTED.FileUrl, INSERTED.CvType, INSERTED.CvData, INSERTED.Template, INSERTED.IsPrimary, INSERTED.CreatedAt, INSERTED.UpdatedAt
       VALUES (@ProfileID, @Title, @FileUrl, 'OnlineBuilder', @CvData, @Template, @IsPrimary, GETDATE(), GETDATE())`,
      {
        ProfileID: profileId,
        Title: title.trim(),
        FileUrl: placeholderUrl,
        CvData: cvDataString,
        Template: selectedTemplate,
        IsPrimary: makePrimary ? 1 : 0
      }
    );

    return res.status(201).json({
      success: true,
      message: 'Lưu CV Online thành công!',
      data: insertRes.recordset[0]
    });
  } catch (error) {
    console.error('saveOnlineCV error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Update Online Builder CV (UC-C06)
const updateOnlineCV = async (req, res) => {
  try {
    await ensureCVTableColumns();
    const userId = req.user.userId;
    const { cvId } = req.params;
    const { title, template, cvData, isPrimary } = req.body;

    const candRes = await executeQuery('SELECT ProfileID FROM CandidateProfiles WHERE UserID = @UserID', { UserID: userId });
    if (!candRes.recordset || candRes.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ' });
    }
    const profileId = candRes.recordset[0].ProfileID;

    // Verify the target before changing any primary flags in this profile.
    const ownedCV = await executeQuery('SELECT CVID FROM CVs WHERE CVID = @CVID AND ProfileID = @ProfileID', { CVID: cvId, ProfileID: profileId });
    if (!ownedCV.recordset?.length) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy CV để cập nhật' });
    }

    if (isPrimary) {
      await executeQuery('UPDATE CVs SET IsPrimary = 0 WHERE ProfileID = @ProfileID', { ProfileID: profileId });
    }

    const cvDataString = typeof cvData === 'string' ? cvData : (cvData ? JSON.stringify(cvData) : null);

    const updateRes = await executeQuery(
      `UPDATE CVs
       SET Title = COALESCE(@Title, Title),
           Template = COALESCE(@Template, Template),
           CvData = COALESCE(@CvData, CvData),
           IsPrimary = COALESCE(@IsPrimary, IsPrimary),
           UpdatedAt = GETDATE()
       OUTPUT INSERTED.CVID, INSERTED.Title, INSERTED.FileUrl, INSERTED.CvType, INSERTED.CvData, INSERTED.Template, INSERTED.IsPrimary, INSERTED.CreatedAt, INSERTED.UpdatedAt
       WHERE CVID = @CVID AND ProfileID = @ProfileID`,
      {
        CVID: cvId,
        ProfileID: profileId,
        Title: title ? title.trim() : null,
        Template: template || null,
        CvData: cvDataString,
        IsPrimary: isPrimary !== undefined ? (isPrimary ? 1 : 0) : null
      }
    );

    if (!updateRes.recordset || updateRes.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy CV để cập nhật' });
    }

    return res.json({
      success: true,
      message: 'Cập nhật CV thành công!',
      data: updateRes.recordset[0]
    });
  } catch (error) {
    console.error('updateOnlineCV error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Get Single CV Detail (UC-C06)
const getCVDetail = async (req, res) => {
  try {
    await ensureCVTableColumns();
    const userId = req.user.userId;
    const { cvId } = req.params;

    const candRes = await executeQuery('SELECT ProfileID FROM CandidateProfiles WHERE UserID = @UserID', { UserID: userId });
    if (!candRes.recordset || candRes.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ' });
    }
    const profileId = candRes.recordset[0].ProfileID;

    const cvRes = await executeQuery(
      `SELECT CVID, ProfileID, Title, FileUrl, CvType, CvData, Template, IsPrimary, CreatedAt, UpdatedAt
       FROM CVs
       WHERE CVID = @CVID AND ProfileID = @ProfileID`,
      { CVID: cvId, ProfileID: profileId }
    );

    if (!cvRes.recordset || cvRes.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy bản CV này' });
    }

    return res.json({
      success: true,
      data: cvRes.recordset[0]
    });
  } catch (error) {
    console.error('getCVDetail error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// JOB ALERTS (UC-C09)
// ==========================================

// Get All Job Alerts for current candidate
const getJobAlerts = async (req, res) => {
  try {
    const userId = req.user.userId;
    const candRes = await executeQuery('SELECT ProfileID FROM CandidateProfiles WHERE UserID = @UserID', { UserID: userId });
    if (!candRes.recordset || candRes.recordset.length === 0) {
      return res.json({ success: true, data: [] });
    }
    const profileId = candRes.recordset[0].ProfileID;

    const alertsRes = await executeQuery(
      `SELECT ja.AlertID, ja.ProfileID, ja.Keywords, ja.MinSalary, ja.Location, 
              ja.CategoryID, jc.CategoryName, ja.Frequency, ja.IsActive, ja.CreatedAt, ja.LastSentAt
       FROM JobAlerts ja
       LEFT JOIN JobCategories jc ON ja.CategoryID = jc.CategoryID
       WHERE ja.ProfileID = @ProfileID
       ORDER BY ja.CreatedAt DESC`,
      { ProfileID: profileId }
    );

    // Calculate count of matching jobs for each alert
    const alerts = alertsRes.recordset;
    for (const alert of alerts) {
      const matchRes = await executeQuery(
        `SELECT COUNT(*) AS MatchCount
         FROM JobPostings jp
         WHERE jp.Status = 'Published'
           AND (@Keywords IS NULL OR jp.Title LIKE '%' + @Keywords + '%' OR jp.Description LIKE '%' + @Keywords + '%')
           AND (@Location IS NULL OR @Location = N'Toàn quốc' OR jp.Location LIKE '%' + @Location + '%')
           AND (@CategoryID IS NULL OR jp.CategoryID = @CategoryID)`,
        {
          Keywords: alert.Keywords || null,
          Location: (alert.Location && alert.Location !== 'Tất cả' && alert.Location !== 'Toàn quốc') ? alert.Location : null,
          CategoryID: alert.CategoryID || null
        }
      );
      alert.MatchCount = matchRes.recordset[0]?.MatchCount || 0;
    }

    return res.json({
      success: true,
      data: alerts
    });
  } catch (error) {
    console.error('getJobAlerts error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Create Job Alert (UC-C09)
const createJobAlert = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { keywords, minSalary, location, categoryId, frequency, isActive } = req.body;

    if (!keywords || !keywords.trim()) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập vị trí hoặc từ khóa công việc mong muốn' });
    }

    const candRes = await executeQuery('SELECT ProfileID FROM CandidateProfiles WHERE UserID = @UserID', { UserID: userId });
    if (!candRes.recordset || candRes.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ ứng viên' });
    }
    const profileId = candRes.recordset[0].ProfileID;

    const insertRes = await executeQuery(
      `INSERT INTO JobAlerts (ProfileID, Keywords, MinSalary, Location, CategoryID, Frequency, IsActive, CreatedAt)
       OUTPUT INSERTED.AlertID, INSERTED.ProfileID, INSERTED.Keywords, INSERTED.MinSalary, INSERTED.Location, 
              INSERTED.CategoryID, INSERTED.Frequency, INSERTED.IsActive, INSERTED.CreatedAt
       VALUES (@ProfileID, @Keywords, @MinSalary, @Location, @CategoryID, @Frequency, @IsActive, GETDATE())`,
      {
        ProfileID: profileId,
        Keywords: keywords.trim(),
        MinSalary: minSalary ? parseFloat(minSalary) : null,
        Location: location ? location.trim() : null,
        CategoryID: categoryId ? parseInt(categoryId, 10) : null,
        Frequency: frequency || 'Daily',
        IsActive: isActive !== undefined ? (isActive ? 1 : 0) : 1
      }
    );

    return res.status(201).json({
      success: true,
      message: 'Thiết lập thông báo việc làm thành công!',
      data: insertRes.recordset[0]
    });
  } catch (error) {
    console.error('createJobAlert error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Update Job Alert (UC-C09)
const updateJobAlert = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { alertId } = req.params;
    const { keywords, minSalary, location, categoryId, frequency, isActive } = req.body;

    const candRes = await executeQuery('SELECT ProfileID FROM CandidateProfiles WHERE UserID = @UserID', { UserID: userId });
    if (!candRes.recordset || candRes.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ' });
    }
    const profileId = candRes.recordset[0].ProfileID;

    const updateRes = await executeQuery(
      `UPDATE JobAlerts
       SET Keywords = COALESCE(@Keywords, Keywords),
           MinSalary = @MinSalary,
           Location = @Location,
           CategoryID = @CategoryID,
           Frequency = COALESCE(@Frequency, Frequency),
           IsActive = COALESCE(@IsActive, IsActive)
       OUTPUT INSERTED.AlertID, INSERTED.ProfileID, INSERTED.Keywords, INSERTED.MinSalary, INSERTED.Location, 
              INSERTED.CategoryID, INSERTED.Frequency, INSERTED.IsActive, INSERTED.CreatedAt
       WHERE AlertID = @AlertID AND ProfileID = @ProfileID`,
      {
        AlertID: alertId,
        ProfileID: profileId,
        Keywords: keywords ? keywords.trim() : null,
        MinSalary: minSalary ? parseFloat(minSalary) : null,
        Location: location ? location.trim() : null,
        CategoryID: categoryId ? parseInt(categoryId, 10) : null,
        Frequency: frequency || null,
        IsActive: isActive !== undefined ? (isActive ? 1 : 0) : null
      }
    );

    if (!updateRes.recordset || updateRes.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy thông báo việc làm' });
    }

    return res.json({
      success: true,
      message: 'Cập nhật tiêu chí thông báo việc làm thành công!',
      data: updateRes.recordset[0]
    });
  } catch (error) {
    console.error('updateJobAlert error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Toggle Job Alert (UC-C09)
const toggleJobAlert = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { alertId } = req.params;
    const { isActive } = req.body;

    const candRes = await executeQuery('SELECT ProfileID FROM CandidateProfiles WHERE UserID = @UserID', { UserID: userId });
    if (!candRes.recordset || candRes.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ' });
    }
    const profileId = candRes.recordset[0].ProfileID;

    await executeQuery(
      `UPDATE JobAlerts
       SET IsActive = @IsActive
       WHERE AlertID = @AlertID AND ProfileID = @ProfileID`,
      {
        AlertID: alertId,
        ProfileID: profileId,
        IsActive: isActive ? 1 : 0
      }
    );

    return res.json({
      success: true,
      message: isActive ? 'Đã bật thông báo việc làm' : 'Đã tạm dừng thông báo việc làm',
      isActive: !!isActive
    });
  } catch (error) {
    console.error('toggleJobAlert error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Delete Job Alert (UC-C09)
const deleteJobAlert = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { alertId } = req.params;

    const candRes = await executeQuery('SELECT ProfileID FROM CandidateProfiles WHERE UserID = @UserID', { UserID: userId });
    if (!candRes.recordset || candRes.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ' });
    }
    const profileId = candRes.recordset[0].ProfileID;

    await executeQuery('DELETE FROM JobAlerts WHERE AlertID = @AlertID AND ProfileID = @ProfileID', {
      AlertID: alertId,
      ProfileID: profileId
    });

    return res.json({
      success: true,
      message: 'Đã xóa thông báo việc làm thành công!'
    });
  } catch (error) {
    console.error('deleteJobAlert error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Get Matching Jobs for Alert (UC-C09)
const getMatchingJobsForAlert = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { alertId } = req.params;

    const candRes = await executeQuery('SELECT ProfileID FROM CandidateProfiles WHERE UserID = @UserID', { UserID: userId });
    if (!candRes.recordset || candRes.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ' });
    }
    const profileId = candRes.recordset[0].ProfileID;

    const alertRes = await executeQuery('SELECT * FROM JobAlerts WHERE AlertID = @AlertID AND ProfileID = @ProfileID', {
      AlertID: alertId,
      ProfileID: profileId
    });

    if (!alertRes.recordset || alertRes.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy thông báo việc làm' });
    }
    const alert = alertRes.recordset[0];

    const query = `
      SELECT jp.JobID, jp.Title, jp.SalaryRange, jp.Location, jp.Status, jp.CreatedAt,
             e.CompanyName, e.CompanyLogoUrl,
             jc.CategoryName
      FROM JobPostings jp
      JOIN Employers e ON jp.EmployerID = e.EmployerID
      LEFT JOIN JobCategories jc ON jp.CategoryID = jc.CategoryID
      WHERE jp.Status = 'Published'
        AND (@Keywords IS NULL OR jp.Title LIKE '%' + @Keywords + '%' OR jp.Description LIKE '%' + @Keywords + '%' OR jp.Requirements LIKE '%' + @Keywords + '%')
        AND (@Location IS NULL OR @Location = N'Toàn quốc' OR jp.Location LIKE '%' + @Location + '%')
        AND (@CategoryID IS NULL OR jp.CategoryID = @CategoryID)
      ORDER BY jp.CreatedAt DESC
    `;

    const jobsRes = await executeQuery(query, {
      Keywords: alert.Keywords || null,
      Location: (alert.Location && alert.Location !== 'Tất cả' && alert.Location !== 'Toàn quốc') ? alert.Location : null,
      CategoryID: alert.CategoryID || null
    });

    return res.json({
      success: true,
      data: {
        alert,
        jobs: jobsRes.recordset
      }
    });
  } catch (error) {
    console.error('getMatchingJobsForAlert error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// COURSES & SKILL GAP (UC-C12)
// ==========================================

// Get All Courses from Database
const getAllCourses = async (req, res) => {
  try {
    const { skillId, search, isFree, provider } = req.query;

    let query = `
      SELECT c.CourseID, c.Title, c.Provider, c.Url, c.SkillID, 
             c.Price, c.Currency, c.IsFree, c.CertificateName, c.Duration, c.Level, c.Rating, c.ThumbnailUrl,
             st.SkillName, st.NormalizedName, jc.CategoryName
      FROM Courses c
      JOIN SkillTaxonomy st ON c.SkillID = st.SkillID
      LEFT JOIN JobCategories jc ON st.CategoryID = jc.CategoryID
      WHERE 1=1
    `;

    const params = {};

    if (skillId) {
      query += ` AND c.SkillID = @SkillID`;
      params.SkillID = parseInt(skillId, 10);
    }

    if (provider) {
      query += ` AND c.Provider = @Provider`;
      params.Provider = provider;
    }

    if (isFree !== undefined && isFree !== '') {
      query += ` AND c.IsFree = @IsFree`;
      params.IsFree = isFree === 'true' || isFree === '1' ? 1 : 0;
    }

    if (search && search.trim()) {
      query += ` AND (c.Title LIKE '%' + @Search + '%' OR st.SkillName LIKE '%' + @Search + '%')`;
      params.Search = search.trim();
    }

    query += ` ORDER BY c.Rating DESC, c.Title ASC`;

    const result = await executeQuery(query, params);

    return res.json({
      success: true,
      data: result.recordset
    });
  } catch (error) {
    console.error('getAllCourses error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// TARGET-ORIENTED AI SKILL GAP ANALYTICS (UC-C11, UC-C12, UC-AI01)
// ==========================================

const STANDARD_ROLES = [
  {
    id: 'backend-node',
    title: 'Senior Backend Developer (Node.js)',
    category: 'Backend Development',
    mustHaveSkills: ['Node.js', 'Express.js', 'PostgreSQL', 'Docker'],
    niceToHaveSkills: ['Redis', 'TypeScript', 'MongoDB', 'AWS Cloud', 'SQL Server']
  },
  {
    id: 'frontend-react',
    title: 'Senior Frontend Developer (React.js)',
    category: 'Frontend Development',
    mustHaveSkills: ['React.js', 'TypeScript', 'Next.js', 'Tailwind CSS'],
    niceToHaveSkills: ['Node.js', 'UI/UX (Figma)']
  },
  {
    id: 'fullstack-web',
    title: 'Fullstack Software Engineer (Web)',
    category: 'Fullstack Development',
    mustHaveSkills: ['React.js', 'Node.js', 'TypeScript', 'PostgreSQL', 'Docker'],
    niceToHaveSkills: ['Next.js', 'Redis', 'Tailwind CSS', 'AWS Cloud', 'MongoDB']
  },
  {
    id: 'backend-dotnet',
    title: '.NET Backend Developer (C# / .NET Core)',
    category: 'Backend Development',
    mustHaveSkills: ['C# / .NET Core', 'SQL Server', 'Docker'],
    niceToHaveSkills: ['Azure Cloud', 'Redis', 'React.js', 'TypeScript']
  },
  {
    id: 'backend-java',
    title: 'Java Backend Developer (Spring Boot)',
    category: 'Backend Development',
    mustHaveSkills: ['Java / Spring Boot', 'PostgreSQL', 'Docker'],
    niceToHaveSkills: ['Redis', 'Kubernetes', 'AWS Cloud', 'SQL Server']
  },
  {
    id: 'devops-cloud',
    title: 'Cloud & DevOps Engineer (AWS / K8s)',
    category: 'DevOps & Cloud',
    mustHaveSkills: ['Docker', 'Kubernetes', 'AWS Cloud'],
    niceToHaveSkills: ['Azure Cloud', 'Python', 'Node.js', 'PostgreSQL']
  },
  {
    id: 'ai-data',
    title: 'AI & Machine Learning Engineer (Python)',
    category: 'AI & Data Science',
    mustHaveSkills: ['Python', 'Machine Learning', 'Generative AI / LLM'],
    niceToHaveSkills: ['PostgreSQL', 'Docker', 'AWS Cloud', 'MongoDB']
  },
  {
    id: 'ui-ux',
    title: 'Product UI/UX Designer',
    category: 'Product Design',
    mustHaveSkills: ['UI/UX (Figma)'],
    niceToHaveSkills: ['Tailwind CSS', 'React.js']
  }
];

const checkCandidateHasSkill = (candidateText, skill) => {
  const sName = (skill.SkillName || '').toLowerCase();
  const sNorm = (skill.NormalizedName || '').toLowerCase();
  
  const terms = new Set([sName, sNorm].filter(Boolean));
  if (sName.includes('react')) { terms.add('react'); terms.add('reactjs'); terms.add('react.js'); }
  if (sName.includes('node')) { terms.add('node'); terms.add('nodejs'); terms.add('node.js'); }
  if (sName.includes('next')) { terms.add('next'); terms.add('nextjs'); terms.add('next.js'); }
  if (sName.includes('typescript')) { terms.add('typescript'); terms.add('ts'); }
  if (sName.includes('c#') || sName.includes('.net')) { terms.add('c#'); terms.add('.net'); terms.add('dotnet'); terms.add('asp.net'); terms.add('csharp'); }
  if (sName.includes('java ') || sName.includes('spring')) { terms.add('spring'); terms.add('spring boot'); terms.add('java'); }
  if (sName.includes('python')) { terms.add('python'); terms.add('django'); terms.add('fastapi'); }
  if (sName.includes('docker')) { terms.add('docker'); terms.add('container'); }
  if (sName.includes('kubernetes')) { terms.add('kubernetes'); terms.add('k8s'); }
  if (sName.includes('aws')) { terms.add('aws'); terms.add('amazon web services'); }
  if (sName.includes('azure')) { terms.add('azure'); }
  if (sName.includes('sql server')) { terms.add('sql server'); terms.add('mssql'); }
  if (sName.includes('postgresql')) { terms.add('postgresql'); terms.add('postgres'); }
  if (sName.includes('mongodb')) { terms.add('mongodb'); terms.add('mongo'); }
  if (sName.includes('redis')) { terms.add('redis'); }
  if (sName.includes('figma')) { terms.add('figma'); terms.add('ui/ux'); terms.add('ui design'); }
  if (sName.includes('tailwind')) { terms.add('tailwind'); terms.add('tailwindcss'); }

  for (const term of terms) {
    if (term && candidateText.includes(term.toLowerCase())) {
      return true;
    }
  }
  return false;
};

// Get Skill Gap & Learning Paths with Target Role / Job / JD
const getSkillGapAnalytics = async (req, res) => {
  try {
    await ensureCVTableColumns();
    const userId = req.user.userId;
    const mode = req.query.mode || req.body?.mode || 'role'; // 'role' | 'job' | 'jd'
    const targetRoleParam = req.query.targetRole || req.body?.targetRole;
    const jobIdParam = req.query.jobId || req.body?.jobId;
    const customJd = req.query.customJd || req.body?.customJd;

    // 1. Fetch Candidate Profile & CVs
    const candRes = await executeQuery(
      'SELECT ProfileID, Headline, Bio, CurrentLocation FROM CandidateProfiles WHERE UserID = @UserID',
      { UserID: userId }
    );
    if (!candRes.recordset || candRes.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ ứng viên' });
    }
    const candidate = candRes.recordset[0];

    // Extract text from CVs
    const cvRes = await executeQuery(
      'SELECT CVID, Title, CvData, IsPrimary FROM CVs WHERE ProfileID = @ProfileID ORDER BY IsPrimary DESC, CVID DESC',
      { ProfileID: candidate.ProfileID }
    );
    const cvList = cvRes.recordset;
    const cvText = cvList.map(c => `${c.Title} ${c.CvData || ''}`).join(' ');
    const candidateFullText = `${candidate.Headline || ''} ${candidate.Bio || ''} ${cvText}`.toLowerCase();

    // 2. Fetch Skill Taxonomy, Courses & Available Published Jobs
    const [skillsRes, coursesRes, jobsRes] = await Promise.all([
      executeQuery(`
        SELECT st.SkillID, st.SkillName, st.NormalizedName, st.CategoryID, jc.CategoryName
        FROM SkillTaxonomy st
        LEFT JOIN JobCategories jc ON st.CategoryID = jc.CategoryID
      `),
      executeQuery(`
        SELECT c.CourseID, c.Title, c.Provider, c.Url, c.SkillID, 
               c.Price, c.Currency, c.IsFree, c.CertificateName, c.Duration, c.Level, c.Rating, c.ThumbnailUrl,
               st.SkillName, st.NormalizedName, jc.CategoryName
        FROM Courses c
        JOIN SkillTaxonomy st ON c.SkillID = st.SkillID
        LEFT JOIN JobCategories jc ON st.CategoryID = jc.CategoryID
      `),
      executeQuery(`
        SELECT jp.JobID, jp.Title, jp.CategoryID, jp.SalaryRange, jp.Location,
               e.CompanyName, e.CompanyLogoUrl, jc.CategoryName
        FROM JobPostings jp
        JOIN Employers e ON jp.EmployerID = e.EmployerID
        LEFT JOIN JobCategories jc ON jp.CategoryID = jc.CategoryID
        WHERE jp.Status = 'Published'
        ORDER BY jp.CreatedAt DESC
      `)
    ]);

    const allSkills = skillsRes.recordset;
    const allCourses = coursesRes.recordset;
    const availableJobs = jobsRes.recordset;

    // Candidate's owned skills detected from CV
    const candidateOwnedSkills = allSkills.filter(skill => checkCandidateHasSkill(candidateFullText, skill));

    // 3. Determine Target Skills ($Skills_{Target}$) based on Mode
    let targetTitle = 'Senior Backend Developer (Node.js)';
    let targetTypeLabel = 'Vị trí mục tiêu';
    let targetDetails = null;
    let targetSkillsMap = new Map(); // SkillID -> { skill, isMandatory }

    if (mode === 'job' && jobIdParam) {
      // MODE 2: SPECIFIC JOB POSTING FROM DATABASE
      const jobDetailRes = await executeQuery(
        `SELECT jp.JobID, jp.Title, jp.Description, jp.Requirements, jp.SalaryRange, jp.Location,
                e.CompanyName, e.CompanyLogoUrl, jc.CategoryName
         FROM JobPostings jp
         JOIN Employers e ON jp.EmployerID = e.EmployerID
         LEFT JOIN JobCategories jc ON jp.CategoryID = jc.CategoryID
         WHERE jp.JobID = @JobID`,
        { JobID: parseInt(jobIdParam, 10) }
      );

      if (jobDetailRes.recordset && jobDetailRes.recordset.length > 0) {
        const job = jobDetailRes.recordset[0];
        targetTitle = `${job.Title} — ${job.CompanyName}`;
        targetTypeLabel = 'Tin tuyển dụng cụ thể (1-1 Match)';
        targetDetails = job;

        // Query job skill requirements
        const reqRes = await executeQuery(
          `SELECT jsr.SkillID, jsr.IsMandatory
           FROM JobSkillRequirements jsr
           WHERE jsr.JobID = @JobID`,
          { JobID: job.JobID }
        );

        const jobReqs = reqRes.recordset;
        for (const req of jobReqs) {
          const matchedSkill = allSkills.find(s => s.SkillID === req.SkillID);
          if (matchedSkill) {
            targetSkillsMap.set(matchedSkill.SkillID, {
              skill: matchedSkill,
              isMandatory: Boolean(req.IsMandatory)
            });
          }
        }

        // Parse any additional skills mentioned in Job Description/Requirements
        const jobFullText = `${job.Description} ${job.Requirements}`.toLowerCase();
        for (const skill of allSkills) {
          if (!targetSkillsMap.has(skill.SkillID) && checkCandidateHasSkill(jobFullText, skill)) {
            targetSkillsMap.set(skill.SkillID, {
              skill,
              isMandatory: false // Nice to have if extracted from text
            });
          }
        }
      }
    } else if (mode === 'jd' && customJd && customJd.trim()) {
      // MODE 3: PASTED CUSTOM JOB DESCRIPTION (JD)
      targetTitle = 'Mô tả công việc tùy chỉnh (Dán JD)';
      targetTypeLabel = 'Tin tuyển dụng tự dán (Custom JD)';
      const jdLower = customJd.toLowerCase();

      // Scan all skills against pasted JD
      for (const skill of allSkills) {
        if (checkCandidateHasSkill(jdLower, skill)) {
          // Identify if it's in mandatory section
          const sName = (skill.SkillName || '').toLowerCase();
          const isMustHave = jdLower.includes('yêu cầu') || jdLower.includes('bắt buộc') || jdLower.includes('must') || jdLower.includes('require');
          const isNiceToHave = jdLower.includes('ưu tiên') || jdLower.includes('điểm cộng') || jdLower.includes('nice to have') || jdLower.includes('plus');

          targetSkillsMap.set(skill.SkillID, {
            skill,
            isMandatory: !isNiceToHave
          });
        }
      }
    } else {
      // MODE 1 (DEFAULT): TARGET ROLE (Vị trí mục tiêu)
      let activeRole = null;
      if (targetRoleParam) {
        activeRole = STANDARD_ROLES.find(r => r.id === targetRoleParam || r.title.toLowerCase() === targetRoleParam.toLowerCase());
      }
      if (!activeRole) {
        // Match from candidate headline or default to backend-node
        const headline = (candidate.Headline || '').toLowerCase();
        if (headline.includes('front')) activeRole = STANDARD_ROLES.find(r => r.id === 'frontend-react');
        else if (headline.includes('full')) activeRole = STANDARD_ROLES.find(r => r.id === 'fullstack-web');
        else if (headline.includes('devops') || headline.includes('cloud')) activeRole = STANDARD_ROLES.find(r => r.id === 'devops-cloud');
        else if (headline.includes('ai') || headline.includes('data') || headline.includes('machine')) activeRole = STANDARD_ROLES.find(r => r.id === 'ai-data');
        else if (headline.includes('ui') || headline.includes('ux') || headline.includes('design')) activeRole = STANDARD_ROLES.find(r => r.id === 'ui-ux');
        else activeRole = STANDARD_ROLES[0]; // Senior Backend Developer (Node.js)
      }

      targetTitle = activeRole.title;
      targetTypeLabel = `Vị trí tiêu chuẩn (${activeRole.category})`;
      targetDetails = { roleId: activeRole.id, category: activeRole.category };

      // Map Must-Have skills
      for (const name of activeRole.mustHaveSkills) {
        const found = allSkills.find(s => s.SkillName.toLowerCase() === name.toLowerCase());
        if (found) {
          targetSkillsMap.set(found.SkillID, { skill: found, isMandatory: true });
        }
      }

      // Map Nice-To-Have skills
      for (const name of activeRole.niceToHaveSkills) {
        const found = allSkills.find(s => s.SkillName.toLowerCase() === name.toLowerCase());
        if (found && !targetSkillsMap.has(found.SkillID)) {
          targetSkillsMap.set(found.SkillID, { skill: found, isMandatory: false });
        }
      }
    }

    // 4. Compare $Skills_{Target}$ vs $Skills_{CV}$
    const targetSkillsList = Array.from(targetSkillsMap.values());
    const requiredSkills = [];
    const acquiredSkills = [];
    const mustHaveMissing = [];
    const niceToHaveMissing = [];

    for (const item of targetSkillsList) {
      const { skill, isMandatory } = item;
      const isOwned = checkCandidateHasSkill(candidateFullText, skill);

      const skillPayload = {
        ...skill,
        isMandatory
      };

      requiredSkills.push(skillPayload);

      if (isOwned) {
        acquiredSkills.push(skillPayload);
      } else {
        if (isMandatory) {
          mustHaveMissing.push(skillPayload);
        } else {
          niceToHaveMissing.push(skillPayload);
        }
      }
    }

    // Combined missing skills for backwards compatibility
    const missingSkills = [...mustHaveMissing, ...niceToHaveMissing];

    // Compute Match Score (0 - 100%)
    // Nếu không có kỹ năng nào phù hợp (acquiredSkills.length === 0) thì matchScore bắt buộc là 0%
    let matchScore = 0;
    if (requiredSkills.length > 0 && acquiredSkills.length > 0) {
      const mustHaveTotal = requiredSkills.filter(s => s.isMandatory).length;
      const niceToHaveTotal = requiredSkills.filter(s => !s.isMandatory).length;
      
      const acquiredMustHave = acquiredSkills.filter(s => s.isMandatory).length;
      const acquiredNiceToHave = acquiredSkills.filter(s => !s.isMandatory).length;

      if (mustHaveTotal > 0 && niceToHaveTotal > 0) {
        matchScore = Math.round((acquiredMustHave / mustHaveTotal) * 75 + (acquiredNiceToHave / niceToHaveTotal) * 25);
      } else if (mustHaveTotal > 0) {
        matchScore = Math.round((acquiredMustHave / mustHaveTotal) * 100);
      } else {
        matchScore = Math.round((acquiredSkills.length / requiredSkills.length) * 100);
      }
    }

    // 5. Query Targeted Course Recommendations (ONLY FOR TARGET GAP SKILLS)
    const missingSkillIds = new Set(missingSkills.map(s => s.SkillID));
    const mustHaveSkillIds = new Set(mustHaveMissing.map(s => s.SkillID));

    const targetedCourses = allCourses
      .filter(c => missingSkillIds.has(c.SkillID))
      .map(course => ({
        ...course,
        isMustHave: mustHaveSkillIds.has(course.SkillID)
      }))
      // Sort Must-Have courses first, then by rating
      .sort((a, b) => {
        if (a.isMustHave && !b.isMustHave) return -1;
        if (!a.isMustHave && b.isMustHave) return 1;
        return (b.Rating || 0) - (a.Rating || 0);
      });

    return res.json({
      success: true,
      data: {
        mode,
        targetTitle,
        targetTypeLabel,
        targetDetails,
        matchScore,
        requiredSkills,
        requiredSkillsCount: requiredSkills.length,
        acquiredSkills,
        acquiredSkillsCount: acquiredSkills.length,
        mustHaveMissing,
        mustHaveCount: mustHaveMissing.length,
        niceToHaveMissing,
        niceToHaveCount: niceToHaveMissing.length,
        missingSkills,
        missingSkillsCount: missingSkills.length,
        recommendedCourses: targetedCourses,
        allCourses,
        availableRoles: STANDARD_ROLES,
        availableJobs: availableJobs.slice(0, 10),
        candidateProfile: {
          headline: candidate.Headline,
          bio: candidate.Bio,
          cvCount: cvList.length,
          primaryCvTitle: cvList.find(c => c.IsPrimary)?.Title || cvList[0]?.Title || 'Hồ sơ cá nhân'
        }
      }
    });
  } catch (error) {
    console.error('getSkillGapAnalytics error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi phân tích lỗ hổng kỹ năng: ' + error.message });
  }
};

module.exports = {
  getCandidateProfile,
  updateCandidateProfile,
  toggleLookingForJob,
  uploadCV,
  setPrimaryCV,
  deleteCV,
  saveOnlineCV,
  updateOnlineCV,
  getCVDetail,
  getJobAlerts,
  createJobAlert,
  updateJobAlert,
  toggleJobAlert,
  deleteJobAlert,
  getMatchingJobsForAlert,
  getAllCourses,
  getMyApplications,
  getMySavedJobs,
  getSkillGapAnalytics
};
