const { executeQuery } = require('../config/db');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const openai = require('./openaiService');
const { canViewApplicantMatching } = require('./applicantMatchingAccess');
const screeningService = require('./screeningService');
const { getGeminiModel } = require('./cvAnalysisService');

const error = (status, message) => Object.assign(new Error(message), { status });

function generateFallbackReview(appInfo, jobInfo, screeningEval) {
  const matched = screeningEval?.matchedSkills || [];
  const missing = screeningEval?.missingSkills || [];
  const reasons = screeningEval?.reasons || [];
  const score = screeningEval?.screeningScore ?? 0;
  const group = screeningEval?.resultGroup || 'ReviewNeeded';

  const groupLabel = group === 'Passed' ? 'Đạt' : group === 'Failed' ? 'Chưa đạt' : 'Cần xem thêm';
  const summary = `Hồ sơ thuộc nhóm [${groupLabel}] với điểm kỹ năng ${score}%. ${reasons.slice(0, 2).join(' ')}`;

  const strengths = [];
  if (matched.length) {
    strengths.push(`Đáp ứng tốt ${matched.length} kỹ năng trọng tâm: ${matched.slice(0, 4).map(s => s.skillName).join(', ')}.`);
  }
  if (screeningEval?.certsResult?.status === 'Passed') {
    strengths.push('Thỏa mãn đầy đủ các chứng chỉ chuyên môn bắt buộc của vị trí.');
  }
  if (screeningEval?.gpaResult?.status === 'Passed') {
    strengths.push(`Kết quả học tập GPA (${screeningEval.gpaResult.candidateGpa}) đạt chuẩn yêu cầu.`);
  }
  if (!strengths.length) {
    strengths.push('Hồ sơ có nền tảng học vấn hoặc kinh nghiệm cơ bản.');
  }

  const concerns = [];
  const missingMandatory = missing.filter(s => s.isMandatory);
  if (missingMandatory.length) {
    concerns.push(`Chưa có bằng chứng rõ ràng cho các kỹ năng bắt buộc: ${missingMandatory.map(s => s.skillName).join(', ')}.`);
  }
  if (screeningEval?.gpaResult?.status === 'Missing') {
    concerns.push('Chưa thể hiện điểm GPA trong CV để đối chiếu tự động.');
  } else if (screeningEval?.gpaResult?.status === 'Below') {
    concerns.push(`GPA (${screeningEval.gpaResult.candidateGpa}) dưới ngưỡng tối thiểu (${screeningEval.gpaResult.requiredGpa}).`);
  }
  if (screeningEval?.certsResult?.missing?.length) {
    concerns.push(`Thiếu chứng chỉ: ${screeningEval.certsResult.missing.join(', ')}.`);
  }
  if (!concerns.length) {
    concerns.push('Không có cảnh báo nghiêm trọng về tiêu chí định lượng.');
  }

  const stabilityAndFit = screeningEval?.signals?.experienceCount > 0
    ? `Ứng viên có ${screeningEval.signals.experienceCount} mốc kinh nghiệm trong hồ sơ. Khuyến nghị kiểm tra tính liên tục và thời gian gắn bó trong phỏng vấn.`
    : 'Ứng viên chưa cung cấp nhiều thông tin về lịch sử công tác trước đây.';

  const interviewQuestions = [];
  if (missing.length > 0) {
    interviewQuestions.push({
      question: `Bạn đã từng áp dụng kỹ năng ${missing[0].skillName} vào dự án thực tế nào chưa, và mức độ tham gia ra sao?`,
      purpose: `Kiểm chứng năng lực thực tế đối với kỹ năng còn thiếu trên CV (${missing[0].skillName}).`
    });
  }
  interviewQuestions.push({
    question: `Dự án nào bạn cảm thấy tự hào nhất và những thách thức kỹ thuật lớn nhất bạn từng giải quyết là gì?`,
    purpose: 'Đánh giá chiều sâu chuyên môn, tư duy giải quyết vấn đề và đóng góp thực tế.'
  });
  interviewQuestions.push({
    question: 'Điều gì thúc đẩy bạn quan tâm đến vị trí này tại công ty chúng tôi và định hướng nghề nghiệp 2 năm tới của bạn?',
    purpose: 'Đánh giá mức độ phù hợp văn hóa và kỳ vọng gắn bó lâu dài.'
  });

  return {
    summary,
    strengths,
    concerns,
    stabilityAndFit,
    interviewQuestions
  };
}

