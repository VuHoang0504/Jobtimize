/**
 * Flexible Recruitment Screening Engine
 * 
 * Supports:
 * - 3 Modes per criterion: REQUIRED, PREFERRED, INFORMATIONAL
 * - 9 Comprehensive Criteria Groups:
 *   1. Work Experience (Total YOE, role YOE, tools, roles held, management)
 *   2. Education (Degree, major, school, GPA - default PREFERRED, never auto-reject unless REQUIRED)
 *   3. Projects & Achievements (Relevance, scale, tech, quantifiable impact)
 *   4. Languages (Language, self-declared proficiency or certs: TOEIC, IELTS, JLPT)
 *   5. Location & Work Mode (City, Remote/Hybrid/Onsite, relocation)
 *   6. Availability (Start date, notice period, contract type)
 *   7. Expected Salary (Comparison against JD budget, "Chưa có dữ liệu" distinction)
 *   8. Industry-Specific (Licenses, portfolio, GitHub, shift work, security)
 *   9. Employment History Insights (Tenure, hops, gaps - purely INFORMATIONAL)
 * - Dynamic Category Weighting (default: 25% Exp, 25% Skills, 20% Projects, 10% Edu, 10% Lang, 10% Work Conditions)
 * - 3 Result Groups: Passed (Qualified), ReviewNeeded (Needs Review), Failed (Not Qualified)
 * - Clear distinction: FOUND, NOT_FOUND, NO_DATA (missing data never auto-disqualifies)
 */
'use strict';

const { fold, canonicalSkill, text } = require('./cvNormalization');

const SCREENING_THRESHOLDS = {
  Relaxed: 50,
  Balanced: 70,
  Strict: 85
};

// Default Category Weights
const DEFAULT_WEIGHTS = {
  experience: 25,
  skills: 25,
  projects: 20,
  education: 10,
  languages: 10,
  workConditions: 10
};

// Default Full Config Template
const DEFAULT_SCREENING_CONFIG = {
  isEnabled: true,
  thresholds: {
    qualified: 70,
    needsReview: 50
  },
  weights: { ...DEFAULT_WEIGHTS },

  // 1. Work Experience
  experience: {
    minTotalYears: { value: 0, mode: 'PREFERRED' }, // years
    minRoleYears: { value: 0, mode: 'PREFERRED' },
    industry: { value: '', mode: 'INFORMATIONAL' },
    tools: { value: [], mode: 'PREFERRED' },
    rolesHeld: { value: [], mode: 'INFORMATIONAL' },
    managementExp: { value: false, mode: 'INFORMATIONAL' }
  },

  // 2. Education (GPA & School default to PREFERRED, never auto-disqualify)
  education: {
    degreeLevel: { value: '', mode: 'INFORMATIONAL' }, // 'Đại học', 'Cao đẳng', 'Thạc sĩ'
    major: { value: '', mode: 'INFORMATIONAL' },
    school: { value: '', mode: 'INFORMATIONAL' },
    gpa: { min: null, scale: 4, mode: 'PREFERRED' }
  },

  // 3. Projects & Achievements
  projects: {
    hasProjects: { value: false, mode: 'INFORMATIONAL' },
    projectType: { value: '', mode: 'INFORMATIONAL' },
    minScale: { value: '', mode: 'INFORMATIONAL' },
    roleInProject: { value: '', mode: 'INFORMATIONAL' },
    technologies: { value: [], mode: 'PREFERRED' },
    quantifiableAchievements: { value: false, mode: 'INFORMATIONAL' }
  },

  // 4. Languages
  languages: {
    items: [] // e.g. [{ language: 'English', proficiency: 'Giao tiếp tốt', certificate: 'TOEIC', minScore: 650, mode: 'PREFERRED', allowSelfDeclared: true }]
  },

  // 5. Location & Work Mode
  locationWorkMode: {
    city: { value: '', mode: 'INFORMATIONAL' },
    workMode: { value: 'ALL', mode: 'INFORMATIONAL' }, // 'On-site', 'Hybrid', 'Remote', 'ALL'
    willingToTravel: { value: false, mode: 'INFORMATIONAL' },
    willingToRelocate: { value: false, mode: 'INFORMATIONAL' }
  },

  // 6. Availability
  availability: {
    earliestJoin: { value: '', mode: 'INFORMATIONAL' }, // 'Ngay lập tức', '2 tuần', '1 tháng'
    maxNoticePeriodWeeks: { value: null, mode: 'INFORMATIONAL' },
    contractType: { value: 'Toàn thời gian', mode: 'INFORMATIONAL' }
  },

  // 7. Expected Salary
  expectedSalary: {
    maxExpected: { value: null, mode: 'INFORMATIONAL' },
    mode: 'INFORMATIONAL',
    warnBudgetMismatch: true
  },

  // 8. Industry-Specific Requirements
  industrySpecific: {
    portfolioRequired: { value: false, mode: 'INFORMATIONAL' },
    githubRequired: { value: false, mode: 'INFORMATIONAL' },
    driverLicense: { value: false, mode: 'INFORMATIONAL' },
    shiftWork: { value: false, mode: 'INFORMATIONAL' },
    securityClearance: { value: false, mode: 'INFORMATIONAL' }
  },

  // 9. Employment History Insights (Always INFORMATIONAL)
  employmentHistory: {
    minAvgTenureMonths: { value: null, mode: 'INFORMATIONAL' },
    maxJobHops: { value: null, mode: 'INFORMATIONAL' },
    maxGapMonths: { value: null, mode: 'INFORMATIONAL' }
  }
};

