-- Initial reference data and demo accounts/listings. Existing accounts are preserved.
USE JobtimizeDB;
GO

-- ========================================================
-- DỮ LIỆU BAN ĐẦU (SEED DATA) CHO JOBTIMIZEDB
-- ========================================================

-- 1. Nạp Roles
IF NOT EXISTS (SELECT 1 FROM Roles WHERE RoleName = 'Admin')
    INSERT INTO Roles (RoleName) VALUES ('Admin');

IF NOT EXISTS (SELECT 1 FROM Roles WHERE RoleName = 'Employer')
    INSERT INTO Roles (RoleName) VALUES ('Employer');

IF NOT EXISTS (SELECT 1 FROM Roles WHERE RoleName = 'Candidate')
    INSERT INTO Roles (RoleName) VALUES ('Candidate');
GO

-- 2. Nạp JobCategories (Ngành nghề)
IF NOT EXISTS (SELECT 1 FROM JobCategories WHERE CategoryName = N'Công nghệ thông tin / Phần mềm')
BEGIN
    INSERT INTO JobCategories (CategoryName, Description) VALUES
    (N'Công nghệ thông tin / Phần mềm', N'Phát triển ứng dụng Web, Mobile, Hệ thống Backend, Frontend'),
    (N'Trí tuệ nhân tạo / Dữ liệu (AI & Data)', N'Machine Learning, Data Engineering, AI/LLM, Phân tích dữ liệu'),
    (N'Điện toán đám mây / DevOps', N'Quản trị hạ tầng Cloud, CI/CD, Containerization, Kubernetes'),
    (N'Thiết kế UI/UX & Sản phẩm', N'Thiết kế trải nghiệm người dùng, giao diện Figma, Quản lý sản phẩm Product'),
    (N'Kiểm thử phần mềm (QA/QC)', N'Manual Test, Automation Testing, Kiểm thử hiệu năng hệ thống');
END
GO

-- 3. Nạp SkillTaxonomy (Từ điển kỹ năng & Normalized Name cho AI)
DECLARE @CatIT INT = (SELECT CategoryID FROM JobCategories WHERE CategoryName = N'Công nghệ thông tin / Phần mềm');
DECLARE @CatData INT = (SELECT CategoryID FROM JobCategories WHERE CategoryName = N'Trí tuệ nhân tạo / Dữ liệu (AI & Data)');
DECLARE @CatCloud INT = (SELECT CategoryID FROM JobCategories WHERE CategoryName = N'Điện toán đám mây / DevOps');
DECLARE @CatDesign INT = (SELECT CategoryID FROM JobCategories WHERE CategoryName = N'Thiết kế UI/UX & Sản phẩm');

IF NOT EXISTS (SELECT 1 FROM SkillTaxonomy WHERE SkillName = 'React.js')
BEGIN
    INSERT INTO SkillTaxonomy (SkillName, NormalizedName, CategoryID) VALUES
    ('React.js', 'react', @CatIT),
    ('Next.js', 'nextjs', @CatIT),
    ('Node.js', 'nodejs', @CatIT),
    ('TypeScript', 'typescript', @CatIT),
    ('Tailwind CSS', 'tailwindcss', @CatIT),
    ('Express.js', 'express', @CatIT),
    ('Python', 'python', @CatIT),
    ('C# / .NET Core', 'dotnet', @CatIT),
    ('Java / Spring Boot', 'springboot', @CatIT),
    ('SQL Server', 'sqlserver', @CatIT),
    ('PostgreSQL', 'postgresql', @CatIT),
    ('MongoDB', 'mongodb', @CatIT),
    ('Redis', 'redis', @CatIT),
    ('Docker', 'docker', @CatCloud),
    ('Kubernetes', 'k8s', @CatCloud),
    ('AWS Cloud', 'aws', @CatCloud),
    ('Azure Cloud', 'azure', @CatCloud),
    ('Machine Learning', 'machinelearning', @CatData),
    ('Generative AI / LLM', 'genai', @CatData),
    ('UI/UX (Figma)', 'figma', @CatDesign);
END
GO