async function getOrGenerateDeepReview(applicationId, employerUserId) {
  // Check ownership
  const appCheck = await executeQuery(`
    SELECT ja.ApplicationID, ja.JobID, ja.ProfileID, ja.CVID, ja.CVVersionID, ja.CriteriaVersion,
           ja.ScreeningResultGroup, ja.ScreeningScore, ja.ScreeningDetailsJson,
           j.Title AS JobTitle, j.Description AS JobDescription, j.Requirements AS JobRequirements,
           e.EmployerID
    FROM JobApplications ja
    JOIN JobPostings j ON ja.JobID = j.JobID
    JOIN Employers e ON j.EmployerID = e.EmployerID
    WHERE ja.ApplicationID = @ApplicationID AND e.UserID = @UserID
  `, {
    ApplicationID: applicationId,
    UserID: employerUserId
  });

  if (!appCheck.recordset || appCheck.recordset.length === 0) {
    throw error(404, 'Không tìm thấy hồ sơ ứng tuyển hoặc bạn không có quyền truy cập.');
  }

  const app = appCheck.recordset[0];

  // Check paid subscription
  const hasAccess = await canViewApplicantMatching(app.EmployerID);
  if (!hasAccess) {
    throw error(403, 'Tính năng nhận xét sâu AI dành riêng cho nhà tuyển dụng có gói trả phí còn hạn.');
  }

  // Get active criteria version
  const criteria = await screeningService.getJobScreeningCriteria(app.JobID);
  const targetCriteriaVersion = criteria.Version || 1;
  const cvVersionId = app.CVVersionID || null;

  // Check cached review
  const cached = (await executeQuery(`
    SELECT TOP 1 ReviewID, Summary, DetailsJson, CreatedAt
    FROM AIDeepReviews
    WHERE ApplicationID = @ApplicationID
      AND CriteriaVersion = @CriteriaVersion
      AND ((CVVersionID IS NULL AND @CVVersionID IS NULL) OR CVVersionID = @CVVersionID)
    ORDER BY ReviewID DESC
  `, {
    ApplicationID: applicationId,
    CriteriaVersion: targetCriteriaVersion,
    CVVersionID: cvVersionId
  })).recordset[0];

  if (cached) {
    try {
      const parsedDetails = JSON.parse(cached.DetailsJson);
      return {
        reviewId: cached.ReviewID,
        summary: cached.Summary,
        ...parsedDetails,
        createdAt: cached.CreatedAt,
        isCached: true
      };
    } catch (_) {
      // If parsing fails, fall through to regenerate
    }
  }

  // Load context
  const context = await screeningService.getApplicationCVContext(applicationId);
  const requiredSkills = await screeningService.getJobSkills(app.JobID);
  const screeningEval = screeningService.evaluateScreening(context, criteria, requiredSkills);

  let reviewData = null;
  const provider = openai.getProvider();

  if (provider === 'gemini' || provider === 'openai') {
    try {
      const cvDataSummary = JSON.stringify({
        personal: context?.data?.personal,
        summary: context?.data?.summary,
        skills: (context?.data?.skills || []).map(s => ({ name: s.canonicalName || s.name, verified: s.verified })),
        experiences: context?.data?.experiences,
        educations: context?.data?.educations,
        certifications: context?.data?.certifications
      });

      const promptText = `Bạn là Chuyên gia Tuyển dụng Cao cấp (Senior HR Executive / Technical Recruiter).
Hãy đưa ra NHẬN XÉT SÂU khách quan, công tâm cho ứng viên đối chiếu với tin tuyển dụng.

THÔNG TIN VỊ TRÍ:
- Tiêu đề: ${app.JobTitle}
- Mô tả: ${app.JobDescription}
- Yêu cầu: ${app.JobRequirements}
- Tiêu chí sàng lọc: Mức ${criteria.ScreeningLevel}, Điểm tối thiểu ${criteria.MinGPA ? `${criteria.MinGPA}/${criteria.GPAScale}` : 'Không bắt buộc'}, Chứng chỉ bắt buộc: ${(criteria.MandatoryCertificates || []).join(', ') || 'Không'}

KẾT QUẢ ĐỐI CHIẾU SƠ BỘ:
- Nhóm: ${screeningEval.resultGroup} (${screeningEval.screeningScore}%)
- Kỹ năng khớp: ${screeningEval.matchedSkills.map(s => s.skillName).join(', ') || 'Chưa có'}
- Kỹ năng thiếu: ${screeningEval.missingSkills.map(s => s.skillName).join(', ') || 'Không'}
- Ghi chú: ${screeningEval.reasons.join('; ')}

DỮ LIỆU CV ỨNG VIÊN:
${cvDataSummary}

YÊU CẦU:
Trả về DUY NHẤT một đối tượng JSON hợp lệ không có markdown code block, theo cấu trúc:
{
  "summary": "Đoạn nhận định tổng quan 2-3 câu về mức độ đáp ứng và tiềm năng của ứng viên",
  "strengths": ["Điểm mạnh nổi bật 1", "Điểm mạnh 2", "Điểm mạnh 3"],
  "concerns": ["Điểm cần lưu ý/rủi ro 1", "Điểm cần lưu ý 2"],
  "stabilityAndFit": "Đánh giá về tính ổn định trong công việc, số năm kinh nghiệm và mức độ phù hợp văn hóa",
  "interviewQuestions": [
    { "question": "Nội dung câu hỏi phỏng vấn đề xuất", "purpose": "Mục tiêu nhằm kiểm chứng điều gì" }
  ]
}`;

      if (provider === 'openai') {
        const raw = await openai.generateJSON([promptText]);
        if (raw?.summary && Array.isArray(raw?.strengths)) {
          reviewData = raw;
        }
      } else if (provider === 'gemini') {
        const model = new GoogleGenerativeAI(process.env.GEMINI_API_KEY.trim()).getGenerativeModel({
          model: getGeminiModel(),
          generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 4000, temperature: 0.2 }
        });
        const resp = await model.generateContent([promptText], { timeout: 45000 });
        const raw = JSON.parse(resp.response.text());
        if (raw?.summary && Array.isArray(raw?.strengths)) {
          reviewData = raw;
        }
      }
    } catch (aiErr) {
      console.warn('AI Deep Review generation warning (falling back to heuristic):', aiErr.message);
    }
  }

  if (!reviewData) {
    reviewData = generateFallbackReview(app, { Title: app.JobTitle }, screeningEval);
  }

  const summaryText = reviewData.summary || 'Đã phân tích hồ sơ ứng viên.';
  const detailsJson = JSON.stringify({
    strengths: reviewData.strengths || [],
    concerns: reviewData.concerns || [],
    stabilityAndFit: reviewData.stabilityAndFit || '',
    interviewQuestions: reviewData.interviewQuestions || []
  });

  const insertRes = await executeQuery(`
    INSERT INTO AIDeepReviews (ApplicationID, CVVersionID, CriteriaVersion, Summary, DetailsJson, CreatedAt)
    OUTPUT INSERTED.ReviewID, INSERTED.CreatedAt
    VALUES (@ApplicationID, @CVVersionID, @CriteriaVersion, @Summary, @DetailsJson, SYSUTCDATETIME())
  `, {
    ApplicationID: applicationId,
    CVVersionID: cvVersionId,
    CriteriaVersion: targetCriteriaVersion,
    Summary: summaryText,
    DetailsJson: detailsJson
  });

  return {
    reviewId: insertRes.recordset[0].ReviewID,
    summary: summaryText,
    strengths: reviewData.strengths || [],
    concerns: reviewData.concerns || [],
    stabilityAndFit: reviewData.stabilityAndFit || '',
    interviewQuestions: reviewData.interviewQuestions || [],
    createdAt: insertRes.recordset[0].CreatedAt,
    isCached: false
  };
}

module.exports = {
  getOrGenerateDeepReview,
  generateFallbackReview
};

