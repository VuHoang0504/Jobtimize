const path = require('path');
const { pathToFileURL } = require('url');
const { sql, getPool } = require('../src/config/db');
const normal = require('../src/services/cvNormalization');
const candidates = require('./data/demoCandidates');
const { buildDemoCV } = require('./data/buildDemoCV');

async function seedDemoCandidates(pool) {
  const { normalizeCV } = await import(pathToFileURL(path.resolve(__dirname, '../../shared/cv/model.mjs')).href);
  const transaction = new sql.Transaction(pool);
  await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
  const query = (text, values = {}) => {
    const request = new sql.Request(transaction);
    for (const [name, value] of Object.entries(values)) request.input(name, value);
    return request.query(text);
  };
  const result = [];
  try {
    const taxonomy = (await query('SELECT SkillID,SkillName,NormalizedName FROM SkillTaxonomy')).recordset;
    for (const candidate of candidates) {
      const email = `talent-demo-${candidate.slug}@jobtimize.example.invalid`;
      const existing = (await query('SELECT UserID FROM Users WHERE Email=@Email', { Email: email })).recordset[0];
      // Repeated runs do not change demo profiles that have subsequently been edited.
      if (existing) { result.push({ name: candidate.name, email, status: 'Already exists' }); continue; }
      const userId = (await query(`INSERT Users(Email,FullName,Status,IsEmailVerified)
        OUTPUT INSERTED.UserID VALUES(@Email,@Name,'Active',0)`, { Email: email, Name: candidate.name })).recordset[0].UserID;
      await query(`IF NOT EXISTS(SELECT 1 FROM Roles WHERE RoleName='Candidate') INSERT Roles(RoleName) VALUES('Candidate');
        INSERT UserRoles(UserID,RoleID) SELECT @ID,RoleID FROM Roles WHERE RoleName='Candidate'`, { ID: userId });
      const summary = `${candidate.years} năm kinh nghiệm. ${candidate.work}`;
      const bio = { bioText: summary, skills: { hardSkills: candidate.skills, softSkills: ['Làm việc nhóm', 'Giải quyết vấn đề'] }, isDemo: true };
      const profileId = (await query(`INSERT CandidateProfiles(UserID,Headline,Bio,DesiredSalary,CurrentLocation,IsLookingForJob)
        OUTPUT INSERTED.ProfileID VALUES(@UserID,@Headline,@Bio,@Salary,@City,1)`, {
        UserID: userId, Headline: candidate.role, Bio: JSON.stringify(bio), Salary: candidate.salary, City: candidate.city
      })).recordset[0].ProfileID;
      const cvData = buildDemoCV(candidate, candidates.indexOf(candidate), email, normalizeCV);
      await query('UPDATE Users SET Phone=@Phone WHERE UserID=@UserID', { Phone: cvData.personal.phone, UserID: userId });
      const builder = JSON.stringify(cvData);
      const analysis = JSON.stringify(normal.fromBuilder(cvData, taxonomy));
      const title = `CV ${candidate.name}`;
      const cvId = (await query(`INSERT CVs(ProfileID,Title,FileUrl,CvType,CvData,Template,IsPrimary,IsArchived)
        OUTPUT INSERTED.CVID VALUES(@ProfileID,@Title,'','OnlineBuilder',@Builder,'minimal',1,0)`, {
        ProfileID: profileId, Title: title, Builder: builder
      })).recordset[0].CVID;
      // Identical hash and schema to cvAnalysisService.capture; no synthetic score is stored.
      await query(`INSERT CVDocumentVersions(CVID,ProfileID,VersionNumber,ContentHash,SourceType,BuilderJson,Template,
        Status,ParsedJson,ConfirmedJson,ParseMethod,ConfirmedAt)
        VALUES(@CVID,@ProfileID,1,@Hash,'OnlineBuilder',@Builder,'minimal','Ready',@Analysis,@Analysis,'structured',SYSUTCDATETIME())`, {
        CVID: cvId, ProfileID: profileId, Hash: normal.hash(builder + '\nminimal'), Builder: builder, Analysis: analysis
      });
      result.push({ name: candidate.name, email, profileId, cvId, status: 'Created' });
    }
    await transaction.commit();
    return result;
  } catch (error) { await transaction.rollback(); throw error; }
}

async function main() {
  const pool = await getPool();
  try { console.table(await seedDemoCandidates(pool)); } finally { await pool.close(); }
}
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { seedDemoCandidates };
