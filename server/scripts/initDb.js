const { sql, config } = require('../src/config/db');
const { applySchema, applySeed } = require('../src/services/databaseSchema');

async function main({ seed = !process.argv.includes('--schema-only') } = {}) {
  const name = config.database;
  if (!/^[A-Za-z][A-Za-z0-9_]{0,127}$/.test(name)) throw new Error('DB_NAME must contain only letters, digits and underscores, starting with a letter.');
  let master, database;
  try {
    master = await new sql.ConnectionPool({ ...config, database: 'master' }).connect();
    await master.request().input('Name', name).query("IF DB_ID(@Name) IS NULL BEGIN DECLARE @createSQL NVARCHAR(MAX)=N'CREATE DATABASE '+QUOTENAME(@Name); EXEC(@createSQL); END;");
    database = await new sql.ConnectionPool(config).connect();
    const query = text => database.request().query(text);
    const batches = await applySchema(query);
    if (seed) await applySeed(query);
    console.log('Database ' + name + ' ready: schema.sql, ' + batches + ' structure batches' + (seed ? ', seed.sql loaded' : ', no seed data') + '.');
  } finally {
    if (database) await database.close();
    if (master) await master.close();
  }
}

if (require.main === module) main().catch(error => {
  console.error('Database initialization failed:', error.message);
  process.exitCode = 1;
});

module.exports = { main };
