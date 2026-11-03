const { getPool } = require('../src/config/db');

async function main() {
  const pool = await getPool();
  try {
    const result = await pool.request().query(`
      SET XACT_ABORT ON;
      BEGIN TRANSACTION;
      IF (SELECT COUNT(*) FROM SubscriptionPackages WHERE PackageName IN (
        N'Gói Tiêu Chuẩn (Pro Recruiter)', N'Gói Doanh Nghiệp (Enterprise AI)')) <> 2
        THROW 50001, 'Expected Pro and Enterprise packages not found.', 1;
      UPDATE SubscriptionPackages SET Price = CASE
        WHEN PackageName = N'Gói Tiêu Chuẩn (Pro Recruiter)' THEN 100000 ELSE 200000 END
      OUTPUT inserted.PackageID, inserted.PackageName, deleted.Price AS PreviousPrice, inserted.Price
      WHERE PackageName IN (N'Gói Tiêu Chuẩn (Pro Recruiter)', N'Gói Doanh Nghiệp (Enterprise AI)');
      COMMIT TRANSACTION;
    `);
    console.table(result.recordset);
  } finally { await pool.close(); }
}
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { main };