-- 4. Nạp Courses (Khóa học gợi ý bù đắp Skill Gap - UC-C12)
IF NOT EXISTS (SELECT 1 FROM Courses WHERE Title LIKE N'%React - The Complete Guide%')
BEGIN
    INSERT INTO Courses (Title, Provider, Url, SkillID, Price, Currency, IsFree, CertificateName, Duration, Level, Rating, ThumbnailUrl)
    SELECT N'React - The Complete Guide 2024 (incl. Next.js, Redux)', 'Udemy', 'https://www.udemy.com/course/react-the-complete-guide/', SkillID, 299000, 'VND', 0, N'Certificate of Completion from Udemy', N'68.5 giờ', N'Trung cấp', 4.8, 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=500&q=80'
    FROM SkillTaxonomy WHERE NormalizedName = 'react';

    INSERT INTO Courses (Title, Provider, Url, SkillID, Price, Currency, IsFree, CertificateName, Duration, Level, Rating, ThumbnailUrl)
    SELECT N'Meta Front-End Developer Professional Certificate', 'Coursera', 'https://www.coursera.org/professional-certificates/meta-front-end-developer', SkillID, 950000, 'VND', 0, N'Meta Verified Career Certificate', N'7 tháng (6h/tuần)', N'Từ Cơ bản đến Nâng cao', 4.9, 'https://images.unsplash.com/photo-1593720213428-28a5b9e94613?w=500&q=80'
    FROM SkillTaxonomy WHERE NormalizedName = 'react';

    INSERT INTO Courses (Title, Provider, Url, SkillID, Price, Currency, IsFree, CertificateName, Duration, Level, Rating, ThumbnailUrl)
    SELECT N'Next.js 14 & React - The Complete Guide', 'Udemy', 'https://www.udemy.com/course/nextjs-react-the-complete-guide/', SkillID, 349000, 'VND', 0, N'Next.js Fullstack Specialist Certificate', N'32.5 giờ', N'Nâng cao', 4.9, 'https://images.unsplash.com/photo-1618401471353-b98aedd04e11?w=500&q=80'
    FROM SkillTaxonomy WHERE NormalizedName = 'nextjs';

    INSERT INTO Courses (Title, Provider, Url, SkillID, Price, Currency, IsFree, CertificateName, Duration, Level, Rating, ThumbnailUrl)
    SELECT N'NodeJS - The Complete Guide (MVC, REST APIs, GraphQL)', 'Udemy', 'https://www.udemy.com/course/nodejs-the-complete-guide/', SkillID, 279000, 'VND', 0, N'Node.js Certified Developer', N'40 giờ', N'Trung cấp', 4.8, 'https://images.unsplash.com/photo-1627398242454-45a1465c2479?w=500&q=80'
    FROM SkillTaxonomy WHERE NormalizedName = 'nodejs';

    INSERT INTO Courses (Title, Provider, Url, SkillID, Price, Currency, IsFree, CertificateName, Duration, Level, Rating, ThumbnailUrl)
    SELECT N'IBM Back-End Development Professional Certificate', 'Coursera', 'https://www.coursera.org/professional-certificates/ibm-backend-development', SkillID, 0, 'VND', 1, N'IBM Professional Certification', N'5 tháng', N'Chuyên sâu', 4.8, 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=500&q=80'
    FROM SkillTaxonomy WHERE NormalizedName = 'nodejs';

    INSERT INTO Courses (Title, Provider, Url, SkillID, Price, Currency, IsFree, CertificateName, Duration, Level, Rating, ThumbnailUrl)
    SELECT N'Understanding TypeScript - 2024 Edition', 'Udemy', 'https://www.udemy.com/course/understanding-typescript/', SkillID, 249000, 'VND', 0, N'TypeScript Mastery Certificate', N'15 giờ', N'Cơ bản đến Trung cấp', 4.8, 'https://images.unsplash.com/photo-1516116211227-bbc141e97669?w=500&q=80'
    FROM SkillTaxonomy WHERE NormalizedName = 'typescript';

    INSERT INTO Courses (Title, Provider, Url, SkillID, Price, Currency, IsFree, CertificateName, Duration, Level, Rating, ThumbnailUrl)
    SELECT N'Google IT Automation with Python Professional Certificate', 'Coursera', 'https://www.coursera.org/professional-certificates/google-it-automation', SkillID, 0, 'VND', 1, N'Google Official Certificate', N'6 tháng', N'Cơ bản đến Nâng cao', 4.9, 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=500&q=80'
    FROM SkillTaxonomy WHERE NormalizedName = 'python';

    INSERT INTO Courses (Title, Provider, Url, SkillID, Price, Currency, IsFree, CertificateName, Duration, Level, Rating, ThumbnailUrl)
    SELECT N'Microsoft SQL Server Development for Beginners & Advanced', 'Coursera', 'https://www.coursera.org/learn/sql-server', SkillID, 0, 'VND', 1, N'Microsoft Learn Verified Badge', N'28 giờ', N'Cơ bản', 4.7, 'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=500&q=80'
    FROM SkillTaxonomy WHERE NormalizedName = 'sqlserver';

    INSERT INTO Courses (Title, Provider, Url, SkillID, Price, Currency, IsFree, CertificateName, Duration, Level, Rating, ThumbnailUrl)
    SELECT N'Docker & Kubernetes: The Practical Guide', 'Udemy', 'https://www.udemy.com/course/docker-kubernetes-the-practical-guide/', SkillID, 329000, 'VND', 0, N'DevOps Containerization Certificate', N'23.5 giờ', N'Trung cấp', 4.9, 'https://images.unsplash.com/photo-1605745341112-85968b19335b?w=500&q=80'
    FROM SkillTaxonomy WHERE NormalizedName = 'docker';

    INSERT INTO Courses (Title, Provider, Url, SkillID, Price, Currency, IsFree, CertificateName, Duration, Level, Rating, ThumbnailUrl)
    SELECT N'AWS Certified Solutions Architect Associate 2024 (SAA-C03)', 'Udemy', 'https://www.udemy.com/course/aws-certified-solutions-architect-associate-saa-c03/', SkillID, 399000, 'VND', 0, N'AWS Solutions Architect Prep Certificate', N'27 giờ', N'Nâng cao', 4.9, 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=500&q=80'
    FROM SkillTaxonomy WHERE NormalizedName = 'aws';

    INSERT INTO Courses (Title, Provider, Url, SkillID, Price, Currency, IsFree, CertificateName, Duration, Level, Rating, ThumbnailUrl)
    SELECT N'Machine Learning Specialization by Andrew Ng & DeepLearning.AI', 'Coursera', 'https://www.coursera.org/specializations/machine-learning-introduction', SkillID, 1200000, 'VND', 0, N'DeepLearning.AI & Stanford Certificate', N'3 tháng', N'Chuyên gia', 5.0, 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=500&q=80'
    FROM SkillTaxonomy WHERE NormalizedName = 'machinelearning';

    INSERT INTO Courses (Title, Provider, Url, SkillID, Price, Currency, IsFree, CertificateName, Duration, Level, Rating, ThumbnailUrl)
    SELECT N'Generative AI for Everyone (Prompt Engineering & LLMs)', 'Coursera', 'https://www.coursera.org/learn/generative-ai-for-everyone', SkillID, 0, 'VND', 1, N'Generative AI Official Credential', N'6 giờ', N'Mọi cấp độ', 4.9, 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&q=80'
    FROM SkillTaxonomy WHERE NormalizedName = 'genai';

    INSERT INTO Courses (Title, Provider, Url, SkillID, Price, Currency, IsFree, CertificateName, Duration, Level, Rating, ThumbnailUrl)
    SELECT N'Google UX Design Professional Certificate', 'Coursera', 'https://www.coursera.org/professional-certificates/google-ux-design', SkillID, 0, 'VND', 1, N'Google UX Design Professional Certificate', N'6 tháng', N'Cơ bản đến Chuyên nghiệp', 4.9, 'https://images.unsplash.com/photo-1581291518655-9523c932edcf?w=500&q=80'
    FROM SkillTaxonomy WHERE NormalizedName = 'figma';
END
GO

-- 5. Nạp Subscription Packages (Gói dịch vụ Nhà tuyển dụng)
IF NOT EXISTS (SELECT 1 FROM SubscriptionPackages WHERE PackageName = N'Gói Khởi Nghiệp (Starter)')
BEGIN
    INSERT INTO SubscriptionPackages (PackageName, Price, DurationDays, PostLimit, SearchLimit) VALUES
    (N'Gói Khởi Nghiệp (Starter)', 0, 30, 3, 10),
    (N'Gói Tiêu Chuẩn (Pro Recruiter)', 100000, 30, 15, 100),
    (N'Gói Doanh Nghiệp (Enterprise AI)', 200000, 90, 50, 500);
END
GO

