const { executeQuery } = require('../config/db');
const AIMatchingService = require('../services/aiMatchingService');

// Get all published jobs with search & filter
const getJobs = async (req, res) => {
  try {
    const { keyword, location, categoryId, minSalary } = req.query;

    let query = `
      SELECT jp.JobID, jp.Title, jp.SalaryRange, jp.Location, jp.Status, jp.CreatedAt, jp.ExpiresAt,
             e.EmployerID, e.CompanyName, e.CompanyLogoUrl, e.CompanySize,
             jc.CategoryID, jc.CategoryName,
             (
               SELECT st.SkillID, st.SkillName, jsr.IsMandatory
               FROM JobSkillRequirements jsr
               JOIN SkillTaxonomy st ON jsr.SkillID = st.SkillID
               WHERE jsr.JobID = jp.JobID
               FOR JSON PATH
             ) AS RequiredSkillsJson
      FROM JobPostings jp
      JOIN Employers e ON jp.EmployerID = e.EmployerID
      LEFT JOIN JobCategories jc ON jp.CategoryID = jc.CategoryID
      WHERE jp.Status = 'Published'
    `;

    const params = {};

    if (keyword) {
      query += ` AND (jp.Title LIKE '%' + @Keyword + '%' OR jp.Description LIKE '%' + @Keyword + '%' OR e.CompanyName LIKE '%' + @Keyword + '%')`;
      params.Keyword = keyword;
    }

    if (location) {
      query += ` AND jp.Location LIKE '%' + @Location + '%'`;
      params.Location = location;
    }

    if (categoryId) {
      query += ` AND jp.CategoryID = @CategoryID`;
      params.CategoryID = parseInt(categoryId, 10);
    }

    query += ` ORDER BY jp.CreatedAt DESC`;

    const result = await executeQuery(query, params);
    let jobs = result.recordset.map(job => {
      let skills = [];
      try {
        if (job.RequiredSkillsJson) {
          skills = JSON.parse(job.RequiredSkillsJson);
        }
      } catch (e) {
        skills = [];
      }
      return {
        ...job,
        requiredSkills: skills,
        RequiredSkillsJson: undefined
      };
    });

    // If candidate is logged in, calculate AI Match Score for each job
    if (req.user && req.user.role === 'Candidate') {
      const candRes = await executeQuery('SELECT ProfileID FROM CandidateProfiles WHERE UserID = @UserID', { UserID: req.user.userId });
      if (candRes.recordset && candRes.recordset.length > 0) {
        const profileId = candRes.recordset[0].ProfileID;
        
        // Fetch saved jobs list
        const savedRes = await executeQuery('SELECT JobID FROM SavedJobs WHERE UserID = @UserID', { UserID: req.user.userId });
        const savedJobIds = new Set(savedRes.recordset.map(s => s.JobID));

        // Fetch applied jobs list
        const appliedRes = await executeQuery('SELECT JobID, Status, MatchScore FROM JobApplications WHERE ProfileID = @ProfileID', { ProfileID: profileId });
        const appliedMap = new Map();
        appliedRes.recordset.forEach(a => appliedMap.set(a.JobID, a));

        // Parallel compute match score
        jobs = await Promise.all(
          jobs.map(async (job) => {
            const aiAnalysis = await AIMatchingService.calculateMatchScore(profileId, job.JobID);
            return {
              ...job,
              matchScore: aiAnalysis.matchScore,
              isSaved: savedJobIds.has(job.JobID),
              isApplied: appliedMap.has(job.JobID),
              applicationStatus: appliedMap.get(job.JobID)?.Status || null
            };
          })
        );
      }
    }

    return res.json({
      success: true,
      data: jobs
    });
  } catch (error) {
    console.error('getJobs error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Get Single Job Detail
const getJobById = async (req, res) => {
  try {
    const { id } = req.params;

    const jobQuery = `
      SELECT jp.JobID, jp.Title, jp.Description, jp.Requirements, jp.SalaryRange, jp.Location,
             jp.Status, jp.CreatedAt, jp.ExpiresAt,
             e.EmployerID, e.CompanyName, e.CompanyLogoUrl, e.Website, e.CompanySize, e.Address, e.Description AS CompanyDescription,
             jc.CategoryID, jc.CategoryName
      FROM JobPostings jp
      JOIN Employers e ON jp.EmployerID = e.EmployerID
      LEFT JOIN JobCategories jc ON jp.CategoryID = jc.CategoryID
      WHERE jp.JobID = @JobID
    `;

    const jobRes = await executeQuery(jobQuery, { JobID: id });
    if (!jobRes.recordset || jobRes.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy tin tuyển dụng' });
    }

    const job = jobRes.recordset[0];

    // Fetch Required Skills
    const skillsRes = await executeQuery(`
      SELECT st.SkillID, st.SkillName, st.NormalizedName, jsr.IsMandatory
      FROM JobSkillRequirements jsr
      JOIN SkillTaxonomy st ON jsr.SkillID = st.SkillID
      WHERE jsr.JobID = @JobID
    `, { JobID: id });

    job.requiredSkills = skillsRes.recordset;

    // Additional context for candidate if logged in
    let candidateContext = {
      isSaved: false,
      isApplied: false,
      application: null,
      aiAnalysis: null,
      candidateCVs: []
    };

    if (req.user && req.user.role === 'Candidate') {
      const candRes = await executeQuery('SELECT ProfileID FROM CandidateProfiles WHERE UserID = @UserID', { UserID: req.user.userId });
      if (candRes.recordset && candRes.recordset.length > 0) {
        const profileId = candRes.recordset[0].ProfileID;

        // Check if saved
        const savedRes = await executeQuery('SELECT 1 FROM SavedJobs WHERE UserID = @UserID AND JobID = @JobID', {
          UserID: req.user.userId,
          JobID: id
        });
        candidateContext.isSaved = savedRes.recordset && savedRes.recordset.length > 0;

        // Check application
        const appRes = await executeQuery('SELECT * FROM JobApplications WHERE ProfileID = @ProfileID AND JobID = @JobID', {
          ProfileID: profileId,
          JobID: id
        });
        if (appRes.recordset && appRes.recordset.length > 0) {
          candidateContext.isApplied = true;
          candidateContext.application = appRes.recordset[0];
        }

        // Fetch candidate CVs
        const cvsRes = await executeQuery('SELECT CVID, Title, FileUrl, IsPrimary FROM CVs WHERE ProfileID = @ProfileID ORDER BY IsPrimary DESC', {
          ProfileID: profileId
        });
        candidateContext.candidateCVs = cvsRes.recordset;

        // AI Skill Gap & Match Analysis
        candidateContext.aiAnalysis = await AIMatchingService.calculateMatchScore(profileId, id);
      }
    }

    return res.json({
      success: true,
      data: {
        ...job,
        candidateContext
      }
    });
  } catch (error) {
    console.error('getJobById error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Toggle Save / Unsave Job (UC-C10)
const toggleSaveJob = async (req, res) => {
  try {
    const { jobId } = req.body;
    const userId = req.user.userId;

    if (!jobId) {
      return res.status(400).json({ success: false, message: 'Thiếu jobId' });
    }

    const checkRes = await executeQuery('SELECT 1 FROM SavedJobs WHERE UserID = @UserID AND JobID = @JobID', {
      UserID: userId,
      JobID: jobId
    });

    let isSaved = false;
    if (checkRes.recordset && checkRes.recordset.length > 0) {
      // Unsave
      await executeQuery('DELETE FROM SavedJobs WHERE UserID = @UserID AND JobID = @JobID', {
        UserID: userId,
        JobID: jobId
      });
      isSaved = false;
    } else {
      // Save
      await executeQuery('INSERT INTO SavedJobs (UserID, JobID) VALUES (@UserID, @JobID)', {
        UserID: userId,
        JobID: jobId
      });
      isSaved = true;
    }

    return res.json({
      success: true,
      message: isSaved ? 'Đã lưu công việc vào danh sách yêu thích!' : 'Đã xóa khỏi danh sách đã lưu',
      isSaved
    });
  } catch (error) {
    console.error('toggleSaveJob error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Apply to Job (UC-C13)
const applyJob = async (req, res) => {
  try {
    const { jobId, cvId } = req.body;
    const userId = req.user.userId;

    if (!jobId) {
      return res.status(400).json({ success: false, message: 'Vui lòng chọn công việc để ứng tuyển' });
    }

    // Get candidate profile
    const candRes = await executeQuery('SELECT ProfileID FROM CandidateProfiles WHERE UserID = @UserID', { UserID: userId });
    if (!candRes.recordset || candRes.recordset.length === 0) {
      return res.status(400).json({ success: false, message: 'Chưa tìm thấy hồ sơ ứng viên' });
    }
    const profileId = candRes.recordset[0].ProfileID;

    // Check if already applied
    const existing = await executeQuery('SELECT ApplicationID FROM JobApplications WHERE JobID = @JobID AND ProfileID = @ProfileID', {
      JobID: jobId,
      ProfileID: profileId
    });
    if (existing.recordset && existing.recordset.length > 0) {
      return res.status(400).json({ success: false, message: 'Bạn đã nộp đơn ứng tuyển cho công việc này rồi!' });
    }

    // Calculate AI Match Score
    const aiResult = await AIMatchingService.calculateMatchScore(profileId, jobId);

    // If no cvId specified, get primary CV
    let targetCvId = cvId;
    if (!targetCvId) {
      const primaryCvRes = await executeQuery('SELECT CVID FROM CVs WHERE ProfileID = @ProfileID ORDER BY IsPrimary DESC', { ProfileID: profileId });
      if (primaryCvRes.recordset && primaryCvRes.recordset.length > 0) {
        targetCvId = primaryCvRes.recordset[0].CVID;
      }
    }

    // Insert JobApplication
    const insertRes = await executeQuery(
      `INSERT INTO JobApplications (JobID, ProfileID, CVID, MatchScore, Status, AppliedAt)
       OUTPUT INSERTED.ApplicationID, INSERTED.MatchScore, INSERTED.Status, INSERTED.AppliedAt
       VALUES (@JobID, @ProfileID, @CVID, @MatchScore, 'Applied', GETDATE())`,
      {
        JobID: jobId,
        ProfileID: profileId,
        CVID: targetCvId || null,
        MatchScore: aiResult.matchScore
      }
    );

    return res.status(201).json({
      success: true,
      message: 'Nộp hồ sơ ứng tuyển thành công! AI đã tính toán điểm phù hợp hồ sơ của bạn.',
      data: {
        application: insertRes.recordset[0],
        aiAnalysis: aiResult
      }
    });
  } catch (error) {
    console.error('applyJob error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getJobs,
  getJobById,
  toggleSaveJob,
  applyJob
};
