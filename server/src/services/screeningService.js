const { executeQuery } = require('../config/db');
const cvAnalysis = require('./cvAnalysisService');
const { fold, canonicalSkill, positiveMention, aliases, hash, text } = require('./cvNormalization');
const flexibleEngine = require('./flexibleScreeningEngine');

const SCREENING_THRESHOLDS = {
  Relaxed: 50,
  Balanced: 70,
  Strict: 85
};

const SCREENING_LEVEL_LABELS = {
  Relaxed: 'Nới lỏng (50%)',
  Balanced: 'Cân bằng (70%)',
  Strict: 'Nghiêm ngặt (85%)'
};

function parseCertificates(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(v => text(v, 200)).filter(Boolean);
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(v => text(v, 200)).filter(Boolean) : [];
  } catch {
    return String(value).split(',').map(v => text(v, 200)).filter(Boolean);
  }
}

/**
 * Pure evaluator for candidate screening against job criteria.
 * Bridges to the flexible engine while maintaining full backward-compatibility.
 */
function evaluateScreening(context, criteria = {}, requiredSkills = [], job = {}) {
  const level = criteria.ScreeningLevel && SCREENING_THRESHOLDS[criteria.ScreeningLevel] ? criteria.ScreeningLevel : 'Balanced';
  const threshold = criteria.threshold || SCREENING_THRESHOLDS[level] || 70;
  const version = criteria.Version || criteria.criteriaVersion || 1;

  // If criteria has ConfigJson, parse and use it directly
  let flexibleConfig = criteria.ConfigJson ? (typeof criteria.ConfigJson === 'string' ? JSON.parse(criteria.ConfigJson) : criteria.ConfigJson) : null;

  if (!flexibleConfig) {
    // Synthesize flexible config from legacy criteria
    const minGpa = criteria.MinGPA != null && criteria.MinGPA > 0 ? Number(criteria.MinGPA) : null;
    const gpaScale = criteria.GPAScale === 10 ? 10 : 4;
    const mandatoryCerts = parseCertificates(criteria.MandatoryCertificates);

    flexibleConfig = {
      ScreeningLevel: level,
      threshold,
      Version: version,
      isEnabled: criteria.IsEnabled !== false && criteria.IsEnabled !== 0,
      thresholds: {
        qualified: threshold,
        needsReview: Math.max(40, threshold - 20)
      },
      education: {
        gpa: { min: minGpa, scale: gpaScale, mode: minGpa != null ? 'PREFERRED' : 'INFORMATIONAL' }
      },
      languages: {
        items: mandatoryCerts.map(c => ({
          language: c.toLowerCase().includes('toeic') || c.toLowerCase().includes('ielts') ? 'English' : c,
          certificate: c,
          mode: 'REQUIRED',
          allowSelfDeclared: false
        }))
      }
    };
  } else {
    flexibleConfig.ScreeningLevel = flexibleConfig.ScreeningLevel || level;
    flexibleConfig.threshold = flexibleConfig.threshold || threshold;
    flexibleConfig.Version = flexibleConfig.Version || version;
  }

  // Ensure isEnabled flag is honored
  if (criteria.IsEnabled === false || criteria.IsEnabled === 0) {
    flexibleConfig.isEnabled = false;
  }

  const evalResult = flexibleEngine.evaluateFlexibleScreening(context, flexibleConfig, requiredSkills, job);

  // Synthesize legacy fields for complete backward compatibility
  const minGpa = criteria.MinGPA != null ? Number(criteria.MinGPA) : null;
  const gpaScale = criteria.GPAScale === 10 ? 10 : 4;
  let gpaStatus = 'NotRequired';
  let normalizedGpa = null;
  if (minGpa != null) {
    if (evalResult.features?.candidateGpa != null) {
      const candGpa = evalResult.features.candidateGpa;
      const candScale = evalResult.features.candidateGpaScale === 10 ? 10 : 4;
      normalizedGpa = candScale === gpaScale
        ? candGpa
        : (gpaScale === 10 ? Math.round((candGpa / 4) * 10 * 100) / 100 : Math.round((candGpa / 10) * 4 * 100) / 100);
      gpaStatus = normalizedGpa >= minGpa ? 'Passed' : 'Below';
    } else {
      gpaStatus = 'Missing';
    }
  }

  const gpaResult = {
    status: gpaStatus,
    candidateGpa: evalResult.features?.candidateGpa || null,
    candidateScale: evalResult.features?.candidateGpaScale || 4,
    normalizedGpa,
    requiredGpa: minGpa,
    scale: gpaScale
  };

  const mandatoryCerts = parseCertificates(criteria.MandatoryCertificates);
  const matchedCerts = [];
  const missingCerts = [];
  if (mandatoryCerts.length > 0) {
    const candidateCerts = (evalResult.features?.certNames || []).map(c => fold(c));
    for (const cert of mandatoryCerts) {
      const isFound = candidateCerts.some(c => c.includes(fold(cert)));
      if (isFound) {
        matchedCerts.push(cert);
      } else {
        missingCerts.push(cert);
      }
    }
  }

  const certsResult = {
    status: mandatoryCerts.length === 0 ? 'NotRequired' : (missingCerts.length === 0 ? 'Passed' : 'Missing'),
    matched: matchedCerts,
    missing: missingCerts
  };

  return {
    ...evalResult,
    gpaResult,
    certsResult,
    signals: {
      experienceCount: (context?.data?.experiences || []).length,
      educationsCount: (context?.data?.educations || []).length,
      languages: (context?.data?.languages || []).map(l => l.language).filter(Boolean)
    }
  };
}