-- 6. Initial demo administrator (existing accounts are never overwritten).
IF NOT EXISTS (SELECT 1 FROM Users WHERE Email = 'admin@jobtimize.vn')
BEGIN
    INSERT INTO Users (Email, PasswordHash, FullName, Phone, Status, IsEmailVerified)
    VALUES ('admin@jobtimize.vn', '$2a$10$.LLrpoVU5Y.tlwHpvWBrSeLjXS7gT/KwSK5k61n7ZEcVC0j4Vkt3a', N'Hệ Thống Jobtimize Admin', '0901234567', 'Active', 1);

    DECLARE @AdminUserID INT = SCOPE_IDENTITY();
    DECLARE @AdminRoleID INT = (SELECT RoleID FROM Roles WHERE RoleName = 'Admin');

    INSERT INTO UserRoles (UserID, RoleID) VALUES (@AdminUserID, @AdminRoleID);
END
GO

-- 7. Nạp Doanh nghiệp & Việc làm mẫu tại Hà Nội, TP. Hồ Chí Minh, Đà Nẵng
DECLARE @EmpRoleID INT = (SELECT RoleID FROM Roles WHERE RoleName = 'Employer');
DECLARE @CatIT INT = (SELECT CategoryID FROM JobCategories WHERE CategoryName = N'Công nghệ thông tin / Phần mềm');
DECLARE @CatAI INT = (SELECT CategoryID FROM JobCategories WHERE CategoryName = N'Trí tuệ nhân tạo / Dữ liệu (AI & Data)');
DECLARE @CatCloud INT = (SELECT CategoryID FROM JobCategories WHERE CategoryName = N'Điện toán đám mây / DevOps');
DECLARE @CatDesign INT = (SELECT CategoryID FROM JobCategories WHERE CategoryName = N'Thiết kế UI/UX & Sản phẩm');
DECLARE @CatQA INT = (SELECT CategoryID FROM JobCategories WHERE CategoryName = N'Kiểm thử phần mềm (QA/QC)');

-- 7.1. FPT Software (Hà Nội)
IF NOT EXISTS (SELECT 1 FROM Users WHERE Email = 'hr@fpt-software.com')
BEGIN
    INSERT INTO Users (Email, PasswordHash, FullName, AvatarUrl, Status, IsEmailVerified)
    VALUES ('hr@fpt-software.com', '$2a$10$.LLrpoVU5Y.tlwHpvWBrSeLjXS7gT/KwSK5k61n7ZEcVC0j4Vkt3a', N'FPT Software Recruitment', '/logos/fpt-software.svg', 'Active', 1);
    DECLARE @FptUserID INT = SCOPE_IDENTITY();
    INSERT INTO UserRoles (UserID, RoleID) VALUES (@FptUserID, @EmpRoleID);

    INSERT INTO Employers (UserID, CompanyName, CompanyLogoUrl, Website, CompanySize, Address, Description, KYCStatus)
    VALUES (@FptUserID, N'FPT Software', '/logos/fpt-software.svg', 'https://fpt-software.com', N'10,000+ nhân viên', N'Tòa nhà FPT, Phố Duy Tân, Cầu Giấy, Hà Nội', N'Tập đoàn công nghệ và xuất khẩu phần mềm số 1 Việt Nam.', 'Approved');
    DECLARE @FptEmpID INT = SCOPE_IDENTITY();

    INSERT INTO JobPostings (EmployerID, CategoryID, Title, Description, Requirements, SalaryRange, Location, Status)
    VALUES (@FptEmpID, @CatIT, N'Senior Fullstack Developer (Node.js & React.js)', N'Phát triển ứng dụng Web quy mô lớn với Node.js, React.js và Microservices.', N'Từ 3+ năm kinh nghiệm Fullstack, thành thạo React, Node.js, PostgreSQL.', N'28 - 45 triệu VNĐ', N'Hà Nội', 'Published');

    INSERT INTO JobPostings (EmployerID, CategoryID, Title, Description, Requirements, SalaryRange, Location, Status)
    VALUES (@FptEmpID, @CatCloud, N'Chuyên viên Quản trị Hệ thống Cloud & DevOps (AWS / Docker)', N'Tự động hóa CI/CD, vận hành cụm Kubernetes và hạ tầng AWS Cloud.', N'Tối thiểu 2 năm kinh nghiệm DevOps, Docker, K8s, AWS EKS.', N'25 - 40 triệu VNĐ', N'Hà Nội', 'Published');
END
GO

-- 7.2. VNG Corporation (TP. Hồ Chí Minh)
IF NOT EXISTS (SELECT 1 FROM Users WHERE Email = 'career@vng.com.vn')
BEGIN
    DECLARE @EmpRoleID INT = (SELECT RoleID FROM Roles WHERE RoleName = 'Employer');
    DECLARE @CatIT INT = (SELECT CategoryID FROM JobCategories WHERE CategoryName = N'Công nghệ thông tin / Phần mềm');
    DECLARE @CatDesign INT = (SELECT CategoryID FROM JobCategories WHERE CategoryName = N'Thiết kế UI/UX & Sản phẩm');

    INSERT INTO Users (Email, PasswordHash, FullName, AvatarUrl, Status, IsEmailVerified)
    VALUES ('career@vng.com.vn', '$2a$10$.LLrpoVU5Y.tlwHpvWBrSeLjXS7gT/KwSK5k61n7ZEcVC0j4Vkt3a', N'VNG Corporation HR', '/logos/vng.svg', 'Active', 1);
    DECLARE @VngUserID INT = SCOPE_IDENTITY();
    INSERT INTO UserRoles (UserID, RoleID) VALUES (@VngUserID, @EmpRoleID);

    INSERT INTO Employers (UserID, CompanyName, CompanyLogoUrl, Website, CompanySize, Address, Description, KYCStatus)
    VALUES (@VngUserID, N'VNG Corporation', '/logos/vng.svg', 'https://vng.com.vn', N'3,000+ nhân viên', N'VNG Campus, Quận 7, TP. Hồ Chí Minh', N'Kỳ lân công nghệ phát triển Zalo, ZaloPay, Cloud Services.', 'Approved');
    DECLARE @VngEmpID INT = SCOPE_IDENTITY();

    INSERT INTO JobPostings (EmployerID, CategoryID, Title, Description, Requirements, SalaryRange, Location, Status)
    VALUES (@VngEmpID, @CatIT, N'Senior Frontend Engineer (ReactJS / Next.js / TypeScript)', N'Xây dựng giao diện web triệu người dùng với Next.js và Tailwind CSS.', N'Từ 3 năm kinh nghiệm React, TypeScript, tối ưu hiệu năng web.', N'30 - 52 triệu VNĐ', N'TP. Hồ Chí Minh', 'Published');

    INSERT INTO JobPostings (EmployerID, CategoryID, Title, Description, Requirements, SalaryRange, Location, Status)
    VALUES (@VngEmpID, @CatDesign, N'Product UI/UX Designer (Figma / Design System)', N'Thiết kế trải nghiệm người dùng và Design System cho các sản phẩm Fintech.', N'Thành thạo Figma, Auto-layout, tư duy sản phẩm xuất sắc.', N'22 - 38 triệu VNĐ', N'TP. Hồ Chí Minh', 'Published');
