/**
 * Database Migration for Flexible Candidate Screening
 */
const { executeQuery } = require('../src/config/db');

async function migrate() {
  console.log('Running migration: migrate_flexible_screening...');

  await executeQuery(`
    IF COL_LENGTH(N'dbo.JobScreeningCriteria', N'IsEnabled') IS NULL
      ALTER TABLE dbo.JobScreeningCriteria ADD IsEnabled BIT NOT NULL DEFAULT 1;

    IF COL_LENGTH(N'dbo.JobScreeningCriteria', N'ConfigJson') IS NULL
      ALTER TABLE dbo.JobScreeningCriteria ADD ConfigJson NVARCHAR(MAX) NULL;

    IF OBJECT_ID(N'dbo.JobScreeningTemplates', N'U') IS NULL
    BEGIN
      CREATE TABLE dbo.JobScreeningTemplates (
        TemplateID INT IDENTITY(1,1) PRIMARY KEY,
        EmployerID INT NOT NULL FOREIGN KEY REFERENCES Employers(EmployerID) ON DELETE CASCADE,
        TemplateName NVARCHAR(150) NOT NULL,
        Description NVARCHAR(500) NULL,
        ConfigJson NVARCHAR(MAX) NOT NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        UpdatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
      );
      CREATE INDEX IX_JobScreeningTemplates_Emp ON dbo.JobScreeningTemplates(EmployerID, TemplateID DESC);
    END;
  `);

  console.log('Migration completed successfully.');
  process.exit(0);
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});

