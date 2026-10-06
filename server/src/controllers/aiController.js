const { executeQuery } = require('../config/db');
const aiService = require('../services/aiService');
const path = require('path');
const fs = require('fs');

/**
 * 1. AI JD Generator
 * POST /api/ai/generate-jd
 */
const generateJD = async (req, res) => {
  try {
    const { title, categoryName, level, skills, additionalNotes } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp tiêu đề vị trí tuyển dụng'
      });
    }

    const jdData = await aiService.generateJD({
      title,
      categoryName,
      level,
      skills,
      additionalNotes
    });

    return res.json({
      success: true,
      data: jdData
    });
  } catch (error) {
    console.error('generateJD error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Lỗi khi tạo JD bằng AI'
    });
  }
};

/**
 * 2. AI CV Parser
 * POST /api/ai/parse-cv
 */
const parseCV = async (req, res) => {
  try {
    let parsedData = null;
    let rawTextLength = 0;

    // Fetch skills from SkillTaxonomy for reference
    const skillsRes = await executeQuery('SELECT SkillName, NormalizedName FROM SkillTaxonomy');
    const skillTaxonomyList = skillsRes.recordset || [];
    const imageExtensions = ['.png', '.jpg', '.jpeg', '.webp'];

    // Custom API Key & Model selection provided by user (optional)
    const customApiKey = req.body.apiKey || req.headers['x-gemini-api-key'] || null;
    const preferredModel = req.body.model || req.headers['x-gemini-model'] || null;

    // 1. If a file was uploaded in this request
    if (req.file) {
      const filePath = req.file.path;
      const ext = path.extname(req.file.originalname || filePath).toLowerCase();

      if (imageExtensions.includes(ext)) {
        const mimeType = req.file.mimetype || (ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg');
        parsedData = await aiService.parseCVFromImage(filePath, mimeType, skillTaxonomyList, customApiKey, preferredModel);
      } else {
        const rawText = await aiService.extractTextFromFile(filePath);
        rawTextLength = rawText.length;
        parsedData = await aiService.parseCVWithAI(rawText, skillTaxonomyList, customApiKey, preferredModel);
      }
    } 
    // 2. If rawText provided in body
    else if (req.body.rawText) {
      const rawText = req.body.rawText;
      rawTextLength = rawText.length;
      parsedData = await aiService.parseCVWithAI(rawText, skillTaxonomyList, customApiKey, preferredModel);
    } 
    // 3. If cvId from existing candidate CV in database
    else if (req.body.cvId) {
      const cvRes = await executeQuery('SELECT FileUrl FROM CVs WHERE CVID = @CVID', { CVID: req.body.cvId });
      if (!cvRes.recordset || cvRes.recordset.length === 0) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy file CV' });
      }
      const fileUrl = cvRes.recordset[0].FileUrl;
      const fullPath = path.join(__dirname, '../../', fileUrl);
      const ext = path.extname(fullPath).toLowerCase();

      if (imageExtensions.includes(ext)) {
        const mimeType = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
        parsedData = await aiService.parseCVFromImage(fullPath, mimeType, skillTaxonomyList, customApiKey, preferredModel);
      } else {
        const rawText = await aiService.extractTextFromFile(fullPath);
        rawTextLength = rawText.length;
        parsedData = await aiService.parseCVWithAI(rawText, skillTaxonomyList, customApiKey, preferredModel);
      }
    } else {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng đính kèm file CV (PDF, DOCX, DOC, ảnh PNG/JPG/WEBP hoặc TXT) hoặc cung cấp nội dung text.'
      });
    }

    return res.json({
      success: true,
      data: {
        ...parsedData,
        rawTextLength
      }
    });
  } catch (error) {
    console.error('parseCV error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Lỗi khi phân tích CV bằng AI'
    });
  }
};

/**
 * 3. Start Mock Interview (Generate Questions)
 * POST /api/ai/interview/start
 */
