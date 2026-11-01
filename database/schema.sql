-- Unified, repeatable SQL Server structure. Data belongs in seed.sql.
-- SSMS: schema.sql then seed.sql. Node: npm run db:init (DB_NAME from server/.env).
-- No existing business tables are dropped or truncated.
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'JobtimizeDB')
BEGIN
    CREATE DATABASE JobtimizeDB;
END
GO
USE JobtimizeDB;
GO

-- @schema:structure

-- ========================================================
-- 1. BẢNG PHÂN QUYỀN & TÀI KHOẢN CHUNG
-- ========================================================

-- Bảng Roles (Phân quyền: Admin, Employer, Candidate)
IF OBJECT_ID(N'dbo.Roles', N'U') IS NULL
BEGIN
CREATE TABLE dbo.Roles (
    RoleID INT IDENTITY(1,1) PRIMARY KEY,
    RoleName NVARCHAR(50) NOT NULL UNIQUE -- 'Admin', 'Employer', 'Candidate'
);
END;
GO

-- Bảng Users (Quản lý tài khoản chung cho mọi Actor)
IF OBJECT_ID(N'dbo.Users', N'U') IS NULL
BEGIN
CREATE TABLE dbo.Users (
    UserID INT IDENTITY(1,1) PRIMARY KEY,
    Email NVARCHAR(255) NOT NULL UNIQUE,
    PasswordHash NVARCHAR(255) NULL, -- Null nếu đăng nhập bằng Google/SSO
    FullName NVARCHAR(100) NOT NULL,
    Phone NVARCHAR(20) NULL,
    AvatarUrl NVARCHAR(500) NULL,
    IsEmailVerified BIT DEFAULT 0,
    GoogleID NVARCHAR(100) NULL,
    Status NVARCHAR(20) DEFAULT 'Active', -- 'Active', 'Locked', 'Pending'
    CreatedAt DATETIME DEFAULT GETDATE(),
    UpdatedAt DATETIME DEFAULT GETDATE()
);
END;
GO

-- Bảng trung gian UserRoles (Hỗ trợ UC-A02: Quản lý phân quyền nội bộ)
IF OBJECT_ID(N'dbo.UserRoles', N'U') IS NULL
BEGIN
CREATE TABLE dbo.UserRoles (
    UserID INT FOREIGN KEY REFERENCES Users(UserID) ON DELETE CASCADE,
    RoleID INT FOREIGN KEY REFERENCES Roles(RoleID) ON DELETE CASCADE,
    PRIMARY KEY (UserID, RoleID)
);
END;
GO

-- ========================================================
-- 2. BẢNG DÀNH CHO ỨNG VIÊN (CANDIDATE)
-- ========================================================

-- Hồ sơ chi tiết của Ứng viên (UC-C03, UC-C04)
IF OBJECT_ID(N'dbo.CandidateProfiles', N'U') IS NULL
BEGIN
CREATE TABLE dbo.CandidateProfiles (
    ProfileID INT IDENTITY(1,1) PRIMARY KEY,
    UserID INT FOREIGN KEY REFERENCES Users(UserID) ON DELETE CASCADE,
    Headline NVARCHAR(255) NULL, -- Ví dụ: Senior Fullstack Developer
    Bio NVARCHAR(MAX) NULL,
    DesiredSalary DECIMAL(18,2) NULL,
    CurrentLocation NVARCHAR(100) NULL,
    IsLookingForJob BIT DEFAULT 1 -- UC-C04: Bật/Tắt tìm việc (True: Đang tìm, False: Tắt)
);
END;
GO

