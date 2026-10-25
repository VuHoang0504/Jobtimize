const { executeQuery } = require('../config/db');

/**
 * Matching Engine for Jobtimize
 * Analyzes candidate profile & CV skills against job requirements.
 * Strictly returns 0% when no skills match.
 */
class AIMatchingService {
  /**
   * Extract skills array from text / bio / CV title
   */
  static extractSkillsFromText(text = '', skillTaxonomyList = []) {
    if (!text) return [];
    const normalizedText = text.toLowerCase();
    const matchedSkills = [];

    for (const skill of skillTaxonomyList) {
      const sName = (skill.SkillName || '').toLowerCase();
      const sNorm = (skill.NormalizedName || '').toLowerCase();
      if (!sName) continue;

      const pattern = new RegExp(`\\b(${sName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}${sNorm ? `|${sNorm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}` : ''})\\b`, 'i');
      if (pattern.test(normalizedText) || normalizedText.includes(sName) || (sNorm && normalizedText.includes(sNorm))) {
        matchedSkills.push(skill);
      }
    }
    return matchedSkills;
  }

  /**
   * Check whether candidate text contains a given skill (with common aliases)
   */
  static hasSkill(candidateText, skill) {
    if (!candidateText || !skill) return false;
    const sName = (skill.SkillName || '').toLowerCase();
    const sNorm = (skill.NormalizedName || '').toLowerCase();

    const terms = new Set([sName, sNorm].filter(Boolean));
    if (sName.includes('react')) { terms.add('react'); terms.add('reactjs'); terms.add('react.js'); }
    if (sName.includes('node')) { terms.add('node'); terms.add('nodejs'); terms.add('node.js'); }
    if (sName.includes('next')) { terms.add('next'); terms.add('nextjs'); terms.add('next.js'); }
    if (sName.includes('typescript')) { terms.add('typescript'); }
    if (sName.includes('c#') || sName.includes('.net')) { terms.add('c#'); terms.add('.net'); terms.add('dotnet'); terms.add('asp.net'); }
    if (sName.includes('java ') || sName.includes('spring')) { terms.add('spring'); terms.add('spring boot'); terms.add('java'); }
    if (sName.includes('python')) { terms.add('python'); terms.add('django'); terms.add('fastapi'); }
    if (sName.includes('docker')) { terms.add('docker'); }
    if (sName.includes('kubernetes')) { terms.add('kubernetes'); terms.add('k8s'); }
    if (sName.includes('aws')) { terms.add('aws'); terms.add('amazon web services'); }
    if (sName.includes('azure')) { terms.add('azure'); }
    if (sName.includes('sql server')) { terms.add('sql server'); terms.add('mssql'); }
    if (sName.includes('postgresql')) { terms.add('postgresql'); terms.add('postgres'); }
    if (sName.includes('mongodb')) { terms.add('mongodb'); }
    if (sName.includes('redis')) { terms.add('redis'); }
    if (sName.includes('figma')) { terms.add('figma'); terms.add('ui/ux'); }
    if (sName.includes('tailwind')) { terms.add('tailwind'); terms.add('tailwindcss'); }

    for (const term of terms) {
      if (term && candidateText.includes(term)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Calculate Match Score between a Candidate Profile/CV and a Job Posting
   */
  static async calculateMatchScore(profileId, jobId) {
    try {
      // 1. Fetch Job and its required skills
      const jobQuery = `
        SELECT jp.JobID, jp.Title, jp.Requirements, jp.Description,
               jsr.SkillID, jsr.IsMandatory, st.SkillName, st.NormalizedName
        FROM JobPostings jp
        LEFT JOIN JobSkillRequirements jsr ON jp.JobID = jsr.JobID
        LEFT JOIN SkillTaxonomy st ON jsr.SkillID = st.SkillID
        WHERE jp.JobID = @JobID
      `;
      const jobRes = await executeQuery(jobQuery, { JobID: jobId });
      if (!jobRes.recordset || jobRes.recordset.length === 0) {
        return { matchScore: 0, matchedSkills: [], missingSkills: [], recommendedCourses: [] };
      }

      let requiredSkills = jobRes.recordset.filter(r => r.SkillID != null);
      const jobRow = jobRes.recordset[0];

      // If job has no rows in JobSkillRequirements, extract required skills from Job Description/Requirements
      if (requiredSkills.length === 0) {
        const taxonomyRes = await executeQuery(`SELECT SkillID, SkillName, NormalizedName FROM SkillTaxonomy`);
        const jobText = `${jobRow.Title || ''} ${jobRow.Description || ''} ${jobRow.Requirements || ''}`.toLowerCase();
        requiredSkills = (taxonomyRes.recordset || [])
          .filter(sk => AIMatchingService.hasSkill(jobText, sk))
          .map(sk => ({ ...sk, IsMandatory: true }));
      }

      // 2. Fetch Candidate Profile & CVs
      const candidateQuery = `
        SELECT cp.ProfileID, cp.Headline, cp.Bio, cp.DesiredSalary, cp.CurrentLocation,
               u.FullName
        FROM CandidateProfiles cp
        JOIN Users u ON cp.UserID = u.UserID
        WHERE cp.ProfileID = @ProfileID
      `;
      const candRes = await executeQuery(candidateQuery, { ProfileID: profileId });
      const candidate = candRes.recordset[0];
      if (!candidate) {
        return { matchScore: 0, matchedSkills: [], missingSkills: [], recommendedCourses: [] };
      }

      // Fetch candidate CVs (including CvData if available)
      let cvText = '';
      try {
        const cvRes = await executeQuery(
          `SELECT Title, CvData FROM CVs WHERE ProfileID = @ProfileID ORDER BY IsPrimary DESC`,
          { ProfileID: profileId }
        );
        cvText = (cvRes.recordset || []).map(c => `${c.Title || ''} ${c.CvData || ''}`).join(' ');
      } catch (e) {
        const cvResFallback = await executeQuery(
          `SELECT Title FROM CVs WHERE ProfileID = @ProfileID ORDER BY IsPrimary DESC`,
          { ProfileID: profileId }
        );
        cvText = (cvResFallback.recordset || []).map(c => c.Title || '').join(' ');
      }

      // Combine candidate text signals
      const candidateContext = `${candidate.Headline || ''} ${candidate.Bio || ''} ${cvText}`.toLowerCase();

      // If job still has no required skills at all, return 0%
      if (requiredSkills.length === 0) {
        return {
          matchScore: 0,
          matchedSkills: [],
          missingSkills: [],
          recommendedCourses: [],
          summary: 'Chưa có kỹ năng nào phù hợp giữa hồ sơ và yêu cầu công việc (0%).'
        };
      }

      const matchedSkills = [];
      const missingSkills = [];
      let totalWeight = 0;
      let earnedWeight = 0;

      for (const req of requiredSkills) {
        const weight = req.IsMandatory ? 2.0 : 1.0;
        totalWeight += weight;

        const isMatched = AIMatchingService.hasSkill(candidateContext, req);

        if (isMatched) {
          earnedWeight += weight;
          matchedSkills.push({
            skillId: req.SkillID,
            skillName: req.SkillName,
            isMandatory: req.IsMandatory
          });
        } else {
          missingSkills.push({
            skillId: req.SkillID,
            skillName: req.SkillName,
            isMandatory: req.IsMandatory
          });
        }
      }

      // Strictly 0% if no skills matched
      let matchScore = 0;
      if (matchedSkills.length > 0 && totalWeight > 0) {
        matchScore = Math.round((earnedWeight / totalWeight) * 100);
        if (matchScore > 100) matchScore = 100;
      }

      // 3. Query Recommended Courses for Missing Skills
      let recommendedCourses = [];
      if (missingSkills.length > 0) {
        const missingSkillIds = missingSkills.map(s => s.skillId).filter(Boolean).join(',');
        if (missingSkillIds) {
          const coursesRes = await executeQuery(`
            SELECT c.CourseID, c.Title, c.Provider, c.Url, c.SkillID, st.SkillName
            FROM Courses c
            JOIN SkillTaxonomy st ON c.SkillID = st.SkillID
            WHERE c.SkillID IN (${missingSkillIds})
          `);
          recommendedCourses = coursesRes.recordset;
        }
      }

      // Summary string
      let summary = '';
      if (matchScore === 0) {
        summary = `Chưa có kỹ năng nào trong hồ sơ trùng khớp với yêu cầu của vị trí này (0%). Bạn cần bổ sung: ${missingSkills.map(s => s.skillName).join(', ')}.`;
      } else if (matchScore >= 80) {
        summary = `Hồ sơ rất phù hợp (${matchScore}%). Bạn đáp ứng hầu hết các kỹ năng trọng yếu của vị trí này.`;
      } else if (matchScore >= 50) {
        summary = `Hồ sơ phù hợp một phần (${matchScore}%). Cần bổ sung thêm: ${missingSkills.map(s => s.skillName).join(', ')}.`;
      } else {
        summary = `Độ phù hợp thấp (${matchScore}%). Cần trau dồi thêm các kỹ năng chuyên môn để đáp ứng yêu cầu công việc.`;
      }

      return {
        matchScore,
        matchedSkills,
        missingSkills,
        recommendedCourses,
        summary
      };
    } catch (error) {
      console.error('Error in calculateMatchScore:', error.message);
      return { matchScore: 0, matchedSkills: [], missingSkills: [], recommendedCourses: [] };
    }
  }
}

module.exports = AIMatchingService;