/**
 * Fetch active screening criteria for a job.
 */
async function getJobScreeningCriteria(jobId) {
  const res = await executeQuery(`
    SELECT TOP 1 CriteriaID, JobID, Version, ScreeningLevel, MinGPA, GPAScale, MandatoryCertificates, IsEnabled, ConfigJson, IsActive, CreatedAt, UpdatedAt
    FROM JobScreeningCriteria
    WHERE JobID = @JobID AND IsActive = 1
    ORDER BY Version DESC
  `, { JobID: jobId });

  if (res.recordset && res.recordset.length > 0) {
    const row = res.recordset[0];
    let parsedConfig = null;
    try {
      if (row.ConfigJson) parsedConfig = typeof row.ConfigJson === 'string' ? JSON.parse(row.ConfigJson) : row.ConfigJson;
    } catch (e) {
      parsedConfig = null;
    }

    if (!parsedConfig) {
      parsedConfig = flexibleEngine.mergeConfig({
        isEnabled: row.IsEnabled !== false && row.IsEnabled !== 0,
        education: {
          gpa: { min: row.MinGPA, scale: row.GPAScale || 4, mode: 'PREFERRED' }
        },
        languages: {
          items: parseCertificates(row.MandatoryCertificates).map(c => ({
            language: c.toLowerCase().includes('toeic') || c.toLowerCase().includes('ielts') ? 'English' : c,
            certificate: c,
            mode: 'REQUIRED',
            allowSelfDeclared: false
          }))
        }
      });
    }

    return {
      ...row,
      IsEnabled: row.IsEnabled !== false && row.IsEnabled !== 0,
      Config: parsedConfig,
      MandatoryCertificates: parseCertificates(row.MandatoryCertificates)
    };
  }

  // Fallback default
  const defaultConfig = flexibleEngine.mergeConfig();
  return {
    CriteriaID: null,
    JobID: jobId,
    Version: 1,
    ScreeningLevel: 'Balanced',
    MinGPA: null,
    GPAScale: null,
    MandatoryCertificates: [],
    IsEnabled: true,
    Config: defaultConfig,
    IsActive: 1
  };
}