-- Quản lý nhiều phiên bản CV (UC-C05, UC-C06)
IF OBJECT_ID(N'dbo.CVs', N'U') IS NULL
BEGIN
CREATE TABLE dbo.CVs (
    CVID INT IDENTITY(1,1) PRIMARY KEY,
    ProfileID INT FOREIGN KEY REFERENCES CandidateProfiles(ProfileID) ON DELETE CASCADE,
    Title NVARCHAR(100) NOT NULL,
    FileUrl NVARCHAR(500) NOT NULL, -- Đường dẫn lưu file PDF/Docx hoặc placeholder nếu tạo online
    CvType NVARCHAR(20) DEFAULT 'Upload', -- 'Upload', 'OnlineBuilder'
    CvData NVARCHAR(MAX) NULL, -- Dữ liệu JSON chi tiết của CV tạo trực tuyến
    Template NVARCHAR(50) DEFAULT 'modern', -- 'modern', 'minimal', 'professional'
    IsPrimary BIT DEFAULT 0,
    CreatedAt DATETIME DEFAULT GETDATE(),
    UpdatedAt DATETIME DEFAULT GETDATE()
);
END;
GO
IF COL_LENGTH('CVs', 'CvType') IS NULL
    ALTER TABLE CVs ADD CvType NVARCHAR(20) DEFAULT 'Upload' WITH VALUES;
IF COL_LENGTH('CVs', 'CvData') IS NULL
    ALTER TABLE CVs ADD CvData NVARCHAR(MAX) NULL;
IF COL_LENGTH('CVs', 'Template') IS NULL
    ALTER TABLE CVs ADD Template NVARCHAR(50) DEFAULT 'modern' WITH VALUES;
IF COL_LENGTH('CVs', 'UpdatedAt') IS NULL
    ALTER TABLE CVs ADD UpdatedAt DATETIME DEFAULT GETDATE() WITH VALUES;

-- Quản lý Danh mục Ngành nghề (UC-A09)
IF OBJECT_ID(N'dbo.JobCategories', N'U') IS NULL
BEGIN
CREATE TABLE dbo.JobCategories (
    CategoryID INT IDENTITY(1,1) PRIMARY KEY,
    CategoryName NVARCHAR(100) NOT NULL,
    Description NVARCHAR(MAX) NULL
);
END;
GO

-- Từ điển Kỹ năng chuẩn hóa (UC-A08)
IF OBJECT_ID(N'dbo.SkillTaxonomy', N'U') IS NULL
BEGIN
CREATE TABLE dbo.SkillTaxonomy (
    SkillID INT IDENTITY(1,1) PRIMARY KEY,
    SkillName NVARCHAR(100) NOT NULL UNIQUE,
    NormalizedName NVARCHAR(100) NOT NULL, -- Dùng để AI map các từ đồng nghĩa (ví dụ: 'ReactJS' và 'React.js')
    CategoryID INT FOREIGN KEY REFERENCES JobCategories(CategoryID)
);
END;
GO

-- ========================================================
-- 3. BẢNG DÀNH CHO NHÀ TUYỂN DỤNG (EMPLOYER)
-- ========================================================

-- Thông tin Doanh nghiệp (UC-E03)
IF OBJECT_ID(N'dbo.Employers', N'U') IS NULL
BEGIN
CREATE TABLE dbo.Employers (
    EmployerID INT IDENTITY(1,1) PRIMARY KEY,
    UserID INT FOREIGN KEY REFERENCES Users(UserID) ON DELETE CASCADE,
    CompanyName NVARCHAR(200) NOT NULL,
    CompanyLogoUrl NVARCHAR(500) NULL,
    Website NVARCHAR(255) NULL,
    CompanySize NVARCHAR(50) NULL, -- Ví dụ: '50-100 nhân viên'
    Address NVARCHAR(MAX) NULL,
    Description NVARCHAR(MAX) NULL,
    KYCStatus NVARCHAR(20) DEFAULT 'Pending' -- 'Pending', 'Approved', 'Rejected' (UC-E04, UC-A05)
);
END;
GO