/**
 * Deep merge user configuration with defaults.
 */
function mergeConfig(custom = {}) {
  if (!custom || typeof custom !== 'object') return { ...DEFAULT_SCREENING_CONFIG };
  const res = {
    ...DEFAULT_SCREENING_CONFIG,
    ...custom,
    thresholds: { ...DEFAULT_SCREENING_CONFIG.thresholds, ...(custom.thresholds || {}) },
    weights: { ...DEFAULT_SCREENING_CONFIG.weights, ...(custom.weights || {}) },
    experience: { ...DEFAULT_SCREENING_CONFIG.experience, ...(custom.experience || {}) },
    education: { ...DEFAULT_SCREENING_CONFIG.education, ...(custom.education || {}) },
    projects: { ...DEFAULT_SCREENING_CONFIG.projects, ...(custom.projects || {}) },
    languages: {
      items: Array.isArray(custom.languages?.items) ? custom.languages.items : (DEFAULT_SCREENING_CONFIG.languages.items || [])
    },
    locationWorkMode: { ...DEFAULT_SCREENING_CONFIG.locationWorkMode, ...(custom.locationWorkMode || {}) },
    availability: { ...DEFAULT_SCREENING_CONFIG.availability, ...(custom.availability || {}) },
    expectedSalary: { ...DEFAULT_SCREENING_CONFIG.expectedSalary, ...(custom.expectedSalary || {}) },
    industrySpecific: { ...DEFAULT_SCREENING_CONFIG.industrySpecific, ...(custom.industrySpecific || {}) },
    employmentHistory: { ...DEFAULT_SCREENING_CONFIG.employmentHistory, ...(custom.employmentHistory || {}) }
  };
  return res;
}

/**
 * Parse date string from CV experience (e.g. "06/2021", "2021", "Hiện tại")
 */
function parseExperienceDate(str) {
  if (!str) return null;
  const s = String(str).trim().toLowerCase();
  if (s.includes('hiện tại') || s.includes('present') || s.includes('nay') || s.includes('now')) {
    return new Date();
  }
  const m = s.match(/(?:([0-9]{1,2})[\/\-\.])?([0-9]{4})/);
  if (m) {
    const month = m[1] ? Math.max(0, Math.min(11, parseInt(m[1], 10) - 1)) : 0;
    const year = parseInt(m[2], 10);
    return new Date(year, month, 1);
  }
  return null;
}

/**
 * Extract rich structured features from candidate context, profile and CV.
 */
function extractCandidateFeatures(context = {}, profile = {}, job = {}) {
  const data = context?.data || {};
  const personal = data.personal || {};
  const experiences = Array.isArray(data.experiences) ? data.experiences : [];
  const educations = Array.isArray(data.educations) ? data.educations : [];
  const certifications = Array.isArray(data.certifications) ? data.certifications : [];
  const languages = Array.isArray(data.languages) ? data.languages : [];
  const skills = Array.isArray(data.skills) ? data.skills : [];
  const summary = text(data.summary || profile.Bio || '', 20000);

  // 1. Calculate Experience Metrics
  let totalMonths = 0;
  const tenureList = [];
  const sortedExps = [];

  for (const exp of experiences) {
    const start = parseExperienceDate(exp.startDate);
    const end = parseExperienceDate(exp.endDate) || new Date();
    if (start && end && end >= start) {
      const months = Math.max(1, (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()));
      totalMonths += months;
      tenureList.push(months);
      sortedExps.push({ start, end, months, exp });
    }
  }

  // Fallback regex for YOE if dates weren't formatted
  let estimatedYoe = totalMonths > 0 ? Math.round((totalMonths / 12) * 10) / 10 : 0;
  const yoeText = [personal.headline, profile.Headline, summary].filter(Boolean).join(' ');
  const yoeMatch = yoeText.match(/([0-9]+(?:\.[0-9]+)?)\s*(?:\+|\s*năm|\s*years|\s*yoe)/i);
  if (estimatedYoe === 0 && yoeMatch) {
    const parsedYoe = parseFloat(yoeMatch[1]);
    if (!isNaN(parsedYoe) && parsedYoe > 0) estimatedYoe = parsedYoe;
  }

  // Check career gaps (> 6 months between jobs)
  let careerGaps = 0;
  sortedExps.sort((a, b) => a.start - b.start);
  for (let i = 0; i < sortedExps.length - 1; i++) {
    const currEnd = sortedExps[i].end;
    const nextStart = sortedExps[i + 1].start;
    const gapMonths = (nextStart.getFullYear() - currEnd.getFullYear()) * 12 + (nextStart.getMonth() - currEnd.getMonth());
    if (gapMonths > 6) careerGaps++;
  }

  const avgTenureMonths = tenureList.length > 0 ? Math.round(totalMonths / tenureList.length) : null;
  const jobHops = experiences.length;

  // Management / leadership signals
  const managementKeywords = ['lead', 'quản lý', 'trưởng nhóm', 'manager', 'head', 'director', 'team lead', 'chủ nhiệm'];
  const allExpText = experiences.map(e => `${e.role} ${e.description} ${e.evidence}`).join(' ');
  const hasManagementExp = managementKeywords.some(kw => fold(allExpText).includes(fold(kw)));

  // 2. Education Details
  let primaryEdu = null;
  let candidateGpa = null;
  let candidateGpaScale = 4;
  for (const edu of educations) {
    if (edu.gpa != null && !isNaN(edu.gpa)) {
      candidateGpa = Number(edu.gpa);
      candidateGpaScale = edu.gpaScale === 10 ? 10 : 4;
      primaryEdu = edu;
      break;
    }
  }
  if (!primaryEdu && educations.length > 0) primaryEdu = educations[0];

  // 3. Projects Details
  const projects = Array.isArray(data.projects) ? data.projects : [];
  // Project-like entries in experiences
  const projectLikeExps = experiences.filter(e => /(dự án|project|hệ thống|ứng dụng|app|website)/i.test(`${e.role} ${e.description}`));
  const totalProjectsCount = projects.length + projectLikeExps.length;
  // Quantifiable achievements
  const quantifiableRegex = /\b([0-9]+(?:\.[0-9]+)?\s*(?:%|tỷ|triệu|nghìn|k|users|người dùng|dau|mau|tps|ms|requests))\b/i;
  const hasQuantifiableImpact = quantifiableRegex.test(allExpText) || quantifiableRegex.test(summary);

  // 4. Languages & Certs
  const langNames = languages.map(l => l.language || l.name).filter(Boolean);
  const certNames = certifications.map(c => c.name).filter(Boolean);

  // 5. Salary & Location
  const desiredSalary = profile.DesiredSalary != null ? Number(profile.DesiredSalary) : null;
  const currentLocation = profile.CurrentLocation || personal.location || '';

  // 6. Online links (GitHub, Portfolio)
  const fullText = JSON.stringify(data);
  const hasGithub = /github\.com\b/i.test(fullText);
  const hasPortfolio = /(portfolio|behance|dribbble|gitlab|linkedin)/i.test(fullText) || /https?:\/\/[a-z0-9]+\.(dev|me|io|com)/i.test(fullText);

  return {
    raw: data,
    personal,
    summary,
    skills,
    experiences,
    educations,
    certifications,
    languages,
    yoe: estimatedYoe,
    jobHops,
    avgTenureMonths,
    careerGaps,
    hasManagementExp,
    primaryEdu,
    candidateGpa,
    candidateGpaScale,
    totalProjectsCount,
    hasQuantifiableImpact,
    langNames,
    certNames,
    desiredSalary,
    currentLocation,
    hasGithub,
    hasPortfolio
  };
}