/**
 * Save new screening criteria for a job with incremented version.
 * Supports both flexible config and legacy attributes.
 */
async function saveJobScreeningCriteria(jobId, options = {}) {
  const {
    screeningLevel = 'Balanced',
    minGpa = null,
    gpaScale = null,
    mandatoryCertificates = [],
    isEnabled = true,
    configJson = null
  } = options;

  const current = await getJobScreeningCriteria(jobId);
  const newVersion = current.CriteriaID ? current.Version + 1 : 1;

  // Deactivate old active criteria
  await executeQuery(`
    UPDATE JobScreeningCriteria
    SET IsActive = 0, UpdatedAt = SYSUTCDATETIME()
    WHERE JobID = @JobID
  `, { JobID: jobId });

  let finalConfig = null;
  if (configJson) {
    finalConfig = typeof configJson === 'string' ? JSON.parse(configJson) : configJson;
    finalConfig.isEnabled = isEnabled !== false;
  } else {
    finalConfig = flexibleEngine.mergeConfig({
      isEnabled: isEnabled !== false,
      education: {
        gpa: { min: minGpa != null ? Number(minGpa) : null, scale: Number(gpaScale) || 4, mode: 'PREFERRED' }
      },
      languages: {
        items: parseCertificates(mandatoryCertificates).map(c => ({
          language: c.toLowerCase().includes('toeic') || c.toLowerCase().includes('ielts') ? 'English' : c,
          certificate: c,
          mode: 'REQUIRED',
          allowSelfDeclared: false
        }))
      }
    });
  }

  const certsJson = JSON.stringify(parseCertificates(mandatoryCertificates));
  const validLevel = SCREENING_THRESHOLDS[screeningLevel] ? screeningLevel : 'Balanced';
  const validMinGpa = minGpa != null && minGpa > 0 ? Number(minGpa) : (finalConfig.education?.gpa?.min || null);
  const validScale = validMinGpa != null ? (Number(gpaScale) === 10 ? 10 : 4) : (finalConfig.education?.gpa?.scale || 4);

  const insertRes = await executeQuery(`
    INSERT INTO JobScreeningCriteria (JobID, Version, ScreeningLevel, MinGPA, GPAScale, MandatoryCertificates, IsEnabled, ConfigJson, IsActive, CreatedAt, UpdatedAt)
    OUTPUT INSERTED.*
    VALUES (@JobID, @Version, @ScreeningLevel, @MinGPA, @GPAScale, @MandatoryCertificates, @IsEnabled, @ConfigJson, 1, SYSUTCDATETIME(), SYSUTCDATETIME())
  `, {
    JobID: jobId,
    Version: newVersion,
    ScreeningLevel: validLevel,
    MinGPA: validMinGpa,
    GPAScale: validScale,
    MandatoryCertificates: certsJson,
    IsEnabled: isEnabled ? 1 : 0,
    ConfigJson: JSON.stringify(finalConfig)
  });

  const savedRow = insertRes.recordset[0];
  return {
    ...savedRow,
    IsEnabled: savedRow.IsEnabled !== 0 && savedRow.IsEnabled !== false,
    Config: finalConfig,
    MandatoryCertificates: parseCertificates(savedRow.MandatoryCertificates)
  };
}

/**
 * Toggle screening on/off for a job.
 */
async function toggleJobScreening(jobId, isEnabled) {
  const current = await getJobScreeningCriteria(jobId);
  const updatedConfig = { ...(current.Config || flexibleEngine.DEFAULT_SCREENING_CONFIG), isEnabled: Boolean(isEnabled) };

  await executeQuery(`
    UPDATE JobScreeningCriteria
    SET IsEnabled = @IsEnabled,
        ConfigJson = @ConfigJson,
        UpdatedAt = SYSUTCDATETIME()
    WHERE JobID = @JobID AND IsActive = 1
  `, {
    JobID: jobId,
    IsEnabled: isEnabled ? 1 : 0,
    ConfigJson: JSON.stringify(updatedConfig)
  });

  return { isEnabled: Boolean(isEnabled), config: updatedConfig };
}

