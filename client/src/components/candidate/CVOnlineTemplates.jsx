import React from 'react';
import { 
  Mail, 
  Phone, 
  MapPin, 
  Globe, 
  Linkedin, 
  Github, 
  Briefcase, 
  GraduationCap, 
  Award, 
  FolderGit2, 
  Languages, 
  CheckCircle2
} from 'lucide-react';

const VIETNAMESE_SANS_STACK = "'Be Vietnam Pro', 'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

export const THEME_COLORS = {
  blue: {
    primary: '#1d4ed8', // blue-700
    accent: '#2563eb',  // blue-600
    light: '#eff6ff',   // blue-50
    border: '#bfdbfe',  // blue-200
    name: 'Xanh Doanh Nghiệp (Blue)'
  },
  slate: {
    primary: '#0f172a', // slate-900
    accent: '#334155',  // slate-700
    light: '#f8fafc',   // slate-50
    border: '#cbd5e1',  // slate-300
    name: 'Đen Xám Tối Giản (Slate)'
  },
  emerald: {
    primary: '#065f46', // emerald-800
    accent: '#059669',  // emerald-600
    light: '#ecfdf5',   // emerald-50
    border: '#a7f3d0',  // emerald-200
    name: 'Xanh Ngọc Lịch Lãm (Emerald)'
  },
  purple: {
    primary: '#1e1b4b', // indigo-950
    accent: '#4338ca',  // indigo-700
    light: '#eef2ff',   // indigo-50
    border: '#c7d2fe',  // indigo-200
    name: 'Xanh Chàm Hiện Đại (Indigo)'
  },
  burgundy: {
    primary: '#881337', // rose-900
    accent: '#be123c',  // rose-700
    light: '#fff1f2',   // rose-50
    border: '#fecdd3',  // rose-200
    name: 'Đỏ Đô Chuyên Nghiệp (Burgundy)'
  }
};

