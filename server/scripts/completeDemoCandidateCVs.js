const path = require('path');
const { pathToFileURL } = require('url');
const { sql, getPool } = require('../src/config/db');
const normal = require('../src/services/cvNormalization');
const candidates = require('./data/demoCandidates');
const { buildDemoCV } = require('./data/buildDemoCV');

async function main() {
  const { normalizeCV, validateCV } = await import(pathToFileURL(path.resolve(__dirname, '../../shared/cv/model.mjs')).href);
  const pool = await getPool();
  const transaction = new sql.Transaction(pool);
  try {
    await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
    const query = (text, values = {}) => {
      const request = new sql.Request(transaction);
      for (const [key, value] of Object.entries(values)) request.input(key, value);
      return request.query(text);
    };
    const taxonomy = (await query('SELECT SkillID,SkillName,NormalizedName FROM SkillTaxonomy')).recordset;
    let updated = 0;
    for (const [index, candidate] of candidates.entries()) {
      const email = `talent-demo-${candidate.slug}@jobtimize.example.invalid`;
      const row = (await query(`SELECT u.UserID,cp.ProfileID,cv.CVID FROM Users u JOIN CandidateProfiles cp ON cp.UserID=u.UserID
        JOIN CVs cv ON cv.ProfileID=cp.ProfileID AND cv.IsPrimary=1 AND cv.IsArchived=0 WHERE u.Email=@Email`, { Email: email })).recordset[0];
      if (!row) throw new Error(`Missing demo CV: ${candidate.slug}`);
      const data = buildDemoCV(candidate, index, email, normalizeCV);
      validateCV(data);
      const builder = JSON.stringify(data);
      const contentHash = normal.hash(builder + '\nminimal');
      const latest = (await query('SELECT TOP 1 VersionNumber,ContentHash FROM CVDocumentVersions WHERE CVID=@ID ORDER BY VersionNumber DESC', { ID: row.CVID })).recordset[0];
      if (latest?.ContentHash === contentHash) continue;
      const analysis = JSON.stringify(normal.fromBuilder(data, taxonomy));
      await query(`UPDATE Users SET Phone=@Phone WHERE UserID=@UserID;
        UPDATE CVs SET CvData=@Builder,Template='minimal',UpdatedAt=GETDATE() WHERE CVID=@CVID;
        INSERT CVDocumentVersions(CVID,ProfileID,VersionNumber,ContentHash,SourceType,BuilderJson,Template,
          Status,ParsedJson,ConfirmedJson,ParseMethod,ConfirmedAt)
        VALUES(@CVID,@ProfileID,@Version,@Hash,'OnlineBuilder',@Builder,'minimal','Ready',@Analysis,@Analysis,'structured',SYSUTCDATETIME());`, {
        Phone: data.personal.phone, UserID: row.UserID, CVID: row.CVID, ProfileID: row.ProfileID,
        Version: (latest?.VersionNumber || 0) + 1, Hash: contentHash, Builder: builder, Analysis: analysis
      });
      updated++;
    }
    await transaction.commit();
    console.log(`Completed ${updated} demo CVs; original versions preserved.`);
  } catch (error) { await transaction.rollback().catch(() => {}); throw error; }
  finally { await pool.close(); }
}
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { main };
