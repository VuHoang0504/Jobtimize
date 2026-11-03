const { getPool } = require('../src/config/db');

// Repair only expired latest subscriptions from the known demo seed.
// Real payments and historical subscriptions retain their original dates.
async function main() {
  const pool = await getPool();
  try {
    const result = await pool.request().query(`
      SET XACT_ABORT ON;
      BEGIN TRANSACTION;
      DECLARE @Now DATETIME = GETDATE();
      ;WITH Latest AS (
        SELECT SubID, ROW_NUMBER() OVER (PARTITION BY EmployerID ORDER BY EndDate DESC, SubID DESC) AS Position
        FROM EmployerSubscriptions
      )
      UPDATE es SET StartDate = DATEADD(day, -1, @Now),
                    EndDate = DATEADD(day, sp.DurationDays - 1, @Now)
      OUTPUT inserted.EmployerID, inserted.SubID, deleted.StartDate AS PreviousStartDate,
             deleted.EndDate AS PreviousEndDate, inserted.StartDate, inserted.EndDate
      FROM EmployerSubscriptions es
      JOIN Latest l ON l.SubID = es.SubID AND l.Position = 1
      JOIN SubscriptionPackages sp ON sp.PackageID = es.PackageID
      WHERE es.EndDate <= @Now AND sp.DurationDays > 1
        AND es.TransactionCode IN (
          'TXN-202605-FPT01', 'TXN-202606-VNG02', 'TXN-202607-KMS03',
          'TXN-202608-VAI04', 'TXN-202609-SHP05', 'TXN-202609-GHT06',
          'TXN-202610-CHT07', 'TXN-202610-FPT08'
        );
      COMMIT TRANSACTION;
    `);
    console.table(result.recordset);
    console.log(`Updated ${result.recordset.length} expired demo subscriptions.`);
  } finally {
    await pool.close();
  }
}

if (require.main === module) main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});

module.exports = { main };