-- Tài liệu KYC xác thực doanh nghiệp (UC-E04, UC-A05)
IF OBJECT_ID(N'dbo.KYCDocuments', N'U') IS NULL
BEGIN
CREATE TABLE dbo.KYCDocuments (
    DocumentID INT IDENTITY(1,1) PRIMARY KEY,
    EmployerID INT FOREIGN KEY REFERENCES Employers(EmployerID) ON DELETE CASCADE,
    BusinessLicenseUrl NVARCHAR(500) NOT NULL,
    TaxCertificateUrl NVARCHAR(500) NULL,
    TaxCode NVARCHAR(50) NULL,
    SubmittedAt DATETIME DEFAULT GETDATE(),
    RejectionReason NVARCHAR(MAX) NULL
);
END;
GO
IF COL_LENGTH('KYCDocuments', 'TaxCertificateUrl') IS NULL
    ALTER TABLE KYCDocuments ADD TaxCertificateUrl NVARCHAR(500) NULL;
IF COL_LENGTH('KYCDocuments', 'TaxCode') IS NULL
    ALTER TABLE KYCDocuments ADD TaxCode NVARCHAR(50) NULL;

-- Tin tuyển dụng JD (UC-E05, UC-E06, UC-A06)
IF OBJECT_ID(N'dbo.JobPostings', N'U') IS NULL
BEGIN
CREATE TABLE dbo.JobPostings (
    JobID INT IDENTITY(1,1) PRIMARY KEY,
    EmployerID INT FOREIGN KEY REFERENCES Employers(EmployerID) ON DELETE CASCADE,
    CategoryID INT FOREIGN KEY REFERENCES JobCategories(CategoryID),
    Title NVARCHAR(200) NOT NULL,
    Description NVARCHAR(MAX) NOT NULL,
    Requirements NVARCHAR(MAX) NOT NULL,
    SalaryRange NVARCHAR(100) NULL,
    Location NVARCHAR(150) NULL,
    Status NVARCHAR(20) DEFAULT 'Published', -- 'Draft', 'PendingApproval', 'Published', 'Closed' (UC-A06)
    CreatedAt DATETIME DEFAULT GETDATE(),
    ExpiresAt DATETIME NULL
);
END;
GO

-- Bảng liên kết Kỹ năng yêu cầu cho JD (Phục vụ AI chấm Match Score)
IF OBJECT_ID(N'dbo.JobSkillRequirements', N'U') IS NULL
BEGIN
CREATE TABLE dbo.JobSkillRequirements (
    JobID INT FOREIGN KEY REFERENCES JobPostings(JobID) ON DELETE CASCADE,
    SkillID INT FOREIGN KEY REFERENCES SkillTaxonomy(SkillID) ON DELETE CASCADE,
    IsMandatory BIT DEFAULT 1,
    PRIMARY KEY (JobID, SkillID)
);
END;
GO

-- ========================================================
-- 4. TƯƠNG TÁC: ỨNG TUYỂN, LƯU TRỮ VÀ GÓI DỊCH VỤ
-- ========================================================

-- Lưu công việc yêu thích (UC-C10)
IF OBJECT_ID(N'dbo.SavedJobs', N'U') IS NULL
BEGIN
CREATE TABLE dbo.SavedJobs (
    UserID INT FOREIGN KEY REFERENCES Users(UserID) ON DELETE NO ACTION,
    JobID INT FOREIGN KEY REFERENCES JobPostings(JobID) ON DELETE CASCADE,
    SavedAt DATETIME DEFAULT GETDATE(),
    PRIMARY KEY (UserID, JobID)
);
END;
GO

-- Lịch sử ứng tuyển công việc (UC-C13, UC-C14, UC-E08)
IF OBJECT_ID(N'dbo.JobApplications', N'U') IS NULL
BEGIN
CREATE TABLE dbo.JobApplications (
    ApplicationID INT IDENTITY(1,1) PRIMARY KEY,
    JobID INT FOREIGN KEY REFERENCES JobPostings(JobID) ON DELETE CASCADE,
    ProfileID INT FOREIGN KEY REFERENCES CandidateProfiles(ProfileID) ON DELETE NO ACTION,
    CVID INT NULL, -- Original CV may be removed; CVVersionID retains the submitted snapshot.
    MatchScore FLOAT NULL, 
    Status NVARCHAR(30) DEFAULT 'Applied', -- 'Applied', 'Screening', 'Interviewing', 'Offered', 'Rejected'
    AppliedAt DATETIME DEFAULT GETDATE()
);
END;
GO