const startMockInterview = async (req, res) => {
  try {
    const { jobTitle, jobId, level, numberOfQuestions } = req.body;

    let targetTitle = jobTitle;
    let requirements = '';

    if (jobId) {
      const jobRes = await executeQuery(
        `SELECT Title, Requirements, Description FROM JobPostings WHERE JobID = @JobID`,
        { JobID: jobId }
      );
      if (jobRes.recordset && jobRes.recordset.length > 0) {
        const job = jobRes.recordset[0];
        targetTitle = targetTitle || job.Title;
        requirements = `${job.Requirements || ''}\n${job.Description || ''}`;
      }
    }

    if (!targetTitle) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập vị trí ứng tuyển hoặc chọn một việc làm thực tế.'
      });
    }

    const interviewData = await aiService.generateInterviewQuestions({
      jobTitle: targetTitle,
      requirements,
      level: level || 'Middle',
      numberOfQuestions: numberOfQuestions || 4
    });

    return res.json({
      success: true,
      data: interviewData
    });
  } catch (error) {
    console.error('startMockInterview error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Lỗi khi khởi tạo buổi phỏng vấn AI'
    });
  }
};

/**
 * 4. Evaluate Mock Interview
 * POST /api/ai/interview/evaluate
 */
const evaluateMockInterview = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { jobTitle, qaList } = req.body;

    if (!qaList || !Array.isArray(qaList) || qaList.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Danh sách câu hỏi và câu trả lời không hợp lệ.'
      });
    }

    // Call AI Evaluation
    const evaluation = await aiService.evaluateInterview({
      jobTitle: jobTitle || 'Vị trí công việc',
      qaList
    });

    // Save to InterviewPractices table
    const candRes = await executeQuery(
      'SELECT ProfileID FROM CandidateProfiles WHERE UserID = @UserID',
      { UserID: userId }
    );

    if (candRes.recordset && candRes.recordset.length > 0) {
      const profileId = candRes.recordset[0].ProfileID;
      const feedbackJSON = JSON.stringify(evaluation);
      const score = evaluation.overallScore || 0;

      await executeQuery(
        `INSERT INTO InterviewPractices (ProfileID, JobTitleTarget, AIFeedback, Score, PracticedAt)
         VALUES (@ProfileID, @JobTitleTarget, @AIFeedback, @Score, GETDATE())`,
        {
          ProfileID: profileId,
          JobTitleTarget: jobTitle || 'Phỏng vấn thử AI',
          AIFeedback: feedbackJSON,
          Score: score
        }
      );
    }

    return res.json({
      success: true,
      data: evaluation
    });
  } catch (error) {
    console.error('evaluateMockInterview error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Lỗi khi chấm điểm phỏng vấn AI'
    });
  }
};

/**
 * 5. Get Interview Practice History
 * GET /api/ai/interview/history
 */
const getInterviewHistory = async (req, res) => {
  try {
    const userId = req.user.userId;

    const candRes = await executeQuery(
      'SELECT ProfileID FROM CandidateProfiles WHERE UserID = @UserID',
      { UserID: userId }
    );

    if (!candRes.recordset || candRes.recordset.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const profileId = candRes.recordset[0].ProfileID;

    const historyRes = await executeQuery(
      `SELECT PracticeID, JobTitleTarget, Score, AIFeedback, PracticedAt
       FROM InterviewPractices
       WHERE ProfileID = @ProfileID
       ORDER BY PracticedAt DESC`,
      { ProfileID: profileId }
    );

    // Parse JSON feedback
    const formattedHistory = (historyRes.recordset || []).map(row => {
      let feedback = null;
      try {
        feedback = JSON.parse(row.AIFeedback);
      } catch (e) {
        feedback = { raw: row.AIFeedback };
      }
      return {
        practiceId: row.PracticeID,
        jobTitle: row.JobTitleTarget,
        score: row.Score,
        feedback,
        practicedAt: row.PracticedAt
      };
    });

    return res.json({
      success: true,
      data: formattedHistory
    });
  } catch (error) {
    console.error('getInterviewHistory error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Lỗi khi tải lịch sử phỏng vấn'
    });
  }
};

module.exports = {
  generateJD,
  parseCV,
  startMockInterview,
  evaluateMockInterview,
  getInterviewHistory
};