/**
 * Template Management (UC-E08)
 */
async function saveFilterTemplate(employerId, { templateName, description = '', configJson }) {
  if (!templateName || !templateName.trim()) throw new Error('Vui lòng nhập tên mẫu bộ lọc.');
  const jsonStr = typeof configJson === 'string' ? configJson : JSON.stringify(configJson);

  const res = await executeQuery(`
    INSERT INTO JobScreeningTemplates (EmployerID, TemplateName, Description, ConfigJson, CreatedAt, UpdatedAt)
    OUTPUT INSERTED.*
    VALUES (@EmployerID, @TemplateName, @Description, @ConfigJson, SYSUTCDATETIME(), SYSUTCDATETIME())
  `, {
    EmployerID: employerId,
    TemplateName: templateName.trim(),
    Description: description ? description.trim() : '',
    ConfigJson: jsonStr
  });

  const row = res.recordset[0];
  return {
    ...row,
    Config: JSON.parse(row.ConfigJson)
  };
}

async function listFilterTemplates(employerId) {
  const res = await executeQuery(`
    SELECT TemplateID, EmployerID, TemplateName, Description, ConfigJson, CreatedAt, UpdatedAt
    FROM JobScreeningTemplates
    WHERE EmployerID = @EmployerID
    ORDER BY TemplateID DESC
  `, { EmployerID: employerId });

  return (res.recordset || []).map(r => ({
    ...r,
    Config: (() => { try { return JSON.parse(r.ConfigJson); } catch { return null; } })()
  }));
}

async function deleteFilterTemplate(employerId, templateId) {
  const res = await executeQuery(`
    DELETE FROM JobScreeningTemplates
    WHERE TemplateID = @TemplateID AND EmployerID = @EmployerID
  `, {
    TemplateID: templateId,
    EmployerID: employerId
  });
  return res.rowsAffected[0] > 0;
}

/**
 * Retrieve CV context for a specific application.
 */
async function getApplicationCVContext(applicationId) {
  const row = (await executeQuery(`
    SELECT ja.ApplicationID, ja.JobID, ja.ProfileID, ja.CVID, ja.CVVersionID,
           cv.Title AS CVTitle,
           cp.Headline, cp.Bio, cp.DesiredSalary, cp.CurrentLocation,
           j.Title AS JobTitle, j.SalaryRange AS JobSalaryRange, j.Location AS JobLocation, j.Description AS JobDescription
    FROM JobApplications ja
    JOIN CandidateProfiles cp ON ja.ProfileID = cp.ProfileID
    JOIN JobPostings j ON ja.JobID = j.JobID
    LEFT JOIN CVs cv ON ja.CVID = cv.CVID
    WHERE ja.ApplicationID = @ApplicationID
  `, { ApplicationID: applicationId })).recordset[0];

  if (!row) return null;

  await cvAnalysis.initialize();

  let version = null;
  if (row.CVVersionID) {
    version = (await executeQuery(`
      SELECT * FROM CVDocumentVersions WHERE VersionID = @VersionID
    `, { VersionID: row.CVVersionID })).recordset[0];
  } else if (row.CVID) {
    const cv = (await executeQuery(`SELECT * FROM CVs WHERE CVID = @CVID`, { CVID: row.CVID })).recordset[0];
    if (cv) version = await cvAnalysis.ensureVersion(cv);
  }

  const data = version?.ConfirmedJson ? cvAnalysis.parse(version.ConfirmedJson) : (version?.ParsedJson ? cvAnalysis.parse(version.ParsedJson) : null);

  return {
    applicationId: row.ApplicationID,
    jobId: row.JobID,
    profileId: row.ProfileID,
    cv: { CVID: row.CVID, Title: row.CVTitle },
    version,
    data,
    profile: {
      Headline: row.Headline,
      Bio: row.Bio,
      DesiredSalary: row.DesiredSalary,
      CurrentLocation: row.CurrentLocation
    },
    job: {
      Title: row.JobTitle,
      SalaryRange: row.JobSalaryRange,
      Location: row.JobLocation,
      Description: row.JobDescription
    }
  };
}