-- Lịch phỏng vấn (UC-E10)
IF OBJECT_ID(N'dbo.Interviews', N'U') IS NULL
BEGIN
CREATE TABLE dbo.Interviews (
    InterviewID INT IDENTITY(1,1) PRIMARY KEY,
    ApplicationID INT FOREIGN KEY REFERENCES JobApplications(ApplicationID) ON DELETE CASCADE,
    InterviewDate DATETIME NOT NULL,
    InterviewType NVARCHAR(20) NOT NULL DEFAULT 'Online',
    LocationOrLink NVARCHAR(500) NOT NULL,
    Notes NVARCHAR(MAX) NULL
);
END;
GO
IF COL_LENGTH('Interviews', 'InterviewType') IS NULL
    ALTER TABLE Interviews ADD InterviewType NVARCHAR(20) NOT NULL CONSTRAINT DF_Interviews_InterviewType DEFAULT 'Online';

-- Gói dịch vụ bán hàng (UC-A11, UC-E07)
IF OBJECT_ID(N'dbo.SubscriptionPackages', N'U') IS NULL
BEGIN
CREATE TABLE dbo.SubscriptionPackages (
    PackageID INT IDENTITY(1,1) PRIMARY KEY,
    PackageName NVARCHAR(100) NOT NULL,
    Price DECIMAL(18,2) NOT NULL,
    DurationDays INT NOT NULL, -- Thời hạn gói (ví dụ: 30 ngày)
    PostLimit INT NOT NULL,     -- Số lượng tin đăng tối đa
    SearchLimit INT NOT NULL    -- Số lượt tìm kiếm CV thụ động tối đa
);
END;
GO

-- Gói dịch vụ Nhà tuyển dụng đã mua (UC-E07)
IF OBJECT_ID(N'dbo.EmployerSubscriptions', N'U') IS NULL
BEGIN
CREATE TABLE dbo.EmployerSubscriptions (
    SubID INT IDENTITY(1,1) PRIMARY KEY,
    EmployerID INT FOREIGN KEY REFERENCES Employers(EmployerID) ON DELETE CASCADE,
    PackageID INT FOREIGN KEY REFERENCES SubscriptionPackages(PackageID),
    StartDate DATETIME DEFAULT GETDATE(),
    EndDate DATETIME NOT NULL,
    RemainingPosts INT NOT NULL,
    RemainingSearches INT NOT NULL
);
END;
GO

IF OBJECT_ID(N'dbo.PaymentTransactions', N'U') IS NULL
BEGIN
CREATE TABLE dbo.PaymentTransactions (
    PaymentID INT IDENTITY(1,1) PRIMARY KEY,
    TransactionRef NVARCHAR(100) NOT NULL UNIQUE,
    EmployerID INT NOT NULL FOREIGN KEY REFERENCES Employers(EmployerID) ON DELETE CASCADE,
    PackageID INT NOT NULL FOREIGN KEY REFERENCES SubscriptionPackages(PackageID),
    Amount DECIMAL(18,2) NOT NULL,
    Status NVARCHAR(20) NOT NULL DEFAULT 'Pending',
    PaymentMethod NVARCHAR(50) NULL,
    GatewayTransactionNo NVARCHAR(100) NULL,
    CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
    PaidAt DATETIME NULL
);
END;
GO