END
GO

-- 7.3. KMS Technology Đà Nẵng (Đà Nẵng)
IF NOT EXISTS (SELECT 1 FROM Users WHERE Email = 'career-dn@kms-technology.com')
BEGIN
    DECLARE @EmpRoleID INT = (SELECT RoleID FROM Roles WHERE RoleName = 'Employer');
    DECLARE @CatIT INT = (SELECT CategoryID FROM JobCategories WHERE CategoryName = N'Công nghệ thông tin / Phần mềm');
    DECLARE @CatQA INT = (SELECT CategoryID FROM JobCategories WHERE CategoryName = N'Kiểm thử phần mềm (QA/QC)');

    INSERT INTO Users (Email, PasswordHash, FullName, AvatarUrl, Status, IsEmailVerified)
    VALUES ('career-dn@kms-technology.com', '$2a$10$.LLrpoVU5Y.tlwHpvWBrSeLjXS7gT/KwSK5k61n7ZEcVC0j4Vkt3a', N'KMS Technology Da Nang', '/logos/kms.svg', 'Active', 1);
    DECLARE @KmsUserID INT = SCOPE_IDENTITY();
    INSERT INTO UserRoles (UserID, RoleID) VALUES (@KmsUserID, @EmpRoleID);

    INSERT INTO Employers (UserID, CompanyName, CompanyLogoUrl, Website, CompanySize, Address, Description, KYCStatus)
    VALUES (@KmsUserID, N'KMS Technology Đà Nẵng', '/logos/kms.svg', 'https://kms-technology.com', N'1,500+ nhân viên', N'74 Bạch Đằng, Hải Châu, Đà Nẵng', N'Công ty phát triển phần mềm chất lượng cao cho thị trường Bắc Mỹ.', 'Approved');
    DECLARE @KmsEmpID INT = SCOPE_IDENTITY();

    INSERT INTO JobPostings (EmployerID, CategoryID, Title, Description, Requirements, SalaryRange, Location, Status)
    VALUES (@KmsEmpID, @CatIT, N'Fullstack Software Engineer (.NET Core & React.js)', N'Phát triển ứng dụng cấp doanh nghiệp trên nền tảng .NET Core và Azure.', N'Thành thạo C# .NET, React.js, SQL Server, tiếng Anh giao tiếp tốt.', N'22 - 40 triệu VNĐ', N'Đà Nẵng', 'Published');

    INSERT INTO JobPostings (EmployerID, CategoryID, Title, Description, Requirements, SalaryRange, Location, Status)
    VALUES (@KmsEmpID, @CatQA, N'Chuyên viên Kiểm thử Tự động QA / QC Engineer', N'Kiểm thử tự động hóa API và Web App với Playwright / Cypress.', N'Tối thiểu 2 năm kinh nghiệm Automation QA, tiếng Anh tốt.', N'18 - 30 triệu VNĐ', N'Đà Nẵng', 'Published');
END
GO

-- 7.4. VinAI (Hà Nội) - Tuyển Python & AI
IF NOT EXISTS (SELECT 1 FROM Users WHERE Email = 'career@vinai.io')
BEGIN
    DECLARE @EmpRoleID INT = (SELECT RoleID FROM Roles WHERE RoleName = 'Employer');
    DECLARE @CatAI INT = (SELECT CategoryID FROM JobCategories WHERE CategoryName = N'Trí tuệ nhân tạo / Dữ liệu (AI & Data)');

    INSERT INTO Users (Email, PasswordHash, FullName, AvatarUrl, Status, IsEmailVerified)
    VALUES ('career@vinai.io', '$2a$10$.LLrpoVU5Y.tlwHpvWBrSeLjXS7gT/KwSK5k61n7ZEcVC0j4Vkt3a', N'VinAI Research Recruitment', '/logos/vinai.svg', 'Active', 1);
    DECLARE @VinAIUserID INT = SCOPE_IDENTITY();
    INSERT INTO UserRoles (UserID, RoleID) VALUES (@VinAIUserID, @EmpRoleID);

    INSERT INTO Employers (UserID, CompanyName, CompanyLogoUrl, Website, CompanySize, Address, Description, KYCStatus)
    VALUES (@VinAIUserID, N'VinAI (Vingroup)', '/logos/vinai.svg', 'https://vinai.io', N'500+ kỹ sư nghiên cứu', N'Tòa nhà Symphony, Long Biên, Hà Nội', N'Viện nghiên cứu Trí tuệ Nhân tạo VinAI hàng đầu Đông Nam Á.', 'Approved');
    DECLARE @VinAIEmpID INT = SCOPE_IDENTITY();

    INSERT INTO JobPostings (EmployerID, CategoryID, Title, Description, Requirements, SalaryRange, Location, Status)
    VALUES (@VinAIEmpID, @CatAI, N'Senior Python Engineer / AI Platform & MLOps', N'Phát triển hạ tầng huấn luyện và phục vụ mô hình AI với Python, FastAPI và Docker.', N'Từ 3+ năm kinh nghiệm Python, Asyncio, Multiprocessing, Docker/K8s.', N'35 - 65 triệu VNĐ', N'Hà Nội', 'Published');
END
GO

-- 7.5. One Mount Group (Hà Nội) - Tuyển DevOps
IF NOT EXISTS (SELECT 1 FROM Users WHERE Email = 'tuyendung@onemount.com')
BEGIN
    DECLARE @EmpRoleID INT = (SELECT RoleID FROM Roles WHERE RoleName = 'Employer');
    DECLARE @CatCloud INT = (SELECT CategoryID FROM JobCategories WHERE CategoryName = N'Điện toán đám mây / DevOps');

    INSERT INTO Users (Email, PasswordHash, FullName, AvatarUrl, Status, IsEmailVerified)
    VALUES ('tuyendung@onemount.com', '$2a$10$.LLrpoVU5Y.tlwHpvWBrSeLjXS7gT/KwSK5k61n7ZEcVC0j4Vkt3a', N'One Mount Talent Acquisition', '/logos/onemount.svg', 'Active', 1);
    DECLARE @OMUserID INT = SCOPE_IDENTITY();
    INSERT INTO UserRoles (UserID, RoleID) VALUES (@OMUserID, @EmpRoleID);

    INSERT INTO Employers (UserID, CompanyName, CompanyLogoUrl, Website, CompanySize, Address, Description, KYCStatus)
    VALUES (@OMUserID, N'One Mount Group', '/logos/onemount.svg', 'https://onemount.com', N'2,000+ nhân viên', N'Times City, Hai Bà Trưng, Hà Nội', N'Hệ sinh thái công nghệ gồm VinShop, VinID và OneHousing.', 'Approved');
    DECLARE @OMEmpID INT = SCOPE_IDENTITY();

    INSERT INTO JobPostings (EmployerID, CategoryID, Title, Description, Requirements, SalaryRange, Location, Status)
    VALUES (@OMEmpID, @CatCloud, N'DevOps & Cloud Infrastructure Engineer (CI/CD / K8s / AWS)', N'Thiết kế và tự động hóa hạ tầng Cloud quy mô lớn với Terraform, Kubernetes và AWS.', N'Có 3 năm kinh nghiệm DevOps, Docker, K8s, Helm Charts, Terraform.', N'30 - 55 triệu VNĐ', N'Hà Nội', 'Published');
