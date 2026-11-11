const { enqueue } = require('./notificationStore');
const { randomUUID } = require('crypto');
const { digest, prepareCatalog, rankPreparedJobs } = require('./notificationRecommendations');

const BATCH_SIZE = 100;
const clean = value => String(value ?? '').trim().replace(/\s+/g, ' ').toLowerCase();

function fingerprint(job, skills) {
  return digest([
    ...['Title', 'Description', 'Requirements', 'CategoryID', 'SalaryRange', 'Location'].map(key => clean(job[key])),
    [...skills].sort((a, b) => a.SkillID - b.SkillID).map(skill => [skill.SkillID, Boolean(skill.IsMandatory)])
  ]);
}

async function context(query, jobId) {
  const job = (await query(`SELECT j.JobID,j.Title,j.Description,j.Requirements,j.CategoryID,j.SalaryRange,j.Location,e.CompanyName
    FROM JobPostings j JOIN Employers e ON e.EmployerID=j.EmployerID JOIN Users u ON u.UserID=e.UserID
    WHERE j.JobID=@JobID AND j.Status='Published' AND u.Status='Active'
    AND (j.ExpiresAt IS NULL OR j.ExpiresAt>GETDATE())`, { JobID: jobId })).recordset[0];
  if (!job) return null;
  const skills = (await query(`SELECT r.JobID,r.SkillID,r.IsMandatory,t.SkillName,t.NormalizedName
    FROM JobSkillRequirements r JOIN SkillTaxonomy t ON t.SkillID=r.SkillID WHERE r.JobID=@JobID ORDER BY r.SkillID`, { JobID: jobId })).recordset;
  return { job, skills, fingerprint: fingerprint(job, skills) };
}

// Must be called in the same transaction as the job and its skill requirements.
async function enqueueJobMatch(query, jobId, previousFingerprint) {
  const current = await context(query, jobId);
  if (!current || current.fingerprint === previousFingerprint) return;
  await enqueue(query, 'job_match_alert', { jobId: current.job.JobID, fingerprint: current.fingerprint, afterProfileId: 0 },
    `job-match:${current.job.JobID}:${randomUUID()}`);
}

const currentFingerprint = async (query, jobId) => (await context(query, jobId))?.fingerprint;

function verifiedSkills(json) {
  try {
    const data = JSON.parse(json);
    if (!Array.isArray(data.skills)) return '';
    return data.skills.filter(skill => skill?.verified === true).map(skill => skill.canonicalName || skill.name || '').join('\n');
  } catch { return ''; }
}

async function matchBatch(query, event) {
  const payload = JSON.parse(event.Payload);
  const current = await context(query, payload.jobId);
  // Discard queued revisions superseded by an edit, closure, expiry or moderation.
  if (!current || current.fingerprint !== payload.fingerprint) return { notices: [], done: true };
  if (!payload.afterProfileId) {
    const retired = await query(`UPDATE Notifications SET IsActive=0 OUTPUT INSERTED.UserID,INSERTED.RecipientRole
      WHERE JobID=@JobID AND Type='job_match_alert' AND IsActive=1 AND EventKey NOT LIKE @Suffix`,
    { JobID: payload.jobId, Suffix: '%:' + current.fingerprint });
    for (const user of retired.recordset || []) query.notificationRecipients?.set(`${user.UserID}:${user.RecipientRole}`, { userId: user.UserID, role: user.RecipientRole });
  }
  const taxonomy = current.skills.length ? [] : (await query('SELECT SkillID,SkillName,NormalizedName FROM SkillTaxonomy ORDER BY SkillID')).recordset;
  const catalog = prepareCatalog([current.job], current.skills, taxonomy);
  if (!catalog[0].total) return { notices: [], done: true };
  const profiles = (await query(`SELECT TOP (${BATCH_SIZE}) p.ProfileID,p.UserID,c.CVID,v.VersionID,v.ConfirmedJson
    FROM CandidateProfiles p JOIN Users u ON u.UserID=p.UserID
    CROSS APPLY(SELECT TOP 1 CVID FROM CVs WHERE ProfileID=p.ProfileID AND IsPrimary=1 AND IsArchived=0 ORDER BY UpdatedAt DESC,CVID DESC)c
    CROSS APPLY(SELECT TOP 1 VersionID,Status,ConfirmedJson FROM CVDocumentVersions WHERE CVID=c.CVID ORDER BY VersionNumber DESC)v
    WHERE p.ProfileID>@AfterProfileID AND p.IsLookingForJob=1 AND u.Status='Active' AND v.Status='Ready'
    AND EXISTS(SELECT 1 FROM UserRoles ur JOIN Roles r ON r.RoleID=ur.RoleID WHERE ur.UserID=p.UserID AND r.RoleName='Candidate')
    AND NOT EXISTS(SELECT 1 FROM JobApplications a WHERE a.ProfileID=p.ProfileID AND a.JobID=@JobID)
    ORDER BY p.ProfileID`, { AfterProfileID: payload.afterProfileId || 0, JobID: payload.jobId })).recordset;
  const notices = [];
  for (const profile of profiles) {
    const match = rankPreparedJobs(verifiedSkills(profile.ConfirmedJson), catalog)[0];
    if (!match) continue;
    notices.push({ userId: profile.UserID, role: 'Candidate', type: 'job_match_alert',
      key: `job-alert:${current.job.JobID}:${profile.VersionID}:${current.fingerprint}`,
      jobId: current.job.JobID, cvId: profile.CVID, title: 'Có việc làm phù hợp với bạn!',
      body: `${match.Title} tại ${match.CompanyName} — khớp ${Math.round(match.score)}% kỹ năng yêu cầu với CV đã xác nhận.${match.Location ? ' Địa điểm: ' + match.Location + '.' : ''}`,
      href: `/jobs/${match.JobID}` });
  }
  const done = profiles.length < BATCH_SIZE;
  return { notices, done, payload: { ...payload, afterProfileId: profiles.at(-1)?.ProfileID || payload.afterProfileId || 0 } };
}

module.exports = { enqueueJobMatch, matchBatch, fingerprint, currentFingerprint, verifiedSkills, BATCH_SIZE };