-- Gửi lời mời ứng tuyển trực tiếp (UC-E12)
IF OBJECT_ID(N'dbo.CandidateInvitations', N'U') IS NULL
BEGIN
CREATE TABLE dbo.CandidateInvitations (
    InvitationID INT IDENTITY(1,1) PRIMARY KEY,
    EmployerID INT FOREIGN KEY REFERENCES Employers(EmployerID),
    ProfileID INT FOREIGN KEY REFERENCES CandidateProfiles(ProfileID),
    JobID INT FOREIGN KEY REFERENCES JobPostings(JobID),
    Message NVARCHAR(MAX) NULL,
    Status NVARCHAR(20) DEFAULT 'Sent', -- 'Sent', 'Accepted', 'Declined'
    SentAt DATETIME DEFAULT GETDATE()
);
END;
GO

-- Thông báo việc làm theo tiêu chí (UC-C09: Job Alerts)
IF OBJECT_ID(N'dbo.JobAlerts', N'U') IS NULL
BEGIN
CREATE TABLE dbo.JobAlerts (
    AlertID INT IDENTITY(1,1) PRIMARY KEY,
    ProfileID INT FOREIGN KEY REFERENCES CandidateProfiles(ProfileID) ON DELETE CASCADE,
    Keywords NVARCHAR(200) NOT NULL,
    MinSalary DECIMAL(18,2) NULL,
    Location NVARCHAR(150) NULL,
    CategoryID INT NULL FOREIGN KEY REFERENCES JobCategories(CategoryID),
    Frequency NVARCHAR(20) DEFAULT 'Daily', -- 'Daily', 'Weekly'
    IsActive BIT DEFAULT 1,
    CreatedAt DATETIME DEFAULT GETDATE(),
    LastSentAt DATETIME NULL
);
END;
GO

-- ========================================================
-- 5. HỆ THỐNG AI & TÍNH NĂNG NÂNG CAO
-- ========================================================

-- Khóa học gợi ý (UC-A10, UC-C12, UC-AI01)
IF OBJECT_ID(N'dbo.Courses', N'U') IS NULL
BEGIN
CREATE TABLE dbo.Courses (
    CourseID INT IDENTITY(1,1) PRIMARY KEY,
    Title NVARCHAR(200) NOT NULL,
    Provider NVARCHAR(100) NULL, -- Coursera, Udemy, EdX, LinkedIn Learning, Microsoft Learn...
    Url NVARCHAR(500) NOT NULL,
    SkillID INT FOREIGN KEY REFERENCES SkillTaxonomy(SkillID), -- Kỹ năng khóa học này bổ sung
    Price DECIMAL(18,2) DEFAULT 0,
    Currency NVARCHAR(10) DEFAULT 'VND',
    IsFree BIT DEFAULT 0,
    CertificateName NVARCHAR(200) NULL,
    Duration NVARCHAR(50) NULL,
    Level NVARCHAR(50) NULL, -- 'Cơ bản', 'Trung cấp', 'Nâng cao', 'Chuyên gia'
    Rating FLOAT DEFAULT 4.8,
    ThumbnailUrl NVARCHAR(500) NULL
);
END;
GO

-- Lộ trình học tập cá nhân hóa của Ứng viên (UC-C12, UC-AI01)
IF OBJECT_ID(N'dbo.LearningPaths', N'U') IS NULL
BEGIN
CREATE TABLE dbo.LearningPaths (
    PathID INT IDENTITY(1,1) PRIMARY KEY,
    ProfileID INT FOREIGN KEY REFERENCES CandidateProfiles(ProfileID) ON DELETE CASCADE,
    MissingSkillID INT FOREIGN KEY REFERENCES SkillTaxonomy(SkillID),
    RecommendedCourseID INT FOREIGN KEY REFERENCES Courses(CourseID),
    Status NVARCHAR(20) DEFAULT 'Incomplete' -- 'Incomplete', 'Completed'
);
END;
GO

-- Lịch sử luyện phỏng vấn AI (UC-C15)
IF OBJECT_ID(N'dbo.InterviewPractices', N'U') IS NULL
BEGIN
CREATE TABLE dbo.InterviewPractices (
    PracticeID INT IDENTITY(1,1) PRIMARY KEY,
    ProfileID INT FOREIGN KEY REFERENCES CandidateProfiles(ProfileID) ON DELETE CASCADE,
    JobTitleTarget NVARCHAR(150) NULL,
    AIFeedback NVARCHAR(MAX) NULL, -- Đánh giá điểm mạnh/yếu từ AI
    Score FLOAT NULL,
    PracticedAt DATETIME DEFAULT GETDATE()
);
END;
GO