END
GO

-- 7.6. Giao Hàng Tiết Kiệm (Hà Nội) - Tuyển Node.js
IF NOT EXISTS (SELECT 1 FROM Users WHERE Email = 'talent@ghtk.vn')
BEGIN
    DECLARE @EmpRoleID INT = (SELECT RoleID FROM Roles WHERE RoleName = 'Employer');
    DECLARE @CatIT INT = (SELECT CategoryID FROM JobCategories WHERE CategoryName = N'Công nghệ thông tin / Phần mềm');

    INSERT INTO Users (Email, PasswordHash, FullName, AvatarUrl, Status, IsEmailVerified)
    VALUES ('talent@ghtk.vn', '$2a$10$.LLrpoVU5Y.tlwHpvWBrSeLjXS7gT/KwSK5k61n7ZEcVC0j4Vkt3a', N'Giao Hàng Tiết Kiệm Tech', '/logos/ghtk.svg', 'Active', 1);
    DECLARE @GhtkUserID INT = SCOPE_IDENTITY();
    INSERT INTO UserRoles (UserID, RoleID) VALUES (@GhtkUserID, @EmpRoleID);

    INSERT INTO Employers (UserID, CompanyName, CompanyLogoUrl, Website, CompanySize, Address, Description, KYCStatus)
    VALUES (@GhtkUserID, N'Giao Hàng Tiết Kiệm (GHTK)', '/logos/ghtk.svg', 'https://giaohangtietkiem.vn', N'30,000+ nhân viên', N'Tòa nhà GHTK, Nam Từ Liêm, Hà Nội', N'Đơn vị công nghệ logistics phục vụ hàng triệu đơn hàng mỗi ngày.', 'Approved');
    DECLARE @GhtkEmpID INT = SCOPE_IDENTITY();

    INSERT INTO JobPostings (EmployerID, CategoryID, Title, Description, Requirements, SalaryRange, Location, Status)
    VALUES (@GhtkEmpID, @CatIT, N'Senior Node.js Backend Engineer (High Throughput Microservices)', N'Phát triển hệ thống microservices định tuyến đơn hàng với Node.js, Redis, Kafka.', N'3+ năm kinh nghiệm Node.js, tư duy chịu tải lớn (High Load), Redis.', N'28 - 50 triệu VNĐ', N'Hà Nội', 'Published');
END
GO

-- 7.7. Shopee (TP. Hồ Chí Minh) - Tuyển DevOps / SRE
IF NOT EXISTS (SELECT 1 FROM Users WHERE Email = 'recruitment@shopee.vn')
BEGIN
    DECLARE @EmpRoleID INT = (SELECT RoleID FROM Roles WHERE RoleName = 'Employer');
    DECLARE @CatCloud INT = (SELECT CategoryID FROM JobCategories WHERE CategoryName = N'Điện toán đám mây / DevOps');

    INSERT INTO Users (Email, PasswordHash, FullName, AvatarUrl, Status, IsEmailVerified)
    VALUES ('recruitment@shopee.vn', '$2a$10$.LLrpoVU5Y.tlwHpvWBrSeLjXS7gT/KwSK5k61n7ZEcVC0j4Vkt3a', N'Shopee Vietnam Recruitment', '/logos/shopee.svg', 'Active', 1);
    DECLARE @ShopeeUserID INT = SCOPE_IDENTITY();
    INSERT INTO UserRoles (UserID, RoleID) VALUES (@ShopeeUserID, @EmpRoleID);

    INSERT INTO Employers (UserID, CompanyName, CompanyLogoUrl, Website, CompanySize, Address, Description, KYCStatus)
    VALUES (@ShopeeUserID, N'Shopee (Sea Group)', '/logos/shopee.svg', 'https://careers.shopee.vn', N'5,000+ nhân viên', N'Saigon Centre Tower 2, Quận 1, TP. Hồ Chí Minh', N'Sàn thương mại điện tử số 1 khu vực Đông Nam Á.', 'Approved');
    DECLARE @ShopeeEmpID INT = SCOPE_IDENTITY();

    INSERT INTO JobPostings (EmployerID, CategoryID, Title, Description, Requirements, SalaryRange, Location, Status)
    VALUES (@ShopeeEmpID, @CatCloud, N'Senior Site Reliability Engineer (DevOps / SRE / Kubernetes)', N'Vận hành cụm Kubernetes hàng nghìn nodes, đảm bảo độ ổn định các dịp Mega Sale.', N'3-5 năm kinh nghiệm DevOps/SRE, Linux internals, K8s, Go/Python.', N'35 - 65 triệu VNĐ', N'TP. Hồ Chí Minh', 'Published');
END
GO

