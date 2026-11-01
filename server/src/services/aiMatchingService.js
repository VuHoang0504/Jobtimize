const { executeQuery } = require('../config/db');
const cvAnalysis = require('./cvAnalysisService');
const { canonicalSkill, aliases, fold, positiveMention, hash } = require('./cvNormalization');

const unavailable = (summary, status = 'NotReady') => ({ matchScore: null, status, matchedSkills: [], missingSkills: [], recommendedCourses: [], summary });
class AIMatchingService {
  static hasSkill(text, skill) {
    return aliases(skill.SkillName).some(term => positiveMention(text, term)) || (skill.NormalizedName && positiveMention(text, skill.NormalizedName));
  }
  static extractSkillsFromText(text = '', taxonomy = []) { return taxonomy.filter(skill => this.hasSkill(text, skill)); }
  // Pure comparison shared by job detail, search and the CV recommendations workspace.
  static compareSkills(context, required) {
    if (!context?.version || context.version.Status !== 'Ready' || !context.data) return unavailable('CV chưa sẵn sàng. Mở Quản lý CV để đọc và xác nhận thông tin.');
    const metadata = { cvId: context.cv.CVID, cvTitle: context.cv.Title, cvVersionId: context.version.VersionID, cvVersion: context.version.VersionNumber };
    if (!required.length) return { ...unavailable('Tin tuyển dụng chưa có tiêu chí kỹ năng để đối chiếu.', 'NoCriteria'), ...metadata };
    const matchedSkills = [], missingSkills = [];
    let total = 0, earned = 0;
    for (const requirement of required) {
      const weight = requirement.IsMandatory ? 2 : 1;
      total += weight;
      const found = (context.data.skills || []).find(skill => skill.verified &&
        (Number(skill.skillId) === Number(requirement.SkillID) || canonicalSkill(skill.name, [requirement]) || fold(skill.canonicalName) === fold(requirement.SkillName)));
      const item = { skillId: requirement.SkillID, skillName: requirement.SkillName, isMandatory: Boolean(requirement.IsMandatory), weight };
      if (found) { earned += weight; matchedSkills.push({ ...item, evidence: found.evidence, source: found.source }); }
      else missingSkills.push(item);
    }
    const matchScore = Math.round(earned / total * 100);
    return { status: 'Ready', matchScore, matchedSkills, missingSkills, recommendedCourses: [], ...metadata,
      algorithmVersion: 'skills-v2', criteriaHash: hash(JSON.stringify(required.map(row => [row.SkillID, row.IsMandatory]).sort())),
      summary: `CV “${context.cv.Title}” phiên bản ${context.version.VersionNumber} đáp ứng ${matchedSkills.length}/${required.length} kỹ năng (${matchScore}%). Điểm phản ánh yêu cầu kỹ năng, không phải xác suất trúng tuyển.` };
  }
  static async getCVContext(profileId, cvId) {
    await cvAnalysis.initialize();
    const cv = (await executeQuery(`SELECT TOP 1 * FROM CVs WHERE ProfileID=@ProfileID AND IsArchived=0
      ${cvId ? 'AND CVID=@CVID' : ''} ORDER BY IsPrimary DESC,UpdatedAt DESC,CVID DESC`, { ProfileID: profileId, ...(cvId ? { CVID: cvId } : {}) })).recordset[0];
    if (!cv) return null;
    const version = await cvAnalysis.ensureVersion(cv);
    return { cv, version, data: cvAnalysis.parse(version?.ConfirmedJson) };
  }
  static async calculateMatchScore(profileId, jobId, cvId = null, prepared = undefined) {
    try {
      const context = prepared === undefined ? await this.getCVContext(profileId, cvId) : prepared;
      if (!context?.version || context.version.Status !== 'Ready' || !context.data) return unavailable('CV chưa sẵn sàng. Mở Quản lý CV để đọc và xác nhận thông tin.');
      const rows = (await executeQuery(`SELECT jp.JobID,jp.Title,jp.Requirements,jp.Description,jsr.SkillID,jsr.IsMandatory,st.SkillName,st.NormalizedName
        FROM JobPostings jp LEFT JOIN JobSkillRequirements jsr ON jp.JobID=jsr.JobID
        LEFT JOIN SkillTaxonomy st ON jsr.SkillID=st.SkillID WHERE jp.JobID=@JobID`, { JobID: jobId })).recordset;
      if (!rows.length) return unavailable('Không tìm thấy tin tuyển dụng.', 'Unavailable');
      let required = rows.filter(row => row.SkillID != null);
      if (!required.length) {
        const taxonomy = (await executeQuery('SELECT SkillID,SkillName,NormalizedName FROM SkillTaxonomy')).recordset;
        const text = rows[0].Title + '\n' + rows[0].Description + '\n' + rows[0].Requirements;
        required = this.extractSkillsFromText(text, taxonomy).map(skill => ({ ...skill, IsMandatory: false }));
      }
      const result = this.compareSkills(context, required);
      const { missingSkills } = result;
      let recommendedCourses = [];
      const ids = missingSkills.map(skill => Number(skill.skillId)).filter(Number.isSafeInteger);
      if (ids.length) recommendedCourses = (await executeQuery(`SELECT c.CourseID,c.Title,c.Provider,c.Url,c.SkillID,st.SkillName FROM Courses c
        JOIN SkillTaxonomy st ON c.SkillID=st.SkillID WHERE c.SkillID IN (${ids.join(',')})`)).recordset;
      return { ...result, recommendedCourses };
    } catch (error) {
      console.error('CV matching unavailable:', error.code || error.name);
      return unavailable('Chưa tính được điểm phù hợp. Vui lòng thử lại.', 'Unavailable');
    }
  }
}
module.exports = AIMatchingService;