-- Phân tích xu hướng kỹ năng thị trường (UC-AI04)
IF OBJECT_ID(N'dbo.MarketSkillTrends', N'U') IS NULL
BEGIN
CREATE TABLE dbo.MarketSkillTrends (
    TrendID INT IDENTITY(1,1) PRIMARY KEY,
    SkillID INT FOREIGN KEY REFERENCES SkillTaxonomy(SkillID),
    DemandCount INT DEFAULT 0, -- Số lượng JD yêu cầu kỹ năng này trong kỳ
    RecordedMonth INT NOT NULL,
    RecordedYear INT NOT NULL
);
END;
GO

-- ========================================================
-- 6. QUẢN TRỊ HỆ THỐNG & KHIẾU NẠI (ADMIN)
-- ========================================================

-- Quản lý khiếu nại / Báo cáo vi phạm (UC-A07)
IF OBJECT_ID(N'dbo.UserReports', N'U') IS NULL
BEGIN
CREATE TABLE dbo.UserReports (
    ReportID INT IDENTITY(1,1) PRIMARY KEY,
    ReporterUserID INT FOREIGN KEY REFERENCES Users(UserID),
    TargetType NVARCHAR(50) NOT NULL, -- 'JobPosting', 'Employer', 'Candidate'
    TargetID INT NOT NULL,           -- ID của đối tượng bị báo cáo
    Reason NVARCHAR(MAX) NOT NULL,
    Status NVARCHAR(20) DEFAULT 'Pending', -- 'Pending', 'Resolved', 'Dismissed'
    CreatedAt DATETIME DEFAULT GETDATE()
);
END;
GO

-- Nhật ký hệ thống (System Logs)
IF OBJECT_ID(N'dbo.SystemLogs', N'U') IS NULL
BEGIN
CREATE TABLE dbo.SystemLogs (
    LogID INT IDENTITY(1,1) PRIMARY KEY,
    UserID INT FOREIGN KEY REFERENCES Users(UserID) NULL,
    Action NVARCHAR(255) NOT NULL,
    IpAddress NVARCHAR(50) NULL,
    LoggedAt DATETIME DEFAULT GETDATE()
);
END;
GO
GO

GO

-- Notifications and moderation fields

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



GO

-- Admin auditing and payments

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

GO

-- CV versions and application snapshots

-- Additive CV analysis/version storage. Original CVs and application IDs are retained.
IF COL_LENGTH('CVs', 'IsArchived') IS NULL
  ALTER TABLE CVs ADD IsArchived BIT NOT NULL CONSTRAINT DF_CVs_IsArchived DEFAULT 0;
IF OBJECT_ID('CVDocumentVersions', 'U') IS NULL
BEGIN
  CREATE TABLE CVDocumentVersions (
    VersionID INT IDENTITY PRIMARY KEY,
    CVID INT NOT NULL,
    ProfileID INT NOT NULL REFERENCES CandidateProfiles(ProfileID),
    VersionNumber INT NOT NULL,
    ContentHash CHAR(64) NOT NULL,
    SourceType VARCHAR(20) NOT NULL,
    OriginalName NVARCHAR(255) NULL,
    FileName VARCHAR(100) NULL,
    MimeType VARCHAR(100) NULL,
    BuilderJson NVARCHAR(MAX) NULL,
    Template NVARCHAR(50) NULL,
    Status VARCHAR(20) NOT NULL DEFAULT 'Queued',
    RawText NVARCHAR(MAX) NULL,
    ParsedJson NVARCHAR(MAX) NULL,
    ConfirmedJson NVARCHAR(MAX) NULL,
    WarningsJson NVARCHAR(MAX) NULL,
    ParseMethod VARCHAR(30) NULL,
    ParserVersion VARCHAR(30) NOT NULL DEFAULT 'cv-parser-1',
    ErrorMessage NVARCHAR(500) NULL,
    Attempts INT NOT NULL DEFAULT 0,
    LeaseUntil DATETIME2 NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    ConfirmedAt DATETIME2 NULL,
    CONSTRAINT UQ_CVVersion_Number UNIQUE(CVID, VersionNumber),
    CONSTRAINT CK_CVVersion_Status CHECK(Status IN ('Queued','Processing','NeedsReview','Ready','Failed'))
  );
  CREATE INDEX IX_CVVersion_Queue ON CVDocumentVersions(Status, LeaseUntil, VersionID);
  CREATE INDEX IX_CVVersion_Profile ON CVDocumentVersions(ProfileID, CVID, VersionNumber DESC);
