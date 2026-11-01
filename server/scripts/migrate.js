// Compatibility command: all database structure now lives in database/schema.sql.
require('./initDb').main({ seed: false }).catch(error => {
  console.error('Schema migration failed:', error.message);
  process.exitCode = 1;
});
