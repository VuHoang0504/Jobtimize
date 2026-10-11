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
  CheckCircle2, 
  Sparkles
} from 'lucide-react';

export const THEME_COLORS = {
  blue: {
    primary: '#1e40af', // blue-800
    accent: '#3b82f6',  // blue-500
    light: '#eff6ff',   // blue-50
    border: '#bfdbfe',  // blue-200
    name: 'Xanh Hiện Đại (Modern Blue)'
  },
  purple: {
    primary: '#6b21a8', // purple-800
    accent: '#8b5cf6',  // purple-500
    light: '#faf5ff',   // purple-50
    border: '#e9d5ff',  // purple-200
    name: 'Tím Trí Tuệ (AI Indigo/Purple)'
  },
  emerald: {
    primary: '#065f46', // emerald-800
    accent: '#10b981',  // emerald-500
    light: '#ecfdf5',   // emerald-50
    border: '#a7f3d0',  // emerald-200
    name: 'Xanh Lá Tinh Tế (Emerald Nature)'
  },
  slate: {
    primary: '#0f172a', // slate-900
    accent: '#475569',  // slate-600
    light: '#f8fafc',   // slate-50
    border: '#cbd5e1',  // slate-300
    name: 'Xám Đen Tối Giản (Minimalist Charcoal)'
  },
  burgundy: {
    primary: '#881337', // rose-900
    accent: '#e11d48',  // rose-600
    light: '#fff1f2',   // rose-50
    border: '#fecdd3',  // rose-200
    name: 'Đỏ Burgundy Sang Trọng'
  }
};

