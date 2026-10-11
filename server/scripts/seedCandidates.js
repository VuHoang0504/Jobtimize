const { executeQuery } = require('../src/config/db');
const bcrypt = require('bcryptjs');

async function seedCandidates() {
  console.log('🌱 Seeding sample candidates for Jobtimize...');

  const candRoleRes = await executeQuery("SELECT RoleID FROM Roles WHERE RoleName = 'Candidate'");
  const candRoleId = candRoleRes.recordset[0]?.RoleID;
  if (!candRoleId) {
    console.error('Candidate role not found!');
    return;
  }

  const passwordHash = await bcrypt.hash('Candidate@123', 10);

  const sampleCandidates = [
    {
      email: 'nam.nguyen@talent.vn',
      fullName: 'Nguyễn Hoàng Nam',
      phone: '0912345601',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&q=80',
      headline: 'Senior Fullstack Engineer (React, Node.js, TypeScript)',
      location: 'Hà Nội',
      desiredSalary: 35000000,
      skills: {
        hardSkills: ['React.js', 'Node.js', 'TypeScript', 'Next.js', 'PostgreSQL', 'Docker'],
        softSkills: ['Làm việc nhóm', 'Quản lý thời gian', 'Giao tiếp kỹ thuật'],
        languages: ['Tiếng Việt (Bản ngữ)', 'Tiếng Anh (IELTS 7.0)']
      },
      bioText: '5+ năm kinh nghiệm phát triển các hệ thống Web Fullstack phục vụ triệu người dùng. Chuyên sâu về React.js, Node.js, tối ưu hóa hiệu năng cơ sở dữ liệu và Microservices architecture.',
      cvTitle: 'CV_NguyenHoangNam_Senior_Fullstack.pdf'
    },
    {
      email: 'quan.tran@talent.vn',
      fullName: 'Trần Minh Quân',
      phone: '0912345602',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&q=80',
      headline: 'AI & Machine Learning Engineer (Python, PyTorch, GenAI)',
      location: 'Hà Nội',
      desiredSalary: 42000000,
      skills: {
        hardSkills: ['Python', 'Machine Learning', 'Generative AI / LLM', 'Docker', 'FastAPI'],
        softSkills: ['Tư duy phản biện', 'Giải quyết vấn đề', 'Nghiên cứu độc lập'],
        languages: ['Tiếng Việt', 'Tiếng Anh (TOEIC 850)']
      },
      bioText: 'Kỹ sư AI với kinh nghiệm triển khai LLM, RAG và hệ thống Computer Vision. Thành thạo Python, PyTorch, LangChain, xây dựng pipeline MLOps với Docker.',
      cvTitle: 'CV_TranMinhQuan_AI_Engineer.pdf'
    },
    {
      email: 'thao.trang@talent.vn',
      fullName: 'Lê Thị Thảo Trang',
      phone: '0912345603',
      avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&q=80',
      headline: 'Senior Frontend Developer (React, Next.js, Tailwind CSS)',
      location: 'TP. Hồ Chí Minh',
      desiredSalary: 32000000,
      skills: {
        hardSkills: ['React.js', 'Next.js', 'Tailwind CSS', 'TypeScript', 'Redux Toolkit'],
        softSkills: ['Tỉ mỉ', 'Đúng giờ', 'Sáng tạo UI/UX'],
        languages: ['Tiếng Việt', 'Tiếng Anh (Giao tiếp tốt)']
      },
      bioText: 'Frontend Engineer đam mê giao diện đẹp, mượt mà và chuẩn SEO. Có kinh nghiệm xây dựng các cổng thương mại điện tử lớn với Next.js và Tailwind CSS.',
      cvTitle: 'CV_LeThiThaoTrang_Frontend_Lead.pdf'
    },
    {
      email: 'huy.dang@talent.vn',
      fullName: 'Đặng Quốc Huy',
      phone: '0912345604',
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&q=80',
      headline: 'Cloud DevOps Engineer (AWS, Kubernetes, Docker, CI/CD)',
      location: 'TP. Hồ Chí Minh',
      desiredSalary: 38000000,
      skills: {
        hardSkills: ['AWS Cloud', 'Docker', 'Kubernetes', 'CI/CD', 'Terraform', 'Azure Cloud'],
        softSkills: ['Quản lý sự cố', 'Tự động hóa', 'Làm việc áp lực cao'],
        languages: ['Tiếng Việt', 'Tiếng Anh (Thành thạo)']
      },
      bioText: 'Chuyên gia vận hành hạ tầng đám mây AWS & Kubernetes. Có chứng chỉ AWS Certified Solutions Architect. Thiết lập CI/CD tự động giúp rút ngắn thời gian release 60%.',
      cvTitle: 'CV_DangQuocHuy_DevOps_Engineer.pdf'
    },
    {
      email: 'phuong.vu@talent.vn',
      fullName: 'Vũ Mai Phương',
      phone: '0912345605',
      avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&q=80',
      headline: 'Product UI/UX Designer (Figma, Design System)',
      location: 'Đà Nẵng',
      desiredSalary: 24000000,
      skills: {
        hardSkills: ['UI/UX (Figma)', 'Design System', 'User Research', 'Prototyping'],
        softSkills: ['Thấu cảm người dùng', 'Thuyết trình', 'Giao tiếp liên phòng ban'],
        languages: ['Tiếng Việt', 'Tiếng Anh']
      },
      bioText: 'Product Designer với 3+ năm thiết kế trải nghiệm người dùng các sản phẩm Fintech & EdTech. Xây dựng Design System quy chuẩn phục vụ cả đội ngũ Dev & Product.',
      cvTitle: 'Portfolio_VuMaiPhuong_UIUX.pdf'
    },
    {
      email: 'anh.pham@talent.vn',
      fullName: 'Phạm Đức Anh',
      phone: '0912345606',
      avatarUrl: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150&q=80',
      headline: 'Fullstack .NET & React Engineer (.NET Core, C#, SQL Server)',
      location: 'Đà Nẵng',
      desiredSalary: 28000000,
      skills: {
        hardSkills: ['C# / .NET Core', 'React.js', 'SQL Server', 'Redis', 'Docker'],
        softSkills: ['Kỷ luật', 'Tư duy logic', 'Cầu tiến'],
        languages: ['Tiếng Việt', 'Tiếng Anh (B2)']
      },
      bioText: 'Kỹ sư phần mềm vững chắc nền tảng C# .NET Core và React.js. Có kinh nghiệm tối ưu hóa truy vấn SQL Server cho database hàng chục triệu bản ghi.',
      cvTitle: 'CV_PhamDucAnh_DotNet_React.pdf'
    }
  ];

  for (const c of sampleCandidates) {
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
          FullName: c.fullName,
          Phone: c.phone,
          AvatarUrl: c.avatarUrl
        }
      );
      userId = uRes.recordset[0].UserID;
      await executeQuery('INSERT INTO UserRoles (UserID, RoleID) VALUES (@UserID, @RoleID)', {
        UserID: userId,
        RoleID: candRoleId
      });
    } else {
      userId = existing.recordset[0].UserID;
    }

    const bioPayload = JSON.stringify({
      bioText: c.bioText,
      skills: c.skills,
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
          Headline: c.headline,
          Bio: bioPayload,
          DesiredSalary: c.desiredSalary,
          CurrentLocation: c.location
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
          Headline: c.headline,
          Bio: bioPayload,
          DesiredSalary: c.desiredSalary,
          CurrentLocation: c.location
        }
      );
    }

    // Ensure sample CV
    const cvCheck = await executeQuery('SELECT CVID FROM CVs WHERE ProfileID = @ProfileID', { ProfileID: profileId });
    if (cvCheck.recordset.length === 0) {
      await executeQuery(
        `INSERT INTO CVs (ProfileID, Title, FileUrl, IsPrimary, CreatedAt)
         VALUES (@ProfileID, @Title, @FileUrl, 1, GETDATE())`,
        {
          ProfileID: profileId,
          Title: c.cvTitle,
          FileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
        }
      );
    }
  }

  console.log(`✅ Seeded ${sampleCandidates.length} high-quality candidates successfully!`);
  process.exit(0);
}

seedCandidates().catch(err => {
  console.error('Seed candidates error:', err);
  process.exit(1);
});

