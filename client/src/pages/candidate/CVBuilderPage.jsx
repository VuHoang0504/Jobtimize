import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import CVRenderer, { THEME_COLORS } from '../../components/candidate/CVOnlineTemplates';
import {
  FileText,
  Save,
  Download,
  Printer,
  Sparkles,
  ArrowLeft,
  RefreshCw,
  Plus,
  Trash2,
  CheckCircle2,
  Palette,
  Layout,
  User,
  Briefcase,
  GraduationCap,
  Award,
  FolderGit2,
  Eye,
  Star,
  Check,
  ChevronRight
} from 'lucide-react';

const INITIAL_CV_DATA = {
  personal: {
    fullName: '',
    headline: '',
    email: '',
    phone: '',
    location: '',
    linkedin: '',
    github: '',
    portfolio: ''
  },
  summary: '',
  experiences: [
    {
      company: 'Tập đoàn Công nghệ FPT',
      role: 'Frontend Developer',
      location: 'Hà Nội',
      startDate: '01/2022',
      endDate: 'Hiện tại',
      duration: '2022 - Hiện tại',
      description: '- Phát triển giao diện người dùng bằng React.js, Tailwind CSS và Next.js.\n- Tối ưu hóa hiệu năng render trang web, giảm 40% thời gian tải trang.\n- Phối hợp với đội ngũ Backend thiết kế và tích hợp RESTful APIs.'
    }
  ],
  educations: [
    {
      school: 'Đại học Bách Khoa Hà Nội',
      degree: 'Cử nhân Kỹ thuật Phần mềm',
      year: '2018 - 2022',
      gpa: '3.6/4.0'
    }
  ],
  skills: {
    hardSkills: ['React.js', 'Next.js', 'JavaScript (ES6+)', 'TypeScript', 'Node.js', 'Tailwind CSS', 'SQL Server'],
    softSkills: ['Làm việc nhóm', 'Giao tiếp', 'Tư duy phản biện', 'Quản lý thời gian'],
    languages: [
      { language: 'Tiếng Việt', proficiency: 'Bản ngữ' },
      { language: 'Tiếng Anh', proficiency: 'TOEIC 850 / Giao tiếp tốt' }
    ]
  },
  projects: [
    {
      name: 'Jobtimize - Nền tảng Tuyển dụng Trực tuyến',
      techStack: 'React.js, Node.js, Express, SQL Server',
      link: 'https://jobtimize.vn',
      description: 'Hệ thống quản lý hồ sơ ứng viên, đối chiếu kỹ năng theo mô tả công việc và kết nối ứng viên với doanh nghiệp.'
    }
  ],
  certifications: [
    {
      name: 'Meta Front-End Developer Professional Certificate',
      issuer: 'Coursera & Meta',
      year: '2023'
    }
  ]
};

