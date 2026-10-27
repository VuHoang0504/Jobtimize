const { sql, config } = require('../src/config/db');
const jobs = require('./data/browseJobs');

async function seedBrowseJobs(pool) {
  const transaction = new sql.Transaction(pool);
  await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
  try {
    let inserted = 0;
    let migrated = 0;
    for (const job of jobs) {
      if (!job.company) throw new Error('Missing demo company for ' + job.categoryName);
      const employer = await new sql.Request(transaction)
        .input('Email', sql.NVarChar(255), 'browse-demo-' + job.company.slug + '@jobtimize.example.invalid')
        .input('CompanyName', sql.NVarChar(200), job.company.companyName)
        .input('Logo', sql.NVarChar(500), job.company.companyLogoUrl)
        .query(`
          DECLARE @UserID INT, @EmployerID INT;
          SELECT @UserID = UserID FROM Users WHERE Email = @Email;
          IF @UserID IS NULL
          BEGIN
            INSERT INTO Users (Email, FullName, IsEmailVerified, Status)
            VALUES (@Email, @CompanyName, 0, 'Active');
            SET @UserID = SCOPE_IDENTITY();
          END;
          IF NOT EXISTS (SELECT 1 FROM Roles WHERE RoleName = 'Employer')
            INSERT INTO Roles (RoleName) VALUES ('Employer');
          IF NOT EXISTS (SELECT 1 FROM UserRoles ur JOIN Roles r ON ur.RoleID = r.RoleID
            WHERE ur.UserID = @UserID AND r.RoleName = 'Employer')
            INSERT INTO UserRoles (UserID, RoleID) SELECT @UserID, RoleID FROM Roles WHERE RoleName = 'Employer';
          SELECT @EmployerID = EmployerID FROM Employers WHERE UserID = @UserID;
          IF @EmployerID IS NULL
          BEGIN
            INSERT INTO Employers (UserID, CompanyName, CompanyLogoUrl, Description, CompanySize, Address, KYCStatus)
            VALUES (@UserID, @CompanyName, @Logo, N'Dữ liệu minh họa Jobtimize. Không phải doanh nghiệp hoặc tin tuyển dụng thực tế.',
              N'100 - 500 nhân viên', N'Việt Nam', 'Pending');
            SET @EmployerID = SCOPE_IDENTITY();
          END
          ELSE UPDATE Employers SET CompanyName = @CompanyName, CompanyLogoUrl = @Logo WHERE EmployerID = @EmployerID;
          SELECT @EmployerID AS EmployerID;
        `);
      const employerId = employer.recordset[0].EmployerID;
      const result = await new sql.Request(transaction)
        .input('EmployerID', sql.Int, employerId)
        .input('CategoryName', sql.NVarChar(100), job.categoryName)
        .input('Title', sql.NVarChar(200), job.title)
        .input('Description', sql.NVarChar(sql.MAX), job.description)
        .input('Requirements', sql.NVarChar(sql.MAX), job.requirements)
        .input('SalaryRange', sql.NVarChar(100), job.salaryRange)
        .input('Location', sql.NVarChar(150), job.location)
        .query(`
          DECLARE @CategoryID INT, @Inserted INT = 0, @Migrated INT = 0;
          SELECT @CategoryID = CategoryID FROM JobCategories WHERE CategoryName = @CategoryName;
          IF @CategoryID IS NULL
          BEGIN
            INSERT INTO JobCategories (CategoryName, Description) VALUES (@CategoryName, @CategoryName);
            SET @CategoryID = SCOPE_IDENTITY();
          END;
          -- Move only the original demo fixture; keep its JobID and all interactions.
          UPDATE jp SET EmployerID = @EmployerID
          FROM JobPostings jp
          JOIN Employers e ON jp.EmployerID = e.EmployerID
          JOIN Users u ON e.UserID = u.UserID
          WHERE u.Email = 'browse-demo@jobtimize.example.invalid' AND jp.Title = @Title
            AND jp.Description LIKE N'[[]Tin tuyển dụng mẫu phục vụ trải nghiệm Jobtimize]%'
            AND NOT EXISTS (SELECT 1 FROM JobPostings WHERE EmployerID = @EmployerID AND Title = @Title);
          SET @Migrated = @@ROWCOUNT;
          IF NOT EXISTS (SELECT 1 FROM JobPostings WHERE EmployerID = @EmployerID AND Title = @Title)
          BEGIN
            INSERT INTO JobPostings (EmployerID, CategoryID, Title, Description, Requirements, SalaryRange, Location, Status, ExpiresAt)
            VALUES (@EmployerID, @CategoryID, @Title, @Description, @Requirements, @SalaryRange, @Location, 'Published', DATEADD(day, 90, GETDATE()));
            SET @Inserted = 1;
          END;
          SELECT @Inserted AS Inserted, @Migrated AS Migrated;
        `);
      inserted += result.recordset[0].Inserted;
      migrated += result.recordset[0].Migrated;
    }
    await transaction.commit();
    return { inserted, migrated, categories: jobs.length };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

async function main() {
  // Use a direct pool: seeding browse data does not run unrelated startup migrations.
  const pool = await new sql.ConnectionPool(config).connect();
  try {
    console.log('Browse seed:', await seedBrowseJobs(pool));
  } finally {
    await pool.close();
  }
}

if (require.main === module) main().catch(error => {
  console.error('Browse seed failed:', error.message);
  process.exitCode = 1;
});

module.exports = { seedBrowseJobs };