// ========================================================
// 1. TEMPLATE: MODERN (Hiện Đại & Năng Động - Chuẩn 1 Trang A4)
// ========================================================
export function ModernCVTemplate({ cvData, theme = 'blue' }) {
  const currentTheme = THEME_COLORS[theme] || THEME_COLORS.blue;
  const { personal, summary, experiences, educations, skills, projects, certifications } = cvData;

  return (
    <div className="bg-white text-gray-800 font-sans p-6 sm:p-7 shadow-sm print:p-0 print:shadow-none min-h-[1050px] flex flex-col justify-start" id="cv-printable-area">
      <div className="space-y-4">
        
        {/* Header Banner */}
        <div 
          className="rounded-xl p-4 sm:p-5 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
          style={{ background: `linear-gradient(135deg, ${currentTheme.primary} 0%, ${currentTheme.accent} 100%)` }}
        >
          <div className="space-y-1 flex-1">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight uppercase">
              {personal?.fullName || 'Họ và Tên Ứng Viên'}
            </h1>
            <p className="text-xs sm:text-sm font-medium text-white/90">
              {personal?.headline || 'Chức danh / Vị trí chuyên môn'}
            </p>
          </div>

          {/* Contact Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-white/90 border-t sm:border-t-0 sm:border-l border-white/20 pt-2 sm:pt-0 sm:pl-4">
            {personal?.email && (
              <div className="flex items-center gap-1.5">
                <Mail className="w-3 h-3 text-white/80 shrink-0" />
                <span className="truncate">{personal.email}</span>
              </div>
            )}
            {personal?.phone && (
              <div className="flex items-center gap-1.5">
                <Phone className="w-3 h-3 text-white/80 shrink-0" />
                <span>{personal.phone}</span>
              </div>
            )}
            {personal?.location && (
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3 h-3 text-white/80 shrink-0" />
                <span className="truncate">{personal.location}</span>
              </div>
            )}
            {personal?.linkedin && (
              <div className="flex items-center gap-1.5">
                <Linkedin className="w-3 h-3 text-white/80 shrink-0" />
                <span className="truncate">{personal.linkedin.replace(/^https?:\/\//, '')}</span>
              </div>
            )}
            {personal?.github && (
              <div className="flex items-center gap-1.5">
                <Github className="w-3 h-3 text-white/80 shrink-0" />
                <span className="truncate">{personal.github.replace(/^https?:\/\//, '')}</span>
              </div>
            )}
            {personal?.portfolio && (
              <div className="flex items-center gap-1.5">
                <Globe className="w-3 h-3 text-white/80 shrink-0" />
                <span className="truncate">{personal.portfolio.replace(/^https?:\/\//, '')}</span>
              </div>
            )}
          </div>
        </div>

        {/* Summary / Bio */}
        {summary && (
          <div className="space-y-1">
            <h2 className="text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5" style={{ color: currentTheme.primary }}>
              <Sparkles className="w-3.5 h-3.5" />
              <span>Tóm Tắt Chuyên Môn</span>
            </h2>
            <div className="h-0.5 w-full bg-gray-100 rounded-full mb-1"></div>
            <p className="text-[11px] leading-relaxed text-gray-700 whitespace-pre-line text-justify">
              {summary}
            </p>
          </div>
        )}

        {/* 2-Column Body */}
        <div className="grid grid-cols-12 gap-5">
          
          {/* Main Column (8/12): Experience & Projects */}
          <div className="col-span-12 md:col-span-8 space-y-4">
            
            {/* Work Experience */}
            {experiences && experiences.length > 0 && (
              <div className="space-y-2">
                <h2 className="text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5" style={{ color: currentTheme.primary }}>
                  <Briefcase className="w-3.5 h-3.5" />
                  <span>Kinh Nghiệm Làm Việc</span>
                </h2>
                <div className="h-0.5 w-full bg-gray-100 rounded-full mb-1.5"></div>

                <div className="space-y-2.5">
                  {experiences.map((exp, idx) => (
                    <div key={idx} className="relative pl-3 border-l-2 space-y-0.5" style={{ borderColor: currentTheme.accent }}>
                      <div className="flex items-baseline justify-between flex-wrap gap-1">
                        <h3 className="text-[11px] font-bold text-gray-900">
                          {exp.role || exp.position || 'Chức danh'}
                        </h3>
                        <span className="text-[9px] font-semibold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                          {exp.duration || `${exp.startDate || ''} - ${exp.endDate || 'Hiện tại'}`}
                        </span>
                      </div>
                      <p className="text-[10px] font-semibold" style={{ color: currentTheme.primary }}>
                        {exp.company || 'Công ty / Tổ chức'} {exp.location ? `• ${exp.location}` : ''}
                      </p>
                      {exp.description && (
                        <p className="text-[10px] leading-relaxed text-gray-600 whitespace-pre-line text-justify pt-0.5">
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
              <div className="space-y-2">
                <h2 className="text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5" style={{ color: currentTheme.primary }}>
                  <FolderGit2 className="w-3.5 h-3.5" />
                  <span>Dự Án Tiêu Biểu</span>
                </h2>
                <div className="h-0.5 w-full bg-gray-100 rounded-full mb-1.5"></div>

                <div className="space-y-2">
                  {projects.map((proj, idx) => (
                    <div key={idx} className="p-2.5 rounded-lg border border-gray-100 bg-gray-50/50 space-y-0.5">
                      <div className="flex items-center justify-between flex-wrap gap-1">
                        <h3 className="text-[11px] font-bold text-gray-900">
                          {proj.name || proj.title || 'Tên dự án'}
                        </h3>
                        {proj.link && (
                          <a href={proj.link.startsWith('http') ? proj.link : `https://${proj.link}`} target="_blank" rel="noreferrer" className="text-[9px] font-semibold underline" style={{ color: currentTheme.accent }}>
                            Link dự án
                          </a>
                        )}
                      </div>
                      {proj.techStack && (
                        <p className="text-[9px] font-semibold text-gray-500">
                          Công nghệ: <span className="text-gray-700">{proj.techStack}</span>
                        </p>
                      )}
                      {proj.description && (
                        <p className="text-[10px] text-gray-600 leading-relaxed whitespace-pre-line">
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
          <div className="col-span-12 md:col-span-4 space-y-4">
            
            {/* Hard Skills */}
            {skills?.hardSkills && skills.hardSkills.length > 0 && (
              <div className="space-y-1.5">
                <h2 className="text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5" style={{ color: currentTheme.primary }}>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Kỹ Năng Chuyên Môn</span>
                </h2>
                <div className="h-0.5 w-full bg-gray-100 rounded-full mb-1"></div>

                <div className="flex flex-wrap gap-1">
                  {skills.hardSkills.map((skill, idx) => (
                    <span 
                      key={idx} 
                      className="px-2 py-0.5 rounded text-[9px] font-bold border"
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
              <div className="space-y-1">
                <h3 className="text-[10px] font-bold text-gray-700 uppercase">Kỹ năng mềm</h3>
                <div className="flex flex-wrap gap-1">
                  {skills.softSkills.map((s, idx) => (
                    <span key={idx} className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 text-[9px] font-medium">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {skills?.languages && skills.languages.length > 0 && (
              <div className="space-y-1">
                <h3 className="text-[10px] font-bold text-gray-700 uppercase flex items-center gap-1">
                  <Languages className="w-3 h-3" /> Ngoại ngữ
                </h3>
                <div className="space-y-0.5">
                  {skills.languages.map((lang, idx) => (
                    <div key={idx} className="flex items-center justify-between text-[10px] text-gray-700">
                      <span>{typeof lang === 'string' ? lang : lang.language}</span>
                      {typeof lang === 'object' && lang.proficiency && (
                        <span className="text-[9px] font-semibold text-gray-500">{lang.proficiency}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Education */}
            {educations && educations.length > 0 && (
              <div className="space-y-1.5">
                <h2 className="text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5" style={{ color: currentTheme.primary }}>
                  <GraduationCap className="w-3.5 h-3.5" />
                  <span>Học Vấn</span>
                </h2>
                <div className="h-0.5 w-full bg-gray-100 rounded-full mb-1"></div>

                <div className="space-y-2">
                  {educations.map((edu, idx) => (
                    <div key={idx} className="space-y-0.5 text-left">
                      <p className="text-[10px] font-bold text-gray-900 leading-tight">
                        {edu.school || edu.institution || 'Trường Đại học'}
                      </p>
                      <p className="text-[10px] font-medium text-gray-700">
                        {edu.degree || edu.major || 'Chuyên ngành'}
                      </p>
                      <p className="text-[9px] font-semibold text-gray-400">
                        {edu.year || edu.duration || `${edu.startDate || ''} - ${edu.endDate || ''}`}
                      </p>
                      {edu.gpa && (
                        <p className="text-[9px] font-bold text-emerald-600">GPA: {edu.gpa}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Certifications */}
            {certifications && certifications.length > 0 && (
              <div className="space-y-1.5">
                <h2 className="text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5" style={{ color: currentTheme.primary }}>
                  <Award className="w-3.5 h-3.5" />
                  <span>Chứng Chỉ</span>
                </h2>
                <div className="h-0.5 w-full bg-gray-100 rounded-full mb-1"></div>

                <div className="space-y-1.5">
                  {certifications.map((cert, idx) => (
                    <div key={idx} className="text-left space-y-0.5">
                      <p className="text-[10px] font-bold text-gray-800">
                        {cert.name || cert.title || 'Tên chứng chỉ'}
                      </p>
                      <p className="text-[9px] text-gray-500">
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
// 2. TEMPLATE: MINIMAL (Tối Giản & Tinh Tế - Chuẩn 1 Trang A4)
// ========================================================
export function MinimalCVTemplate({ cvData, theme = 'slate' }) {
  const currentTheme = THEME_COLORS[theme] || THEME_COLORS.slate;
  const { personal, summary, experiences, educations, skills, projects } = cvData;

  return (
    <div className="bg-white text-gray-800 font-sans p-6 sm:p-7 shadow-sm print:p-0 print:shadow-none min-h-[1050px] flex flex-col justify-start" id="cv-printable-area">
      <div className="space-y-4">
        
        {/* Minimal Header */}
        <div className="text-center space-y-1.5 border-b border-gray-200 pb-3">
          <h1 className="text-2xl font-serif font-black tracking-tight text-gray-900 uppercase">
            {personal?.fullName || 'Họ và Tên Ứng Viên'}
          </h1>
          <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: currentTheme.accent }}>
            {personal?.headline || 'Chuyên viên Công nghệ'}
          </p>
          
          <div className="flex flex-wrap items-center justify-center gap-2.5 text-[11px] text-gray-600 pt-1">
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
          <div className="space-y-1">
            <h2 className="text-[11px] font-bold uppercase tracking-widest font-serif border-b pb-0.5" style={{ color: currentTheme.primary, borderColor: currentTheme.border }}>
              Giới thiệu bản thân
            </h2>
            <p className="text-[11px] leading-relaxed text-gray-700 whitespace-pre-line text-justify">
              {summary}
            </p>
          </div>
        )}

        {/* Experience */}
        {experiences && experiences.length > 0 && (
          <div className="space-y-2.5">
            <h2 className="text-[11px] font-bold uppercase tracking-widest font-serif border-b pb-0.5" style={{ color: currentTheme.primary, borderColor: currentTheme.border }}>
              Kinh nghiệm làm việc
            </h2>
            <div className="space-y-2.5">
              {experiences.map((exp, idx) => (
                <div key={idx} className="space-y-0.5">
                  <div className="flex items-baseline justify-between">
                    <span className="text-[11px] font-bold text-gray-900 font-serif">
                      {exp.role || exp.position} — <span className="font-sans font-semibold text-gray-700">{exp.company}</span>
                    </span>
                    <span className="text-[9px] text-gray-500 font-sans italic">
                      {exp.duration || `${exp.startDate || ''} - ${exp.endDate || 'Hiện tại'}`}
                    </span>
                  </div>
                  {exp.description && (
                    <p className="text-[10px] leading-relaxed text-gray-600 whitespace-pre-line text-justify">
                      {exp.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Education & Skills in 2 columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          
          {/* Education */}
          {educations && educations.length > 0 && (
            <div className="space-y-1.5">
              <h2 className="text-[11px] font-bold uppercase tracking-widest font-serif border-b pb-0.5" style={{ color: currentTheme.primary, borderColor: currentTheme.border }}>
                Học vấn
              </h2>
              <div className="space-y-1.5">
                {educations.map((edu, idx) => (
                  <div key={idx} className="space-y-0.5">
                    <p className="text-[11px] font-bold text-gray-900 font-serif">{edu.school || edu.institution}</p>
                    <p className="text-[10px] text-gray-700">{edu.degree || edu.major}</p>
                    <p className="text-[9px] text-gray-400">{edu.year || edu.duration}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Skills */}
          <div className="space-y-1.5">
            <h2 className="text-[11px] font-bold uppercase tracking-widest font-serif border-b pb-0.5" style={{ color: currentTheme.primary, borderColor: currentTheme.border }}>
              Kỹ năng & Chuyên môn
            </h2>
            {skills?.hardSkills && skills.hardSkills.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {skills.hardSkills.map((s, idx) => (
                  <span key={idx} className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-800 text-[9px] font-semibold">
                    {typeof s === 'string' ? s : s.name}
                  </span>
                ))}
              </div>
            )}
            {skills?.languages && skills.languages.length > 0 && (
              <div className="text-[10px] text-gray-600 pt-0.5">
                <span className="font-bold text-gray-800">Ngoại ngữ: </span>
                {skills.languages.map((l) => (typeof l === 'string' ? l : `${l.language} (${l.proficiency})`)).join(', ')}
              </div>
            )}
          </div>

        </div>

        {/* Projects */}
        {projects && projects.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-[11px] font-bold uppercase tracking-widest font-serif border-b pb-0.5" style={{ color: currentTheme.primary, borderColor: currentTheme.border }}>
              Dự án nổi bật
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {projects.map((proj, idx) => (
                <div key={idx} className="space-y-0.5">
                  <h3 className="text-[11px] font-bold text-gray-900 font-serif">{proj.name || proj.title}</h3>
                  {proj.techStack && <p className="text-[9px] text-gray-500 font-sans italic">{proj.techStack}</p>}
                  {proj.description && <p className="text-[10px] text-gray-600 leading-relaxed">{proj.description}</p>}
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
// 3. TEMPLATE: PROFESSIONAL (Doanh Nghiệp & Executive - Chuẩn 1 Trang A4)
// ========================================================
export function ProfessionalCVTemplate({ cvData, theme = 'purple' }) {
  const currentTheme = THEME_COLORS[theme] || THEME_COLORS.purple;
  const { personal, summary, experiences, educations, skills, projects, certifications } = cvData;

  return (
    <div className="bg-white text-gray-800 font-sans shadow-sm print:shadow-none min-h-[1050px] flex flex-col md:flex-row" id="cv-printable-area">
      
      {/* Dark Sidebar (4.5/12) */}
      <div 
        className="w-full md:w-5/12 p-5 sm:p-6 text-white space-y-4 shrink-0"
        style={{ backgroundColor: currentTheme.primary }}
      >
        {/* Name & Title */}
        <div className="space-y-1 border-b border-white/20 pb-3">
          <h1 className="text-xl font-black tracking-tight uppercase leading-tight">
            {personal?.fullName || 'Họ Tên Ứng Viên'}
          </h1>
          <p className="text-[11px] font-bold tracking-wider uppercase text-white/80">
            {personal?.headline || 'Senior Software Engineer'}
          </p>
        </div>

        {/* Contact Info */}
        <div className="space-y-1.5 text-[11px] text-white/90">
          <h2 className="text-[10px] font-black uppercase tracking-wider text-white/70">
            Liên hệ
          </h2>
          {personal?.email && (
            <div className="flex items-center gap-1.5">
              <Mail className="w-3 h-3 text-white/70 shrink-0" />
              <span className="truncate">{personal.email}</span>
            </div>
          )}
          {personal?.phone && (
            <div className="flex items-center gap-1.5">
              <Phone className="w-3 h-3 text-white/70 shrink-0" />
              <span>{personal.phone}</span>
            </div>
          )}
          {personal?.location && (
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3 h-3 text-white/70 shrink-0" />
              <span>{personal.location}</span>
            </div>
          )}
          {personal?.linkedin && (
            <div className="flex items-center gap-1.5">
              <Linkedin className="w-3 h-3 text-white/70 shrink-0" />
              <span className="truncate">{personal.linkedin.replace(/^https?:\/\//, '')}</span>
            </div>
          )}
          {personal?.github && (
            <div className="flex items-center gap-1.5">
              <Github className="w-3 h-3 text-white/70 shrink-0" />
              <span className="truncate">{personal.github.replace(/^https?:\/\//, '')}</span>
            </div>
          )}
        </div>

        {/* Skills */}
        {skills?.hardSkills && skills.hardSkills.length > 0 && (
          <div className="space-y-2 pt-1">
            <h2 className="text-[10px] font-black uppercase tracking-wider text-white/70">
              Kỹ năng trọng tâm
            </h2>
            <div className="space-y-1.5">
              {skills.hardSkills.map((s, idx) => {
                const sName = typeof s === 'string' ? s : s.name;
                return (
                  <div key={idx} className="space-y-0.5">
                    <div className="flex justify-between text-[10px] font-semibold">
                      <span>{sName}</span>
                      <span className="text-[9px] text-white/70">Chuyên môn</span>
                    </div>
                    <div className="h-1 w-full bg-white/20 rounded-full overflow-hidden">
                      <div className="h-full bg-white rounded-full" style={{ width: `${80 + (idx % 3) * 10}%` }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Education */}
        {educations && educations.length > 0 && (
          <div className="space-y-2 pt-1">
            <h2 className="text-[10px] font-black uppercase tracking-wider text-white/70">
              Học vấn
            </h2>
            <div className="space-y-1.5">
              {educations.map((edu, idx) => (
                <div key={idx} className="space-y-0.5 text-[11px]">
                  <p className="font-bold text-white leading-tight">{edu.school || edu.institution}</p>
                  <p className="text-white/80 text-[10px]">{edu.degree || edu.major}</p>
                  <p className="text-white/60 text-[9px]">{edu.year || edu.duration}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Certifications */}
        {certifications && certifications.length > 0 && (
          <div className="space-y-1.5 pt-1">
            <h2 className="text-[10px] font-black uppercase tracking-wider text-white/70">
              Chứng chỉ
            </h2>
            <div className="space-y-1">
              {certifications.map((cert, idx) => (
                <div key={idx} className="text-[10px] text-white/90">
                  <p className="font-bold">{cert.name || cert.title}</p>
                  <p className="text-[9px] text-white/60">{cert.issuer}</p>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* Main Content Column (7/12) */}
      <div className="w-full md:w-7/12 p-5 sm:p-6 space-y-4 flex flex-col justify-start">
        
        {/* Executive Summary */}
        {summary && (
          <div className="space-y-1">
            <h2 className="text-[11px] font-black uppercase tracking-wider text-gray-900 border-b pb-0.5 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" style={{ color: currentTheme.accent }} />
              <span>Mục tiêu & Tóm tắt sự nghiệp</span>
            </h2>
            <p className="text-[11px] leading-relaxed text-gray-700 whitespace-pre-line text-justify">
              {summary}
            </p>
          </div>
        )}

        {/* Experience */}
        {experiences && experiences.length > 0 && (
          <div className="space-y-2.5">
            <h2 className="text-[11px] font-black uppercase tracking-wider text-gray-900 border-b pb-0.5 flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5" style={{ color: currentTheme.accent }} />
              <span>Kinh nghiệm chuyên môn</span>
            </h2>
            <div className="space-y-2.5">
              {experiences.map((exp, idx) => (
                <div key={idx} className="space-y-0.5">
                  <div className="flex items-baseline justify-between flex-wrap">
                    <h3 className="text-[11px] font-bold text-gray-900">{exp.role || exp.position}</h3>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                      {exp.duration || `${exp.startDate || ''} - ${exp.endDate || 'Hiện tại'}`}
                    </span>
                  </div>
                  <p className="text-[10px] font-bold" style={{ color: currentTheme.accent }}>
                    {exp.company} {exp.location ? `• ${exp.location}` : ''}
                  </p>
                  {exp.description && (
                    <p className="text-[10px] leading-relaxed text-gray-600 whitespace-pre-line text-justify pt-0.5">
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
          <div className="space-y-2">
            <h2 className="text-[11px] font-black uppercase tracking-wider text-gray-900 border-b pb-0.5 flex items-center gap-1.5">
              <FolderGit2 className="w-3.5 h-3.5" style={{ color: currentTheme.accent }} />
              <span>Dự án thực tế</span>
            </h2>
            <div className="space-y-2">
              {projects.map((proj, idx) => (
                <div key={idx} className="p-2.5 rounded border border-gray-100 bg-gray-50/50 space-y-0.5">
                  <h3 className="text-[11px] font-bold text-gray-900">{proj.name || proj.title}</h3>
                  {proj.techStack && <p className="text-[9px] font-bold text-gray-500">Tech Stack: {proj.techStack}</p>}
                  {proj.description && <p className="text-[10px] text-gray-600 leading-relaxed">{proj.description}</p>}
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
