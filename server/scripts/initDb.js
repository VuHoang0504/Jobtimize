const sql = require('mssql');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const baseConfig = {
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || '123',
  server: process.env.DB_SERVER || '127.0.0.1',
  port: parseInt(process.env.DB_PORT, 10) || 1433,
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: true,
    enableArithAbort: true
  }
};

const dbName = process.env.DB_NAME || 'JobtimizeDB';

async function executeSqlFile(pool, filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  // Tách các lệnh theo từ khóa GO (chuẩn MSSQL batch separator)
  const batches = content
    .split(/^\s*GO\s*$/im)
    .map(b => b.trim())
    .filter(b => b.length > 0);

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    try {
      await pool.request().query(batch);
    } catch (err) {
      console.warn(`⚠️ Warning executing batch ${i + 1} from ${path.basename(filePath)}:`, err.message);
    }
  }
}

async function initDb() {
  console.log(`🔌 Kết nối đến SQL Server (${baseConfig.server}:${baseConfig.port})...`);
  
  // 1. Kết nối vào master để tạo Database nếu chưa có
  let masterPool;
  try {
    masterPool = await new sql.ConnectionPool({
      ...baseConfig,
      database: 'master'
    }).connect();

    console.log(`📦 Kiểm tra CSDL [${dbName}]...`);
    await masterPool.request().query(`
      IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'${dbName}')
      BEGIN
        CREATE DATABASE [${dbName}];
        PRINT 'Created database ${dbName}';
      END
    `);
    console.log(`✅ CSDL [${dbName}] đã sẵn sàng!`);
  } catch (err) {
    console.error('❌ Không thể kết nối tới SQL Server:', err.message);
    console.error('👉 Vui lòng đảm bảo SQL Server đang chạy và cổng 1433 đã được kích hoạt.');
    process.exit(1);
  } finally {
    if (masterPool) await masterPool.close();
  }

  // 2. Kết nối vào JobtimizeDB để chạy schema.sql và seed.sql
  let dbPool;
  try {
    dbPool = await new sql.ConnectionPool({
      ...baseConfig,
      database: dbName
    }).connect();

    const schemaPath = path.resolve(__dirname, '../../database/schema.sql');
    if (fs.existsSync(schemaPath)) {
      console.log('📋 Đang khởi tạo bảng cấu trúc (schema.sql)...');
      await executeSqlFile(dbPool, schemaPath);
      console.log('✅ Khởi tạo cấu trúc bảng thành công!');
    }

    const seedPath = path.resolve(__dirname, '../../database/seed.sql');
    if (fs.existsSync(seedPath)) {
      console.log('🌱 Đang nạp dữ liệu mẫu ban đầu (seed.sql)...');
      await executeSqlFile(dbPool, seedPath);
      console.log('✅ Nạp dữ liệu mẫu thành công!');
    }

    console.log('\n🎉 [HOÀN TẤT] Database đã sẵn sàng 100% để khởi chạy Jobtimize!\n');
    process.exit(0);
  } catch (err) {
    console.error('❌ Lỗi khi khởi tạo CSDL:', err.message);
    process.exit(1);
  } finally {
    if (dbPool) await dbPool.close();
  }
}

initDb();

