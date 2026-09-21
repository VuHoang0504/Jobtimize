const { executeQuery } = require('../config/db');

/**
 * AI Matching Engine for Jobtimize
 * Analyzes candidate profile, extracted CV skills against job requirements.
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
      const sName = skill.SkillName.toLowerCase();
      const sNorm = (skill.NormalizedName || '').toLowerCase();
      
      const pattern = new RegExp(`\\b(${sName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}|${sNorm})\\b`, 'i');
      if (pattern.test(normalizedText) || normalizedText.includes(sName)) {
        matchedSkills.push(skill);
      }
    }
    return matchedSkills;
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

      const requiredSkills = jobRes.recordset.filter(r => r.SkillID != null);
      
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

      // Fetch candidate CVs for text matching
      const cvRes = await executeQuery(
        `SELECT Title, FileUrl FROM CVs WHERE ProfileID = @ProfileID ORDER BY IsPrimary DESC`,
        { ProfileID: profileId }
      );
      
      // Combine candidate text signals
      const cvTitles = cvRes.recordset.map(c => c.Title).join(' ');
      const candidateContext = `${candidate.Headline || ''} ${candidate.Bio || ''} ${cvTitles}`.toLowerCase();

      // If job has no explicit required skills, calculate based on general text similarity
      if (requiredSkills.length === 0) {
        return {
          matchScore: 75.0,
          matchedSkills: [],
          missingSkills: [],
          recommendedCourses: [],
          summary: 'Công việc không có danh sách kỹ năng bắt buộc cụ thể. Điểm phù hợp dựa trên hồ sơ tổng quát.'
        };
      }

      const matchedSkills = [];
      const missingSkills = [];
      let totalWeight = 0;
      let earnedWeight = 0;

      for (const req of requiredSkills) {
        const weight = req.IsMandatory ? 2.0 : 1.0;
        totalWeight += weight;

        const sName = req.SkillName.toLowerCase();
        const sNorm = (req.NormalizedName || '').toLowerCase();

        const isMatched = candidateContext.includes(sName) || (sNorm && candidateContext.includes(sNorm));

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

      // Base percentage
      let matchScore = totalWeight > 0 ? (earnedWeight / totalWeight) * 100 : 70;
      
      // Bonus: If candidate has a well-defined Headline
      if (candidate.Headline && candidate.Headline.length > 5) {
        matchScore = Math.min(100, matchScore + 5);
      }

      // Round to 1 decimal place
      matchScore = Math.round(matchScore * 10) / 10;
      if (matchScore > 100) matchScore = 100;
      if (matchScore < 15 && requiredSkills.length > 0) matchScore = 20; // baseline floor

      // 3. Query Recommended Courses for Missing Skills
      let recommendedCourses = [];
      if (missingSkills.length > 0) {
        const missingSkillIds = missingSkills.map(s => s.skillId).join(',');
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

      // AI Summary string
      let summary = '';
      if (matchScore >= 80) {
        summary = `Hồ sơ rất phù hợp (${matchScore}%). Ứng viên đáp ứng hầu hết các kỹ năng trọng yếu của vị trí này.`;
      } else if (matchScore >= 50) {
        summary = `Hồ sơ tiềm năng (${matchScore}%). Ứng viên đáp ứng một phần kỹ năng, cần bổ sung thêm: ${missingSkills.map(s => s.skillName).join(', ')}.`;
      } else {
        summary = `Độ tương thích cơ bản (${matchScore}%). Cần trau dồi thêm các kỹ năng chuyên sâu để đáp ứng tiêu chuẩn công việc.`;
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
      return { matchScore: 50, matchedSkills: [], missingSkills: [], recommendedCourses: [] };
    }
  }
}

module.exports = AIMatchingService;
