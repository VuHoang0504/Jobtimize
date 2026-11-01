const { executeQuery } = require('../config/db');
const { withTransaction } = require('../services/notificationStore');
const fs = require('fs');
const path = require('path');

let cvColumnsVerified = false;
const ensureCVTableColumns = async () => {
  if (cvColumnsVerified) return;
  try {
    await require('../services/cvAnalysisService').initialize();
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
    await require('../services/cvAnalysisService').initialize();

    // Fetch CVs
    const cvsRes = await executeQuery(
      `SELECT CVID, Title, FileUrl, CvType, CvData, Template, IsPrimary, CreatedAt, UpdatedAt 
       FROM CVs 
       WHERE ProfileID = @ProfileID 
       AND IsArchived=0 ORDER BY IsPrimary DESC, CreatedAt DESC`,
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
    const existingCvs = await executeQuery('SELECT COUNT(*) AS Total FROM CVs WHERE ProfileID = @ProfileID AND IsArchived=0', { ProfileID: profileId });
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
      const target = await query('SELECT CVID FROM CVs WITH(UPDLOCK,HOLDLOCK) WHERE CVID=@CVID AND ProfileID=@ProfileID AND IsArchived=0', { CVID: cvId, ProfileID: profileId });
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

    const cvDataString = typeof cvData === 'string' ? cvData : JSON.stringify(cvData);
    const selectedTemplate = template || 'modern';
    const placeholderUrl = `/candidate/cv-builder?preview=true`;

    const insertRes = await withTransaction(async query => {
      await query('SELECT ProfileID FROM CandidateProfiles WITH(UPDLOCK,HOLDLOCK) WHERE ProfileID=@ID', { ID: profileId });
      const existingCvs = await query('SELECT COUNT(*) AS Total FROM CVs WHERE ProfileID=@ID AND IsArchived=0', { ID: profileId });
      const makePrimary = isPrimary || existingCvs.recordset[0].Total === 0;
      if (makePrimary) await query('UPDATE CVs SET IsPrimary=0 WHERE ProfileID=@ID', { ID: profileId });
      const result = await query(
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

      await require('../services/cvAnalysisService').capture({ ...result.recordset[0], ProfileID: profileId }, null, query);
      return result;
    });
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
    const ownedCV = await executeQuery('SELECT CVID FROM CVs WHERE CVID = @CVID AND ProfileID = @ProfileID AND IsArchived=0', { CVID: cvId, ProfileID: profileId });
    if (!ownedCV.recordset?.length) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy CV để cập nhật' });
    }
    const analysisService = require('../services/cvAnalysisService');
    const currentCV = await analysisService.ownedCV(cvId, userId);
    if (currentCV.CvType !== 'OnlineBuilder') return res.status(400).json({ success: false, message: 'Tải phiên bản mới của tệp này trong Quản lý CV.' });
    await analysisService.ensureVersion(currentCV);

    const cvDataString = typeof cvData === 'string' ? cvData : (cvData ? JSON.stringify(cvData) : null);

    const updateRes = await withTransaction(async query => {
      await query('SELECT ProfileID FROM CandidateProfiles WITH(UPDLOCK,HOLDLOCK) WHERE ProfileID=@ID', { ID: profileId });
      const active = await query('SELECT CVID FROM CVs WITH(UPDLOCK,HOLDLOCK) WHERE CVID=@ID AND IsArchived=0', { ID: cvId });
      if (!active.recordset.length) throw Object.assign(new Error('CV đã bị xóa.'), { status: 409 });
      if (isPrimary) await query('UPDATE CVs SET IsPrimary=0 WHERE ProfileID=@ID', { ID: profileId });
      const result = await query(
      `UPDATE CVs
       SET Title = COALESCE(@Title, Title),
           Template = COALESCE(@Template, Template),
           CvData = COALESCE(@CvData, CvData),
           IsPrimary = COALESCE(@IsPrimary, IsPrimary),
           UpdatedAt = GETDATE()
       OUTPUT INSERTED.CVID, INSERTED.Title, INSERTED.FileUrl, INSERTED.CvType, INSERTED.CvData, INSERTED.Template, INSERTED.IsPrimary, INSERTED.CreatedAt, INSERTED.UpdatedAt
       WHERE CVID = @CVID AND ProfileID = @ProfileID AND IsArchived=0`,
      {
        CVID: cvId,
        ProfileID: profileId,
        Title: title ? title.trim() : null,
        Template: template || null,
        CvData: cvDataString,
        IsPrimary: isPrimary !== undefined ? (isPrimary ? 1 : 0) : null
      }
    );

      await analysisService.capture({ ...result.recordset[0], ProfileID: profileId }, null, query);
      return result;
    });
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
       WHERE CVID = @CVID AND ProfileID = @ProfileID AND IsArchived=0`,
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

// CV-based job recommendations and per-job skill analysis.
const getSkillGapAnalytics = async (req, res) => {
  try {
    const data = await require('../services/skillGapService').analyze(req.user.userId, { ...req.query, ...req.body });
    return res.json({ success: true, data });
  } catch (error) {
    if (!error.status) console.error('Skill analysis unavailable:', error.code || error.name);
    return res.status(error.status || 500).json({ success: false, message: error.status ? error.message : 'Chưa tải được kết quả phân tích. Vui lòng thử lại.' });
  }
};

const getSkillGapInsights = async (req, res) => {
  try {
    const data = await require('../services/skillGapInsights').insights(req.user.userId, req.body);
    return res.json({ success: true, data });
  } catch (error) {
    if (!error.status) console.error('Skill insights failed:', error.code || error.name);
    return res.status(error.status || 500).json({ success: false, message: error.status ? error.message : 'Chưa tải được nhận xét AI. Vui lòng thử lại.' });
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
  getMyApplications,
  getMySavedJobs,
  getSkillGapAnalytics,
  getSkillGapInsights
};
