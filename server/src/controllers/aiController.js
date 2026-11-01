const { executeQuery } = require('../config/db');
const aiService = require('../services/aiService');

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
      message: 'Chưa tạo được nội dung tuyển dụng. Vui lòng thử lại.'
    });
  }
};

/**
 * 2. AI CV Parser
 * POST /api/ai/parse-cv
 */
const parseCV = async (req, res, next) => {
  try {
    const service = require('../services/cvAnalysisService');
    if (!req.body.cvId) return res.status(400).json({ success: false, message: 'Tải CV trong Quản lý CV để đọc và kiểm tra nội dung.' });
    const cv = await service.ownedCV(req.body.cvId, req.user.userId);
    const version = await service.ensureVersion(cv);
    return res.json({ success: true, data: service.publicVersion(version, true) });
  } catch (error) { next(error); }
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
      message: 'Chưa tạo được buổi phỏng vấn. Vui lòng thử lại.'
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
          JobTitleTarget: jobTitle || 'Phỏng vấn thử',
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
      message: 'Chưa đánh giá được bài phỏng vấn. Vui lòng thử lại.'
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