/**
 * Parse job salary range into min/max numbers (e.g. "18 - 30 triệu VNĐ" -> max: 30000000)
 */
function parseSalaryRange(rangeStr) {
  if (!rangeStr) return { min: null, max: null };
  const matches = rangeStr.match(/([0-9]+(?:[.,][0-9]+)?)/g);
  if (!matches) return { min: null, max: null };
  const isMillion = /triệu|million|tr\b/i.test(rangeStr);
  const multiplier = isMillion ? 1000000 : 1;
  const nums = matches.map(m => parseFloat(m.replace(',', '.')) * multiplier);
  if (nums.length === 1) return { min: null, max: nums[0] };
  return { min: nums[0], max: nums[1] };
}

/**
 * Pure evaluator for flexible candidate screening against job criteria.
 */
function evaluateFlexibleScreening(context, criteriaConfig = {}, requiredSkills = [], job = {}) {
  const config = mergeConfig(criteriaConfig);
  const isEnabled = config.isEnabled !== false;
  const criteriaVersion = criteriaConfig.Version || criteriaConfig.criteriaVersion || 1;
  const level = criteriaConfig.ScreeningLevel || 'Balanced';
  const threshold = criteriaConfig.threshold || (SCREENING_THRESHOLDS[level] ? SCREENING_THRESHOLDS[level] : 70);

  const metadata = {
    screeningLevel: level,
    threshold,
    criteriaVersion,
    cvVersion: context?.version?.VersionNumber || null,
    cvStatus: context?.version?.Status || 'Missing'
  };

  // If filtering is completely disabled, return Normal Browsing state
  if (!isEnabled) {
    return {
      resultGroup: 'Normal', // Normal browsing mode
      screeningScore: context?.application?.MatchScore || 80,
      matchedCriteria: [],
      unmetCriteria: [],
      missingDataCriteria: [],
      categoryScores: {},
      reasons: ['Chế độ duyệt hồ sơ thông thường: Không áp dụng bộ lọc sàng lọc.'],
      insights: {},
      isFilterActive: false,
      ...metadata
    };
  }

  // Check CV status
  if (!context?.version || context.version.Status !== 'Ready' || !context.data) {
    const statusMsg = context?.version?.Status === 'Processing' || context?.version?.Status === 'Queued'
      ? 'CV đang được xử lý trích xuất dữ liệu.'
      : context?.version?.Status === 'Failed'
      ? 'Đọc CV tự động không thành công. Nhà tuyển dụng có thể mở CV gốc để xem.'
      : 'Dữ liệu CV chưa được xác nhận đầy đủ.';
    return {
      resultGroup: 'ReviewNeeded',
      screeningScore: 0,
      matchedCriteria: [],
      unmetCriteria: [],
      missingDataCriteria: [{ label: 'Dữ liệu CV trích xuất', status: 'NO_DATA', reason: statusMsg }],
      categoryScores: {},
      reasons: [statusMsg],
      insights: {},
      isFilterActive: true,
      ...metadata
    };
  }

  const features = extractCandidateFeatures(context, context.profile || {}, job);
  const matchedCriteria = [];
  const unmetCriteria = [];
  const missingDataCriteria = [];
  const reasons = [];
  const hardRequirementFailures = [];
  const hardRequirementMissing = [];

  // ─────────────────────────────────────────────────────────────
  // 1. EVALUATE SKILLS CATEGORY
  // ─────────────────────────────────────────────────────────────
  let skillsTotalWeight = 0;
  let skillsEarnedWeight = 0;
  const matchedSkillsList = [];
  const missingSkillsList = [];
  const missingMandatorySkills = [];

  for (const requirement of requiredSkills) {
    const isMandatory = Boolean(requirement.IsMandatory);
    const weight = isMandatory ? 2 : 1;
    skillsTotalWeight += weight;

    const found = features.skills.find(skill => skill.verified &&
      (Number(skill.skillId) === Number(requirement.SkillID) ||
       canonicalSkill(skill.name, [requirement]) ||
       fold(skill.canonicalName || skill.name) === fold(requirement.SkillName)));

    const item = {
      skillId: requirement.SkillID,
      skillName: requirement.SkillName,
      isMandatory,
      weight
    };

    if (found) {
      skillsEarnedWeight += weight;
      matchedSkillsList.push({ ...item, evidence: found.evidence, source: found.source });
      matchedCriteria.push({
        category: 'skills',
        label: `Kỹ năng: ${requirement.SkillName}`,
        evidence: found.evidence || `Có kỹ năng ${requirement.SkillName}`,
        status: 'FOUND',
        mode: isMandatory ? 'REQUIRED' : 'PREFERRED'
      });
    } else {
      missingSkillsList.push(item);
      if (isMandatory) {
        missingMandatorySkills.push(requirement.SkillName);
        unmetCriteria.push({
          category: 'skills',
          label: `Kỹ năng bắt buộc: ${requirement.SkillName}`,
          evidence: null,
          status: 'NOT_FOUND',
          mode: 'REQUIRED'
        });
      } else {
        unmetCriteria.push({
          category: 'skills',
          label: `Kỹ năng ưu tiên: ${requirement.SkillName}`,
          evidence: null,
          status: 'NOT_FOUND',
          mode: 'PREFERRED'
        });
      }
    }
  }

  const skillsCategoryScore = skillsTotalWeight > 0 ? Math.round((skillsEarnedWeight / skillsTotalWeight) * 100) : 100;
  if (matchedSkillsList.length > 0) {
    reasons.push(`Điểm kỹ năng đạt ${skillsCategoryScore}% (Ngưỡng yêu cầu: ${threshold}%).`);
  }

  // ─────────────────────────────────────────────────────────────
  // 2. EVALUATE WORK EXPERIENCE CATEGORY
  // ─────────────────────────────────────────────────────────────
  const expConfig = config.experience || {};
  let expScoreSum = 0;
  let expItemCount = 0;

  // Min Total Years
  const reqTotalYoe = Number(expConfig.minTotalYears?.value || 0);
  const totalYoeMode = expConfig.minTotalYears?.mode || 'PREFERRED';
  if (reqTotalYoe > 0) {
    expItemCount++;
    if (features.yoe >= reqTotalYoe) {
      expScoreSum += 1.0;
      matchedCriteria.push({
        category: 'experience',
        label: `Kinh nghiệm làm việc ≥ ${reqTotalYoe} năm`,
        evidence: `Ứng viên có ~${features.yoe} năm kinh nghiệm thực tế`,
        status: 'FOUND',
        mode: totalYoeMode
      });
    } else if (features.yoe > 0) {
      const partial = Math.max(0.3, features.yoe / reqTotalYoe);
      expScoreSum += partial;
      const msg = `Kinh nghiệm (~${features.yoe} năm) chưa đạt yêu cầu tối thiểu ${reqTotalYoe} năm`;
      if (totalYoeMode === 'REQUIRED') {
        hardRequirementFailures.push(msg);
      }
      unmetCriteria.push({
        category: 'experience',
        label: `Kinh nghiệm làm việc ≥ ${reqTotalYoe} năm`,
        evidence: `Hiện có ~${features.yoe} năm`,
        status: 'NOT_FOUND',
        mode: totalYoeMode
      });
    } else {
      missingDataCriteria.push({
        category: 'experience',
        label: `Kinh nghiệm làm việc ≥ ${reqTotalYoe} năm`,
        evidence: 'Chưa có thông tin số năm kinh nghiệm rõ ràng trên CV',
        status: 'NO_DATA',
        mode: totalYoeMode
      });
      if (totalYoeMode === 'REQUIRED') {
        hardRequirementMissing.push(`Chưa xác định được số năm kinh nghiệm (yêu cầu ≥ ${reqTotalYoe} năm)`);
      }
    }
  }

  // Management / Leadership Experience
  const reqManagement = Boolean(expConfig.managementExp?.value);
  const managementMode = expConfig.managementExp?.mode || 'INFORMATIONAL';
  if (reqManagement) {
    if (managementMode !== 'INFORMATIONAL') expItemCount++;
    if (features.hasManagementExp) {
      if (managementMode !== 'INFORMATIONAL') expScoreSum += 1.0;
      matchedCriteria.push({
        category: 'experience',
        label: 'Kinh nghiệm quản lý / Trưởng nhóm',
        evidence: 'Có tín hiệu vai trò Lead/Manager trong lịch sử công tác',
        status: 'FOUND',
        mode: managementMode
      });
    } else {
      if (managementMode === 'REQUIRED') hardRequirementFailures.push('Chưa có kinh nghiệm quản lý hoặc trưởng nhóm');
      unmetCriteria.push({
        category: 'experience',
        label: 'Kinh nghiệm quản lý / Trưởng nhóm',
        evidence: 'Chưa tìm thấy thông tin quản lý đội ngũ trong CV',
        status: 'NOT_FOUND',
        mode: managementMode
      });
    }
  }

  const experienceCategoryScore = expItemCount > 0 ? Math.round((expScoreSum / expItemCount) * 100) : 100;

  // ─────────────────────────────────────────────────────────────
  // 3. EVALUATE PROJECTS & ACHIEVEMENTS CATEGORY
  // ─────────────────────────────────────────────────────────────
  const projConfig = config.projects || {};
  let projScoreSum = 0;
  let projItemCount = 0;

  // Has relevant projects
  if (projConfig.hasProjects?.value) {
    const projMode = projConfig.hasProjects.mode || 'PREFERRED';
    if (projMode !== 'INFORMATIONAL') projItemCount++;
    if (features.totalProjectsCount > 0) {
      if (projMode !== 'INFORMATIONAL') projScoreSum += 1.0;
      matchedCriteria.push({
        category: 'projects',
        label: 'Có dự án thực tế liên quan',
        evidence: `Ghi nhận ${features.totalProjectsCount} dự án / sản phẩm thực tế trong hồ sơ`,
        status: 'FOUND',
        mode: projMode
      });
    } else {
      if (projMode === 'REQUIRED') hardRequirementMissing.push('Chưa tìm thấy mô tả dự án cụ thể');
      missingDataCriteria.push({
        category: 'projects',
        label: 'Có dự án thực tế liên quan',
        evidence: 'Chưa có thông tin dự án chi tiết trên CV',
        status: 'NO_DATA',
        mode: projMode
      });
    }
  }

  // Quantifiable achievements
  if (projConfig.quantifiableAchievements?.value) {
    const achMode = projConfig.quantifiableAchievements.mode || 'INFORMATIONAL';
    if (achMode !== 'INFORMATIONAL') projItemCount++;
    if (features.hasQuantifiableImpact) {
      if (achMode !== 'INFORMATIONAL') projScoreSum += 1.0;
      matchedCriteria.push({
        category: 'projects',
        label: 'Thành tựu và kết quả định lượng',
        evidence: 'CV có số liệu đo lường cụ thể về hiệu quả / quy mô',
        status: 'FOUND',
        mode: achMode
      });
    } else {
      unmetCriteria.push({
        category: 'projects',
        label: 'Thành tựu và kết quả định lượng',
        evidence: 'CV chưa làm nổi bật số liệu định lượng (users, revenue, performance)',
        status: 'NOT_FOUND',
        mode: achMode
      });
    }
  }

  const projectsCategoryScore = projItemCount > 0 ? Math.round((projScoreSum / projItemCount) * 100) : 100;

  // ─────────────────────────────────────────────────────────────
  // 4. EVALUATE EDUCATION CATEGORY (DEFAULT TO PREFERRED, NEVER AUTO-REJECT)
  // ─────────────────────────────────────────────────────────────
  const eduConfig = config.education || {};
  let eduScoreSum = 0;
  let eduItemCount = 0;

  // Degree Level
  const reqDegree = eduConfig.degreeLevel?.value;
  const degreeMode = eduConfig.degreeLevel?.mode || 'INFORMATIONAL';
  if (reqDegree && String(reqDegree).trim()) {
    if (degreeMode !== 'INFORMATIONAL') eduItemCount++;
    const hasDegree = features.educations.some(e => fold(e.degree || '').includes(fold(reqDegree)));
    if (hasDegree) {
      if (degreeMode !== 'INFORMATIONAL') eduScoreSum += 1.0;
      matchedCriteria.push({
        category: 'education',
        label: `Bậc học: ${reqDegree}`,
        evidence: `Tốt nghiệp ${reqDegree}`,
        status: 'FOUND',
        mode: degreeMode
      });
    } else if (features.educations.length > 0) {
      if (degreeMode === 'REQUIRED') hardRequirementFailures.push(`Bằng cấp chưa tương đương mức ${reqDegree}`);
      unmetCriteria.push({
        category: 'education',
        label: `Bậc học: ${reqDegree}`,
        evidence: features.educations[0]?.degree || 'Chưa đúng bậc học',
        status: 'NOT_FOUND',
        mode: degreeMode
      });
    } else {
      missingDataCriteria.push({
        category: 'education',
        label: `Bậc học: ${reqDegree}`,
        evidence: 'Chưa có thông tin bằng cấp trên CV',
        status: 'NO_DATA',
        mode: degreeMode
      });
      if (degreeMode === 'REQUIRED') hardRequirementMissing.push(`Chưa có thông tin bằng cấp (${reqDegree})`);
    }
  }

  // GPA Evaluation (Default mode: PREFERRED, never auto-rejects!)
  const minGpa = eduConfig.gpa?.min != null && Number(eduConfig.gpa.min) > 0 ? Number(eduConfig.gpa.min) : null;
  const gpaScale = eduConfig.gpa?.scale === 10 ? 10 : 4;
  const gpaMode = eduConfig.gpa?.mode || 'PREFERRED';
  let gpaFailed = false;
  let gpaMissing = false;

  if (minGpa != null) {
    if (gpaMode !== 'INFORMATIONAL') eduItemCount++;
    if (features.candidateGpa != null) {
      const normalizedGpa = features.candidateGpaScale === gpaScale
        ? features.candidateGpa
        : (gpaScale === 10 ? Math.round((features.candidateGpa / 4) * 10 * 100) / 100 : Math.round((features.candidateGpa / 10) * 4 * 100) / 100);

      if (normalizedGpa >= minGpa) {
        if (gpaMode !== 'INFORMATIONAL') eduScoreSum += 1.0;
        matchedCriteria.push({
          category: 'education',
          label: `GPA ≥ ${minGpa}/${gpaScale}`,
          evidence: `GPA đạt ${features.candidateGpa}/${features.candidateGpaScale} (Chuẩn hóa: ${normalizedGpa}/${gpaScale})`,
          status: 'FOUND',
          mode: gpaMode
        });
      } else {
        gpaFailed = true;
        const ratio = Math.max(0.2, normalizedGpa / minGpa);
        if (gpaMode !== 'INFORMATIONAL') eduScoreSum += ratio;
        const msg = `GPA (${features.candidateGpa}/${features.candidateGpaScale}) dưới ngưỡng ${minGpa}/${gpaScale}`;
        if (gpaMode === 'REQUIRED') hardRequirementFailures.push(msg);
        unmetCriteria.push({
          category: 'education',
          label: `GPA ≥ ${minGpa}/${gpaScale}`,
          evidence: `GPA thực tế: ${features.candidateGpa}/${features.candidateGpaScale}`,
          status: 'NOT_FOUND',
          mode: gpaMode
        });
      }
    } else {
      gpaMissing = true;
      missingDataCriteria.push({
        category: 'education',
        label: `GPA ≥ ${minGpa}/${gpaScale}`,
        evidence: 'Chưa có thông tin điểm GPA trên CV',
        status: 'NO_DATA',
        mode: gpaMode
      });
      if (gpaMode === 'REQUIRED') {
        hardRequirementMissing.push(`Chưa có điểm GPA để đối chiếu ngưỡng bắt buộc ${minGpa}/${gpaScale}`);
      }
    }
  }

  const educationCategoryScore = eduItemCount > 0 ? Math.round((eduScoreSum / eduItemCount) * 100) : 100;

  // ─────────────────────────────────────────────────────────────
  // 5. EVALUATE LANGUAGES CATEGORY (Supports self-declared proficiency!)
  // ─────────────────────────────────────────────────────────────
  const langConfig = config.languages || {};
  const reqLangItems = Array.isArray(langConfig.items) ? langConfig.items : [];
  let langScoreSum = 0;
  let langItemCount = 0;
  let certsMissing = false;

  for (const reqLang of reqLangItems) {
    const langName = reqLang.language || '';
    if (!langName) continue;
    const langMode = reqLang.mode || 'PREFERRED';
    if (langMode !== 'INFORMATIONAL') langItemCount++;

    const certName = reqLang.certificate || '';
    const allowSelfDeclared = reqLang.allowSelfDeclared !== false; // allow declared by default

    // Check certificates first
    let certFound = false;
    if (certName) {
      certFound = features.certNames.some(c => fold(c).includes(fold(certName)));
      if (!certFound && !allowSelfDeclared) certsMissing = true;
    }

    // Check self-declared language in languages array or text
    const langFound = features.langNames.some(l => fold(l).includes(fold(langName))) ||
                      fold(JSON.stringify(features.languages)).includes(fold(langName));

    if (certFound) {
      if (langMode !== 'INFORMATIONAL') langScoreSum += 1.0;
      matchedCriteria.push({
        category: 'languages',
        label: `${langName} (Chứng chỉ ${certName})`,
        evidence: `Có chứng chỉ ${certName} trong hồ sơ`,
        status: 'FOUND',
        mode: langMode
      });
    } else if (langFound && allowSelfDeclared) {
      // Award solid 85% credit for self-declared proficiency without requiring physical cert!
      if (langMode !== 'INFORMATIONAL') langScoreSum += 0.85;
      matchedCriteria.push({
        category: 'languages',
        label: `${langName} (Trình độ tự khai)`,
        evidence: `Khai báo thành thạo ${langName} trên CV`,
        status: 'FOUND',
        mode: langMode
      });
    } else if (certName && !allowSelfDeclared) {
      certsMissing = true;
      hardRequirementMissing.push(`Thiếu chứng chỉ ngoại ngữ: ${certName}`);
      unmetCriteria.push({
        category: 'languages',
        label: `${langName} (Yêu cầu chứng chỉ ${certName})`,
        evidence: 'Chưa có chứng chỉ trong hồ sơ',
        status: 'NOT_FOUND',
        mode: langMode
      });
    } else {
      certsMissing = true;
      missingDataCriteria.push({
        category: 'languages',
        label: `Ngoại ngữ: ${langName}`,
        evidence: `Chưa có thông tin về ${langName} trên CV`,
        status: 'NO_DATA',
        mode: langMode
      });
      if (langMode === 'REQUIRED') hardRequirementMissing.push(`Chưa có thông tin ngoại ngữ ${langName}`);
    }
  }

  const languagesCategoryScore = langItemCount > 0 ? Math.round((langScoreSum / langItemCount) * 100) : 100;

  // ─────────────────────────────────────────────────────────────
  // 6. EVALUATE LOCATION, WORK MODE & SALARY
  // ─────────────────────────────────────────────────────────────
  const locConfig = config.locationWorkMode || {};
  let workCondScoreSum = 0;
  let workCondItemCount = 0;

  // Location / City
  const reqCity = locConfig.city?.value || '';
  const cityMode = locConfig.city?.mode || 'INFORMATIONAL';
  if (reqCity && reqCity.trim()) {
    if (cityMode !== 'INFORMATIONAL') workCondItemCount++;
    if (fold(features.currentLocation).includes(fold(reqCity))) {
      if (cityMode !== 'INFORMATIONAL') workCondScoreSum += 1.0;
      matchedCriteria.push({
        category: 'workConditions',
        label: `Địa điểm: ${reqCity}`,
        evidence: `Ứng viên đang ở ${features.currentLocation}`,
        status: 'FOUND',
        mode: cityMode
      });
    } else if (features.currentLocation) {
      if (cityMode !== 'INFORMATIONAL') workCondScoreSum += 0.5; // partial credit if candidate is in another province
      if (cityMode === 'REQUIRED') hardRequirementFailures.push(`Địa điểm ứng viên (${features.currentLocation}) không ở ${reqCity}`);
      unmetCriteria.push({
        category: 'workConditions',
        label: `Địa điểm: ${reqCity}`,
        evidence: `Hiện ở ${features.currentLocation}`,
        status: 'NOT_FOUND',
        mode: cityMode
      });
    } else {
      missingDataCriteria.push({
        category: 'workConditions',
        label: `Địa điểm: ${reqCity}`,
        evidence: 'Chưa có thông tin địa điểm cư trú',
        status: 'NO_DATA',
        mode: cityMode
      });
    }
  }

  // Salary Cross-check against Job Budget
  const jobSalary = parseSalaryRange(job.SalaryRange || '');
  let salaryInsight = { status: 'NO_DATA', label: 'Chưa có dữ liệu lương', note: '' };

  if (features.desiredSalary != null && features.desiredSalary > 0) {
    const formattedCandSalary = (features.desiredSalary / 1000000).toLocaleString('vi-VN') + ' tr';
    if (jobSalary.max && features.desiredSalary > jobSalary.max) {
      salaryInsight = {
        status: 'OVER_BUDGET',
        label: 'Vượt ngân sách',
        desired: features.desiredSalary,
        jobMax: jobSalary.max,
        note: `Kỳ vọng ~${formattedCandSalary} cao hơn mức trần của tin tuyển dụng (${(jobSalary.max / 1000000)} tr)`
      };
      unmetCriteria.push({
        category: 'workConditions',
        label: 'Kỳ vọng lương trong khung tuyển dụng',
        evidence: salaryInsight.note,
        status: 'NOT_FOUND',
        mode: 'INFORMATIONAL'
      });
    } else {
      salaryInsight = {
        status: 'WITHIN_BUDGET',
        label: 'Phù hợp ngân sách',
        desired: features.desiredSalary,
        jobMax: jobSalary.max,
        note: `Kỳ vọng ~${formattedCandSalary} nằm trong khung tuyển dụng`
      };
      matchedCriteria.push({
        category: 'workConditions',
        label: 'Kỳ vọng lương trong khung tuyển dụng',
        evidence: salaryInsight.note,
        status: 'FOUND',
        mode: 'INFORMATIONAL'
      });
    }
  } else {
    salaryInsight = {
      status: 'NO_DATA',
      label: 'Chưa có dữ liệu',
      desired: null,
      jobMax: jobSalary.max,
      note: 'Ứng viên chưa điền kỳ vọng lương. Khuyến nghị trao đổi trong phỏng vấn.'
    };
    missingDataCriteria.push({
      category: 'workConditions',
      label: 'Kỳ vọng lương trong khung tuyển dụng',
      evidence: 'Chưa có thông tin mức lương mong muốn trên CV',
      status: 'NO_DATA',
      mode: 'INFORMATIONAL'
    });
  }

  const workConditionsCategoryScore = workCondItemCount > 0 ? Math.round((workCondScoreSum / workCondItemCount) * 100) : 100;

  // ─────────────────────────────────────────────────────────────
  // 7. WEIGHTED MATCHING SCORE CALCULATION & DYNAMIC NORMALIZATION
  // ─────────────────────────────────────────────────────────────
  const rawWeights = config.weights || DEFAULT_WEIGHTS;
  const activeWeights = {};
  let totalActiveWeight = 0;

  const categoryScores = {
    skills: skillsCategoryScore,
    experience: experienceCategoryScore,
    projects: projectsCategoryScore,
    education: educationCategoryScore,
    languages: languagesCategoryScore,
    workConditions: workConditionsCategoryScore
  };

  // Only assign weights to categories that have active requirements
  if (requiredSkills.length > 0) { activeWeights.skills = rawWeights.skills || 25; totalActiveWeight += activeWeights.skills; }
  if (expItemCount > 0) { activeWeights.experience = rawWeights.experience || 25; totalActiveWeight += activeWeights.experience; }
  if (projItemCount > 0) { activeWeights.projects = rawWeights.projects || 20; totalActiveWeight += activeWeights.projects; }
  if (eduItemCount > 0) { activeWeights.education = rawWeights.education || 10; totalActiveWeight += activeWeights.education; }
  if (langItemCount > 0) { activeWeights.languages = rawWeights.languages || 10; totalActiveWeight += activeWeights.languages; }
  if (workCondItemCount > 0) { activeWeights.workConditions = rawWeights.workConditions || 10; totalActiveWeight += activeWeights.workConditions; }

  let weightedScore = 0;
  if (totalActiveWeight > 0) {
    let sum = 0;
    for (const [cat, w] of Object.entries(activeWeights)) {
      sum += (categoryScores[cat] || 0) * (w / totalActiveWeight);
    }
    weightedScore = Math.round(sum);
  } else {
    // If no specific criteria configured, fallback to skills score or 100
    weightedScore = skillsCategoryScore;
  }

  // ─────────────────────────────────────────────────────────────
  // 8. FINAL RESULT GROUP DETERMINATION
  // ─────────────────────────────────────────────────────────────
  const qualifiedThreshold = threshold;
  const needsReviewThreshold = Math.max(30, threshold - 20);
  const belowSkillThreshold = skillsCategoryScore < threshold;

  let resultGroup = 'Passed';

  if (hardRequirementFailures.length > 0 || belowSkillThreshold || gpaFailed) {
    resultGroup = 'Failed';
    if (belowSkillThreshold) {
      reasons.push(`Điểm kỹ năng (${skillsCategoryScore}%) chưa đạt ngưỡng tối thiểu ${threshold}% (Mức ${level}).`);
    }
    if (gpaFailed) {
      reasons.push(`GPA (${features.candidateGpa}/${features.candidateGpaScale}) dưới ngưỡng yêu cầu ${minGpa}/${gpaScale}.`);
    }
    reasons.push(...hardRequirementFailures.map(f => `Không đạt điều kiện: ${f}`));
  } else if (
    (level !== 'Relaxed' && missingMandatorySkills.length > 0) ||
    gpaMissing ||
    certsMissing ||
    hardRequirementMissing.length > 0 ||
    weightedScore < qualifiedThreshold
  ) {
    resultGroup = 'ReviewNeeded';
    if (missingMandatorySkills.length > 0 && level !== 'Relaxed') {
      reasons.push(`Thiếu ${missingMandatorySkills.length} kỹ năng bắt buộc: ${missingMandatorySkills.join(', ')}.`);
    }
    if (gpaMissing) {
      reasons.push(`Chưa tìm thấy điểm GPA trong CV để đối chiếu với ngưỡng ${minGpa}/${gpaScale}.`);
    }
    if (certsMissing) {
      reasons.push('Chưa tìm thấy đủ chứng chỉ bắt buộc trong CV.');
    }
    reasons.push(...hardRequirementMissing.map(m => `Cần xác minh: ${m}`));
    if (weightedScore < qualifiedThreshold && !reasons.length) {
      reasons.push(`Điểm phù hợp đạt ${weightedScore}%, cần xem xét thêm trước vòng phỏng vấn (Ngưỡng đạt: ${qualifiedThreshold}%).`);
    }
  } else {
    resultGroup = 'Passed';
    reasons.push(`Đáp ứng tốt các tiêu chí trọng tâm với điểm kỹ năng ${skillsCategoryScore}%.`);
  }

  // ─────────────────────────────────────────────────────────────
  // 9. EMPLOYMENT HISTORY INSIGHTS (PURELY INFORMATIONAL)
  // ─────────────────────────────────────────────────────────────
  const employmentInsights = {
    avgTenureMonths: features.avgTenureMonths,
    formattedAvgTenure: features.avgTenureMonths ? `${(features.avgTenureMonths / 12).toFixed(1)} năm / công ty` : 'Chưa đủ dữ liệu',
    jobHopsCount: features.jobHops,
    careerGapsCount: features.careerGaps,
    hasCareerGap: features.careerGaps > 0,
    note: 'Lịch sử công tác chỉ mang tính tham khảo khi phỏng vấn, không dùng để tự động loại hồ sơ.'
  };

  return {
    resultGroup,
    screeningScore: weightedScore,
    categoryScores,
    activeWeights,
    matchedCriteria,
    unmetCriteria,
    missingDataCriteria,
    salaryInsight,
    employmentInsights,
    reasons: [...new Set(reasons)],
    matchedSkills: matchedSkillsList,
    missingSkills: missingSkillsList,
    features: {
      yoe: features.yoe,
      candidateGpa: features.candidateGpa,
      candidateGpaScale: features.candidateGpaScale,
      hasGithub: features.hasGithub,
      hasPortfolio: features.hasPortfolio,
      certNames: features.certNames || [],
      langNames: features.langNames || []
    },
    isFilterActive: true,
    ...metadata
  };
}

module.exports = {
  DEFAULT_WEIGHTS,
  DEFAULT_SCREENING_CONFIG,
  mergeConfig,
  extractCandidateFeatures,
  evaluateFlexibleScreening
};
