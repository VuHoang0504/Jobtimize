const { createHash } = require('crypto');
const fs = require('fs/promises');
const path = require('path');
const { extractTextFromFile } = require('./aiService');
const { executeQuery } = require('../config/db');
const { withTransaction, putNotification } = require('./notificationStore');

const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const failedProfiles = new Map();
const skillMatchers = new Map();

function skillMatcher(skill) {
  const name = (skill.SkillName || '').toLowerCase(), normalized = (skill.NormalizedName || '').toLowerCase();
  const key = JSON.stringify([name, normalized]);
  if (skillMatchers.has(key)) return skillMatchers.get(key);
  const terms = new Set([name, normalized].filter(Boolean));
  const aliases = [
    [['react', 'reactjs'], ['react', 'reactjs', 'react.js']], [['node', 'nodejs'], ['node', 'nodejs', 'node.js']],
    [['next', 'nextjs'], ['nextjs', 'next.js']], [['c#', 'dotnet', 'net', 'netcore', 'c#netcore'], ['c#', '.net', 'dotnet', 'asp.net']],
    [['java', 'spring', 'springboot', 'javaspringboot'], ['java', 'spring', 'spring boot', 'springboot']],
    [['kubernetes', 'k8s'], ['kubernetes', 'k8s']], [['sqlserver', 'mssql'], ['sql server', 'sqlserver', 'mssql']],
    [['postgres', 'postgresql'], ['postgres', 'postgresql']], [['tailwind', 'tailwindcss'], ['tailwind', 'tailwindcss']]
  ];
  const canonicalNames = [name, normalized].map(value => value.replace(/[^a-z0-9#+]/g, ''));
  for (const [keys, values] of aliases) if (canonicalNames.some(value => keys.includes(value))) values.forEach(value => terms.add(value));
  const patterns = [...terms].map(term => {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(^|[^\\p{L}\\p{N}_])${escaped}(?=$|[^\\p{L}\\p{N}_])`, 'iu');
  });
  const matches = text => patterns.some(pattern => pattern.test(text));
  if (skillMatchers.size >= 2000) skillMatchers.clear();
  skillMatchers.set(key, matches);
  return matches;
}

function hasSkill(text, skill) {
  return skillMatcher(skill)(text);
}

function prepareCatalog(jobs, requirements, taxonomy) {
  const byJob = new Map();
  for (const skill of requirements) {
    if (!byJob.has(skill.JobID)) byJob.set(skill.JobID, []);
    byJob.get(skill.JobID).push(skill);
  }
  return jobs.map(job => {
    const explicit = byJob.get(job.JobID) || [];
    const skills = explicit.length ? explicit : taxonomy.filter(skill => hasSkill(
      `${job.Title} ${job.Description} ${job.Requirements}`, skill)).map(skill => ({ ...skill, IsMandatory: true }));
    const matchers = skills.map(skill => ({ matches: skillMatcher(skill), weight: skill.IsMandatory ? 2 : 1 }));
    return { job, matchers, total: matchers.reduce((sum, skill) => sum + skill.weight, 0) };
  });
}

function rankPreparedJobs(cvText, catalog, applied = new Set()) {
  return catalog.filter(({ job }) => !applied.has(job.JobID)).map(({ job, matchers, total }) => {
    const earned = matchers.reduce((sum, skill) => sum + (skill.matches(cvText) ? skill.weight : 0), 0);
    // Compare the unrounded score to the agreed threshold.
    return { ...job, score: total ? earned / total * 100 : 0 };
  }).filter(job => job.score >= 70).sort((a, b) => b.score - a.score || b.JobID - a.JobID).slice(0, 3);
}

function rankJobs(cvText, jobs, requirements, taxonomy, applied = new Set()) {
  return rankPreparedJobs(cvText, prepareCatalog(jobs, requirements, taxonomy), applied);
}

async function getCVText(cv) {
  if (cv.CvData) return `${cv.Title || ''} ${cv.CvData}`;
  // Only read local uploaded CVs, never fetch a URL supplied in CV metadata.
  if (!cv.FileUrl?.startsWith('/uploads/')) return '';
  const uploads = path.resolve(__dirname, '../../uploads');
  const file = path.resolve(uploads, cv.FileUrl.slice('/uploads/'.length));
  if (!file.startsWith(uploads + path.sep)) return '';
  const real = await fs.realpath(file);
  if (!real.startsWith(await fs.realpath(uploads) + path.sep)) return '';
  const stat = await fs.stat(real);
  if (stat.size > 10 * 1024 * 1024) return '';
  return extractTextFromFile(real);
}

async function refreshRecommendations() {
  const [jobResult, skillResult, taxonomyResult, profileResult, stateResult, appliedResult] = await Promise.all([
    executeQuery(`SELECT j.JobID,j.Title,j.Description,j.Requirements,e.CompanyName FROM JobPostings j
      JOIN Employers e ON e.EmployerID=j.EmployerID JOIN Users u ON u.UserID=e.UserID
      WHERE j.Status='Published' AND u.Status='Active' AND (j.ExpiresAt IS NULL OR j.ExpiresAt>GETDATE()) ORDER BY j.JobID`),
    executeQuery(`SELECT r.JobID,r.SkillID,r.IsMandatory,t.SkillName,t.NormalizedName FROM JobSkillRequirements r JOIN SkillTaxonomy t ON t.SkillID=r.SkillID ORDER BY r.JobID,r.SkillID`),
    executeQuery('SELECT SkillID,SkillName,NormalizedName FROM SkillTaxonomy ORDER BY SkillID'),
    executeQuery(`SELECT p.ProfileID,p.UserID,c.CVID,CONVERT(VARCHAR(64),HASHBYTES('SHA2_256',CONCAT(c.Title,'|',c.CvData,'|',c.FileUrl,'|',CONVERT(VARCHAR(30),c.UpdatedAt,126))),2) AS CVHash
      FROM CandidateProfiles p JOIN Users u ON u.UserID=p.UserID
      CROSS APPLY(SELECT TOP 1 CVID,Title,CvData,FileUrl,UpdatedAt FROM CVs WHERE ProfileID=p.ProfileID AND IsPrimary=1 ORDER BY UpdatedAt DESC,CVID DESC)c
      WHERE p.IsLookingForJob=1 AND u.Status='Active' AND EXISTS(SELECT 1 FROM UserRoles ur JOIN Roles r ON r.RoleID=ur.RoleID WHERE ur.UserID=p.UserID AND r.RoleName='Candidate')`),
    executeQuery('SELECT ProfileID,Fingerprint FROM NotificationRecommendationState'),
    executeQuery('SELECT ProfileID,JobID FROM JobApplications ORDER BY ProfileID,JobID')
  ]);
  const jobs = jobResult.recordset, skills = skillResult.recordset, taxonomy = taxonomyResult.recordset;
  const catalogHash = digest([jobs, skills, taxonomy]);
  const appliedByProfile = new Map();
  for (const application of appliedResult.recordset) {
    if (!appliedByProfile.has(application.ProfileID)) appliedByProfile.set(application.ProfileID, []);
    appliedByProfile.get(application.ProfileID).push(application.JobID);
  }
  const states = new Map(stateResult.recordset.map(s => [s.ProfileID, s.Fingerprint]));
  const eligible = new Set(profileResult.recordset.map(p => p.ProfileID));
  for (const id of failedProfiles.keys()) if (!eligible.has(id)) failedProfiles.delete(id);
  // Every tick scans cheap hashes; only changed sources cause CV extraction/scoring.
  const dirty = profileResult.recordset.map(p => ({ ...p, applied: appliedByProfile.get(p.ProfileID) || [] }))
    .map(p => ({ ...p, fingerprint: digest([p.CVID, p.CVHash, catalogHash, p.applied]) }))
    .filter(p => states.get(p.ProfileID) !== p.fingerprint && (failedProfiles.get(p.ProfileID)?.fingerprint !== p.fingerprint || failedProfiles.get(p.ProfileID).retryAt <= Date.now())).slice(0, 20);
  const prepared = dirty.length ? prepareCatalog(jobs, skills, taxonomy) : [];
  for (const profile of dirty) {
    try {
      const cv = (await executeQuery('SELECT CVID,Title,CvData,FileUrl FROM CVs WHERE CVID=@CVID AND IsPrimary=1', { CVID: profile.CVID })).recordset[0];
      if (!cv) continue;
      // A changed or unreadable CV must not leave recommendations based on its old contents.
      await withTransaction(async query => {
        await query("UPDATE Notifications SET IsActive=0 WHERE UserID=@ID AND Type='job_match'", { ID: profile.UserID });
        await query('DELETE FROM NotificationRecommendationState WHERE ProfileID=@ID', { ID: profile.ProfileID });
      });
      const text = await getCVText(cv);
      const ranked = rankPreparedJobs(text, prepared, new Set(profile.applied));
      await withTransaction(async query => {
        await query(`UPDATE Notifications SET IsActive=0 WHERE UserID=@UserID AND Type='job_match'`, { UserID: profile.UserID });
        for (const job of ranked) {
          await putNotification(query, { userId: profile.UserID, role: 'Candidate', type: 'job_match',
            key: `match:${profile.CVID}:${profile.CVHash}:${job.JobID}`, jobId: job.JobID, cvId: cv.CVID,
            title: 'Việc làm phù hợp với CV mặc định',
            body: `${job.Title} tại ${job.CompanyName} — phù hợp ${Math.round(job.score)}%.`, href: `/jobs/${job.JobID}` });
        }
        await query(`IF EXISTS(SELECT 1 FROM NotificationRecommendationState WITH(UPDLOCK,HOLDLOCK) WHERE ProfileID=@ProfileID)
          UPDATE NotificationRecommendationState SET Fingerprint=@Hash,UpdatedAt=SYSUTCDATETIME() WHERE ProfileID=@ProfileID
          ELSE INSERT NotificationRecommendationState(ProfileID,Fingerprint) VALUES(@ProfileID,@Hash)`, { ProfileID: profile.ProfileID, Hash: profile.fingerprint });
      });
      failedProfiles.delete(profile.ProfileID);
    } catch (error) {
      failedProfiles.set(profile.ProfileID, { fingerprint: profile.fingerprint, retryAt: Date.now() + 5 * 60 * 1000 });
      console.error('Notification CV refresh failed:', profile.ProfileID, error.message);
    }
  }
  await executeQuery(`UPDATE n SET IsActive=0 FROM Notifications n WHERE n.Type='job_match' AND n.IsActive=1
    AND NOT EXISTS(SELECT 1 FROM CVs c JOIN CandidateProfiles p ON p.ProfileID=c.ProfileID JOIN Users u ON u.UserID=p.UserID
      JOIN JobPostings j ON j.JobID=n.JobID JOIN Employers e ON e.EmployerID=j.EmployerID JOIN Users eu ON eu.UserID=e.UserID
      WHERE c.CVID=n.CVID AND c.IsPrimary=1 AND p.UserID=n.UserID AND p.IsLookingForJob=1 AND u.Status='Active' AND eu.Status='Active'
      AND j.Status='Published' AND (j.ExpiresAt IS NULL OR j.ExpiresAt>GETDATE())
      AND NOT EXISTS(SELECT 1 FROM JobApplications a WHERE a.ProfileID=p.ProfileID AND a.JobID=j.JobID))`);
  await executeQuery(`DELETE s FROM NotificationRecommendationState s WHERE NOT EXISTS(
    SELECT 1 FROM CandidateProfiles p JOIN Users u ON u.UserID=p.UserID JOIN CVs c ON c.ProfileID=p.ProfileID
    WHERE p.ProfileID=s.ProfileID AND p.IsLookingForJob=1 AND u.Status='Active' AND c.IsPrimary=1)`);
}

module.exports = { rankJobs, prepareCatalog, rankPreparedJobs, digest, getCVText, hasSkill, refreshRecommendations };
