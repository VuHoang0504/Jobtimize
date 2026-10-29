-- Additive, repeatable migration. Run in the application's configured database.
-- These existing moderation fields are also added by server.js on first boot.
IF COL_LENGTH('JobPostings', 'AdminNote') IS NULL ALTER TABLE dbo.JobPostings ADD AdminNote NVARCHAR(MAX) NULL;
IF COL_LENGTH('UserReports', 'AdminNote') IS NULL ALTER TABLE dbo.UserReports ADD AdminNote NVARCHAR(MAX) NULL;
IF COL_LENGTH('UserReports', 'ResolvedAt') IS NULL ALTER TABLE dbo.UserReports ADD ResolvedAt DATETIME NULL;
IF OBJECT_ID(N'dbo.NotificationOutbox', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.NotificationOutbox (
    OutboxID INT IDENTITY PRIMARY KEY,
    EventKey VARCHAR(180) NOT NULL UNIQUE,
    EventType VARCHAR(40) NOT NULL,
    Payload NVARCHAR(MAX) NOT NULL CHECK (ISJSON(Payload) = 1),
    CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    AvailableAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    ProcessedAt DATETIME2 NULL,
    Attempts INT NOT NULL DEFAULT 0,
    LastError NVARCHAR(500) NULL
  );
  CREATE INDEX IX_NotificationOutbox_Pending ON dbo.NotificationOutbox(ProcessedAt, AvailableAt, OutboxID);
END;
IF OBJECT_ID(N'dbo.Notifications', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Notifications (
    NotificationID INT IDENTITY PRIMARY KEY,
    UserID INT NOT NULL REFERENCES dbo.Users(UserID) ON DELETE CASCADE,
    RecipientRole VARCHAR(20) NOT NULL,
    EventKey VARCHAR(180) NOT NULL,
    Type VARCHAR(40) NOT NULL,
    Title NVARCHAR(160) NOT NULL,
    Body NVARCHAR(1200) NOT NULL,
    Href NVARCHAR(500) NOT NULL,
    JobID INT NULL,
    CVID INT NULL,
    IsActive BIT NOT NULL DEFAULT 1,
    CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    ReadAt DATETIME2 NULL,
    CONSTRAINT UQ_Notifications_UserEvent UNIQUE(UserID, EventKey)
  );
  CREATE INDEX IX_Notifications_Inbox ON dbo.Notifications(UserID, RecipientRole, IsActive, NotificationID DESC) INCLUDE (ReadAt, Type, JobID, CVID);
END;
IF OBJECT_ID(N'dbo.NotificationRecommendationState', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.NotificationRecommendationState (
    ProfileID INT PRIMARY KEY REFERENCES dbo.CandidateProfiles(ProfileID) ON DELETE CASCADE,
    Fingerprint CHAR(64) NOT NULL,
    UpdatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
  );
END;
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('dbo.JobApplications') AND name='IX_JobApplications_NotificationLookup')
  CREATE INDEX IX_JobApplications_NotificationLookup ON dbo.JobApplications(ProfileID,JobID) INCLUDE(ApplicationID);
