const { executeQuery } = require('../config/db');
const { canViewApplicantMatching } = require('../services/applicantMatchingAccess');
const matching = require('../services/aiMatchingService');

async function employerAccess(userId) {
  const employer = (await executeQuery('SELECT EmployerID FROM Employers WHERE UserID=@UserID', { UserID: userId })).recordset[0];
  if (!employer) throw Object.assign(new Error('Không tìm thấy hồ sơ nhà tuyển dụng.'), { status: 403 });
  return { employerId: employer.EmployerID, hasAccess: await canViewApplicantMatching(employer.EmployerID) };
}

async function getJobs(req, res) {
  try {
    const access = await employerAccess(req.user.userId);
    const jobs = access.hasAccess ? (await executeQuery(`SELECT JobID, Title, Location, ExpiresAt FROM JobPostings
      WHERE EmployerID=@ID AND Status='Published' AND (ExpiresAt IS NULL OR ExpiresAt>GETDATE())
      ORDER BY JobID DESC`, { ID: access.employerId })).recordset : [];
    return res.json({ success: true, data: { hasAccess: access.hasAccess, jobs } });
  } catch (error) { return res.status(error.status || 500).json({ success: false, message: 'Chưa tải được tin tuyển dụng. Vui lòng thử lại.' }); }
}

function rankCandidates(rows, criteria) {
  const results = [];
  for (const row of rows) {
    let data;
    try { data = JSON.parse(row.ConfirmedJson); } catch (_) { continue; }
    if (!data || !Array.isArray(data.skills)) continue;
    const analysis = matching.compareSkills({ cv: { CVID: row.CVID, Title: row.CVTitle },
      version: { Status: row.VersionStatus, VersionID: row.VersionID, VersionNumber: row.VersionNumber }, data }, criteria);
    if (analysis.status !== 'Ready' || analysis.matchScore <= 0) continue;
    results.push({ ProfileID: row.ProfileID, FullName: row.FullName, Headline: row.Headline,
      CurrentLocation: row.CurrentLocation, DesiredSalary: row.DesiredSalary, CVTitle: row.CVTitle,
      CVFileUrl: `/api/cv-documents/talent/${row.ProfileID}/file`, analysis });
  }
  return results.sort((a, b) => b.analysis.matchScore - a.analysis.matchScore || a.analysis.missingSkills.filter(s => s.isMandatory).length - b.analysis.missingSkills.filter(s => s.isMandatory).length || a.ProfileID - b.ProfileID);
}

async function findCandidates(req, res) {
  try {
    const jobId = Number(req.params.jobId);
    const page = Number(req.query.page || 1);
    if (!Number.isSafeInteger(jobId) || jobId < 1 || !Number.isSafeInteger(page) || page < 1) return res.status(400).json({ success: false, message: 'Tin tuyển dụng hoặc trang kết quả không hợp lệ.' });
    const access = await employerAccess(req.user.userId);
    if (!access.hasAccess) return res.status(403).json({ success: false, message: 'Mở gói trả phí để tìm ứng viên phù hợp theo tin tuyển dụng.' });
    const job = (await executeQuery(`SELECT JobID,Title,Description,Requirements,Location FROM JobPostings
      WHERE JobID=@JobID AND EmployerID=@EmployerID AND Status='Published'
      AND (ExpiresAt IS NULL OR ExpiresAt>GETDATE())`, { JobID: jobId, EmployerID: access.employerId })).recordset[0];
    if (!job) return res.status(404).json({ success: false, message: 'Tin không thuộc tài khoản của bạn hoặc đã ngừng tuyển dụng.' });
    let criteria = (await executeQuery(`SELECT st.SkillID,st.SkillName,st.NormalizedName,jsr.IsMandatory
      FROM JobSkillRequirements jsr JOIN SkillTaxonomy st ON st.SkillID=jsr.SkillID WHERE jsr.JobID=@JobID`, { JobID: jobId })).recordset;
    let criteriaSource = 'structured';
    if (!criteria.length) {
      criteriaSource = 'text';
      const taxonomy = (await executeQuery('SELECT SkillID,SkillName,NormalizedName FROM SkillTaxonomy')).recordset;
      criteria = matching.extractSkillsFromText(`${job.Title}\n${job.Description || ''}\n${job.Requirements || ''}`, taxonomy).map(skill => ({ ...skill, IsMandatory: false }));
    }
    if (!criteria.length) return res.json({ success: true, data: { job, criteria, criteriaSource, candidates: [], total: 0, page, pages: 0, evaluated: 0,
      message: 'Tin chưa có kỹ năng để đối chiếu. Hãy bổ sung yêu cầu kỹ năng trong tin tuyển dụng.' } });
    const rows = (await executeQuery(`SELECT cp.ProfileID,cp.Headline,cp.CurrentLocation,cp.DesiredSalary,u.FullName,
      cv.CVID,cv.Title AS CVTitle,v.VersionID,v.VersionNumber,v.Status AS VersionStatus,v.ConfirmedJson
      FROM CandidateProfiles cp JOIN Users u ON u.UserID=cp.UserID
      CROSS APPLY (SELECT TOP 1 CVID,Title FROM CVs WHERE ProfileID=cp.ProfileID AND IsPrimary=1 AND IsArchived=0 ORDER BY CVID DESC) cv
      CROSS APPLY (SELECT TOP 1 VersionID,VersionNumber,Status,ConfirmedJson FROM CVDocumentVersions WHERE CVID=cv.CVID ORDER BY VersionNumber DESC) v
      WHERE cp.IsLookingForJob=1 AND u.Status='Active' AND v.Status='Ready'`)).recordset;
    const ranked = rankCandidates(rows, criteria);
    return res.json({ success: true, data: { job, criteria, criteriaSource, evaluated: rows.length,
      total: ranked.length, page, pages: Math.ceil(ranked.length / 20), candidates: ranked.slice((page - 1) * 20, page * 20) } });
  } catch (error) {
    console.error('Candidate matching error:', error.message);
    return res.status(error.status || 500).json({ success: false, message: 'Chưa tìm được ứng viên. Vui lòng thử lại.' });
  }
}

module.exports = { getJobs, findCandidates, rankCandidates };
