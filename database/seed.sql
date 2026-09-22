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

PRINT 'JobtimizeDB Seed Data completed!';