-- 7.8. Chợ Tốt (TP. Hồ Chí Minh) - Tuyển Node.js
IF NOT EXISTS (SELECT 1 FROM Users WHERE Email = 'talent@chotot.vn')
BEGIN
    DECLARE @EmpRoleID INT = (SELECT RoleID FROM Roles WHERE RoleName = 'Employer');
    DECLARE @CatIT INT = (SELECT CategoryID FROM JobCategories WHERE CategoryName = N'Công nghệ thông tin / Phần mềm');

    INSERT INTO Users (Email, PasswordHash, FullName, AvatarUrl, Status, IsEmailVerified)
    VALUES ('talent@chotot.vn', '$2a$10$.LLrpoVU5Y.tlwHpvWBrSeLjXS7gT/KwSK5k61n7ZEcVC0j4Vkt3a', N'Chợ Tốt Talent Team', '/logos/chotot.svg', 'Active', 1);
    DECLARE @CtUserID INT = SCOPE_IDENTITY();
    INSERT INTO UserRoles (UserID, RoleID) VALUES (@CtUserID, @EmpRoleID);

    INSERT INTO Employers (UserID, CompanyName, CompanyLogoUrl, Website, CompanySize, Address, Description, KYCStatus)
    VALUES (@CtUserID, N'Chợ Tốt (Carousell Group)', '/logos/chotot.svg', 'https://chotot.com', N'500+ nhân viên', N'Tòa nhà Mê Linh Point, Quận 1, TP. Hồ Chí Minh', N'Trang mua bán rao vặt trực tuyến số 1 tại Việt Nam.', 'Approved');
    DECLARE @CtEmpID INT = SCOPE_IDENTITY();

    INSERT INTO JobPostings (EmployerID, CategoryID, Title, Description, Requirements, SalaryRange, Location, Status)
    VALUES (@CtEmpID, @CatIT, N'Fullstack Developer (Node.js, TypeScript & React.js)', N'Phát triển ứng dụng Fullstack với Node.js, NestJS, TypeScript và React.js.', N'2-4 năm kinh nghiệm Node.js, React, Docker, PostgreSQL.', N'26 - 48 triệu VNĐ', N'TP. Hồ Chí Minh', 'Published');
END
GO

-- 7.9. BAP IT & Enclave (Đà Nẵng) - Tuyển Python & Node.js
IF NOT EXISTS (SELECT 1 FROM Users WHERE Email = 'career@bap.jp')
BEGIN
    DECLARE @EmpRoleID INT = (SELECT RoleID FROM Roles WHERE RoleName = 'Employer');
    DECLARE @CatIT INT = (SELECT CategoryID FROM JobCategories WHERE CategoryName = N'Công nghệ thông tin / Phần mềm');

    INSERT INTO Users (Email, PasswordHash, FullName, AvatarUrl, Status, IsEmailVerified)
    VALUES ('career@bap.jp', '$2a$10$.LLrpoVU5Y.tlwHpvWBrSeLjXS7gT/KwSK5k61n7ZEcVC0j4Vkt3a', N'BAP IT Co., Ltd Da Nang', '/logos/bap.svg', 'Active', 1);
    DECLARE @BapUserID INT = SCOPE_IDENTITY();
    INSERT INTO UserRoles (UserID, RoleID) VALUES (@BapUserID, @EmpRoleID);

    INSERT INTO Employers (UserID, CompanyName, CompanyLogoUrl, Website, CompanySize, Address, Description, KYCStatus)
    VALUES (@BapUserID, N'BAP IT Co., Ltd', '/logos/bap.svg', 'https://bap-software.net', N'600+ nhân viên', N'180 Nguyễn Tri Phương, Thanh Khê, Đà Nẵng', N'Công ty phát triển phần mềm và AI cho thị trường Nhật Bản.', 'Approved');
    DECLARE @BapEmpID INT = SCOPE_IDENTITY();

    INSERT INTO JobPostings (EmployerID, CategoryID, Title, Description, Requirements, SalaryRange, Location, Status)
    VALUES (@BapEmpID, @CatIT, N'Senior Python Developer (Django / FastAPI / AI Integration)', N'Xây dựng hệ thống Backend Python kết nối AI và Computer Vision cho thị trường Nhật Bản.', N'2+ năm kinh nghiệm Python, Django/FastAPI, PostgreSQL.', N'22 - 40 triệu VNĐ', N'Đà Nẵng', 'Published');
END
GO

IF NOT EXISTS (SELECT 1 FROM Users WHERE Email = 'hr@enclave.vn')
BEGIN
    DECLARE @EmpRoleID INT = (SELECT RoleID FROM Roles WHERE RoleName = 'Employer');
    DECLARE @CatIT INT = (SELECT CategoryID FROM JobCategories WHERE CategoryName = N'Công nghệ thông tin / Phần mềm');

    INSERT INTO Users (Email, PasswordHash, FullName, AvatarUrl, Status, IsEmailVerified)
    VALUES ('hr@enclave.vn', '$2a$10$.LLrpoVU5Y.tlwHpvWBrSeLjXS7gT/KwSK5k61n7ZEcVC0j4Vkt3a', N'Enclave Da Nang HR', '/logos/enclave.svg', 'Active', 1);
    DECLARE @EncUserID INT = SCOPE_IDENTITY();
    INSERT INTO UserRoles (UserID, RoleID) VALUES (@EncUserID, @EmpRoleID);

    INSERT INTO Employers (UserID, CompanyName, CompanyLogoUrl, Website, CompanySize, Address, Description, KYCStatus)
    VALUES (@EncUserID, N'Enclave Da Nang', '/logos/enclave.svg', 'https://enclave.vn', N'400+ nhân viên', N'Hoàng Diệu, Hải Châu, Đà Nẵng', N'Công ty phần mềm phục vụ đối tác Silicon Valley.', 'Approved');
    DECLARE @EncEmpID INT = SCOPE_IDENTITY();

    INSERT INTO JobPostings (EmployerID, CategoryID, Title, Description, Requirements, SalaryRange, Location, Status)
    VALUES (@EncEmpID, @CatIT, N'Backend Node.js / NestJS Engineer (Cloud-Native API)', N'Phát triển API Cloud-native với Node.js / NestJS, TypeScript trên hạ tầng AWS.', N'2+ năm kinh nghiệm Node.js, NestJS, TypeScript, tiếng Anh tốt.', N'20 - 38 triệu VNĐ', N'Đà Nẵng', 'Published');
END
GO