// ========================================================
// 1. TEMPLATE: MODERN (Hiện đại, 2 cột - Tối ưu font không chân Tiếng Việt)
// ========================================================
export function ModernCVTemplate({ cvData, theme = 'blue' }) {
  const currentTheme = THEME_COLORS[theme] || THEME_COLORS.blue;
  const { personal, summary, experiences, educations, skills, projects, certifications } = cvData;

  return (
    <div
      className="bg-white text-slate-800 font-sans p-6 sm:p-8 shadow-sm print:p-0 print:shadow-none min-h-[1050px] flex flex-col justify-start antialiased"
      style={{ fontFamily: VIETNAMESE_SANS_STACK }}
      id="cv-printable-area"
    >
      <div className="space-y-5">
        
        {/* Header Banner */}
        <div 
          className="rounded-xl p-5 sm:p-6 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
          style={{ backgroundColor: currentTheme.primary }}
        >
          <div className="space-y-1 flex-1">
            <h1 className="text-xl sm:text-2xl font-bold tracking-normal uppercase leading-snug">
              {personal?.fullName || 'Họ và Tên Ứng Viên'}
            </h1>
            <p className="text-xs sm:text-sm font-medium text-white/90">
              {personal?.headline || 'Chức danh / Vị trí ứng tuyển'}
            </p>
          </div>

          {/* Contact Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-[11px] text-white/95 border-t sm:border-t-0 sm:border-l border-white/20 pt-2.5 sm:pt-0 sm:pl-4">
            {personal?.email && (
              <div className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-white/80 shrink-0" />
                <span className="truncate">{personal.email}</span>
              </div>
            )}
            {personal?.phone && (
              <div className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-white/80 shrink-0" />
                <span>{personal.phone}</span>
              </div>
            )}
            {personal?.location && (
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-white/80 shrink-0" />
                <span className="truncate">{personal.location}</span>
              </div>
            )}
            {personal?.linkedin && (
              <div className="flex items-center gap-1.5">
                <Linkedin className="w-3.5 h-3.5 text-white/80 shrink-0" />
                <span className="truncate">{personal.linkedin.replace(/^https?:\/\//, '')}</span>
              </div>
            )}
            {personal?.github && (
              <div className="flex items-center gap-1.5">
                <Github className="w-3.5 h-3.5 text-white/80 shrink-0" />
                <span className="truncate">{personal.github.replace(/^https?:\/\//, '')}</span>
              </div>
            )}
            {personal?.portfolio && (
              <div className="flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-white/80 shrink-0" />
                <span className="truncate">{personal.portfolio.replace(/^https?:\/\//, '')}</span>
              </div>
            )}
          </div>
        </div>

        {/* Summary / Bio */}
        {summary && (
          <div className="space-y-1.5">
            <h2 className="text-xs font-bold uppercase tracking-wide" style={{ color: currentTheme.primary }}>
              Tóm tắt chuyên môn
            </h2>
            <div className="h-0.5 w-full bg-slate-100 rounded-full"></div>
            <p className="text-[11.5px] leading-relaxed text-slate-700 whitespace-pre-line">
              {summary}
            </p>
          </div>
        )}

        {/* 2-Column Body */}
        <div className="grid grid-cols-12 gap-6">
          
          {/* Main Column (8/12): Experience & Projects */}
          <div className="col-span-12 md:col-span-8 space-y-5">
            
            {/* Work Experience */}
            {experiences && experiences.length > 0 && (
              <div className="space-y-2.5">
                <h2 className="text-xs font-bold uppercase tracking-wide flex items-center gap-1.5" style={{ color: currentTheme.primary }}>
                  <Briefcase className="w-3.5 h-3.5" />
                  <span>Kinh nghiệm làm việc</span>
                </h2>
                <div className="h-0.5 w-full bg-slate-100 rounded-full"></div>

                <div className="space-y-3.5">
                  {experiences.map((exp, idx) => (
                    <div key={idx} className="relative pl-3.5 border-l-2 space-y-1" style={{ borderColor: currentTheme.accent }}>
                      <div className="flex items-baseline justify-between flex-wrap gap-1">
                        <h3 className="text-xs font-bold text-slate-900">
                          {exp.role || exp.position || 'Chức danh'}
                        </h3>
                        <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                          {exp.duration || `${exp.startDate || ''} - ${exp.endDate || 'Hiện tại'}`}
                        </span>
                      </div>
                      <p className="text-[11px] font-semibold" style={{ color: currentTheme.primary }}>
                        {exp.company || 'Công ty / Tổ chức'} {exp.location ? `• ${exp.location}` : ''}
                      </p>
                      {exp.description && (
                        <p className="text-[11px] leading-relaxed text-slate-600 whitespace-pre-line pt-0.5">
                          {exp.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Featured Projects */}
            {projects && projects.length > 0 && (
              <div className="space-y-2.5">
                <h2 className="text-xs font-bold uppercase tracking-wide flex items-center gap-1.5" style={{ color: currentTheme.primary }}>
                  <FolderGit2 className="w-3.5 h-3.5" />
                  <span>Dự án tiêu biểu</span>
                </h2>
                <div className="h-0.5 w-full bg-slate-100 rounded-full"></div>

                <div className="space-y-2.5">
                  {projects.map((proj, idx) => (
                    <div key={idx} className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 space-y-1">
                      <div className="flex items-center justify-between flex-wrap gap-1">
                        <h3 className="text-xs font-bold text-slate-900">
                          {proj.name || proj.title || 'Tên dự án'}
                        </h3>
                        {proj.link && (
                          <a href={proj.link.startsWith('http') ? proj.link : `https://${proj.link}`} target="_blank" rel="noreferrer" className="text-[10px] font-semibold underline" style={{ color: currentTheme.accent }}>
                            Liên kết dự án
                          </a>
                        )}
                      </div>
                      {proj.techStack && (
                        <p className="text-[10px] font-medium text-slate-500">
                          Công nghệ: <span className="font-semibold text-slate-700">{proj.techStack}</span>
                        </p>
                      )}
                      {proj.description && (
                        <p className="text-[11px] text-slate-600 leading-relaxed whitespace-pre-line">
                          {proj.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* Sidebar Column (4/12): Skills, Education, Certifications */}
          <div className="col-span-12 md:col-span-4 space-y-5">
            
            {/* Hard Skills */}
            {skills?.hardSkills && skills.hardSkills.length > 0 && (
              <div className="space-y-2">
                <h2 className="text-xs font-bold uppercase tracking-wide flex items-center gap-1.5" style={{ color: currentTheme.primary }}>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Kỹ năng chuyên môn</span>
                </h2>
                <div className="h-0.5 w-full bg-slate-100 rounded-full"></div>

                <div className="flex flex-wrap gap-1.5">
                  {skills.hardSkills.map((skill, idx) => (
                    <span 
                      key={idx} 
                      className="px-2 py-0.5 rounded text-[10px] font-semibold border"
                      style={{ 
                        backgroundColor: currentTheme.light, 
                        color: currentTheme.primary,
                        borderColor: currentTheme.border
                      }}
                    >
                      {typeof skill === 'string' ? skill : skill.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Soft Skills & Languages */}
            {skills?.softSkills && skills.softSkills.length > 0 && (
              <div className="space-y-1.5">
                <h3 className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">Kỹ năng mềm</h3>
                <div className="flex flex-wrap gap-1.5">
                  {skills.softSkills.map((s, idx) => (
                    <span key={idx} className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-medium">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {skills?.languages && skills.languages.length > 0 && (
              <div className="space-y-1.5">
                <h3 className="text-[11px] font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1">
                  <Languages className="w-3.5 h-3.5" /> Ngoại ngữ
                </h3>
                <div className="space-y-1">
                  {skills.languages.map((lang, idx) => (
                    <div key={idx} className="flex items-center justify-between text-[11px] text-slate-700">
                      <span className="font-medium">{typeof lang === 'string' ? lang : lang.language}</span>
                      {typeof lang === 'object' && lang.proficiency && (
                        <span className="text-[10px] text-slate-500">{lang.proficiency}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Education */}
            {educations && educations.length > 0 && (
              <div className="space-y-2">
                <h2 className="text-xs font-bold uppercase tracking-wide flex items-center gap-1.5" style={{ color: currentTheme.primary }}>
                  <GraduationCap className="w-3.5 h-3.5" />
                  <span>Học vấn</span>
                </h2>
                <div className="h-0.5 w-full bg-slate-100 rounded-full"></div>

                <div className="space-y-2.5">
                  {educations.map((edu, idx) => (
                    <div key={idx} className="space-y-0.5 text-left">
                      <p className="text-[11px] font-bold text-slate-900 leading-snug">
                        {edu.school || edu.institution || 'Trường Đại học'}
                      </p>
                      <p className="text-[10.5px] font-medium text-slate-700">
                        {edu.degree || edu.major || 'Chuyên ngành'}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        {edu.year || edu.duration || `${edu.startDate || ''} - ${edu.endDate || ''}`}
                      </p>
                      {edu.gpa && (
                        <p className="text-[10px] font-semibold text-emerald-700">GPA: {edu.gpa}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Certifications */}
            {certifications && certifications.length > 0 && (
              <div className="space-y-2">
                <h2 className="text-xs font-bold uppercase tracking-wide flex items-center gap-1.5" style={{ color: currentTheme.primary }}>
                  <Award className="w-3.5 h-3.5" />
                  <span>Chứng chỉ</span>
                </h2>
                <div className="h-0.5 w-full bg-slate-100 rounded-full"></div>

                <div className="space-y-2">
                  {certifications.map((cert, idx) => (
                    <div key={idx} className="text-left space-y-0.5">
                      <p className="text-[11px] font-bold text-slate-800 leading-snug">
                        {cert.name || cert.title || 'Tên chứng chỉ'}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        {cert.issuer ? `${cert.issuer}` : ''} {cert.year ? `(${cert.year})` : ''}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

        </div>

      </div>
    </div>
  );
}

// ========================================================
// 2. TEMPLATE: MINIMAL (Tối giản, hiện đại, font không chân chuẩn Tiếng Việt)
// ========================================================
export function MinimalCVTemplate({ cvData, theme = 'slate' }) {
  const currentTheme = THEME_COLORS[theme] || THEME_COLORS.slate;
  const { personal, summary, experiences, educations, skills, projects, certifications } = cvData;

  return (
    <div
      className="bg-white text-slate-800 font-sans p-6 sm:p-8 shadow-sm print:p-0 print:shadow-none min-h-[1050px] flex flex-col justify-start antialiased"
      style={{ fontFamily: VIETNAMESE_SANS_STACK }}
      id="cv-printable-area"
    >
      <div className="space-y-5">
        
        {/* Minimal Header (Sans-serif modern, clean Vietnamese diacritics) */}
        <div className="text-center space-y-1.5 border-b border-slate-200 pb-4">
          <h1 className="text-2xl font-bold tracking-normal text-slate-900 uppercase leading-snug">
            {personal?.fullName || 'Họ và Tên Ứng Viên'}
          </h1>
          <p className="text-xs font-semibold tracking-wide uppercase" style={{ color: currentTheme.accent }}>
            {personal?.headline || 'Chuyên viên Công nghệ'}
          </p>
          
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] text-slate-600 pt-1">
            {personal?.email && <span>{personal.email}</span>}
            {personal?.phone && <span>• {personal.phone}</span>}
            {personal?.location && <span>• {personal.location}</span>}
            {personal?.linkedin && <span>• {personal.linkedin.replace(/^https?:\/\//, '')}</span>}
            {personal?.github && <span>• {personal.github.replace(/^https?:\/\//, '')}</span>}
            {personal?.portfolio && <span>• {personal.portfolio.replace(/^https?:\/\//, '')}</span>}
          </div>
        </div>

        {/* Summary */}
        {summary && (
          <div className="space-y-1.5">
            <h2
              className="text-xs font-bold uppercase tracking-wide border-b pb-1"
              style={{ color: currentTheme.primary, borderColor: currentTheme.border }}
            >
              Giới thiệu bản thân
            </h2>
            <p className="text-[11.5px] leading-relaxed text-slate-700 whitespace-pre-line">
              {summary}
            </p>
          </div>
        )}

        {/* Experience */}
        {experiences && experiences.length > 0 && (
          <div className="space-y-2.5">
            <h2
              className="text-xs font-bold uppercase tracking-wide border-b pb-1"
              style={{ color: currentTheme.primary, borderColor: currentTheme.border }}
            >
              Kinh nghiệm làm việc
            </h2>
            <div className="space-y-3">
              {experiences.map((exp, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex items-baseline justify-between gap-2 flex-wrap">
                    <span className="text-xs font-bold text-slate-900">
                      {exp.role || exp.position} — <span className="font-semibold text-slate-700">{exp.company}</span>
                    </span>
                    <span className="text-[10.5px] text-slate-500 font-medium">
                      {exp.duration || `${exp.startDate || ''} - ${exp.endDate || 'Hiện tại'}`}
                    </span>
                  </div>
                  {exp.description && (
                    <p className="text-[11px] leading-relaxed text-slate-600 whitespace-pre-line">
                      {exp.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Education & Skills in 2 columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Education */}
          {educations && educations.length > 0 && (
            <div className="space-y-2">
              <h2
                className="text-xs font-bold uppercase tracking-wide border-b pb-1"
                style={{ color: currentTheme.primary, borderColor: currentTheme.border }}
              >
                Học vấn
              </h2>
              <div className="space-y-2.5">
                {educations.map((edu, idx) => (
                  <div key={idx} className="space-y-0.5">
                    <p className="text-xs font-bold text-slate-900 leading-snug">{edu.school || edu.institution}</p>
                    <p className="text-[11px] text-slate-700 font-medium">{edu.degree || edu.major}</p>
                    <p className="text-[10px] text-slate-500">
                      {edu.year || edu.duration} {edu.gpa ? `• GPA: ${edu.gpa}` : ''}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Skills */}
          <div className="space-y-2">
            <h2
              className="text-xs font-bold uppercase tracking-wide border-b pb-1"
              style={{ color: currentTheme.primary, borderColor: currentTheme.border }}
            >
              Kỹ năng & Chuyên môn
            </h2>
            {skills?.hardSkills && skills.hardSkills.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {skills.hardSkills.map((s, idx) => (
                  <span key={idx} className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 text-[10.5px] font-semibold">
                    {typeof s === 'string' ? s : s.name}
                  </span>
                ))}
              </div>
            )}
            {skills?.softSkills && skills.softSkills.length > 0 && (
              <div className="text-[11px] text-slate-600 pt-0.5">
                <span className="font-semibold text-slate-800">Kỹ năng mềm: </span>
                {skills.softSkills.join(', ')}
              </div>
            )}
            {skills?.languages && skills.languages.length > 0 && (
              <div className="text-[11px] text-slate-600 pt-0.5">
                <span className="font-semibold text-slate-800">Ngoại ngữ: </span>
                {skills.languages.map((l) => (typeof l === 'string' ? l : `${l.language} (${l.proficiency})`)).join(', ')}
              </div>
            )}
          </div>

        </div>

        {/* Projects */}
        {projects && projects.length > 0 && (
          <div className="space-y-2.5">
            <h2
              className="text-xs font-bold uppercase tracking-wide border-b pb-1"
              style={{ color: currentTheme.primary, borderColor: currentTheme.border }}
            >
              Dự án nổi bật
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {projects.map((proj, idx) => (
                <div key={idx} className="space-y-1">
                  <h3 className="text-xs font-bold text-slate-900 leading-snug">{proj.name || proj.title}</h3>
                  {proj.techStack && <p className="text-[10.5px] text-slate-500 font-medium">{proj.techStack}</p>}
                  {proj.description && <p className="text-[11px] text-slate-600 leading-relaxed">{proj.description}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Certifications */}
        {certifications && certifications.length > 0 && (
          <div className="space-y-2">
            <h2
              className="text-xs font-bold uppercase tracking-wide border-b pb-1"
              style={{ color: currentTheme.primary, borderColor: currentTheme.border }}
            >
              Chứng chỉ
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {certifications.map((cert, idx) => (
                <div key={idx} className="text-[11px]">
                  <span className="font-bold text-slate-900">{cert.name || cert.title}</span>
                  {cert.issuer && <span className="text-slate-600"> — {cert.issuer}</span>}
                  {cert.year && <span className="text-slate-500"> ({cert.year})</span>}
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// ========================================================
// 3. TEMPLATE: PROFESSIONAL (Doanh nghiệp - Chuẩn A4, font không chân)
// ========================================================
export function ProfessionalCVTemplate({ cvData, theme = 'blue' }) {
  const currentTheme = THEME_COLORS[theme] || THEME_COLORS.blue;
  const { personal, summary, experiences, educations, skills, projects, certifications } = cvData;

  return (
    <div
      className="bg-white text-slate-800 font-sans shadow-sm print:shadow-none min-h-[1050px] flex flex-col md:flex-row antialiased"
      style={{ fontFamily: VIETNAMESE_SANS_STACK }}
      id="cv-printable-area"
    >
      
      {/* Left Sidebar (5/12) */}
      <div 
        className="w-full md:w-5/12 p-6 text-white space-y-5 shrink-0"
        style={{ backgroundColor: currentTheme.primary }}
      >
        {/* Name & Title */}
        <div className="space-y-1.5 border-b border-white/20 pb-4">
          <h1 className="text-xl font-bold tracking-normal uppercase leading-snug">
            {personal?.fullName || 'Họ và Tên Ứng Viên'}
          </h1>
          <p className="text-xs font-semibold tracking-wide uppercase text-white/85">
            {personal?.headline || 'Chuyên viên Công nghệ'}
          </p>
        </div>

        {/* Contact Info */}
        <div className="space-y-2 text-[11px] text-white/95">
          <h2 className="text-[10.5px] font-bold uppercase tracking-wide text-white/75">
            Thông tin liên hệ
          </h2>
          {personal?.email && (
            <div className="flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-white/75 shrink-0" />
              <span className="truncate">{personal.email}</span>
            </div>
          )}
          {personal?.phone && (
            <div className="flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 text-white/75 shrink-0" />
              <span>{personal.phone}</span>
            </div>
          )}
          {personal?.location && (
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-white/75 shrink-0" />
              <span>{personal.location}</span>
            </div>
          )}
          {personal?.linkedin && (
            <div className="flex items-center gap-2">
              <Linkedin className="w-3.5 h-3.5 text-white/75 shrink-0" />
              <span className="truncate">{personal.linkedin.replace(/^https?:\/\//, '')}</span>
            </div>
          )}
          {personal?.github && (
            <div className="flex items-center gap-2">
              <Github className="w-3.5 h-3.5 text-white/75 shrink-0" />
              <span className="truncate">{personal.github.replace(/^https?:\/\//, '')}</span>
            </div>
          )}
        </div>

        {/* Skills */}
        {skills?.hardSkills && skills.hardSkills.length > 0 && (
          <div className="space-y-2 pt-1">
            <h2 className="text-[10.5px] font-bold uppercase tracking-wide text-white/75">
              Kỹ năng chuyên môn
            </h2>
            <div className="flex flex-wrap gap-1.5">
              {skills.hardSkills.map((s, idx) => {
                const sName = typeof s === 'string' ? s : s.name;
                return (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded bg-white/15 text-white text-[10.5px] font-medium"
                  >
                    {sName}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Education */}
        {educations && educations.length > 0 && (
          <div className="space-y-2 pt-1">
            <h2 className="text-[10.5px] font-bold uppercase tracking-wide text-white/75">
              Học vấn
            </h2>
            <div className="space-y-2">
              {educations.map((edu, idx) => (
                <div key={idx} className="space-y-0.5 text-[11px]">
                  <p className="font-bold text-white leading-snug">{edu.school || edu.institution}</p>
                  <p className="text-white/85 text-[10.5px]">{edu.degree || edu.major}</p>
                  <p className="text-white/65 text-[10px]">{edu.year || edu.duration}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Certifications */}
        {certifications && certifications.length > 0 && (
          <div className="space-y-2 pt-1">
            <h2 className="text-[10.5px] font-bold uppercase tracking-wide text-white/75">
              Chứng chỉ
            </h2>
            <div className="space-y-1.5">
              {certifications.map((cert, idx) => (
                <div key={idx} className="text-[11px] text-white/95">
                  <p className="font-bold leading-snug">{cert.name || cert.title}</p>
                  <p className="text-[10px] text-white/70">{cert.issuer}</p>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* Main Content Column (7/12) */}
      <div className="w-full md:w-7/12 p-6 space-y-5 flex flex-col justify-start">
        
        {/* Executive Summary */}
        {summary && (
          <div className="space-y-1.5">
            <h2 className="text-xs font-bold uppercase tracking-wide text-slate-900 border-b border-slate-200 pb-1">
              Mục tiêu & Tóm tắt sự nghiệp
            </h2>
            <p className="text-[11.5px] leading-relaxed text-slate-700 whitespace-pre-line">
              {summary}
            </p>
          </div>
        )}

        {/* Experience */}
        {experiences && experiences.length > 0 && (
          <div className="space-y-2.5">
            <h2 className="text-xs font-bold uppercase tracking-wide text-slate-900 border-b border-slate-200 pb-1 flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5" style={{ color: currentTheme.accent }} />
              <span>Kinh nghiệm chuyên môn</span>
            </h2>
            <div className="space-y-3">
              {experiences.map((exp, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex items-baseline justify-between flex-wrap gap-1">
                    <h3 className="text-xs font-bold text-slate-900">{exp.role || exp.position}</h3>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                      {exp.duration || `${exp.startDate || ''} - ${exp.endDate || 'Hiện tại'}`}
                    </span>
                  </div>
                  <p className="text-[11px] font-semibold" style={{ color: currentTheme.accent }}>
                    {exp.company} {exp.location ? `• ${exp.location}` : ''}
                  </p>
                  {exp.description && (
                    <p className="text-[11px] leading-relaxed text-slate-600 whitespace-pre-line pt-0.5">
                      {exp.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Projects */}
        {projects && projects.length > 0 && (
          <div className="space-y-2.5">
            <h2 className="text-xs font-bold uppercase tracking-wide text-slate-900 border-b border-slate-200 pb-1 flex items-center gap-1.5">
              <FolderGit2 className="w-3.5 h-3.5" style={{ color: currentTheme.accent }} />
              <span>Dự án thực tế</span>
            </h2>
            <div className="space-y-2.5">
              {projects.map((proj, idx) => (
                <div key={idx} className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 space-y-1">
                  <h3 className="text-xs font-bold text-slate-900">{proj.name || proj.title}</h3>
                  {proj.techStack && <p className="text-[10px] font-semibold text-slate-500">Công nghệ: {proj.techStack}</p>}
                  {proj.description && <p className="text-[11px] text-slate-600 leading-relaxed">{proj.description}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

    </div>
  );
}

// Master Render Component by template name
export default function CVRenderer({ template = 'modern', cvData, theme = 'blue' }) {
  if (template === 'minimal') {
    return <MinimalCVTemplate cvData={cvData} theme={theme} />;
  }
  if (template === 'professional') {
    return <ProfessionalCVTemplate cvData={cvData} theme={theme} />;
  }
  return <ModernCVTemplate cvData={cvData} theme={theme} />;
}
