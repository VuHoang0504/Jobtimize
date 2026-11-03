const { executeQuery, getPool } = require('../src/config/db');
const { applyCategories } = require('../src/services/databaseSchema');

async function main() {
  try {
    await applyCategories(executeQuery);
    const result = await executeQuery('SELECT CategoryID, CategoryName FROM JobCategories ORDER BY CategoryName');
    console.log('Job categories ready: ' + result.recordset.length);
  } finally {
    await (await getPool()).close();
  }
}

if (require.main === module) main().catch(error => {
  console.error('Job category migration failed:', error.message);
  process.exitCode = 1;
});

module.exports = { main };
