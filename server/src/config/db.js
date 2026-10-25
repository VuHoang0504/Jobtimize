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
      .then(async (pool) => {
        console.log('✅ Connected to MS SQL Server [JobtimizeDB] successfully!');
        try {
          await pool.request().query(`
            IF COL_LENGTH('CVs', 'CvType') IS NULL
                ALTER TABLE CVs ADD CvType NVARCHAR(20) DEFAULT 'Upload' WITH VALUES;
            IF COL_LENGTH('CVs', 'CvData') IS NULL
                ALTER TABLE CVs ADD CvData NVARCHAR(MAX) NULL;
            IF COL_LENGTH('CVs', 'Template') IS NULL
                ALTER TABLE CVs ADD Template NVARCHAR(50) DEFAULT 'modern' WITH VALUES;
            IF COL_LENGTH('CVs', 'UpdatedAt') IS NULL
                ALTER TABLE CVs ADD UpdatedAt DATETIME DEFAULT GETDATE() WITH VALUES;

            DECLARE @fkName NVARCHAR(256);
            SELECT @fkName = fk.name
            FROM sys.foreign_keys fk
            INNER JOIN sys.foreign_key_columns fkc ON fk.object_id = fkc.constraint_object_id
            INNER JOIN sys.columns c ON fkc.parent_object_id = c.object_id AND fkc.parent_column_id = c.column_id
            WHERE fk.parent_object_id = OBJECT_ID('JobApplications') AND c.name = 'CVID';

            IF @fkName IS NOT NULL
                EXEC('ALTER TABLE JobApplications DROP CONSTRAINT [' + @fkName + ']');
          `);
        } catch (migErr) {
          console.warn('Auto-migration warning on CVs table:', migErr.message);
        }
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
