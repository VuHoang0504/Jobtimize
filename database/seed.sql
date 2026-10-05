-- ========================================================
-- DỮ LIỆU BAN ĐẦU (SEED DATA) CHO JOBTIMIZEDB
-- ========================================================

USE JobtimizeDB;
GO

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

-- 4. Nạp Courses (Khóa học gợi ý bù đắp Skill Gap)
IF NOT EXISTS (SELECT 1 FROM Courses WHERE Title = N'React - The Complete Guide (incl. Next.js, Redux)')
BEGIN
    INSERT INTO Courses (Title, Provider, Url, SkillID)
    SELECT N'React - The Complete Guide (incl. Next.js, Redux)', 'Udemy', 'https://www.udemy.com/course/react-the-complete-guide/', SkillID 
    FROM SkillTaxonomy WHERE NormalizedName = 'react';

    INSERT INTO Courses (Title, Provider, Url, SkillID)
    SELECT N'Next.js 14 & React Full-Stack Guide', 'Udemy', 'https://www.udemy.com/course/nextjs-react-the-complete-guide/', SkillID 
    FROM SkillTaxonomy WHERE NormalizedName = 'nextjs';

    INSERT INTO Courses (Title, Provider, Url, SkillID)
    SELECT N'Understanding TypeScript - 2024 Edition', 'Udemy', 'https://www.udemy.com/course/understanding-typescript/', SkillID 
    FROM SkillTaxonomy WHERE NormalizedName = 'typescript';

    INSERT INTO Courses (Title, Provider, Url, SkillID)
    SELECT N'NodeJS - The Complete Guide (REST APIs, GraphQL)', 'Udemy', 'https://www.udemy.com/course/nodejs-the-complete-guide/', SkillID 
    FROM SkillTaxonomy WHERE NormalizedName = 'nodejs';

    INSERT INTO Courses (Title, Provider, Url, SkillID)
    SELECT N'Docker & Kubernetes: The Practical Guide', 'Udemy', 'https://www.udemy.com/course/docker-kubernetes-the-practical-guide/', SkillID 
    FROM SkillTaxonomy WHERE NormalizedName = 'docker';

    INSERT INTO Courses (Title, Provider, Url, SkillID)
    SELECT N'Microsoft SQL Server Development for Everyone', 'Coursera', 'https://www.coursera.org/learn/sql-server', SkillID 
    FROM SkillTaxonomy WHERE NormalizedName = 'sqlserver';

    INSERT INTO Courses (Title, Provider, Url, SkillID)
    SELECT N'AWS Certified Solutions Architect Associate', 'Udemy', 'https://www.udemy.com/course/aws-certified-solutions-architect-associate-saa-c03/', SkillID 
    FROM SkillTaxonomy WHERE NormalizedName = 'aws';

    INSERT INTO Courses (Title, Provider, Url, SkillID)
    SELECT N'Machine Learning Specialization by Andrew Ng', 'Coursera', 'https://www.coursera.org/specializations/machine-learning-introduction', SkillID 
    FROM SkillTaxonomy WHERE NormalizedName = 'machinelearning';
END
GO

-- 5. Nạp Subscription Packages (Gói dịch vụ Nhà tuyển dụng)
IF NOT EXISTS (SELECT 1 FROM SubscriptionPackages WHERE PackageName = N'Gói Khởi Nghiệp (Starter)')
BEGIN
    INSERT INTO SubscriptionPackages (PackageName, Price, DurationDays, PostLimit, SearchLimit) VALUES
    (N'Gói Khởi Nghiệp (Starter)', 0, 30, 3, 10),
    (N'Gói Tiêu Chuẩn (Pro Recruiter)', 1990000, 30, 15, 100),
    (N'Gói Doanh Nghiệp (Enterprise AI)', 4990000, 90, 50, 500);
END
GO

