const { initialize } = require('../src/services/notificationService');
const { getPool, config } = require('../src/config/db');
(async () => {
  try {
    await initialize();
    console.log(`Notification and Admin schemas ready in ${config.database}.`);
  } catch (error) { console.error(error.message); process.exitCode = 1; }
  finally { await (await getPool()).close(); }
})();
