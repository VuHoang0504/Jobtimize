CREATE DATABASE JobtimizeDB;
GO
USE JobtimizeDB;
GO

-- ========================================================
-- 1. BẢNG PHÂN QUYỀN & TÀI KHOẢN CHUNG
-- ========================================================

-- Bảng Roles (Phân quyền: Admin, Employer, Candidate)
CREATE TABLE Roles (
    RoleID INT IDENTITY(1,1) PRIMARY KEY,
    RoleName NVARCHAR(50) NOT NULL UNIQUE -- 'Admin', 'Employer', 'Candidate'
);

-- Bảng Users (Quản lý tài khoản chung cho mọi Actor)
CREATE TABLE Users (
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

-- Bảng trung gian UserRoles (Hỗ trợ UC-A02: Quản lý phân quyền nội bộ)
CREATE TABLE UserRoles (
    UserID INT FOREIGN KEY REFERENCES Users(UserID) ON DELETE CASCADE,
    RoleID INT FOREIGN KEY REFERENCES Roles(RoleID) ON DELETE CASCADE,
    PRIMARY KEY (UserID, RoleID)
);

-- ========================================================
-- 2. BẢNG DÀNH CHO ỨNG VIÊN (CANDIDATE)
-- ========================================================

-- Hồ sơ chi tiết của Ứng viên (UC-C03, UC-C04)
CREATE TABLE CandidateProfiles (
    ProfileID INT IDENTITY(1,1) PRIMARY KEY,
    UserID INT FOREIGN KEY REFERENCES Users(UserID) ON DELETE CASCADE,
    Headline NVARCHAR(255) NULL, -- Ví dụ: Senior Fullstack Developer
    Bio NVARCHAR(MAX) NULL,
    DesiredSalary DECIMAL(18,2) NULL,
    CurrentLocation NVARCHAR(100) NULL,
    IsLookingForJob BIT DEFAULT 1 -- UC-C04: Bật/Tắt tìm việc (True: Đang tìm, False: Tắt)
);

-- Quản lý nhiều phiên bản CV (UC-C05, UC-C06)
CREATE TABLE CVs (
    CVID INT IDENTITY(1,1) PRIMARY KEY,
    ProfileID INT FOREIGN KEY REFERENCES CandidateProfiles(ProfileID) ON DELETE CASCADE,
    Title NVARCHAR(100) NOT NULL,
    FileUrl NVARCHAR(500) NOT NULL, -- Đường dẫn lưu file PDF/Docx hoặc nội dung JSON nếu tạo online
    IsPrimary BIT DEFAULT 0,
    CreatedAt DATETIME DEFAULT GETDATE()
);

-- Quản lý Danh mục Ngành nghề (UC-A09)
CREATE TABLE JobCategories (
    CategoryID INT IDENTITY(1,1) PRIMARY KEY,
    CategoryName NVARCHAR(100) NOT NULL,
    Description NVARCHAR(MAX) NULL
);

-- Từ điển Kỹ năng chuẩn hóa (UC-A08)
CREATE TABLE SkillTaxonomy (
    SkillID INT IDENTITY(1,1) PRIMARY KEY,
    SkillName NVARCHAR(100) NOT NULL UNIQUE,
    NormalizedName NVARCHAR(100) NOT NULL, -- Dùng để AI map các từ đồng nghĩa (ví dụ: 'ReactJS' và 'React.js')
    CategoryID INT FOREIGN KEY REFERENCES JobCategories(CategoryID)
);

-- ========================================================
-- 3. BẢNG DÀNH CHO NHÀ TUYỂN DỤNG (EMPLOYER)
-- ========================================================

-- Thông tin Doanh nghiệp (UC-E03)
CREATE TABLE Employers (
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

-- Tài liệu KYC xác thực doanh nghiệp (UC-E04, UC-A05)
CREATE TABLE KYCDocuments (
    DocumentID INT IDENTITY(1,1) PRIMARY KEY,
    EmployerID INT FOREIGN KEY REFERENCES Employers(EmployerID) ON DELETE CASCADE,
    BusinessLicenseUrl NVARCHAR(500) NOT NULL,
    SubmittedAt DATETIME DEFAULT GETDATE(),
    RejectionReason NVARCHAR(MAX) NULL
);

-- Tin tuyển dụng JD (UC-E05, UC-E06, UC-A06)
CREATE TABLE JobPostings (
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

-- Bảng liên kết Kỹ năng yêu cầu cho JD (Phục vụ AI chấm Match Score)
CREATE TABLE JobSkillRequirements (
    JobID INT FOREIGN KEY REFERENCES JobPostings(JobID) ON DELETE CASCADE,
    SkillID INT FOREIGN KEY REFERENCES SkillTaxonomy(SkillID) ON DELETE CASCADE,
    IsMandatory BIT DEFAULT 1,
    PRIMARY KEY (JobID, SkillID)
);

-- ========================================================
-- 4. TƯƠNG TÁC: ỨNG TUYỂN, LƯU TRỮ VÀ GÓI DỊCH VỤ
-- ========================================================

-- Lưu công việc yêu thích (UC-C10)
CREATE TABLE SavedJobs (
    UserID INT FOREIGN KEY REFERENCES Users(UserID) ON DELETE NO ACTION,
    JobID INT FOREIGN KEY REFERENCES JobPostings(JobID) ON DELETE CASCADE,
    SavedAt DATETIME DEFAULT GETDATE(),
    PRIMARY KEY (UserID, JobID)
);

-- Lịch sử ứng tuyển công việc (UC-C13, UC-C14, UC-E08)
CREATE TABLE JobApplications (
    ApplicationID INT IDENTITY(1,1) PRIMARY KEY,
    JobID INT FOREIGN KEY REFERENCES JobPostings(JobID) ON DELETE CASCADE,
    ProfileID INT FOREIGN KEY REFERENCES CandidateProfiles(ProfileID) ON DELETE NO ACTION,
    CVID INT FOREIGN KEY REFERENCES CVs(CVID) ON DELETE NO ACTION,
    MatchScore FLOAT NULL, 
    Status NVARCHAR(30) DEFAULT 'Applied', -- 'Applied', 'Screening', 'Interviewing', 'Offered', 'Rejected'
    AppliedAt DATETIME DEFAULT GETDATE()
);

-- Lịch phỏng vấn (UC-E10)
CREATE TABLE Interviews (
    InterviewID INT IDENTITY(1,1) PRIMARY KEY,
    ApplicationID INT FOREIGN KEY REFERENCES JobApplications(ApplicationID) ON DELETE CASCADE,
    InterviewDate DATETIME NOT NULL,
    LocationOrLink NVARCHAR(500) NOT NULL,
    Notes NVARCHAR(MAX) NULL
);

-- Gói dịch vụ bán hàng (UC-A11, UC-E07)
CREATE TABLE SubscriptionPackages (
    PackageID INT IDENTITY(1,1) PRIMARY KEY,
    PackageName NVARCHAR(100) NOT NULL,
    Price DECIMAL(18,2) NOT NULL,
    DurationDays INT NOT NULL, -- Thời hạn gói (ví dụ: 30 ngày)
    PostLimit INT NOT NULL,     -- Số lượng tin đăng tối đa
    SearchLimit INT NOT NULL    -- Số lượt tìm kiếm CV thụ động tối đa
);

-- Gói dịch vụ Nhà tuyển dụng đã mua (UC-E07)
CREATE TABLE EmployerSubscriptions (
    SubID INT IDENTITY(1,1) PRIMARY KEY,
    EmployerID INT FOREIGN KEY REFERENCES Employers(EmployerID) ON DELETE CASCADE,
    PackageID INT FOREIGN KEY REFERENCES SubscriptionPackages(PackageID),
    StartDate DATETIME DEFAULT GETDATE(),
    EndDate DATETIME NOT NULL,
    RemainingPosts INT NOT NULL,
    RemainingSearches INT NOT NULL
);

-- Gửi lời mời ứng tuyển trực tiếp (UC-E12)
CREATE TABLE CandidateInvitations (
    InvitationID INT IDENTITY(1,1) PRIMARY KEY,
    EmployerID INT FOREIGN KEY REFERENCES Employers(EmployerID),
    ProfileID INT FOREIGN KEY REFERENCES CandidateProfiles(ProfileID),
    JobID INT FOREIGN KEY REFERENCES JobPostings(JobID),
    Message NVARCHAR(MAX) NULL,
    Status NVARCHAR(20) DEFAULT 'Sent', -- 'Sent', 'Accepted', 'Declined'
    SentAt DATETIME DEFAULT GETDATE()
);

-- ========================================================
-- 5. HỆ THỐNG AI & TÍNH NĂNG NÂNG CAO
-- ========================================================

-- Khóa học gợi ý (UC-A10, UC-C12, UC-AI01)
CREATE TABLE Courses (
    CourseID INT IDENTITY(1,1) PRIMARY KEY,
    Title NVARCHAR(200) NOT NULL,
    Provider NVARCHAR(100) NULL, -- Coursera, Udemy, EdX,...
    Url NVARCHAR(500) NOT NULL,
    SkillID INT FOREIGN KEY REFERENCES SkillTaxonomy(SkillID) -- Kỹ năng khóa học này bổ sung
);

-- Lộ trình học tập cá nhân hóa của Ứng viên (UC-C12, UC-AI01)
CREATE TABLE LearningPaths (
    PathID INT IDENTITY(1,1) PRIMARY KEY,
    ProfileID INT FOREIGN KEY REFERENCES CandidateProfiles(ProfileID) ON DELETE CASCADE,
    MissingSkillID INT FOREIGN KEY REFERENCES SkillTaxonomy(SkillID),
    RecommendedCourseID INT FOREIGN KEY REFERENCES Courses(CourseID),
    Status NVARCHAR(20) DEFAULT 'Incomplete' -- 'Incomplete', 'Completed'
);

-- Lịch sử luyện phỏng vấn AI (UC-C15)
CREATE TABLE InterviewPractices (
    PracticeID INT IDENTITY(1,1) PRIMARY KEY,
    ProfileID INT FOREIGN KEY REFERENCES CandidateProfiles(ProfileID) ON DELETE CASCADE,
    JobTitleTarget NVARCHAR(150) NULL,
    AIFeedback NVARCHAR(MAX) NULL, -- Đánh giá điểm mạnh/yếu từ AI
    Score FLOAT NULL,
    PracticedAt DATETIME DEFAULT GETDATE()
);

-- Phân tích xu hướng kỹ năng thị trường (UC-AI04)
CREATE TABLE MarketSkillTrends (
    TrendID INT IDENTITY(1,1) PRIMARY KEY,
    SkillID INT FOREIGN KEY REFERENCES SkillTaxonomy(SkillID),
    DemandCount INT DEFAULT 0, -- Số lượng JD yêu cầu kỹ năng này trong kỳ
    RecordedMonth INT NOT NULL,
    RecordedYear INT NOT NULL
);

-- ========================================================
-- 6. QUẢN TRỊ HỆ THỐNG & KHIẾU NẠI (ADMIN)
-- ========================================================

-- Quản lý khiếu nại / Báo cáo vi phạm (UC-A07)
CREATE TABLE UserReports (
    ReportID INT IDENTITY(1,1) PRIMARY KEY,
    ReporterUserID INT FOREIGN KEY REFERENCES Users(UserID),
    TargetType NVARCHAR(50) NOT NULL, -- 'JobPosting', 'Employer', 'Candidate'
    TargetID INT NOT NULL,           -- ID của đối tượng bị báo cáo
    Reason NVARCHAR(MAX) NOT NULL,
    Status NVARCHAR(20) DEFAULT 'Pending', -- 'Pending', 'Resolved', 'Dismissed'
    CreatedAt DATETIME DEFAULT GETDATE()
);

-- Nhật ký hệ thống (System Logs)
CREATE TABLE SystemLogs (
    LogID INT IDENTITY(1,1) PRIMARY KEY,
    UserID INT FOREIGN KEY REFERENCES Users(UserID) NULL,
    Action NVARCHAR(255) NOT NULL,
    IpAddress NVARCHAR(50) NULL,
    LoggedAt DATETIME DEFAULT GETDATE()
);
GO
