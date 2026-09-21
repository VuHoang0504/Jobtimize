const { executeQuery } = require('../config/db');
const fs = require('fs');
const path = require('path');

// Get candidate profile
const getCandidateProfile = async (req, res) => {
  try {
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
      `SELECT CVID, Title, FileUrl, IsPrimary, CreatedAt FROM CVs WHERE ProfileID = @ProfileID ORDER BY IsPrimary DESC, CreatedAt DESC`,
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

    // Reset all to 0
    await executeQuery('UPDATE CVs SET IsPrimary = 0 WHERE ProfileID = @ProfileID', { ProfileID: profileId });
    
    // Set target to 1
    await executeQuery('UPDATE CVs SET IsPrimary = 1 WHERE CVID = @CVID AND ProfileID = @ProfileID', {
      CVID: cvId,
      ProfileID: profileId
    });

    return res.json({
      success: true,
      message: 'Đã đặt làm CV chính mặc định!'
    });
  } catch (error) {
    console.error('setPrimaryCV error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Delete CV
const deleteCV = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { cvId } = req.params;

    const candRes = await executeQuery('SELECT ProfileID FROM CandidateProfiles WHERE UserID = @UserID', { UserID: userId });
    if (!candRes.recordset || candRes.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ' });
    }
    const profileId = candRes.recordset[0].ProfileID;

    const cvRes = await executeQuery('SELECT FileUrl FROM CVs WHERE CVID = @CVID AND ProfileID = @ProfileID', {
      CVID: cvId,
      ProfileID: profileId
    });

    if (cvRes.recordset && cvRes.recordset.length > 0) {
      const filePath = path.join(__dirname, '../../', cvRes.recordset[0].FileUrl);
      if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch (e) { console.error(e); }
      }
      await executeQuery('DELETE FROM CVs WHERE CVID = @CVID', { CVID: cvId });
    }

    return res.json({
      success: true,
      message: 'Đã xóa CV thành công!'
    });
  } catch (error) {
    console.error('deleteCV error:', error);
    return res.status(500).json({ success: false, message: error.message });
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

// Get Skill Gap & Learning Paths (UC-C11, UC-C12, UC-AI01)
const getSkillGapAnalytics = async (req, res) => {
  try {
    const userId = req.user.userId;
    const candRes = await executeQuery('SELECT ProfileID, Headline, Bio FROM CandidateProfiles WHERE UserID = @UserID', { UserID: userId });
    if (!candRes.recordset || candRes.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ' });
    }
    const candidate = candRes.recordset[0];

    // Fetch all courses in DB
    const coursesRes = await executeQuery(`
      SELECT c.CourseID, c.Title, c.Provider, c.Url, c.SkillID, st.SkillName, st.NormalizedName
      FROM Courses c
      JOIN SkillTaxonomy st ON c.SkillID = st.SkillID
    `);

    // Fetch top market skill trends
    const skillsRes = await executeQuery(`
      SELECT st.SkillID, st.SkillName, st.NormalizedName, jc.CategoryName,
             COUNT(jsr.JobID) AS DemandCount
      FROM SkillTaxonomy st
      LEFT JOIN JobSkillRequirements jsr ON st.SkillID = jsr.SkillID
      LEFT JOIN JobCategories jc ON st.CategoryID = jc.CategoryID
      GROUP BY st.SkillID, st.SkillName, st.NormalizedName, jc.CategoryName
      ORDER BY DemandCount DESC
    `);

    const cvRes = await executeQuery('SELECT Title FROM CVs WHERE ProfileID = @ProfileID', { ProfileID: candidate.ProfileID });
    const cvText = cvRes.recordset.map(c => c.Title).join(' ');
    const candidateText = `${candidate.Headline || ''} ${candidate.Bio || ''} ${cvText}`.toLowerCase();

    const topSkills = skillsRes.recordset;
    const acquiredSkills = [];
    const recommendedCourses = [];

    for (const skill of topSkills) {
      const sName = skill.SkillName.toLowerCase();
      const sNorm = (skill.NormalizedName || '').toLowerCase();
      const hasSkill = candidateText.includes(sName) || (sNorm && candidateText.includes(sNorm));

      if (hasSkill) {
        acquiredSkills.push(skill);
      } else {
        // Find matching courses for missing skill
        const matchingCourse = coursesRes.recordset.find(c => c.SkillID === skill.SkillID);
        if (matchingCourse && recommendedCourses.length < 6) {
          recommendedCourses.push(matchingCourse);
        }
      }
    }

    return res.json({
      success: true,
      data: {
        acquiredSkills,
        missingSkillsCount: topSkills.length - acquiredSkills.length,
        recommendedCourses,
        marketSkillTrends: topSkills.slice(0, 8)
      }
    });
  } catch (error) {
    console.error('getSkillGapAnalytics error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getCandidateProfile,
  updateCandidateProfile,
  toggleLookingForJob,
  uploadCV,
  setPrimaryCV,
  deleteCV,
  getMyApplications,
  getMySavedJobs,
  getSkillGapAnalytics
};
