const path = require('path');
const sql = require('mssql');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const candidates = [
  {
    email: 'ungvien01@example.com', fullName: 'Nguyễn Minh Anh',
    headline: 'Frontend Developer — React, JavaScript', location: 'Hà Nội', salary: 18000000,
    bioText: 'Hồ sơ ứng viên mẫu để kiểm thử. Có 2 năm kinh nghiệm phát triển giao diện web.',
    hardSkills: ['React.js', 'JavaScript', 'HTML', 'CSS']
  },
  {
    email: 'ungvien02@example.com', fullName: 'Trần Hoàng Nam',
    headline: 'Backend Developer — Node.js, SQL Server', location: 'TP. Hồ Chí Minh', salary: 22000000,
    bioText: 'Hồ sơ ứng viên mẫu để kiểm thử. Có 3 năm kinh nghiệm xây dựng API và cơ sở dữ liệu.',
    hardSkills: ['Node.js', 'Express.js', 'SQL Server', 'Git']
  },
  {
    email: 'ungvien03@example.com', fullName: 'Lê Thu Hà',
    headline: 'UI/UX Designer — Figma, User Research', location: 'Đà Nẵng', salary: 16000000,
    bioText: 'Hồ sơ ứng viên mẫu để kiểm thử. Có 2 năm kinh nghiệm thiết kế trải nghiệm người dùng.',
    hardSkills: ['UI/UX (Figma)', 'User Research', 'Prototyping', 'Design System']
  }
];

async function main() {
  const pool = new sql.ConnectionPool({
    user: process.env.DB_USER || 'sa',
    password: process.env.DB_PASSWORD || '123',
    server: process.env.DB_SERVER || '127.0.0.1',
    port: Number(process.env.DB_PORT || 1433),
    database: process.env.DB_NAME || 'JobtimizeDB',
    connectionTimeout: 10000,
    options: {
      encrypt: process.env.DB_ENCRYPT === 'true',
      trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE !== 'false'
    }
  });
  let transaction;
  let committed = false;
  try {
    await pool.connect();
    transaction = new sql.Transaction(pool);
    await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
    const roles = await new sql.Request(transaction).query("SELECT RoleID FROM Roles WHERE RoleName = 'Candidate'");
    const roleId = roles.recordset[0]?.RoleID;
    if (!roleId) throw new Error('Candidate role not found');

    const results = [];
    for (const candidate of candidates) {
      const existing = await new sql.Request(transaction)
        .input('Email', sql.NVarChar(255), candidate.email)
        .query('SELECT UserID FROM Users WITH (UPDLOCK, HOLDLOCK) WHERE Email = @Email');
      if (existing.recordset.length) {
        results.push({ email: candidate.email, result: 'Already exists; unchanged' });
        continue;
      }

      const passwordHash = await bcrypt.hash('Candidate@123', 10);
      const bio = JSON.stringify({
        bioText: candidate.bioText,
        skills: { hardSkills: candidate.hardSkills, softSkills: ['Làm việc nhóm', 'Giao tiếp'], languages: ['Tiếng Việt', 'Tiếng Anh'] },
        links: {}
      });
      const inserted = await new sql.Request(transaction)
        .input('Email', sql.NVarChar(255), candidate.email)
        .input('PasswordHash', sql.NVarChar(255), passwordHash)
        .input('FullName', sql.NVarChar(100), candidate.fullName)
        .input('RoleID', sql.Int, roleId)
        .input('Headline', sql.NVarChar(255), candidate.headline)
        .input('Bio', sql.NVarChar(sql.MAX), bio)
        .input('Location', sql.NVarChar(100), candidate.location)
        .input('Salary', sql.Decimal(18, 2), candidate.salary)
        .query(`
          INSERT INTO Users (Email, PasswordHash, FullName, Status, IsEmailVerified)
          VALUES (@Email, @PasswordHash, @FullName, 'Active', 1);
          DECLARE @UserID INT = SCOPE_IDENTITY();
          INSERT INTO UserRoles (UserID, RoleID) VALUES (@UserID, @RoleID);
          INSERT INTO CandidateProfiles (UserID, Headline, Bio, CurrentLocation, DesiredSalary, IsLookingForJob)
          VALUES (@UserID, @Headline, @Bio, @Location, @Salary, 1);
          SELECT @UserID AS UserID;
        `);
      results.push({ email: candidate.email, fullName: candidate.fullName, userId: inserted.recordset[0].UserID, result: 'Created' });
    }
    await transaction.commit();
    committed = true;
    console.table(results);
    console.log('New demo accounts use password: Candidate@123');
  } catch (error) {
    if (transaction && !committed) await transaction.rollback().catch(() => {});
    throw error;
  } finally {
    await pool.close();
  }
}

main().catch(error => {
  console.error('Demo candidate creation failed:', error.message);
  process.exitCode = 1;
});
