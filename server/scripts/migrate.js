const { executeQuery } = require('../src/config/db');

async function migrate() {
  console.log('Running database migrations...');
  
  // 1. KYCDocuments
  await executeQuery(`
    IF COL_LENGTH('KYCDocuments', 'TaxCertificateUrl') IS NULL
      ALTER TABLE KYCDocuments ADD TaxCertificateUrl NVARCHAR(500) NULL;
    IF COL_LENGTH('KYCDocuments', 'TaxCode') IS NULL
      ALTER TABLE KYCDocuments ADD TaxCode NVARCHAR(50) NULL;
  `);
  console.log('✅ KYCDocuments columns verified.');

  // 2. Interviews
  await executeQuery(`
    IF COL_LENGTH('Interviews', 'InterviewType') IS NULL
      ALTER TABLE Interviews ADD InterviewType NVARCHAR(20) NOT NULL CONSTRAINT DF_Interviews_InterviewType DEFAULT 'Online';
  `);
  console.log('✅ Interviews columns verified.');

  // 3. PaymentTransactions
  await executeQuery(`
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'PaymentTransactions')
    BEGIN
      CREATE TABLE PaymentTransactions (
        PaymentID INT IDENTITY(1,1) PRIMARY KEY,
        TransactionRef NVARCHAR(100) NOT NULL UNIQUE,
        EmployerID INT NOT NULL FOREIGN KEY REFERENCES Employers(EmployerID) ON DELETE CASCADE,
        PackageID INT NOT NULL FOREIGN KEY REFERENCES SubscriptionPackages(PackageID),
        Amount DECIMAL(18,2) NOT NULL,
        Status NVARCHAR(20) NOT NULL DEFAULT 'Pending',
        PaymentMethod NVARCHAR(50) NOT NULL DEFAULT 'VNPay',
        GatewayTransactionNo NVARCHAR(100) NULL,
        CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
        PaidAt DATETIME NULL
      );
    END
    ELSE
    BEGIN
      IF COL_LENGTH('PaymentTransactions', 'PaymentMethod') IS NULL
        ALTER TABLE PaymentTransactions ADD PaymentMethod NVARCHAR(50) NOT NULL DEFAULT 'VNPay';
    END
  `);
  console.log('✅ PaymentTransactions table verified.');

  // 4. Check if SubscriptionPackages has data, seed if empty
  const packages = await executeQuery('SELECT COUNT(*) AS cnt FROM SubscriptionPackages');
  if (packages.recordset[0].cnt === 0) {
    await executeQuery(`
      INSERT INTO SubscriptionPackages (PackageName, Price, DurationDays, PostLimit, SearchLimit) VALUES
      (N'Gói Khởi Nghiệp (Starter)', 0, 30, 3, 10),
      (N'Gói Tiêu Chuẩn (Pro Recruiter)', 1990000, 30, 15, 100),
      (N'Gói Doanh Nghiệp (Enterprise AI)', 4990000, 90, 50, 500);
    `);
    console.log('✅ SubscriptionPackages seeded.');
  }

  // 5. Ensure CandidateInvitations table exists
  await executeQuery(`
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'CandidateInvitations')
    BEGIN
      CREATE TABLE CandidateInvitations (
        InvitationID INT IDENTITY(1,1) PRIMARY KEY,
        EmployerID INT FOREIGN KEY REFERENCES Employers(EmployerID),
        ProfileID INT FOREIGN KEY REFERENCES CandidateProfiles(ProfileID),
        JobID INT FOREIGN KEY REFERENCES JobPostings(JobID),
        Message NVARCHAR(MAX) NULL,
        Status NVARCHAR(20) DEFAULT 'Sent',
        SentAt DATETIME DEFAULT GETDATE()
      );
    END
  `);
  console.log('✅ CandidateInvitations table verified.');

  console.log('🎉 Migrations completed successfully!');
  process.exit(0);
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});