-- 6. Nạp Tài khoản Admin mặc định (Password: Admin@123 -> $2a$10$RX1j2ErxvRPEDgtfQEJmmOc38iGGT8ktN.gTbekg6IkIngDVtlts.)
IF NOT EXISTS (SELECT 1 FROM Users WHERE Email = 'admin@jobtimize.vn')
BEGIN
    INSERT INTO Users (Email, PasswordHash, FullName, Phone, Status, IsEmailVerified)
    VALUES ('admin@jobtimize.vn', '$2a$10$RX1j2ErxvRPEDgtfQEJmmOc38iGGT8ktN.gTbekg6IkIngDVtlts.', N'Hệ Thống Jobtimize Admin', '0901234567', 'Active', 1);

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
    INSERT INTO Users (Email, PasswordHash, FullName, Status, IsEmailVerified)
    VALUES ('hr@fpt-software.com', '$2a$10$RX1j2ErxvRPEDgtfQEJmmOc38iGGT8ktN.gTbekg6IkIngDVtlts.', N'FPT Software Recruitment', 'Active', 1);
    DECLARE @FptUserID INT = SCOPE_IDENTITY();
    INSERT INTO UserRoles (UserID, RoleID) VALUES (@FptUserID, @EmpRoleID);

    INSERT INTO Employers (UserID, CompanyName, CompanyLogoUrl, Website, CompanySize, Address, Description, KYCStatus)
    VALUES (@FptUserID, N'FPT Software', 'https://images.unsplash.com/photo-1549923746-c502d488b3ea?w=120&q=80', 'https://fpt-software.com', N'10,000+ nhân viên', N'Tòa nhà FPT, Phố Duy Tân, Cầu Giấy, Hà Nội', N'Tập đoàn công nghệ và xuất khẩu phần mềm số 1 Việt Nam.', 'Approved');
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

    INSERT INTO Users (Email, PasswordHash, FullName, Status, IsEmailVerified)
    VALUES ('career@vng.com.vn', '$2a$10$RX1j2ErxvRPEDgtfQEJmmOc38iGGT8ktN.gTbekg6IkIngDVtlts.', N'VNG Corporation HR', 'Active', 1);
    DECLARE @VngUserID INT = SCOPE_IDENTITY();
    INSERT INTO UserRoles (UserID, RoleID) VALUES (@VngUserID, @EmpRoleID);

    INSERT INTO Employers (UserID, CompanyName, CompanyLogoUrl, Website, CompanySize, Address, Description, KYCStatus)
    VALUES (@VngUserID, N'VNG Corporation', 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=120&q=80', 'https://vng.com.vn', N'3,000+ nhân viên', N'VNG Campus, Quận 7, TP. Hồ Chí Minh', N'Kỳ lân công nghệ phát triển Zalo, ZaloPay, Cloud Services.', 'Approved');
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

    INSERT INTO Users (Email, PasswordHash, FullName, Status, IsEmailVerified)
    VALUES ('career-dn@kms-technology.com', '$2a$10$RX1j2ErxvRPEDgtfQEJmmOc38iGGT8ktN.gTbekg6IkIngDVtlts.', N'KMS Technology Da Nang', 'Active', 1);
    DECLARE @KmsUserID INT = SCOPE_IDENTITY();
    INSERT INTO UserRoles (UserID, RoleID) VALUES (@KmsUserID, @EmpRoleID);

    INSERT INTO Employers (UserID, CompanyName, CompanyLogoUrl, Website, CompanySize, Address, Description, KYCStatus)
    VALUES (@KmsUserID, N'KMS Technology Đà Nẵng', 'https://images.unsplash.com/photo-1572021335469-31706a17aaef?w=120&q=80', 'https://kms-technology.com', N'1,500+ nhân viên', N'74 Bạch Đằng, Hải Châu, Đà Nẵng', N'Công ty phát triển phần mềm chất lượng cao cho thị trường Bắc Mỹ.', 'Approved');
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

    INSERT INTO Users (Email, PasswordHash, FullName, Status, IsEmailVerified)
    VALUES ('career@vinai.io', '$2a$10$RX1j2ErxvRPEDgtfQEJmmOc38iGGT8ktN.gTbekg6IkIngDVtlts.', N'VinAI Research Recruitment', 'Active', 1);
    DECLARE @VinAIUserID INT = SCOPE_IDENTITY();
    INSERT INTO UserRoles (UserID, RoleID) VALUES (@VinAIUserID, @EmpRoleID);

    INSERT INTO Employers (UserID, CompanyName, CompanyLogoUrl, Website, CompanySize, Address, Description, KYCStatus)
    VALUES (@VinAIUserID, N'VinAI (Vingroup)', 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=120&q=80', 'https://vinai.io', N'500+ kỹ sư nghiên cứu', N'Tòa nhà Symphony, Long Biên, Hà Nội', N'Viện nghiên cứu Trí tuệ Nhân tạo VinAI hàng đầu Đông Nam Á.', 'Approved');
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

    INSERT INTO Users (Email, PasswordHash, FullName, Status, IsEmailVerified)
    VALUES ('tuyendung@onemount.com', '$2a$10$RX1j2ErxvRPEDgtfQEJmmOc38iGGT8ktN.gTbekg6IkIngDVtlts.', N'One Mount Talent Acquisition', 'Active', 1);
    DECLARE @OMUserID INT = SCOPE_IDENTITY();
    INSERT INTO UserRoles (UserID, RoleID) VALUES (@OMUserID, @EmpRoleID);

    INSERT INTO Employers (UserID, CompanyName, CompanyLogoUrl, Website, CompanySize, Address, Description, KYCStatus)
    VALUES (@OMUserID, N'One Mount Group', 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=120&q=80', 'https://onemount.com', N'2,000+ nhân viên', N'Times City, Hai Bà Trưng, Hà Nội', N'Hệ sinh thái công nghệ gồm VinShop, VinID và OneHousing.', 'Approved');
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

    INSERT INTO Users (Email, PasswordHash, FullName, Status, IsEmailVerified)
    VALUES ('talent@ghtk.vn', '$2a$10$RX1j2ErxvRPEDgtfQEJmmOc38iGGT8ktN.gTbekg6IkIngDVtlts.', N'Giao Hàng Tiết Kiệm Tech', 'Active', 1);
    DECLARE @GhtkUserID INT = SCOPE_IDENTITY();
    INSERT INTO UserRoles (UserID, RoleID) VALUES (@GhtkUserID, @EmpRoleID);

    INSERT INTO Employers (UserID, CompanyName, CompanyLogoUrl, Website, CompanySize, Address, Description, KYCStatus)
    VALUES (@GhtkUserID, N'Giao Hàng Tiết Kiệm (GHTK)', 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=120&q=80', 'https://giaohangtietkiem.vn', N'30,000+ nhân viên', N'Tòa nhà GHTK, Nam Từ Liêm, Hà Nội', N'Đơn vị công nghệ logistics phục vụ hàng triệu đơn hàng mỗi ngày.', 'Approved');
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

    INSERT INTO Users (Email, PasswordHash, FullName, Status, IsEmailVerified)
    VALUES ('recruitment@shopee.vn', '$2a$10$RX1j2ErxvRPEDgtfQEJmmOc38iGGT8ktN.gTbekg6IkIngDVtlts.', N'Shopee Vietnam Recruitment', 'Active', 1);
    DECLARE @ShopeeUserID INT = SCOPE_IDENTITY();
    INSERT INTO UserRoles (UserID, RoleID) VALUES (@ShopeeUserID, @EmpRoleID);

    INSERT INTO Employers (UserID, CompanyName, CompanyLogoUrl, Website, CompanySize, Address, Description, KYCStatus)
    VALUES (@ShopeeUserID, N'Shopee (Sea Group)', 'https://images.unsplash.com/photo-1556742049-0a67e5572293?w=120&q=80', 'https://careers.shopee.vn', N'5,000+ nhân viên', N'Saigon Centre Tower 2, Quận 1, TP. Hồ Chí Minh', N'Sàn thương mại điện tử số 1 khu vực Đông Nam Á.', 'Approved');
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

    INSERT INTO Users (Email, PasswordHash, FullName, Status, IsEmailVerified)
    VALUES ('talent@chotot.vn', '$2a$10$RX1j2ErxvRPEDgtfQEJmmOc38iGGT8ktN.gTbekg6IkIngDVtlts.', N'Chợ Tốt Talent Team', 'Active', 1);
    DECLARE @CtUserID INT = SCOPE_IDENTITY();
    INSERT INTO UserRoles (UserID, RoleID) VALUES (@CtUserID, @EmpRoleID);

    INSERT INTO Employers (UserID, CompanyName, CompanyLogoUrl, Website, CompanySize, Address, Description, KYCStatus)
    VALUES (@CtUserID, N'Chợ Tốt (Carousell Group)', 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=120&q=80', 'https://chotot.com', N'500+ nhân viên', N'Tòa nhà Mê Linh Point, Quận 1, TP. Hồ Chí Minh', N'Trang mua bán rao vặt trực tuyến số 1 tại Việt Nam.', 'Approved');
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

    INSERT INTO Users (Email, PasswordHash, FullName, Status, IsEmailVerified)
    VALUES ('career@bap.jp', '$2a$10$RX1j2ErxvRPEDgtfQEJmmOc38iGGT8ktN.gTbekg6IkIngDVtlts.', N'BAP IT Co., Ltd Da Nang', 'Active', 1);
    DECLARE @BapUserID INT = SCOPE_IDENTITY();
    INSERT INTO UserRoles (UserID, RoleID) VALUES (@BapUserID, @EmpRoleID);

    INSERT INTO Employers (UserID, CompanyName, CompanyLogoUrl, Website, CompanySize, Address, Description, KYCStatus)
    VALUES (@BapUserID, N'BAP IT Co., Ltd', 'https://images.unsplash.com/photo-1570126128802-99f57d6067b5?w=120&q=80', 'https://bap-software.net', N'600+ nhân viên', N'180 Nguyễn Tri Phương, Thanh Khê, Đà Nẵng', N'Công ty phát triển phần mềm và AI cho thị trường Nhật Bản.', 'Approved');
    DECLARE @BapEmpID INT = SCOPE_IDENTITY();

    INSERT INTO JobPostings (EmployerID, CategoryID, Title, Description, Requirements, SalaryRange, Location, Status)
    VALUES (@BapEmpID, @CatIT, N'Senior Python Developer (Django / FastAPI / AI Integration)', N'Xây dựng hệ thống Backend Python kết nối AI và Computer Vision cho thị trường Nhật Bản.', N'2+ năm kinh nghiệm Python, Django/FastAPI, PostgreSQL.', N'22 - 40 triệu VNĐ', N'Đà Nẵng', 'Published');
END
GO

IF NOT EXISTS (SELECT 1 FROM Users WHERE Email = 'hr@enclave.vn')
BEGIN
    DECLARE @EmpRoleID INT = (SELECT RoleID FROM Roles WHERE RoleName = 'Employer');
    DECLARE @CatIT INT = (SELECT CategoryID FROM JobCategories WHERE CategoryName = N'Công nghệ thông tin / Phần mềm');

    INSERT INTO Users (Email, PasswordHash, FullName, Status, IsEmailVerified)
    VALUES ('hr@enclave.vn', '$2a$10$RX1j2ErxvRPEDgtfQEJmmOc38iGGT8ktN.gTbekg6IkIngDVtlts.', N'Enclave Da Nang HR', 'Active', 1);
    DECLARE @EncUserID INT = SCOPE_IDENTITY();
    INSERT INTO UserRoles (UserID, RoleID) VALUES (@EncUserID, @EmpRoleID);

    INSERT INTO Employers (UserID, CompanyName, CompanyLogoUrl, Website, CompanySize, Address, Description, KYCStatus)
    VALUES (@EncUserID, N'Enclave Da Nang', 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=120&q=80', 'https://enclave.vn', N'400+ nhân viên', N'Hoàng Diệu, Hải Châu, Đà Nẵng', N'Công ty phần mềm phục vụ đối tác Silicon Valley.', 'Approved');
    DECLARE @EncEmpID INT = SCOPE_IDENTITY();

    INSERT INTO JobPostings (EmployerID, CategoryID, Title, Description, Requirements, SalaryRange, Location, Status)
    VALUES (@EncEmpID, @CatIT, N'Backend Node.js / NestJS Engineer (Cloud-Native API)', N'Phát triển API Cloud-native với Node.js / NestJS, TypeScript trên hạ tầng AWS.', N'2+ năm kinh nghiệm Node.js, NestJS, TypeScript, tiếng Anh tốt.', N'20 - 38 triệu VNĐ', N'Đà Nẵng', 'Published');
END
GO

PRINT 'JobtimizeDB Seed Data completed!';


