const { sql, config } = require('../src/config/db');
const fs = require('fs');
const path = require('path');

async function main() {
  const pool = await new sql.ConnectionPool(config).connect();
  try {
    const result = await pool.request().query(`SELECT c.CategoryName, COUNT(j.JobID) AS ActiveJobs
      FROM JobCategories c LEFT JOIN JobPostings j ON j.CategoryID=c.CategoryID
        AND j.Status='Published' AND (j.ExpiresAt IS NULL OR j.ExpiresAt>GETDATE())
        AND EXISTS(SELECT 1 FROM Employers e JOIN Users u ON u.UserID=e.UserID
          WHERE e.EmployerID=j.EmployerID AND u.Status='Active')
      GROUP BY c.CategoryName ORDER BY c.CategoryName`);
    console.log(JSON.stringify(result.recordset, null, 2));
    const demos = await pool.request().query(`SELECT j.JobID, j.Title, j.Description, j.Requirements,
      j.SalaryRange, j.Location, j.ExpiresAt, e.CompanyName, e.CompanyLogoUrl,
      e.Website, e.CompanySize, e.Address, e.Description AS CompanyDescription
      FROM JobPostings j JOIN Employers e ON e.EmployerID=j.EmployerID
      JOIN Users u ON u.UserID=e.UserID
      WHERE u.Email LIKE 'browse-demo-%@jobtimize.example.invalid'
        AND j.Status='Published' AND j.ExpiresAt>GETDATE()`);
    for (const row of demos.recordset) {
      for (const key of ['Title', 'Description', 'Requirements', 'SalaryRange', 'Location', 'CompanyName', 'CompanyLogoUrl', 'CompanySize', 'Address', 'CompanyDescription']) {
        if (!row[key]?.trim()) throw new Error(`Job ${row.JobID} missing ${key}`);
      }
      if (!row.CompanyLogoUrl.startsWith('/logos/demo/') || !fs.existsSync(path.resolve(__dirname, '../../client/public' + row.CompanyLogoUrl))) {
        throw new Error(`Job ${row.JobID} missing local logo`);
      }
    }
    console.log(JSON.stringify({ categories: result.recordset.length, missing: result.recordset.filter(row => !row.ActiveJobs).map(row => row.CategoryName), demoJobsWithValidProfilesAndLogos: demos.recordset.length }));
  } finally { await pool.close(); }
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
