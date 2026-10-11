const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { getPool } = require('./config/db');

// Route imports
const authRoutes = require('./routes/authRoutes');
const jobRoutes = require('./routes/jobRoutes');
const candidateRoutes = require('./routes/candidateRoutes');
const employerRoutes = require('./routes/employerRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const aiRoutes = require('./routes/aiRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Static folder for uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Root & Health Check API
app.get('/', (req, res) => {
  res.send(`
    <div style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
      <h1 style="color: #0A66C2;">🚀 Jobtimize Backend API is running!</h1>
      <p style="color: #555; font-size: 16px;">Để xem <strong>Giao diện Người dùng (Frontend)</strong>, vui lòng mở liên kết bên dưới:</p>
      <a href="http://localhost:3000" style="display: inline-block; padding: 12px 24px; background: #00B14F; color: #fff; text-decoration: none; border-radius: 8px; font-weight: bold; margin-top: 10px;">
        👉 Mở Giao diện Web tại http://localhost:3000
      </a>
      <p style="color: #888; margin-top: 30px; font-size: 13px;">API Health Check: <a href="/api/health">/api/health</a></p>
    </div>
  `);
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    platform: 'Jobtimize AI Recruitment Platform',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/candidate', candidateRoutes);
app.use('/api/employer', employerRoutes);
app.use('/api/metadata', categoryRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/admin', adminRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Lỗi hệ thống nội bộ máy chủ'
  });
});

