const sql = require('mssql');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const config = {
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || '123',
  server: process.env.DB_SERVER || '127.0.0.1',
  port: parseInt(process.env.DB_PORT, 10) || 1433,
  database: process.env.DB_NAME || 'JobtimizeDB',
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE !== 'false',
    enableArithAbort: true
  },
  pool: {
    max: 15,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

let poolPromise;

const getPool = async () => {
  if (!poolPromise) {
    poolPromise = new sql.ConnectionPool(config)
      .connect()
      .then(pool => {
        console.log('✅ Connected to MS SQL Server [JobtimizeDB] successfully!');
        return pool;
      })
      .catch(err => {
        console.error('❌ SQL Server Database Connection Failed:', err.message);
        poolPromise = null;
        throw err;
      });
  }
  return poolPromise;
};

const executeQuery = async (queryText, params = {}) => {
  try {
    const pool = await getPool();
    const request = pool.request();
    
    // Bind parameters if any
    for (const [key, value] of Object.entries(params)) {
      request.input(key, value);
    }
    
    const result = await request.query(queryText);
    return result;
  } catch (error) {
    console.error('Database query execution error:', error.message);
    throw error;
  }
};

module.exports = {
  sql,
  getPool,
  executeQuery
};