/**
 * Retrieve skill requirements for a job.
 */
async function getJobSkills(jobId) {
  const rows = (await executeQuery(`
    SELECT jsr.JobID, jsr.SkillID, jsr.IsMandatory, st.SkillName, st.NormalizedName
    FROM JobSkillRequirements jsr
    JOIN SkillTaxonomy st ON jsr.SkillID = st.SkillID
    WHERE jsr.JobID = @JobID
  `, { JobID: jobId })).recordset;

  return rows;
}

/**
 * Evaluate and persist screening result for a single application.
 */
async function calculateAndSaveScreening(applicationId) {
  const context = await getApplicationCVContext(applicationId);
  if (!context) return null;

  const criteria = await getJobScreeningCriteria(context.jobId);
  const requiredSkills = await getJobSkills(context.jobId);

  const evaluation = evaluateScreening(context, criteria, requiredSkills, context.job || {});

  await executeQuery(`
    UPDATE JobApplications
    SET ScreeningResultGroup = @ResultGroup,
        ScreeningScore = @Score,
        ScreeningDetailsJson = @DetailsJson,
        CriteriaVersion = @CriteriaVersion,
        MatchScore = @Score
    WHERE ApplicationID = @ApplicationID
  `, {
    ApplicationID: applicationId,
    ResultGroup: evaluation.resultGroup,
    Score: evaluation.screeningScore,
    DetailsJson: JSON.stringify(evaluation),
    CriteriaVersion: evaluation.criteriaVersion
  });

  return evaluation;
}

/**
 * Recalculate screening for all applications of a job in the background.
 */
async function recalculateJobApplications(jobId) {
  const criteria = await getJobScreeningCriteria(jobId);
  const apps = (await executeQuery(`
    SELECT ApplicationID FROM JobApplications WHERE JobID = @JobID
  `, { JobID: jobId })).recordset;

  if (!apps.length) return { total: 0, processed: 0 };

  // Register queue status
  const queueEntry = (await executeQuery(`
    INSERT INTO JobScreeningQueue (JobID, CriteriaVersion, Status, TotalCount, ProcessedCount, CreatedAt, UpdatedAt)
    OUTPUT INSERTED.QueueID
    VALUES (@JobID, @CriteriaVersion, 'Processing', @TotalCount, 0, SYSUTCDATETIME(), SYSUTCDATETIME())
  `, {
    JobID: jobId,
    CriteriaVersion: criteria.Version || 1,
    TotalCount: apps.length
  })).recordset[0];

  let processed = 0;
  for (const app of apps) {
    try {
      await calculateAndSaveScreening(app.ApplicationID);
      processed++;
    } catch (err) {
      console.error(`Failed to screen application ${app.ApplicationID}:`, err.message);
    }
  }

  await executeQuery(`
    UPDATE JobScreeningQueue
    SET Status = 'Completed', ProcessedCount = @Processed, UpdatedAt = SYSUTCDATETIME()
    WHERE QueueID = @QueueID
  `, {
    QueueID: queueEntry.QueueID,
    Processed: processed
  });

  return { total: apps.length, processed };
}

module.exports = {
  SCREENING_THRESHOLDS,
  SCREENING_LEVEL_LABELS,
  parseCertificates,
  evaluateScreening,
  getJobScreeningCriteria,
  saveJobScreeningCriteria,
  toggleJobScreening,
  saveFilterTemplate,
  listFilterTemplates,
  deleteFilterTemplate,
  calculateAndSaveScreening,
  recalculateJobApplications,
  getApplicationCVContext,
  getJobSkills
};