// Start Server and Test DB connection
app.listen(PORT, async () => {
  console.log(`🚀 Jobtimize Server is running on http://localhost:${PORT}`);
  try {
    const pool = await getPool();
    // Đảm bảo bảng JobPostings có cột AdminNote cho kiểm duyệt
    await pool.request().query(`
      IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'JobPostings') AND name = 'AdminNote')
      BEGIN
        ALTER TABLE JobPostings ADD AdminNote NVARCHAR(MAX) NULL;
      END
    `);

    // Đảm bảo bảng UserReports và các cột xử lý báo cáo
    await pool.request().query(`
      IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'UserReports')
      BEGIN
        CREATE TABLE UserReports (
          ReportID INT IDENTITY(1,1) PRIMARY KEY,
          ReporterUserID INT FOREIGN KEY REFERENCES Users(UserID),
          TargetType NVARCHAR(50) NOT NULL, -- 'JobPosting', 'Employer', 'Candidate'
          TargetID INT NOT NULL,
          Reason NVARCHAR(MAX) NOT NULL,
          Status NVARCHAR(20) DEFAULT 'Pending', -- 'Pending', 'Resolved', 'Dismissed'
          AdminNote NVARCHAR(MAX) NULL,
          ResolvedAt DATETIME NULL,
          CreatedAt DATETIME DEFAULT GETDATE()
        );
      END
      ELSE
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'UserReports') AND name = 'AdminNote')
        BEGIN
          ALTER TABLE UserReports ADD AdminNote NVARCHAR(MAX) NULL;
        END;
        IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'UserReports') AND name = 'ResolvedAt')
        BEGIN
          ALTER TABLE UserReports ADD ResolvedAt DATETIME NULL;
        END;
      END
    `);

    // Seed mẫu báo cáo vi phạm nếu bảng rỗng
    await pool.request().query(`
      IF (SELECT COUNT(*) FROM UserReports) = 0
      BEGIN
        DECLARE @FirstJob INT = (SELECT TOP 1 JobID FROM JobPostings);
        DECLARE @FirstUser INT = (SELECT TOP 1 UserID FROM Users WHERE Email <> 'admin@jobtimize.vn');
        IF @FirstJob IS NOT NULL AND @FirstUser IS NOT NULL
        BEGIN
          INSERT INTO UserReports (ReporterUserID, TargetType, TargetID, Reason, Status, CreatedAt)
          VALUES 
          (@FirstUser, 'JobPosting', @FirstJob, N'Tin tuyển dụng yêu cầu ứng viên đóng phí phỏng vấn trái quy định, thông tin mức lương không đúng thực tế khi trao đổi.', 'Pending', DATEADD(HOUR, -5, GETDATE()));
        END
      END
    `);

    // Đảm bảo các cột thanh toán và doanh thu trong bảng EmployerSubscriptions
    await pool.request().query(`
      IF EXISTS (SELECT 1 FROM sys.tables WHERE name = 'EmployerSubscriptions')
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'EmployerSubscriptions') AND name = 'AmountPaid')
          ALTER TABLE EmployerSubscriptions ADD AmountPaid DECIMAL(18,2) NULL;
        IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'EmployerSubscriptions') AND name = 'PaymentMethod')
          ALTER TABLE EmployerSubscriptions ADD PaymentMethod NVARCHAR(50) DEFAULT 'VNPay';
        IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'EmployerSubscriptions') AND name = 'PaymentStatus')
          ALTER TABLE EmployerSubscriptions ADD PaymentStatus NVARCHAR(30) DEFAULT 'Completed';
        IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'EmployerSubscriptions') AND name = 'TransactionCode')
          ALTER TABLE EmployerSubscriptions ADD TransactionCode NVARCHAR(100) NULL;
        IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'EmployerSubscriptions') AND name = 'CreatedAt')
          ALTER TABLE EmployerSubscriptions ADD CreatedAt DATETIME DEFAULT GETDATE();
      END
    `);

    // Seed dữ liệu doanh thu & gói dịch vụ mẫu cho 6 tháng gần nhất nếu chưa có
    await pool.request().query(`
      IF EXISTS (SELECT 1 FROM sys.tables WHERE name = 'EmployerSubscriptions')
         AND (SELECT COUNT(*) FROM EmployerSubscriptions) < 4
      BEGIN
        DECLARE @FptID INT = (SELECT TOP 1 EmployerID FROM Employers WHERE CompanyName LIKE N'%FPT%');
        DECLARE @VngID INT = (SELECT TOP 1 EmployerID FROM Employers WHERE CompanyName LIKE N'%VNG%');
        DECLARE @KmsID INT = (SELECT TOP 1 EmployerID FROM Employers WHERE CompanyName LIKE N'%KMS%');
        DECLARE @VinAIID INT = (SELECT TOP 1 EmployerID FROM Employers WHERE CompanyName LIKE N'%VinAI%');
        DECLARE @ShopeeID INT = (SELECT TOP 1 EmployerID FROM Employers WHERE CompanyName LIKE N'%Shopee%');
        DECLARE @GhtkID INT = (SELECT TOP 1 EmployerID FROM Employers WHERE CompanyName LIKE N'%Giao Hàng%');
        DECLARE @ChoTotID INT = (SELECT TOP 1 EmployerID FROM Employers WHERE CompanyName LIKE N'%Chợ Tốt%');

        DECLARE @PkgStarter INT = (SELECT TOP 1 PackageID FROM SubscriptionPackages WHERE Price = 0);
        DECLARE @PkgPro INT = (SELECT TOP 1 PackageID FROM SubscriptionPackages WHERE Price > 0 AND Price < 3000000);
        DECLARE @PkgEnterprise INT = (SELECT TOP 1 PackageID FROM SubscriptionPackages WHERE Price >= 3000000);

        IF @FptID IS NOT NULL AND @PkgEnterprise IS NOT NULL
          INSERT INTO EmployerSubscriptions (EmployerID, PackageID, StartDate, EndDate, RemainingPosts, RemainingSearches, AmountPaid, PaymentMethod, PaymentStatus, TransactionCode, CreatedAt)
          VALUES (@FptID, @PkgEnterprise, DATEADD(MONTH, -5, GETDATE()), DATEADD(MONTH, -2, GETDATE()), 35, 380, 4990000, 'BankTransfer', 'Completed', 'TXN-202605-FPT01', DATEADD(MONTH, -5, GETDATE()));

        IF @VngID IS NOT NULL AND @PkgEnterprise IS NOT NULL
          INSERT INTO EmployerSubscriptions (EmployerID, PackageID, StartDate, EndDate, RemainingPosts, RemainingSearches, AmountPaid, PaymentMethod, PaymentStatus, TransactionCode, CreatedAt)
          VALUES (@VngID, @PkgEnterprise, DATEADD(MONTH, -4, GETDATE()), DATEADD(MONTH, -1, GETDATE()), 42, 450, 4990000, 'VNPay', 'Completed', 'TXN-202606-VNG02', DATEADD(MONTH, -4, GETDATE()));

        IF @KmsID IS NOT NULL AND @PkgPro IS NOT NULL
          INSERT INTO EmployerSubscriptions (EmployerID, PackageID, StartDate, EndDate, RemainingPosts, RemainingSearches, AmountPaid, PaymentMethod, PaymentStatus, TransactionCode, CreatedAt)
          VALUES (@KmsID, @PkgPro, DATEADD(MONTH, -3, GETDATE()), DATEADD(MONTH, -2, GETDATE()), 10, 80, 1990000, 'MoMo', 'Completed', 'TXN-202607-KMS03', DATEADD(MONTH, -3, GETDATE()));

        IF @VinAIID IS NOT NULL AND @PkgEnterprise IS NOT NULL
          INSERT INTO EmployerSubscriptions (EmployerID, PackageID, StartDate, EndDate, RemainingPosts, RemainingSearches, AmountPaid, PaymentMethod, PaymentStatus, TransactionCode, CreatedAt)
          VALUES (@VinAIID, @PkgEnterprise, DATEADD(MONTH, -2, GETDATE()), DATEADD(MONTH, 1, GETDATE()), 48, 490, 4990000, 'BankTransfer', 'Completed', 'TXN-202608-VAI04', DATEADD(MONTH, -2, GETDATE()));

        IF @ShopeeID IS NOT NULL AND @PkgEnterprise IS NOT NULL
          INSERT INTO EmployerSubscriptions (EmployerID, PackageID, StartDate, EndDate, RemainingPosts, RemainingSearches, AmountPaid, PaymentMethod, PaymentStatus, TransactionCode, CreatedAt)
          VALUES (@ShopeeID, @PkgEnterprise, DATEADD(MONTH, -1, GETDATE()), DATEADD(MONTH, 2, GETDATE()), 45, 460, 4990000, 'VNPay', 'Completed', 'TXN-202609-SHP05', DATEADD(MONTH, -1, GETDATE()));

        IF @GhtkID IS NOT NULL AND @PkgPro IS NOT NULL
          INSERT INTO EmployerSubscriptions (EmployerID, PackageID, StartDate, EndDate, RemainingPosts, RemainingSearches, AmountPaid, PaymentMethod, PaymentStatus, TransactionCode, CreatedAt)
          VALUES (@GhtkID, @PkgPro, DATEADD(DAY, -14, GETDATE()), DATEADD(DAY, 16, GETDATE()), 12, 90, 1990000, 'VNPay', 'Completed', 'TXN-202609-GHT06', DATEADD(DAY, -14, GETDATE()));

        IF @ChoTotID IS NOT NULL AND @PkgPro IS NOT NULL
          INSERT INTO EmployerSubscriptions (EmployerID, PackageID, StartDate, EndDate, RemainingPosts, RemainingSearches, AmountPaid, PaymentMethod, PaymentStatus, TransactionCode, CreatedAt)
          VALUES (@ChoTotID, @PkgPro, DATEADD(DAY, -4, GETDATE()), DATEADD(DAY, 26, GETDATE()), 14, 95, 1990000, 'MoMo', 'Completed', 'TXN-202610-CHT07', DATEADD(DAY, -4, GETDATE()));

        IF @FptID IS NOT NULL AND @PkgEnterprise IS NOT NULL
          INSERT INTO EmployerSubscriptions (EmployerID, PackageID, StartDate, EndDate, RemainingPosts, RemainingSearches, AmountPaid, PaymentMethod, PaymentStatus, TransactionCode, CreatedAt)
          VALUES (@FptID, @PkgEnterprise, DATEADD(DAY, -1, GETDATE()), DATEADD(MONTH, 3, GETDATE()), 50, 500, 4990000, 'BankTransfer', 'Completed', 'TXN-202610-FPT08', DATEADD(DAY, -1, GETDATE()));
      END
    `);

    // Phân bổ ngày tạo thực tế cho việc làm và người dùng nếu dữ liệu mẫu bị trùng cùng 1 giây
    await pool.request().query(`
      IF (SELECT COUNT(DISTINCT CAST(CreatedAt AS DATE)) FROM Users) <= 1
      BEGIN
        UPDATE Users SET CreatedAt = DATEADD(MONTH, -5, CreatedAt) WHERE Email = 'hr@fpt-software.com';
        UPDATE Users SET CreatedAt = DATEADD(MONTH, -4, CreatedAt) WHERE Email = 'career@vng.com.vn';
        UPDATE Users SET CreatedAt = DATEADD(MONTH, -3, CreatedAt) WHERE Email = 'career-dn@kms-technology.com';
        UPDATE Users SET CreatedAt = DATEADD(MONTH, -2, CreatedAt) WHERE Email = 'career@vinai.io';
        UPDATE Users SET CreatedAt = DATEADD(MONTH, -1, CreatedAt) WHERE Email = 'tuyendung@onemount.com';
        UPDATE Users SET CreatedAt = DATEADD(DAY, -18, CreatedAt) WHERE Email = 'talent@ghtk.vn';
        UPDATE Users SET CreatedAt = DATEADD(DAY, -10, CreatedAt) WHERE Email = 'recruitment@shopee.vn';
        UPDATE Users SET CreatedAt = DATEADD(DAY, -3, CreatedAt) WHERE Email = 'talent@chotot.vn';
      END;

      IF (SELECT COUNT(DISTINCT CAST(CreatedAt AS DATE)) FROM JobPostings) <= 1
      BEGIN
        UPDATE JobPostings SET CreatedAt = DATEADD(MONTH, -5, CreatedAt) WHERE JobID IN (1, 2);
        UPDATE JobPostings SET CreatedAt = DATEADD(MONTH, -4, CreatedAt) WHERE JobID IN (3, 4);
        UPDATE JobPostings SET CreatedAt = DATEADD(MONTH, -3, CreatedAt) WHERE JobID IN (5, 6);
        UPDATE JobPostings SET CreatedAt = DATEADD(MONTH, -2, CreatedAt) WHERE JobID = 7;
        UPDATE JobPostings SET CreatedAt = DATEADD(MONTH, -1, CreatedAt) WHERE JobID = 8;
        UPDATE JobPostings SET CreatedAt = DATEADD(DAY, -14, CreatedAt) WHERE JobID = 9;
        UPDATE JobPostings SET CreatedAt = DATEADD(DAY, -5, CreatedAt) WHERE JobID = 10;
      END;
    `);

    // Seed mẫu hồ sơ và ứng tuyển nếu chưa có
    await pool.request().query(`
      IF EXISTS (SELECT 1 FROM sys.tables WHERE name = 'JobApplications')
         AND (SELECT COUNT(*) FROM JobApplications) = 0
      BEGIN
        DECLARE @CandidateUser INT = (
          SELECT TOP 1 u.UserID 
          FROM Users u 
          JOIN UserRoles ur ON u.UserID = ur.UserID 
          JOIN Roles r ON ur.RoleID = r.RoleID 
          WHERE r.RoleName = 'Candidate'
        );

        IF @CandidateUser IS NOT NULL
        BEGIN
          DECLARE @PId INT = (SELECT TOP 1 ProfileID FROM CandidateProfiles WHERE UserID = @CandidateUser);
          IF @PId IS NULL
          BEGIN
            INSERT INTO CandidateProfiles (UserID, Headline, DesiredSalary, CurrentLocation, IsLookingForJob)
            VALUES (@CandidateUser, N'Senior Fullstack Software Engineer', 35000000, N'Hà Nội', 1);
            SET @PId = SCOPE_IDENTITY();
          END;

          DECLARE @CId INT = (SELECT TOP 1 CVID FROM CVs WHERE ProfileID = @PId);
          IF @CId IS NULL
          BEGIN
            INSERT INTO CVs (ProfileID, Title, FileUrl, IsPrimary)
            VALUES (@PId, N'CV Fullstack Engineer 2026', 'https://example.com/cv.pdf', 1);
            SET @CId = SCOPE_IDENTITY();
          END;

          INSERT INTO JobApplications (JobID, ProfileID, CVID, MatchScore, Status, AppliedAt)
          SELECT TOP 6 JobID, @PId, @CId, 86.5, 'Applied', DATEADD(DAY, -JobID * 3, GETDATE())
          FROM JobPostings;
        END
      END
    `);
  } catch (err) {
    console.warn('⚠️ Warning: MS SQL Server connection not ready yet. Please ensure SQL Server is running on port 1433 and JobtimizeDB database is created.');
  }
});
