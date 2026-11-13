const path = require('path');
const { pathToFileURL } = require('url');
const { executeQuery } = require('../src/config/db');
const normal = require('../src/services/cvNormalization');
const { buildDemoCV } = require('./data/buildDemoCV');
const bcrypt = require('bcryptjs');

async function seedCandidates() {
  console.log('🌱 Seeding 2 sample candidates for Jobtimize...');

  const { normalizeCV } = await import(pathToFileURL(path.resolve(__dirname, '../../shared/cv/model.mjs')).href);
  const taxonomy = (await executeQuery('SELECT SkillID, SkillName, NormalizedName FROM SkillTaxonomy')).recordset;
  const candRoleRes = await executeQuery("SELECT RoleID FROM Roles WHERE RoleName = 'Candidate'");
  const candRoleId = candRoleRes.recordset[0]?.RoleID;
  if (!candRoleId) {
    console.error('Candidate role not found!');
    return;
  }

  const passwordHash = await bcrypt.hash('Candidate@123', 10);

  const sampleCandidates = [
    {
      email: 'nam.nguyen@jobtimize.vn',
      name: 'Nguyễn Hoàng Nam',
      slug: 'nguyen-hoang-nam',
      phone: '0912345601',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&q=80',
      role: 'Senior Fullstack Engineer (React.js, Node.js, TypeScript)',
      years: 5,
      city: 'Hà Nội',
      salary: 35000000,
      degree: 'Kỹ sư Công nghệ thông tin',
      skills: ['React.js', 'Node.js', 'TypeScript', 'Next.js', 'PostgreSQL', 'Docker'],
      softSkills: ['Làm việc nhóm', 'Quản lý thời gian', 'Giao tiếp kỹ thuật'],
      work: 'Phát triển các hệ thống Web Fullstack phục vụ hàng triệu người dùng với React.js, Next.js, TypeScript và Node.js. Tối ưu hóa hiệu năng cơ sở dữ liệu PostgreSQL và kiến trúc Microservices trên Docker.',
      project: 'Enterprise E-Commerce Platform: Xây dựng nền tảng thương mại điện tử chịu tải cao với Next.js, Node.js, PostgreSQL và Redis.',
      cvTitle: 'CV Nguyễn Hoàng Nam - Senior Fullstack Engineer'
    },
    {
      email: 'quan.tran@jobtimize.vn',
      name: 'Trần Minh Quân',
      slug: 'tran-minh-quan',
      phone: '0912345602',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&q=80',
      role: 'AI & Machine Learning Engineer (Python, PyTorch, GenAI)',
      years: 4,
      city: 'TP. Hồ Chí Minh',
      salary: 42000000,
      degree: 'Kỹ sư Khoa học máy tính',
      skills: ['Python', 'Machine Learning', 'Generative AI / LLM', 'Docker', 'PostgreSQL', 'Redis'],
      softSkills: ['Tư duy phản biện', 'Giải quyết vấn đề', 'Nghiên cứu độc lập'],
      work: 'Nghiên cứu và triển khai các mô hình LLM, RAG và Computer Vision vào sản phẩm thực tế. Thành thạo Python, PyTorch, FastAPI và xây dựng pipeline MLOps với Docker.',
      project: 'Smart AI Assistant & RAG Engine: Hệ thống trợ lý ảo doanh nghiệp tích hợp LLM, tìm kiếm ngữ nghĩa và phân tích dữ liệu tự động.',
      cvTitle: 'CV Trần Minh Quân - AI & Machine Learning Engineer'
    }
  ];

  for (const [idx, c] of sampleCandidates.entries()) {
    const existing = await executeQuery('SELECT UserID FROM Users WHERE Email = @Email', { Email: c.email });
    let userId;
    if (existing.recordset.length === 0) {
      const uRes = await executeQuery(
        `INSERT INTO Users (Email, PasswordHash, FullName, Phone, AvatarUrl, IsEmailVerified, Status)
         OUTPUT INSERTED.UserID
         VALUES (@Email, @PasswordHash, @FullName, @Phone, @AvatarUrl, 1, 'Active')`,
        {
          Email: c.email,
          PasswordHash: passwordHash,
          FullName: c.name,
          Phone: c.phone,
          AvatarUrl: c.avatarUrl
        }
      );
      userId = uRes.recordset[0].UserID;
      await executeQuery(
        `IF NOT EXISTS (SELECT 1 FROM UserRoles WHERE UserID = @UserID AND RoleID = @RoleID)
         INSERT INTO UserRoles (UserID, RoleID) VALUES (@UserID, @RoleID)`,
        { UserID: userId, RoleID: candRoleId }
      );
    } else {
      userId = existing.recordset[0].UserID;
      await executeQuery(
        `UPDATE Users SET FullName = @FullName, Phone = @Phone, AvatarUrl = @AvatarUrl, Status = 'Active', IsEmailVerified = 1 WHERE UserID = @UserID`,
        { UserID: userId, FullName: c.name, Phone: c.phone, AvatarUrl: c.avatarUrl }
      );
    }

    const bioPayload = JSON.stringify({
      bioText: `${c.years}+ năm kinh nghiệm. ${c.work}`,
      skills: {
        hardSkills: c.skills,
        softSkills: c.softSkills
      },
      links: { linkedin: 'https://linkedin.com', github: 'https://github.com' }
    });

    const profRes = await executeQuery('SELECT ProfileID FROM CandidateProfiles WHERE UserID = @UserID', { UserID: userId });
    let profileId;
    if (profRes.recordset.length === 0) {
      const pRes = await executeQuery(
        `INSERT INTO CandidateProfiles (UserID, Headline, Bio, DesiredSalary, CurrentLocation, IsLookingForJob)
         OUTPUT INSERTED.ProfileID
         VALUES (@UserID, @Headline, @Bio, @DesiredSalary, @CurrentLocation, 1)`,
        {
          UserID: userId,
          Headline: c.role,
          Bio: bioPayload,
          DesiredSalary: c.salary,
          CurrentLocation: c.city
        }
      );
      profileId = pRes.recordset[0].ProfileID;
    } else {
      profileId = profRes.recordset[0].ProfileID;
      await executeQuery(
        `UPDATE CandidateProfiles
         SET Headline = @Headline, Bio = @Bio, DesiredSalary = @DesiredSalary,
             CurrentLocation = @CurrentLocation, IsLookingForJob = 1
         WHERE ProfileID = @ProfileID`,
        {
          ProfileID: profileId,
          Headline: c.role,
          Bio: bioPayload,
          DesiredSalary: c.salary,
          CurrentLocation: c.city
        }
      );
    }

    const cvData = buildDemoCV(c, idx, c.email, normalizeCV);
    cvData.personal.phone = c.phone;
    const builder = JSON.stringify(cvData);
    const analysis = JSON.stringify(normal.fromBuilder(cvData, taxonomy));
    const fileUrl = `/api/cv-documents/talent/${profileId}/file`;

    const cvCheck = await executeQuery('SELECT CVID FROM CVs WHERE ProfileID = @ProfileID AND IsArchived = 0', { ProfileID: profileId });
    let cvId;
    if (cvCheck.recordset.length === 0) {
      const insertCv = await executeQuery(
        `INSERT INTO CVs (ProfileID, Title, FileUrl, CvType, CvData, Template, IsPrimary, IsArchived, CreatedAt)
         OUTPUT INSERTED.CVID
         VALUES (@ProfileID, @Title, @FileUrl, 'OnlineBuilder', @Builder, 'modern', 1, 0, GETDATE())`,
        {
          ProfileID: profileId,
          Title: c.cvTitle,
          FileUrl: fileUrl,
          Builder: builder
        }
      );
      cvId = insertCv.recordset[0].CVID;
    } else {
      cvId = cvCheck.recordset[0].CVID;
      await executeQuery(
        `UPDATE CVs SET Title = @Title, FileUrl = @FileUrl, CvType = 'OnlineBuilder', CvData = @Builder, Template = 'modern', IsPrimary = 1, IsArchived = 0 WHERE CVID = @CVID`,
        { CVID: cvId, Title: c.cvTitle, FileUrl: fileUrl, Builder: builder }
      );
    }

    const verCheck = await executeQuery('SELECT VersionID FROM CVDocumentVersions WHERE CVID = @CVID', { CVID: cvId });
    if (verCheck.recordset.length === 0) {
      await executeQuery(
        `INSERT INTO CVDocumentVersions (CVID, ProfileID, VersionNumber, ContentHash, SourceType, BuilderJson, Template, Status, ParsedJson, ConfirmedJson, ParseMethod, ConfirmedAt)
         VALUES (@CVID, @ProfileID, 1, @Hash, 'OnlineBuilder', @Builder, 'modern', 'Ready', @Analysis, @Analysis, 'structured', SYSUTCDATETIME())`,
        {
          CVID: cvId,
          ProfileID: profileId,
          Hash: normal.hash(builder + '\nmodern'),
          Builder: builder,
          Analysis: analysis
        }
      );
    }
  }

  console.log(`✅ Seeded ${sampleCandidates.length} candidate accounts and active CVs successfully!`);
  process.exit(0);
}

seedCandidates().catch(err => {
  console.error('Seed candidates error:', err);
  process.exit(1);
});
