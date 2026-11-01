const { fold, canonicalSkill, positiveMention } = require('./cvNormalization');

// Discovery is broader than the skill score: a role/category may be relevant
// even when none of its explicit requirements match the confirmed skill list.
function createRelevance(cv, taxonomy) {
  const skills = (cv.skills || []).filter(skill => skill.verified);
  const categories = new Set(skills.map(skill => taxonomy.find(item => item.SkillID === Number(skill.skillId)) || canonicalSkill(skill.canonicalName || skill.name, taxonomy)).filter(Boolean).map(skill => skill.CategoryID).filter(Boolean));
  const roleText = [cv.personal?.headline, ...(cv.experiences || []).map(item => item.role)].filter(Boolean).join(' ');
  const ignored = new Set(['senior', 'junior', 'middle', 'intern', 'fresher', 'nhan', 'vien', 'chuyen', 'cong', 'ty', 'kinh', 'nghiem', 'tong', 'hop', 'truong', 'nhom', 'quan', 'cao', 'cap', 'trach', 'nhiem', 'manager', 'management', 'specialist', 'engineer', 'leader', 'lead', 'head', 'staff', 'the', 'and', 'with', 'for', 'test', 'candidate', 'cv']);
  const roleWords = [...new Set(fold(roleText).split(/[^\p{L}\p{N}+#.]+/u).filter(word => word.length >= 3 && !ignored.has(word)))];
  return job => {
    if (job.matchedCount > 0) return { related: true, reason: `Khớp ${job.matchedCount} kỹ năng trong CV`, rank: 3 };
    if (categories.has(job.CategoryID)) return { related: true, reason: 'Cùng ngành nghề với kỹ năng trong CV', rank: 2 };
    if (roleWords.some(word => positiveMention(job.Title || '', word))) return { related: true, reason: 'Liên quan chức danh hoặc kinh nghiệm trong CV', rank: 1 };
    return { related: false, reason: '', rank: 0 };
  };
}
module.exports = { createRelevance };
