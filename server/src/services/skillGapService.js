const { executeQuery } = require('../config/db');
const cvAnalysis = require('./cvAnalysisService');
const matching = require('./aiMatchingService');
const courses = require('./courseRecommendations');
const { createRelevance } = require('./cvJobRelevance');

function id(value, name) {
  if (value === undefined || value === null || value === '') return null;
  if (!/^\d+$/.test(String(value)) || !Number.isSafeInteger(Number(value)) || Number(value) < 1 || Number(value) > 2147483647) throw cvAnalysis.fail(`${name} không hợp lệ.`, 400);
  return Number(value);
}
async function analyze(userId, input = {}, options = {}) {
  const cvId = id(input.cvId, 'CV'), jobId = id(input.jobId, 'Tin tuyển dụng'), categoryId = id(input.categoryId, 'Ngành nghề');
  const keyword = String(input.keyword || '').trim().slice(0, 100), location = String(input.location || '').trim().slice(0, 100);
  await cvAnalysis.initialize();
  const profile = (await executeQuery('SELECT ProfileID FROM CandidateProfiles WHERE UserID=@UserID', { UserID: userId })).recordset[0];
  if (!profile) throw cvAnalysis.fail('Không tìm thấy hồ sơ ứng viên.', 404);
  // Read saved versions only. Never call ensureVersion, the parser or an AI model here.
  const rows = (await executeQuery(`SELECT c.CVID,c.Title,c.IsPrimary,v.VersionID,v.VersionNumber,v.Status,v.ConfirmedJson,v.ConfirmedAt
    FROM CVs c OUTER APPLY (SELECT TOP 1 * FROM CVDocumentVersions d WHERE d.CVID=c.CVID AND d.ProfileID=c.ProfileID ORDER BY d.VersionNumber DESC) v
    WHERE c.ProfileID=@ProfileID AND c.IsArchived=0 ORDER BY c.IsPrimary DESC,c.UpdatedAt DESC,c.CVID DESC`, { ProfileID: profile.ProfileID })).recordset;
  const cvs = rows.map(cv => ({ cvId: cv.CVID, title: cv.Title, isPrimary: Boolean(cv.IsPrimary), status: cv.Status || 'NotReady', version: cv.VersionNumber || null }));
  const cv = cvId ? rows.find(row => row.CVID === cvId) : rows.find(row => row.IsPrimary && row.Status === 'Ready') || rows.find(row => row.Status === 'Ready') || rows[0];
  if (cvId && !cv) throw cvAnalysis.fail('Không tìm thấy CV của bạn.', 404);
  const data = cvAnalysis.parse(cv?.ConfirmedJson);
  const selectedCV = cv ? { ...cvs.find(row => row.cvId === cv.CVID), versionId: cv.VersionID, confirmedAt: cv.ConfirmedAt } : null;
  const empty = { cvs, selectedCV, jobs: [], analysis: null, categories: [], unscoredCount: 0 };
  if (!cv || cv.Status !== 'Ready' || !data || !Array.isArray(data.skills)) return { ...empty, status: 'NotReady' };
  const context = { cv, version: { Status: cv.Status, VersionID: cv.VersionID, VersionNumber: cv.VersionNumber }, data };
  const [jobsRes, taxonomyRes] = await Promise.all([
    executeQuery(`SELECT jp.JobID,jp.Title,jp.Description,jp.Requirements,jp.CategoryID,jp.SalaryRange,jp.Location,jp.CreatedAt,jp.ExpiresAt,
      e.CompanyName,jc.CategoryName,
      (SELECT st.SkillID,st.SkillName,st.NormalizedName,jsr.IsMandatory FROM JobSkillRequirements jsr
       JOIN SkillTaxonomy st ON st.SkillID=jsr.SkillID WHERE jsr.JobID=jp.JobID FOR JSON PATH) RequiredSkillsJson
      FROM JobPostings jp JOIN Employers e ON e.EmployerID=jp.EmployerID
      JOIN Users owner ON owner.UserID=e.UserID LEFT JOIN JobCategories jc ON jc.CategoryID=jp.CategoryID
      WHERE jp.Status='Published' AND owner.Status='Active' AND (jp.ExpiresAt IS NULL OR jp.ExpiresAt>GETDATE())
      ORDER BY jp.CreatedAt DESC,jp.JobID DESC`),
    executeQuery('SELECT SkillID,SkillName,NormalizedName,CategoryID FROM SkillTaxonomy')
  ]);
  const categories = [...new Map(jobsRes.recordset.filter(job => job.CategoryID).map(job => [job.CategoryID, { categoryId: job.CategoryID, name: job.CategoryName }])).values()];
  if (jobId && !jobsRes.recordset.some(job => job.JobID === jobId)) throw cvAnalysis.fail('Tin tuyển dụng đã đóng hoặc không còn nhận ứng tuyển.', 404);
  const relevance = createRelevance(data, taxonomyRes.recordset);
  const compared = jobsRes.recordset.map(job => {
    let requirements = cvAnalysis.parse(job.RequiredSkillsJson) || [];
    const criteriaSource = requirements.length ? 'employer' : 'description';
    if (!requirements.length) requirements = matching.extractSkillsFromText(`${job.Title}\n${job.Description}\n${job.Requirements}`, taxonomyRes.recordset).map(skill => ({ ...skill, IsMandatory: false }));
    const analysis = matching.compareSkills(context, requirements);
    const { Description, Requirements, RequiredSkillsJson, ...summary } = job;
    const comparedJob = { ...summary, analysis: { ...analysis, criteriaSource }, matchScore: analysis.matchScore,
      matchedCount: analysis.matchedSkills.length, missingMandatoryCount: analysis.missingSkills.filter(skill => skill.isMandatory).length };
    const related = relevance(comparedJob);
    return { ...comparedJob, related: related.related, relevanceRank: related.rank, recommendationReason: related.reason };
  });
  const ranked = compared.filter(job => (!categoryId || job.CategoryID === categoryId) &&
    (!keyword || `${job.Title} ${job.CompanyName}`.toLocaleLowerCase().includes(keyword.toLocaleLowerCase())) &&
    (!location || (job.Location || '').toLocaleLowerCase().includes(location.toLocaleLowerCase())));
  const unscoredCount = ranked.filter(job => job.analysis.status === 'NoCriteria').length;
  const explicitSearch = Boolean(categoryId || keyword);
  const jobs = ranked.filter(job => job.related || explicitSearch || input.scope === 'all').map(job => ({ ...job,
    recommendationReason: job.recommendationReason || (explicitSearch ? 'Theo bộ lọc bạn chọn' : 'Khám phá thêm việc đang tuyển')
  })).sort((a, b) => (b.matchScore ?? -1) - (a.matchScore ?? -1) || b.relevanceRank - a.relevanceRank || a.missingMandatoryCount - b.missingMandatoryCount || new Date(b.CreatedAt) - new Date(a.CreatedAt) || b.JobID - a.JobID);
  const selected = jobId ? compared.find(job => job.JobID === jobId) : jobs[0];
  // An explicit job can be analyzed even if it has no overlap or is outside list filters.
  const analysis = selected ? { ...selected.analysis, job: { ...selected, analysis: undefined } } : null;
  if (analysis?.missingSkills.length) {
    const ids = analysis.missingSkills.map(skill => Number(skill.skillId)).filter(Number.isSafeInteger);
    const params = Object.fromEntries(ids.map((value, i) => [`Skill${i}`, value]));
    const stored = (await executeQuery(`SELECT CourseID,Title,Provider,Url,SkillID,Price,Currency,IsFree,Duration,Level FROM Courses WHERE SkillID IN (${ids.map((_, i) => `@Skill${i}`).join(',')})`, params)).recordset;
    analysis.recommendedCourses = courses.recommendations(analysis.missingSkills, stored);
  }
  if (analysis) analysis.courseSearchSuggestions = courses.searchSuggestions(analysis.missingSkills, analysis.recommendedCourses);
  return { status: 'Ready', cvs, selectedCV, categories, unscoredCount, verifiedSkillCount: data.skills.filter(skill => skill.verified).length,
    jobs: jobs.map(({ analysis, related, relevanceRank, ...job }) => job), analysis,
    ...(options.includeContext ? { context: { cvData: data, job: jobsRes.recordset.find(job => job.JobID === selected?.JobID), taxonomy: taxonomyRes.recordset } } : {}) };
}
module.exports = { analyze };
