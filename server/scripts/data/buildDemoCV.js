function buildDemoCV(candidate, index, email, normalizeCV) {
  const year = new Date().getFullYear();
  const start = year - candidate.years;
  const phone = `000000${String(101 + index).padStart(4, '0')}`;
  const experienced = candidate.years >= 4;
  return normalizeCV({
    personal: { fullName: candidate.name, email, phone, headline: candidate.role, location: candidate.city,
      birthDate: `${start - 22}-05-15`, portfolio: `https://${candidate.slug}.example.invalid` },
    summary: `${candidate.years} năm kinh nghiệm trong vai trò ${candidate.role}. ${candidate.work} Mong muốn phát triển chuyên môn, tham gia đội ngũ chú trọng chất lượng và đóng góp vào các dự án có tác động thực tế.`,
    experiences: [
      { company: 'Công ty Giải pháp Minh Họa (dữ liệu demo)', role: candidate.role, location: candidate.city,
        startDate: `${experienced ? start + 2 : start}-01`, current: true,
        description: `${candidate.work}\nPhối hợp với các bộ phận liên quan để xác định yêu cầu, triển khai công việc và kiểm tra chất lượng trước khi bàn giao. Lập tài liệu chuyên môn và báo cáo tiến độ theo tuần.` },
      ...(experienced ? [{ company: 'Công ty Phát triển An Bình Demo (hư cấu)', role: `Chuyên viên ${candidate.degree.replace(/^(Kỹ sư|Cử nhân) /, '')}`, location: candidate.city,
        startDate: `${start}-01`, endDate: `${start + 1}-12`, current: false,
        description: `Tham gia các công việc nền tảng trong lĩnh vực ${candidate.degree.replace(/^(Kỹ sư|Cử nhân) /, '').toLowerCase()}. Sử dụng ${candidate.skills.slice(0, 3).join(', ')} để xử lý nhiệm vụ, phối hợp nhóm và chuẩn hóa tài liệu bàn giao.` }] : [])
    ],
    educations: [{ school: 'Trường Đại học Minh Họa Jobtimize (hư cấu)', degree: candidate.degree,
      year: `${start - 4} – ${start}`, gpa: '3.3/4.0', description: `Hoàn thành chương trình ${candidate.degree.toLowerCase()}; đồ án tốt nghiệp gắn với nghiệp vụ chuyên ngành và làm việc nhóm.` }],
    skills: { hardSkills: candidate.skills, softSkills: ['Làm việc nhóm', 'Giải quyết vấn đề', 'Quản lý thời gian', 'Giao tiếp chuyên môn'] },
    projects: [{ name: candidate.project.split(':')[0], techStack: candidate.skills.join(', '),
      description: `${candidate.project}\nVai trò: phụ trách phân tích yêu cầu và thực hiện các hạng mục chuyên môn.\nCông việc: ${candidate.work}\nKết quả: hoàn thành sản phẩm và tài liệu bàn giao; thực hiện kiểm tra chất lượng trước khi nghiệm thu.` }],
    certifications: [{ name: `Khóa bồi dưỡng ${candidate.degree.replace(/^(Kỹ sư|Cử nhân) /, '')} (minh họa)`, issuer: 'Học viện chuyên môn Jobtimize Demo', year: String(year - 1) }],
    languages: [{ language: 'Tiếng Việt', proficiency: 'Bản ngữ' }, { language: 'Tiếng Anh', proficiency: index < 3 ? 'Đọc hiểu tài liệu kỹ thuật và trao đổi công việc' : 'Đọc hiểu tài liệu chuyên ngành' }],
    additional: 'Toàn bộ thông tin cá nhân, số điện thoại, cơ sở đào tạo, doanh nghiệp và kinh nghiệm là hư cấu, chỉ phục vụ demo Jobtimize. Không dùng để liên hệ người thật.'
  }, 'minimal');
}
module.exports = { buildDemoCV };