END;
IF COL_LENGTH('JobApplications','CVVersionID') IS NULL
  ALTER TABLE JobApplications ADD CVVersionID INT NULL REFERENCES CVDocumentVersions(VersionID);
IF COL_LENGTH('JobApplications','MatchDetailsJson') IS NULL
  ALTER TABLE JobApplications ADD MatchDetailsJson NVARCHAR(MAX) NULL;

GO

-- Invitation responses and interviews

-- Repeatable, additive migration. No conversations or message tables.
-- Existing databases may predate the column already present in fresh schema.sql.
IF COL_LENGTH('Interviews', 'InterviewType') IS NULL
  ALTER TABLE Interviews ADD InterviewType NVARCHAR(20) NOT NULL CONSTRAINT DF_Interviews_InterviewType DEFAULT 'Online';
IF COL_LENGTH('CandidateInvitations', 'RespondedAt') IS NULL
  ALTER TABLE CandidateInvitations ADD RespondedAt DATETIME2 NULL;
IF COL_LENGTH('CandidateInvitations', 'Version') IS NULL
  ALTER TABLE CandidateInvitations ADD Version INT NOT NULL CONSTRAINT DF_Invitation_Version DEFAULT 1;
IF COL_LENGTH('Interviews', 'InvitationID') IS NULL
  ALTER TABLE Interviews ADD InvitationID INT NULL CONSTRAINT FK_Interviews_Invitation REFERENCES CandidateInvitations(InvitationID);
IF COL_LENGTH('Interviews', 'Status') IS NULL
  ALTER TABLE Interviews ADD Status NVARCHAR(20) NOT NULL CONSTRAINT DF_Interview_Status DEFAULT 'Pending';
IF COL_LENGTH('Interviews', 'RespondedAt') IS NULL
  ALTER TABLE Interviews ADD RespondedAt DATETIME2 NULL;
IF COL_LENGTH('Interviews', 'Version') IS NULL
  ALTER TABLE Interviews ADD Version INT NOT NULL CONSTRAINT DF_Interview_Version DEFAULT 1;
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_Interviews_Invitation' AND object_id=OBJECT_ID('Interviews'))
  CREATE INDEX IX_Interviews_Invitation ON Interviews(InvitationID, InterviewID DESC);
GO

GO

-- Preserve the legacy CV deletion behavior on upgraded databases.
DECLARE @cvForeignKey SYSNAME;
SELECT @cvForeignKey=fk.name FROM sys.foreign_keys fk
JOIN sys.foreign_key_columns fkc ON fkc.constraint_object_id=fk.object_id
JOIN sys.columns c ON c.object_id=fkc.parent_object_id AND c.column_id=fkc.parent_column_id
WHERE fk.parent_object_id=OBJECT_ID('dbo.JobApplications') AND c.name='CVID';
IF @cvForeignKey IS NOT NULL
BEGIN
  DECLARE @dropCVForeignKey NVARCHAR(MAX)=N'ALTER TABLE dbo.JobApplications DROP CONSTRAINT '+QUOTENAME(@cvForeignKey);
  EXEC(@dropCVForeignKey);
END;
GO
