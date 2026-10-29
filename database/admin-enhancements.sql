-- Additive, rerunnable. No existing business records are rewritten.
IF COL_LENGTH('UserReports','ResolvedByUserID') IS NULL ALTER TABLE UserReports ADD ResolvedByUserID INT NULL;
IF OBJECT_ID('AccountModerationActions', 'U') IS NULL
BEGIN
  CREATE TABLE AccountModerationActions (
    ActionID INT IDENTITY PRIMARY KEY,
    ReportID INT NULL,
    ActorUserID INT NOT NULL,
    TargetUserID INT NOT NULL,
    Action NVARCHAR(20) NOT NULL,
    Reason NVARCHAR(2000) NOT NULL,
    PreviousStatus NVARCHAR(20) NULL,
    NewStatus NVARCHAR(20) NOT NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
  );
  CREATE UNIQUE INDEX UX_Moderation_Report ON AccountModerationActions(ReportID) WHERE ReportID IS NOT NULL;
  CREATE INDEX IX_Moderation_Target ON AccountModerationActions(TargetUserID,CreatedAt DESC);
END;
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('PaymentTransactions') AND name='IX_Payments_Report')
  CREATE INDEX IX_Payments_Report ON PaymentTransactions(Status,PaidAt) INCLUDE(Amount,EmployerID,PackageID,PaymentMethod);
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('Users') AND name='IX_Users_CreatedAt')
  CREATE INDEX IX_Users_CreatedAt ON Users(CreatedAt);
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('JobPostings') AND name='IX_Jobs_CreatedAt')
  CREATE INDEX IX_Jobs_CreatedAt ON JobPostings(CreatedAt) INCLUDE(CategoryID,Location);
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('JobApplications') AND name='IX_Applications_AppliedAt')
  CREATE INDEX IX_Applications_AppliedAt ON JobApplications(AppliedAt) INCLUDE(MatchScore);

IF COL_LENGTH('PaymentTransactions','OrderCode') IS NULL ALTER TABLE PaymentTransactions ADD OrderCode BIGINT NULL;
IF COL_LENGTH('PaymentTransactions','PaymentLinkId') IS NULL ALTER TABLE PaymentTransactions ADD PaymentLinkId NVARCHAR(100) NULL;
IF COL_LENGTH('PaymentTransactions','CheckoutUrl') IS NULL ALTER TABLE PaymentTransactions ADD CheckoutUrl NVARCHAR(1000) NULL;
IF COL_LENGTH('PaymentTransactions','QrCode') IS NULL ALTER TABLE PaymentTransactions ADD QrCode NVARCHAR(MAX) NULL;
IF COL_LENGTH('EmployerSubscriptions','AmountPaid') IS NULL ALTER TABLE EmployerSubscriptions ADD AmountPaid DECIMAL(18,2) NULL;
IF COL_LENGTH('EmployerSubscriptions','PaymentMethod') IS NULL ALTER TABLE EmployerSubscriptions ADD PaymentMethod NVARCHAR(50) NULL;
IF COL_LENGTH('EmployerSubscriptions','PaymentStatus') IS NULL ALTER TABLE EmployerSubscriptions ADD PaymentStatus NVARCHAR(30) NULL;
IF COL_LENGTH('EmployerSubscriptions','TransactionCode') IS NULL ALTER TABLE EmployerSubscriptions ADD TransactionCode NVARCHAR(100) NULL;
IF COL_LENGTH('EmployerSubscriptions','CreatedAt') IS NULL ALTER TABLE EmployerSubscriptions ADD CreatedAt DATETIME NULL;
GO
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('PaymentTransactions') AND name='UX_Payment_OrderCode')
  CREATE UNIQUE INDEX UX_Payment_OrderCode ON PaymentTransactions(OrderCode) WHERE OrderCode IS NOT NULL;