export default function CVBuilderPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const queryParams = new URLSearchParams(location.search);
  const editCvId = queryParams.get('id');

  const [template, setTemplate] = useState('modern'); // 'modern', 'minimal', 'professional'
  const [theme, setTheme] = useState('blue'); // 'blue', 'purple', 'emerald', 'slate', 'burgundy'
  const [cvTitle, setCvTitle] = useState('CV Chuyên Nghiệp ' + new Date().getFullYear());
  const [isPrimary, setIsPrimary] = useState(false);
  const [cvData, setCvData] = useState(INITIAL_CV_DATA);
  const [hardSkillsText, setHardSkillsText] = useState(INITIAL_CV_DATA.skills.hardSkills.join(', '));
  const [softSkillsText, setSoftSkillsText] = useState(INITIAL_CV_DATA.skills.softSkills.join(', '));

  // Active form section accordion/tab
  const [activeSection, setActiveSection] = useState('personal'); // 'personal', 'summary', 'experience', 'education', 'skills', 'projects', 'certifications'
  const [previewZoom, setPreviewZoom] = useState(100);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState('');
  const [saveError, setSaveError] = useState('');

  // Fetch candidate profile or existing CV data
  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      try {
        if (editCvId) {
          // Load specific CV to edit
          const cvRes = await api.get(`/candidate/cv/${editCvId}`);
          if (cvRes.data.success && cvRes.data.data) {
            const item = cvRes.data.data;
            setCvTitle(item.Title || 'Bản CV Online');
            setTemplate(item.Template || 'modern');
            setIsPrimary(!!item.IsPrimary);
            if (item.CvData) {
              const parsed = typeof item.CvData === 'string' ? JSON.parse(item.CvData) : item.CvData;
              setCvData(parsed);
              setHardSkillsText((parsed.skills?.hardSkills || []).join(', '));
              setSoftSkillsText((parsed.skills?.softSkills || []).join(', '));
              setLoading(false);
              return;
            }
          }
        }

        // If new or fallback, prefill from Candidate Profile
        await handlePrefillFromProfile();
      } catch (err) {
        console.error('Load CV initial error:', err);
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, [editCvId]);

  // Function to pull directly from candidate profile
  const handlePrefillFromProfile = async () => {
    try {
      const res = await api.get('/candidate/profile');
      if (res.data.success && res.data.data) {
        const p = res.data.data;
        let parsedBio = {};
        try {
          if (p.Bio && p.Bio.startsWith('{')) {
            parsedBio = JSON.parse(p.Bio);
          }
        } catch (e) {}

        const profileCvData = {
          personal: {
            fullName: p.FullName || user?.fullName || '',
            headline: p.Headline || 'Chuyên viên Công nghệ Thông tin',
            email: p.Email || user?.email || '',
            phone: p.Phone || '',
            location: p.CurrentLocation || '',
            linkedin: parsedBio.links?.linkedin || '',
            github: parsedBio.links?.github || '',
            portfolio: parsedBio.links?.portfolio || ''
          },
          summary: parsedBio.bioText || parsedBio.bio || (typeof p.Bio === 'string' && !p.Bio.startsWith('{') ? p.Bio : '') || 'Lập trình viên nhiệt huyết với khả năng xây dựng các giải pháp công nghệ hiện đại, tối ưu và mở rộng tốt.',
          experiences: (parsedBio.experiences && parsedBio.experiences.length > 0) ? parsedBio.experiences : INITIAL_CV_DATA.experiences,
          educations: (parsedBio.educations && parsedBio.educations.length > 0) ? parsedBio.educations : INITIAL_CV_DATA.educations,
          skills: {
            hardSkills: (parsedBio.skills?.hardSkills && parsedBio.skills.hardSkills.length > 0) ? parsedBio.skills.hardSkills : INITIAL_CV_DATA.skills.hardSkills,
            softSkills: (parsedBio.skills?.softSkills && parsedBio.skills.softSkills.length > 0) ? parsedBio.skills.softSkills : INITIAL_CV_DATA.skills.softSkills,
            languages: (parsedBio.skills?.languages && parsedBio.skills.languages.length > 0) ? parsedBio.skills.languages : INITIAL_CV_DATA.skills.languages
          },
          projects: (parsedBio.additionalInfo?.projects && parsedBio.additionalInfo.projects.length > 0) ? parsedBio.additionalInfo.projects : INITIAL_CV_DATA.projects,
          certifications: (parsedBio.additionalInfo?.certifications && parsedBio.additionalInfo.certifications.length > 0) ? parsedBio.additionalInfo.certifications : INITIAL_CV_DATA.certifications
        };

        setCvData(profileCvData);
        setHardSkillsText((profileCvData.skills?.hardSkills || []).join(', '));
        setSoftSkillsText((profileCvData.skills?.softSkills || []).join(', '));
      }
    } catch (err) {
      console.error('Prefill from profile error:', err);
    }
  };

  // Helper state updaters
  const updatePersonalInfo = (field, val) => {
    setCvData(prev => ({
      ...prev,
      personal: { ...prev.personal, [field]: val }
    }));
  };

  // Experience handlers
  const addExperience = () => {
    setCvData(prev => ({
      ...prev,
      experiences: [
        ...prev.experiences,
        { company: '', role: '', location: '', duration: '', description: '' }
      ]
    }));
  };

  const updateExperience = (index, field, val) => {
    setCvData(prev => {
      const exps = [...prev.experiences];
      exps[index] = { ...exps[index], [field]: val };
      return { ...prev, experiences: exps };
    });
  };

  const removeExperience = (index) => {
    setCvData(prev => ({
      ...prev,
      experiences: prev.experiences.filter((_, i) => i !== index)
    }));
  };

  // Education handlers
  const addEducation = () => {
    setCvData(prev => ({
      ...prev,
      educations: [
        ...prev.educations,
        { school: '', degree: '', year: '', gpa: '' }
      ]
    }));
  };

  const updateEducation = (index, field, val) => {
    setCvData(prev => {
      const edus = [...prev.educations];
      edus[index] = { ...edus[index], [field]: val };
      return { ...prev, educations: edus };
    });
  };

  const removeEducation = (index) => {
    setCvData(prev => ({
      ...prev,
      educations: prev.educations.filter((_, i) => i !== index)
    }));
  };

  // Skill handlers
  const handleHardSkillChange = (value) => {
    setHardSkillsText(value);
    const skillsArr = value.split(',').map(s => s.trim()).filter(Boolean);
    setCvData(prev => ({
      ...prev,
      skills: { ...prev.skills, hardSkills: skillsArr }
    }));
  };

  const handleSoftSkillChange = (value) => {
    setSoftSkillsText(value);
    const skillsArr = value.split(',').map(s => s.trim()).filter(Boolean);
    setCvData(prev => ({
      ...prev,
      skills: { ...prev.skills, softSkills: skillsArr }
    }));
  };

  // Project handlers
  const addProject = () => {
    setCvData(prev => ({
      ...prev,
      projects: [
        ...prev.projects,
        { name: '', techStack: '', link: '', description: '' }
      ]
    }));
  };

  const updateProject = (index, field, val) => {
    setCvData(prev => {
      const projs = [...prev.projects];
      projs[index] = { ...projs[index], [field]: val };
      return { ...prev, projects: projs };
    });
  };

  const removeProject = (index) => {
    setCvData(prev => ({
      ...prev,
      projects: prev.projects.filter((_, i) => i !== index)
    }));
  };

  // Certification handlers
  const addCertification = () => {
    setCvData(prev => ({
      ...prev,
      certifications: [
        ...prev.certifications,
        { name: '', issuer: '', year: '' }
      ]
    }));
  };

  const updateCertification = (index, field, val) => {
    setCvData(prev => {
      const certs = [...prev.certifications];
      certs[index] = { ...certs[index], [field]: val };
      return { ...prev, certifications: certs };
    });
  };

  const removeCertification = (index) => {
    setCvData(prev => ({
      ...prev,
      certifications: prev.certifications.filter((_, i) => i !== index)
    }));
  };

  // Save CV to system
  const handleSaveCV = async () => {
    if (!cvTitle.trim()) {
      setSaveError('Vui lòng nhập tên/tiêu đề bản CV');
      return;
    }

    setSaving(true);
    setSaveError('');
    setSaveSuccess('');

    const payload = {
      title: cvTitle.trim(),
      template,
      cvData,
      isPrimary
    };

    try {
      if (editCvId) {
        await api.put(`/candidate/cv/online/${editCvId}`, payload);
        setSaveSuccess('Cập nhật bản CV thành công!');
      } else {
        const res = await api.post('/candidate/cv/online', payload);
        setSaveSuccess('Lưu bản CV mới thành công!');
        if (res.data.data?.CVID) {
          navigate(`/candidate/cv-builder?id=${res.data.data.CVID}`, { replace: true });
        }
      }
    } catch (err) {
      setSaveError(err.response?.data?.message || 'Có lỗi khi lưu CV lên hệ thống');
    } finally {
      setSaving(false);
    }
  };

  // Export PDF / Print trigger
  const handleExportPDF = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/3 mx-auto"></div>
        <div className="h-96 bg-gray-200 rounded-3xl max-w-5xl mx-auto"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/70 pb-16">
      
      {/* Top Action Header Bar (Hidden on Print) */}
      <div className="bg-white border-b border-gray-200 sticky top-16 z-40 print:hidden shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          
          {/* Back & Title */}
          <div className="flex items-center gap-3">
            <Link
              to="/candidate/dashboard"
              className="p-2 rounded-xl text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
              title="Quay lại Dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={cvTitle}
                  onChange={(e) => setCvTitle(e.target.value)}
                  className="text-sm sm:text-base font-black text-gray-900 bg-transparent border-b border-dashed border-gray-300 hover:border-brand-blue focus:border-brand-blue focus:outline-none px-1 py-0.5"
                  placeholder="Tiêu đề bản CV..."
                />
              </div>
              <p className="text-[11px] text-gray-500">
                Chỉnh sửa trực quan • Tự động render chuẩn A4
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={handlePrefillFromProfile}
              type="button"
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-gray-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors"
              title="Lấy dữ liệu từ hồ sơ cá nhân"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Đồng bộ từ hồ sơ</span>
            </button>

            <button
              onClick={handleExportPDF}
              type="button"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-all"
              title="Xuất file PDF hoặc In"
            >
              <Printer className="w-4 h-4 text-slate-600" />
              <span>Xuất PDF / In</span>
            </button>

            <button
              onClick={handleSaveCV}
              disabled={saving}
              type="button"
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-all disabled:opacity-60"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Đang lưu...' : 'Lưu phiên bản CV'}</span>
            </button>
          </div>

        </div>
      </div>

      {/* Notifications */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 print:hidden">
        {saveSuccess && (
          <div className="mb-4 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{saveSuccess} Bạn có thể sử dụng bản CV này để ứng tuyển ngay lập tức.</span>
            </div>
            <button onClick={() => setSaveSuccess('')} className="text-emerald-700 hover:text-emerald-900 font-bold">✕</button>
          </div>
        )}
        {saveError && (
          <div className="mb-4 p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs font-bold flex items-center justify-between animate-in fade-in">
            <span>{saveError}</span>
            <button onClick={() => setSaveError('')} className="text-red-700 hover:text-red-900 font-bold">✕</button>
          </div>
        )}
      </div>

      {/* Main Workspace Layout (2 Columns: Editor Left + Live Preview Right) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* ======================================================== */}
          {/* LEFT COLUMN: VISUAL FORM CONTROLS & SETTINGS (5/12) */}
          {/* ======================================================== */}
          <div className="lg:col-span-5 space-y-6 print:hidden">
            
            {/* 1. Template & Theme Customizer Card */}
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-200/80 shadow-card space-y-5">
              
              {/* Template Picker */}
              <div className="space-y-2.5">
                <label className="text-xs font-black text-gray-800 uppercase flex items-center gap-2">
                  <Layout className="w-4 h-4 text-brand-blue" />
                  <span>Chọn Mẫu Template CV</span>
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    { id: 'modern', name: 'Modern', desc: 'Hiện đại, 2 cột' },
                    { id: 'minimal', name: 'Minimal', desc: 'Tối giản, tinh tế' },
                    { id: 'professional', name: 'Professional', desc: 'Executive sang trọng' }
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTemplate(t.id)}
                      className={`p-3 rounded-2xl border text-left transition-all relative ${
                        template === t.id
                          ? 'border-brand-blue bg-blue-50/50 shadow-xs ring-2 ring-brand-blue/20'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      {template === t.id && (
                        <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-brand-blue"></span>
                      )}
                      <p className="text-xs font-bold text-gray-900">{t.name}</p>
                      <p className="text-[10px] text-gray-500 mt-0.5">{t.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Theme Color Picker */}
              <div className="space-y-2.5">
                <label className="text-xs font-black text-gray-800 uppercase flex items-center gap-2">
                  <Palette className="w-4 h-4 text-purple-600" />
                  <span>Tông Màu Chủ Đạo</span>
                </label>
                <div className="flex flex-wrap gap-3 items-center">
                  {Object.entries(THEME_COLORS).map(([k, col]) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setTheme(k)}
                      title={col.name}
                      className={`w-8 h-8 rounded-full border-2 transition-transform ${
                        theme === k ? 'scale-125 border-gray-900 shadow-md' : 'border-transparent hover:scale-110'
                      }`}
                      style={{ backgroundColor: col.primary }}
                    />
                  ))}
                  <span className="text-xs text-gray-500 font-semibold pl-2">
                    {THEME_COLORS[theme]?.name}
                  </span>
                </div>
              </div>

              {/* Set as Primary CV checkbox */}
              <div className="pt-2 border-t border-gray-100 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="primaryCheck"
                  checked={isPrimary}
                  onChange={(e) => setIsPrimary(e.target.checked)}
                  className="rounded text-brand-blue focus:ring-brand-blue w-4 h-4 cursor-pointer"
                />
                <label htmlFor="primaryCheck" className="text-xs font-bold text-gray-700 cursor-pointer">
                  Đặt làm CV mặc định khi nộp hồ sơ
                </label>
              </div>

            </div>

            {/* 2. Visual Content Editor (Section Tabs) */}
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-200/80 shadow-card space-y-5">
              
              {/* Navigation Pill Buttons */}
              <div className="flex flex-wrap gap-1.5 pb-2 border-b border-gray-100">
                {[
                  { id: 'personal', label: 'Thông tin', icon: User },
                  { id: 'summary', label: 'Giới thiệu', icon: FileText },
                  { id: 'experience', label: 'Kinh nghiệm', icon: Briefcase },
                  { id: 'education', label: 'Học vấn', icon: GraduationCap },
                  { id: 'skills', label: 'Kỹ năng', icon: CheckCircle2 },
                  { id: 'projects', label: 'Dự án & Khác', icon: FolderGit2 }
                ].map((s) => {
                  const Icon = s.icon;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setActiveSection(s.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        activeSection === s.id
                          ? 'bg-brand-blue text-white shadow-xs'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{s.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* TAB 1: Personal Info */}
              {activeSection === 'personal' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-gray-700">Họ và tên *</label>
                      <input
                        type="text"
                        value={cvData.personal.fullName}
                        onChange={(e) => updatePersonalInfo('fullName', e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-semibold focus:border-brand-blue focus:outline-none"
                        placeholder="Nguyễn Văn A"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-gray-700">Chức danh / Tiêu đề *</label>
                      <input
                        type="text"
                        value={cvData.personal.headline}
                        onChange={(e) => updatePersonalInfo('headline', e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-semibold focus:border-brand-blue focus:outline-none"
                        placeholder="Fullstack Developer"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-gray-700">Email *</label>
                      <input
                        type="email"
                        value={cvData.personal.email}
                        onChange={(e) => updatePersonalInfo('email', e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-semibold focus:border-brand-blue focus:outline-none"
                        placeholder="nguyenvana@gmail.com"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-gray-700">Số điện thoại *</label>
                      <input
                        type="text"
                        value={cvData.personal.phone}
                        onChange={(e) => updatePersonalInfo('phone', e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-semibold focus:border-brand-blue focus:outline-none"
                        placeholder="0912 345 678"
                      />
                    </div>

                    <div className="space-y-1 sm:col-span-2">
                      <label className="text-[11px] font-bold text-gray-700">Địa chỉ / Tỉnh thành</label>
                      <input
                        type="text"
                        value={cvData.personal.location}
                        onChange={(e) => updatePersonalInfo('location', e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-semibold focus:border-brand-blue focus:outline-none"
                        placeholder="Hà Nội, Việt Nam"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-gray-700">LinkedIn URL</label>
                      <input
                        type="text"
                        value={cvData.personal.linkedin}
                        onChange={(e) => updatePersonalInfo('linkedin', e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-semibold focus:border-brand-blue focus:outline-none"
                        placeholder="linkedin.com/in/username"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-gray-700">GitHub URL</label>
                      <input
                        type="text"
                        value={cvData.personal.github}
                        onChange={(e) => updatePersonalInfo('github', e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-semibold focus:border-brand-blue focus:outline-none"
                        placeholder="github.com/username"
                      />
                    </div>

                    <div className="space-y-1 sm:col-span-2">
                      <label className="text-[11px] font-bold text-gray-700">Portfolio / Website cá nhân</label>
                      <input
                        type="text"
                        value={cvData.personal.portfolio}
                        onChange={(e) => updatePersonalInfo('portfolio', e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-semibold focus:border-brand-blue focus:outline-none"
                        placeholder="https://myportfolio.dev"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: Summary */}
              {activeSection === 'summary' && (
                <div className="space-y-3 animate-in fade-in duration-150">
                  <label className="text-[11px] font-bold text-gray-700">
                    Tóm tắt chuyên môn / Mục tiêu sự nghiệp
                  </label>
                  <textarea
                    rows={6}
                    value={cvData.summary}
                    onChange={(e) => setCvData(prev => ({ ...prev, summary: e.target.value }))}
                    placeholder="Mô tả ngắn gọn về kinh nghiệm cốt lõi, thế mạnh nổi bật và mục tiêu phát triển của bạn..."
                    className="w-full p-3 rounded-2xl border border-gray-200 text-xs font-medium focus:border-brand-blue focus:outline-none leading-relaxed"
                  />
                </div>
              )}

              {/* TAB 3: Work Experience */}
              {activeSection === 'experience' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-700">Lịch sử làm việc</span>
                    <button
                      type="button"
                      onClick={addExperience}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-50 text-brand-blue hover:bg-blue-100 text-xs font-bold transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" /> Thêm công ty
                    </button>
                  </div>

                  <div className="space-y-4">
                    {cvData.experiences.map((exp, idx) => (
                      <div key={idx} className="p-4 rounded-2xl border border-gray-200 bg-gray-50/50 space-y-3 relative group">
                        <button
                          type="button"
                          onClick={() => removeExperience(idx)}
                          className="absolute top-3 right-3 text-gray-400 hover:text-red-500 p-1 rounded-lg hover:bg-red-50 transition-colors"
                          title="Xóa mục này"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>

                        <div className="grid grid-cols-2 gap-2.5 pr-8">
                          <input
                            type="text"
                            value={exp.company}
                            onChange={(e) => updateExperience(idx, 'company', e.target.value)}
                            placeholder="Tên công ty"
                            className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold bg-white"
                          />
                          <input
                            type="text"
                            value={exp.role || exp.position}
                            onChange={(e) => updateExperience(idx, 'role', e.target.value)}
                            placeholder="Vị trí / Chức danh"
                            className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold bg-white"
                          />
                          <input
                            type="text"
                            value={exp.duration}
                            onChange={(e) => updateExperience(idx, 'duration', e.target.value)}
                            placeholder="Thời gian (VD: 2021 - 2023)"
                            className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs bg-white"
                          />
                          <input
                            type="text"
                            value={exp.location}
                            onChange={(e) => updateExperience(idx, 'location', e.target.value)}
                            placeholder="Địa điểm (VD: Hà Nội)"
                            className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs bg-white"
                          />
                        </div>

                        <textarea
                          rows={3}
                          value={exp.description}
                          onChange={(e) => updateExperience(idx, 'description', e.target.value)}
                          placeholder="Mô tả công việc, các dự án và thành tựu nổi bật..."
                          className="w-full p-2.5 rounded-xl border border-gray-200 text-xs font-medium bg-white focus:outline-none"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 4: Education */}
              {activeSection === 'education' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-700">Trình độ học vấn</span>
                    <button
                      type="button"
                      onClick={addEducation}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-50 text-brand-blue hover:bg-blue-100 text-xs font-bold transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" /> Thêm trường học
                    </button>
                  </div>

                  <div className="space-y-3">
                    {cvData.educations.map((edu, idx) => (
                      <div key={idx} className="p-3.5 rounded-2xl border border-gray-200 bg-gray-50/50 space-y-2 relative">
                        <button
                          type="button"
                          onClick={() => removeEducation(idx)}
                          className="absolute top-3 right-3 text-gray-400 hover:text-red-500 p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>

                        <div className="grid grid-cols-2 gap-2 pr-6">
                          <input
                            type="text"
                            value={edu.school || edu.institution}
                            onChange={(e) => updateEducation(idx, 'school', e.target.value)}
                            placeholder="Tên trường ĐH / CĐ"
                            className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold bg-white"
                          />
                          <input
                            type="text"
                            value={edu.degree || edu.major}
                            onChange={(e) => updateEducation(idx, 'degree', e.target.value)}
                            placeholder="Ngành / Bằng cấp"
                            className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold bg-white"
                          />
                          <input
                            type="text"
                            value={edu.year || edu.duration}
                            onChange={(e) => updateEducation(idx, 'year', e.target.value)}
                            placeholder="Niên khóa (VD: 2018 - 2022)"
                            className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs bg-white"
                          />
                          <input
                            type="text"
                            value={edu.gpa}
                            onChange={(e) => updateEducation(idx, 'gpa', e.target.value)}
                            placeholder="GPA (VD: 3.5/4.0)"
                            className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs bg-white"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 5: Skills */}
              {activeSection === 'skills' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-gray-700">
                      Kỹ năng chuyên môn (cách nhau bởi dấu phẩy)
                    </label>
                    <textarea
                      rows={3}
                      value={hardSkillsText}
                      onChange={(e) => handleHardSkillChange(e.target.value)}
                      placeholder="React.js, Node.js, SQL Server, Docker, TypeScript..."
                      className="w-full p-2.5 rounded-xl border border-gray-200 text-xs font-medium focus:outline-none focus:border-blue-600"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-gray-700">
                      Kỹ năng mềm (cách nhau bởi dấu phẩy)
                    </label>
                    <input
                      type="text"
                      value={softSkillsText}
                      onChange={(e) => handleSoftSkillChange(e.target.value)}
                      placeholder="Giao tiếp, Làm việc nhóm, Giải quyết vấn đề..."
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-medium focus:outline-none focus:border-blue-600"
                    />
                  </div>
                </div>
              )}

              {/* TAB 6: Projects & Certifications */}
              {activeSection === 'projects' && (
                <div className="space-y-5 animate-in fade-in duration-150">
                  {/* Projects */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-700">Dự án tiêu biểu</span>
                      <button
                        type="button"
                        onClick={addProject}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-blue-50 text-brand-blue text-[11px] font-bold"
                      >
                        <Plus className="w-3 h-3" /> Thêm dự án
                      </button>
                    </div>

                    {cvData.projects.map((proj, idx) => (
                      <div key={idx} className="p-3 rounded-xl border border-gray-200 bg-gray-50/50 space-y-2 relative">
                        <button
                          type="button"
                          onClick={() => removeProject(idx)}
                          className="absolute top-2.5 right-2.5 text-gray-400 hover:text-red-500"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <div className="grid grid-cols-2 gap-2 pr-6">
                          <input
                            type="text"
                            value={proj.name || proj.title}
                            onChange={(e) => updateProject(idx, 'name', e.target.value)}
                            placeholder="Tên dự án"
                            className="px-2.5 py-1 rounded-lg border text-xs font-semibold bg-white"
                          />
                          <input
                            type="text"
                            value={proj.link}
                            onChange={(e) => updateProject(idx, 'link', e.target.value)}
                            placeholder="Link dự án / demo"
                            className="px-2.5 py-1 rounded-lg border text-xs bg-white"
                          />
                        </div>
                        <input
                          type="text"
                          value={proj.techStack}
                          onChange={(e) => updateProject(idx, 'techStack', e.target.value)}
                          placeholder="Công nghệ sử dụng (Tech Stack)"
                          className="w-full px-2.5 py-1 rounded-lg border text-xs bg-white"
                        />
                        <textarea
                          rows={2}
                          value={proj.description}
                          onChange={(e) => updateProject(idx, 'description', e.target.value)}
                          placeholder="Mô tả chức năng chính..."
                          className="w-full p-2 rounded-lg border text-xs bg-white"
                        />
                      </div>
                    ))}
                  </div>

                  {/* Certifications */}
                  <div className="space-y-3 pt-3 border-t border-gray-100">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-700">Chứng chỉ nghề nghiệp</span>
                      <button
                        type="button"
                        onClick={addCertification}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-blue-50 text-brand-blue text-[11px] font-bold"
                      >
                        <Plus className="w-3 h-3" /> Thêm chứng chỉ
                      </button>
                    </div>

                    {cvData.certifications.map((cert, idx) => (
                      <div key={idx} className="p-3 rounded-xl border border-gray-200 bg-gray-50/50 space-y-2 relative">
                        <button
                          type="button"
                          onClick={() => removeCertification(idx)}
                          className="absolute top-2.5 right-2.5 text-gray-400 hover:text-red-500"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <div className="grid grid-cols-2 gap-2 pr-6">
                          <input
                            type="text"
                            value={cert.name || cert.title}
                            onChange={(e) => updateCertification(idx, 'name', e.target.value)}
                            placeholder="Tên chứng chỉ"
                            className="px-2.5 py-1 rounded-lg border text-xs font-semibold bg-white"
                          />
                          <input
                            type="text"
                            value={cert.issuer}
                            onChange={(e) => updateCertification(idx, 'issuer', e.target.value)}
                            placeholder="Đơn vị cấp"
                            className="px-2.5 py-1 rounded-lg border text-xs bg-white"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>

          </div>

          {/* ======================================================== */}
          {/* RIGHT COLUMN: LIVE PREVIEW & A4 CANVAS (7/12) */}
          {/* ======================================================== */}
          <div className="lg:col-span-7 space-y-4">
            
            {/* Canvas Controls Header (Hidden on Print) */}
            <div className="bg-white px-5 py-3 rounded-2xl border border-gray-200/80 shadow-xs flex items-center justify-between print:hidden">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-brand-blue" />
                <span className="text-xs font-bold text-gray-800">
                  Live Preview: Mẫu {template.toUpperCase()}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-gray-500">
                <span>Khổ A4 Chuẩn</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold">
                  Sẵn sàng in PDF
                </span>
              </div>
            </div>

            {/* Printable Paper Canvas Container */}
            <div className="bg-gray-200/60 p-4 sm:p-6 rounded-3xl overflow-x-auto flex justify-center shadow-inner border border-gray-300/60 print:p-0 print:bg-white print:border-0">
              <div className="w-full max-w-[800px] bg-white rounded-xl shadow-2xl overflow-hidden print:shadow-none print:w-full print:max-w-none">
                <CVRenderer template={template} cvData={cvData} theme={theme} />
              </div>
            </div>

          </div>

        </div>
      </div>

    </div>
  );
}