-- 7.10. Viettel Solutions (Hà Nội) - Doanh nghiệp đang chờ phê duyệt KYC (Pending)
IF NOT EXISTS (SELECT 1 FROM Users WHERE Email = 'recruitment@viettel.vn')
BEGIN
    DECLARE @EmpRoleID INT = (SELECT RoleID FROM Roles WHERE RoleName = 'Employer');
    DECLARE @CatAI INT = (SELECT CategoryID FROM JobCategories WHERE CategoryName = N'Trí tuệ nhân tạo / Dữ liệu (AI & Data)');

    INSERT INTO Users (Email, PasswordHash, FullName, Phone, AvatarUrl, Status, IsEmailVerified)
    VALUES ('recruitment@viettel.vn', '$2a$10$.LLrpoVU5Y.tlwHpvWBrSeLjXS7gT/KwSK5k61n7ZEcVC0j4Vkt3a', N'Viettel Solutions Talent Acquisition', '02462556789', '/logos/viettel.svg', 'Active', 1);
    DECLARE @ViettelUserID INT = SCOPE_IDENTITY();
    INSERT INTO UserRoles (UserID, RoleID) VALUES (@ViettelUserID, @EmpRoleID);

    INSERT INTO Employers (UserID, CompanyName, CompanyLogoUrl, Website, CompanySize, Address, Description, KYCStatus)
    VALUES (@ViettelUserID, N'Viettel Solutions', '/logos/viettel.svg', 'https://viettelsolutions.vn', N'5,000+ nhân viên', N'Số 1 Trần Hữu Dực, Nam Từ Liêm, Hà Nội', N'Tổng Công ty Giải pháp Doanh nghiệp Viettel - Tiên phong chuyển đổi số quốc gia.', 'Pending');
    DECLARE @ViettelEmpID INT = SCOPE_IDENTITY();

    INSERT INTO KYCDocuments (EmployerID, BusinessLicenseUrl, TaxCode, SubmittedAt)
    VALUES (@ViettelEmpID, '/kyc/giay-phep-kd-viettel.svg', '0108475629', DATEADD(HOUR, -3, GETDATE()));

    INSERT INTO JobPostings (EmployerID, CategoryID, Title, Description, Requirements, SalaryRange, Location, Status, ExpiresAt)
    VALUES (@ViettelEmpID, @CatAI, N'Kỹ sư Trí tuệ Nhân tạo / Machine Learning Engineer (Python)', N'Nghiên cứu, phát triển các mô hình AI/LLM và Computer Vision ứng dụng vào giải pháp chuyển đổi số thông minh cho chính phủ và doanh nghiệp.
- Xây dựng mô hình xử lý ngôn ngữ tự nhiên (NLP) và nhận dạng hình ảnh với Python.
- Tinh chỉnh các mô hình mã nguồn mở (LLMs) phục vụ chatbot và trợ lý ảo thông minh.
- Triển khai mô hình AI lên production với độ trễ thấp và độ chính xác cao.', N'- Tốt nghiệp đại học chuyên ngành CNTT, Khoa học Máy tính hoặc Toán Tin.
- Sử dụng thành thạo Python, PyTorch / TensorFlow.
- Hiểu sâu về các thuật toán Machine Learning, Deep Learning, Transformer.
- Có kinh nghiệm làm việc với RAG, LLM fine-tuning là ưu thế lớn.', N'35 - 60 triệu VNĐ', N'Hà Nội', 'PendingApproval', DATEADD(DAY, 45, GETDATE()));
    DECLARE @ViettelJobID INT = SCOPE_IDENTITY();

    INSERT INTO JobSkillRequirements (JobID, SkillID, IsMandatory)
    SELECT @ViettelJobID, SkillID, 1 FROM SkillTaxonomy WHERE SkillName IN ('Python', 'Machine Learning', 'Generative AI / LLM');
END
GO

-- 7.11. MoMo (M-Service) (TP. Hồ Chí Minh) - Doanh nghiệp đang chờ phê duyệt KYC (Pending)
IF NOT EXISTS (SELECT 1 FROM Users WHERE Email = 'recruitment@momo.vn')
BEGIN
    DECLARE @EmpRoleID INT = (SELECT RoleID FROM Roles WHERE RoleName = 'Employer');
    DECLARE @CatIT INT = (SELECT CategoryID FROM JobCategories WHERE CategoryName = N'Công nghệ thông tin / Phần mềm');

    INSERT INTO Users (Email, PasswordHash, FullName, Phone, AvatarUrl, Status, IsEmailVerified)
    VALUES ('recruitment@momo.vn', '$2a$10$.LLrpoVU5Y.tlwHpvWBrSeLjXS7gT/KwSK5k61n7ZEcVC0j4Vkt3a', N'MoMo Talent Acquisition', '02873065555', '/logos/momo.svg', 'Active', 1);
    DECLARE @MomoUserID INT = SCOPE_IDENTITY();
    INSERT INTO UserRoles (UserID, RoleID) VALUES (@MomoUserID, @EmpRoleID);

    INSERT INTO Employers (UserID, CompanyName, CompanyLogoUrl, Website, CompanySize, Address, Description, KYCStatus)
    VALUES (@MomoUserID, N'MoMo (M-Service)', '/logos/momo.svg', 'https://momo.vn', N'2,000+ nhân viên', N'Tòa nhà Phú Mỹ Hưng, Hoàng Văn Thái, Quận 7, TP. Hồ Chí Minh', N'Siêu ứng dụng thanh toán và tài chính số hàng đầu tại Việt Nam.', 'Pending');
    DECLARE @MomoEmpID INT = SCOPE_IDENTITY();

    INSERT INTO KYCDocuments (EmployerID, BusinessLicenseUrl, TaxCode, SubmittedAt)
    VALUES (@MomoEmpID, '/kyc/giay-phep-kd-momo.svg', '0305289147', DATEADD(HOUR, -1, GETDATE()));

    INSERT INTO JobPostings (EmployerID, CategoryID, Title, Description, Requirements, SalaryRange, Location, Status, ExpiresAt)
    VALUES (@MomoEmpID, @CatIT, N'Backend Developer (Node.js / Express / Redis / Microservices)', N'Xây dựng và tối ưu các dịch vụ Backend phục vụ hàng chục triệu giao dịch tài chính tốc độ cao.
- Thiết kế API chuẩn RESTful/gRPC cho ứng dụng di động.
- Xử lý bài toán chịu tải cao, caching nhiều tầng với Redis và RabbitMQ.
- Đảm bảo độ sẵn sàng 99.99% và an toàn bảo mật dữ liệu tài chính.', N'- Từ 2+ năm kinh nghiệm Backend với Node.js, Express/NestJS.
- Am hiểu sâu sắc về kiến trúc Microservices, Event-Driven Architecture.
- Thành thạo CSDL PostgreSQL/MySQL và Caching với Redis.
- Kỹ năng tư duy logic và giải quyết vấn đề tốt.', N'25 - 45 triệu VNĐ', N'TP. Hồ Chí Minh', 'PendingApproval', DATEADD(DAY, 45, GETDATE()));
    DECLARE @MomoJobID INT = SCOPE_IDENTITY();

    INSERT INTO JobSkillRequirements (JobID, SkillID, IsMandatory)
    SELECT @MomoJobID, SkillID, 1 FROM SkillTaxonomy WHERE SkillName IN ('Node.js', 'Express.js', 'Redis', 'PostgreSQL');
END
GO

-- 8. Nạp 2 Tài khoản Người tìm việc (Candidate) kèm bộ CV đang bật tìm việc (IsLookingForJob = 1)
IF NOT EXISTS (SELECT 1 FROM Users WHERE Email = 'nam.nguyen@jobtimize.vn')
BEGIN
    DECLARE @CandRoleID INT = (SELECT RoleID FROM Roles WHERE RoleName = 'Candidate');

    INSERT INTO Users (Email, PasswordHash, FullName, Phone, AvatarUrl, Status, IsEmailVerified)
    VALUES ('nam.nguyen@jobtimize.vn', '$2a$10$.LLrpoVU5Y.tlwHpvWBrSeLjXS7gT/KwSK5k61n7ZEcVC0j4Vkt3a', N'Nguyễn Hoàng Nam', '0912345601', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&q=80', 'Active', 1);
    DECLARE @NamUserID INT = SCOPE_IDENTITY();
    INSERT INTO UserRoles (UserID, RoleID) VALUES (@NamUserID, @CandRoleID);

    INSERT INTO CandidateProfiles (UserID, Headline, Bio, DesiredSalary, CurrentLocation, IsLookingForJob)
    VALUES (@NamUserID, N'Senior Fullstack Engineer (React.js, Node.js, TypeScript)', N'{"bioText":"5+ năm kinh nghiệm phát triển các hệ thống Web Fullstack phục vụ hàng triệu người dùng với React.js, Next.js, TypeScript và Node.js.","skills":{"hardSkills":["React.js","Node.js","TypeScript","Next.js","PostgreSQL","Docker"],"softSkills":["Làm việc nhóm","Quản lý thời gian","Giao tiếp kỹ thuật"]}}', 35000000, N'Hà Nội', 1);
    DECLARE @NamProfileID INT = SCOPE_IDENTITY();

    INSERT INTO CVs (ProfileID, Title, FileUrl, CvType, Template, IsPrimary, IsArchived)
    VALUES (@NamProfileID, N'CV Nguyễn Hoàng Nam - Senior Fullstack Engineer', '/api/cv-documents/talent/' + CAST(@NamProfileID AS NVARCHAR(20)) + '/file', 'OnlineBuilder', 'modern', 1, 0);
END
GO

IF NOT EXISTS (SELECT 1 FROM Users WHERE Email = 'quan.tran@jobtimize.vn')
BEGIN
    DECLARE @CandRoleID INT = (SELECT RoleID FROM Roles WHERE RoleName = 'Candidate');

    INSERT INTO Users (Email, PasswordHash, FullName, Phone, AvatarUrl, Status, IsEmailVerified)
    VALUES ('quan.tran@jobtimize.vn', '$2a$10$.LLrpoVU5Y.tlwHpvWBrSeLjXS7gT/KwSK5k61n7ZEcVC0j4Vkt3a', N'Trần Minh Quân', '0912345602', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&q=80', 'Active', 1);
    DECLARE @QuanUserID INT = SCOPE_IDENTITY();
    INSERT INTO UserRoles (UserID, RoleID) VALUES (@QuanUserID, @CandRoleID);

    INSERT INTO CandidateProfiles (UserID, Headline, Bio, DesiredSalary, CurrentLocation, IsLookingForJob)
    VALUES (@QuanUserID, N'AI & Machine Learning Engineer (Python, PyTorch, GenAI)', N'{"bioText":"4+ năm kinh nghiệm nghiên cứu và triển khai các mô hình LLM, RAG và Computer Vision vào sản phẩm thực tế với Python, PyTorch, FastAPI và Docker.","skills":{"hardSkills":["Python","Machine Learning","Generative AI / LLM","Docker","PostgreSQL","Redis"],"softSkills":["Tư duy phản biện","Giải quyết vấn đề","Nghiên cứu độc lập"]}}', 42000000, N'TP. Hồ Chí Minh', 1);
    DECLARE @QuanProfileID INT = SCOPE_IDENTITY();

    INSERT INTO CVs (ProfileID, Title, FileUrl, CvType, Template, IsPrimary, IsArchived)
    VALUES (@QuanProfileID, N'CV Trần Minh Quân - AI & Machine Learning Engineer', '/api/cv-documents/talent/' + CAST(@QuanProfileID AS NVARCHAR(20)) + '/file', 'OnlineBuilder', 'modern', 1, 0);
END
GO

PRINT 'JobtimizeDB Seed Data completed!';

GO

-- Additional demo records formerly inserted during API startup.
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
GO

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
        DECLARE @PkgPro INT = (SELECT TOP 1 PackageID FROM SubscriptionPackages WHERE PackageName = N'Gói Tiêu Chuẩn (Pro Recruiter)');
        DECLARE @PkgEnterprise INT = (SELECT TOP 1 PackageID FROM SubscriptionPackages WHERE PackageName = N'Gói Doanh Nghiệp (Enterprise AI)');

        IF @FptID IS NOT NULL AND @PkgEnterprise IS NOT NULL
          INSERT INTO EmployerSubscriptions (EmployerID, PackageID, StartDate, EndDate, RemainingPosts, RemainingSearches, AmountPaid, PaymentMethod, PaymentStatus, TransactionCode, CreatedAt)
          VALUES (@FptID, @PkgEnterprise, DATEADD(MONTH, -5, GETDATE()), DATEADD(MONTH, -2, GETDATE()), 35, 380, 4990000, 'BankTransfer', 'Completed', 'TXN-202605-FPT01', DATEADD(MONTH, -5, GETDATE()));

        IF @VngID IS NOT NULL AND @PkgEnterprise IS NOT NULL
          INSERT INTO EmployerSubscriptions (EmployerID, PackageID, StartDate, EndDate, RemainingPosts, RemainingSearches, AmountPaid, PaymentMethod, PaymentStatus, TransactionCode, CreatedAt)
          VALUES (@VngID, @PkgEnterprise, DATEADD(DAY, -1, GETDATE()), DATEADD(DAY, (SELECT DurationDays FROM SubscriptionPackages WHERE PackageID = @PkgEnterprise) - 1, GETDATE()), 42, 450, 4990000, 'VNPay', 'Completed', 'TXN-202606-VNG02', DATEADD(MONTH, -4, GETDATE()));

        IF @KmsID IS NOT NULL AND @PkgPro IS NOT NULL
          INSERT INTO EmployerSubscriptions (EmployerID, PackageID, StartDate, EndDate, RemainingPosts, RemainingSearches, AmountPaid, PaymentMethod, PaymentStatus, TransactionCode, CreatedAt)
          VALUES (@KmsID, @PkgPro, DATEADD(DAY, -1, GETDATE()), DATEADD(DAY, (SELECT DurationDays FROM SubscriptionPackages WHERE PackageID = @PkgPro) - 1, GETDATE()), 10, 80, 1990000, 'MoMo', 'Completed', 'TXN-202607-KMS03', DATEADD(MONTH, -3, GETDATE()));

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
GO

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
GO

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
GO
