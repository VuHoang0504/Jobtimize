import React, { useState, useEffect, useRef } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import MatchScoreBadge from '../../components/common/MatchScoreBadge';
import { validatePassword } from '../../utils/validation';
import { 
  User, 
  FileText, 
  Bookmark, 
  Send, 
  Sparkles, 
  Upload, 
  Trash2, 
  CheckCircle2, 
  DollarSign, 
  MapPin, 
  Phone, 
  Mail, 
  Edit3, 
  Save, 
  Star,
  ExternalLink,
  BookOpen,
  Camera,
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  ShieldCheck,
  RefreshCw,
  Bot,
  Globe,
  Linkedin,
  Github,
  Award,
  Briefcase,
  GraduationCap,
  Layers,
  FolderGit2,
  Users
} from 'lucide-react';
import MockInterviewSection from '../../components/candidate/MockInterviewSection';

export default function CandidateDashboard() {
  const { user, refreshUser } = useAuth();
  const location = useLocation();

  // Tab state
  const queryParams = new URLSearchParams(location.search);
  const initialTab = queryParams.get('tab') || 'profile';
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    const tab = new URLSearchParams(location.search).get('tab');
    if (tab) {
      setActiveTab(tab);
    }
  }, [location.search]);

  // Profile data state
  const [profile, setProfile] = useState(null);
  const [applications, setApplications] = useState([]);
  const [savedJobs, setSavedJobs] = useState([]);
  const [skillGapData, setSkillGapData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Edit profile state
  const [isEditing, setIsEditing] = useState(false);
  const [headline, setHeadline] = useState('');
  const [bio, setBio] = useState('');
  const [desiredSalary, setDesiredSalary] = useState('');
  const [currentLocation, setCurrentLocation] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [linkedinLink, setLinkedinLink] = useState('');
  const [githubLink, setGithubLink] = useState('');
  const [portfolioLink, setPortfolioLink] = useState('');
  const [profileAdditionalTab, setProfileAdditionalTab] = useState('projects');
  const [savingProfile, setSavingProfile] = useState(false);

  // Structured profile fields from AI / Bio JSON
  const [parsedBioData, setParsedBioData] = useState({
    bioText: '',
    links: { linkedin: '', github: '', portfolio: '' },
    skills: { hardSkills: [], softSkills: [], languages: [] },
    experiences: [],
    educations: [],
    additionalInfo: { projects: [], certifications: [], activities: [], references: [] }
  });

  // CV upload state
  const [cvTitle, setCvTitle] = useState('');
  const [cvFile, setCvFile] = useState(null);
  const [uploadingCv, setUploadingCv] = useState(false);

  // Avatar upload state
  const fileInputRef = useRef(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarSuccess, setAvatarSuccess] = useState('');
  const [avatarError, setAvatarError] = useState('');

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const fetchProfileData = async () => {
    try {
      const res = await api.get('/candidate/profile');
      if (res.data.success) {
        const p = res.data.data;
        setProfile(p);
        setHeadline(p.Headline || '');
        setDesiredSalary(p.DesiredSalary || '');
        setCurrentLocation(p.CurrentLocation || '');
        setFullName(p.FullName || '');
        setPhone(p.Phone || '');

        let parsed = null;
        let cleanBioText = '';

        if (p.Bio && typeof p.Bio === 'string') {
          const rawBio = p.Bio.trim();
          if (rawBio.startsWith('{')) {
            try {
              parsed = JSON.parse(rawBio);
            } catch (e) {
              console.warn('Bio parse JSON failed:', e);
            }
          } else {
            cleanBioText = rawBio;
          }
        }

        if (parsed) {
          const rawTextVal = parsed.bioText || parsed.bio || parsed.summary || '';
          cleanBioText = (typeof rawTextVal === 'string' && !rawTextVal.trim().startsWith('{')) ? rawTextVal.trim() : '';
          setBio(cleanBioText);
          setParsedBioData({
            bioText: cleanBioText,
            links: parsed.links || { linkedin: '', github: '', portfolio: '' },
            skills: parsed.skills || { hardSkills: [], softSkills: [], languages: [] },
            experiences: Array.isArray(parsed.experiences) ? parsed.experiences : [],
            educations: Array.isArray(parsed.educations) ? parsed.educations : [],
            additionalInfo: parsed.additionalInfo || { projects: [], certifications: [], activities: [], references: [] }
          });
          if (parsed.links) {
            setLinkedinLink(parsed.links.linkedin || '');
            setGithubLink(parsed.links.github || '');
            setPortfolioLink(parsed.links.portfolio || '');
          }
        } else {
          setBio(cleanBioText);
          setParsedBioData({
            bioText: cleanBioText,
            links: { linkedin: '', github: '', portfolio: '' },
            skills: { hardSkills: [], softSkills: [], languages: [] },
            experiences: [],
            educations: [],
            additionalInfo: { projects: [], certifications: [], activities: [], references: [] }
          });
        }
      }
    } catch (err) {
      console.error('Fetch candidate profile error:', err);
    }
  };

  const fetchApplications = async () => {
    try {
      const res = await api.get('/candidate/applications');
      if (res.data.success) setApplications(res.data.data);
    } catch (err) {
      console.error('Fetch applications error:', err);
    }
  };

  const fetchSavedJobs = async () => {
    try {
      const res = await api.get('/candidate/saved-jobs');
      if (res.data.success) setSavedJobs(res.data.data);
    } catch (err) {
      console.error('Fetch saved jobs error:', err);
    }
  };

  const fetchSkillGap = async () => {
    try {
      const res = await api.get('/candidate/skill-gap');
      if (res.data.success) setSkillGapData(res.data.data);
    } catch (err) {
      console.error('Fetch skill gap error:', err);
    }
  };

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      await Promise.all([fetchProfileData(), fetchApplications(), fetchSavedJobs(), fetchSkillGap()]);
      setLoading(false);
    };
    loadAll();
  }, [user]);

  // Handle Profile Update
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    try {
      setSavingProfile(true);
      const cleanBio = (bio || '').trim();
      const updatedPayload = {
        ...parsedBioData,
        bioText: cleanBio,
        bio: cleanBio,
        links: {
          linkedin: (linkedinLink || '').trim(),
          github: (githubLink || '').trim(),
          portfolio: (portfolioLink || '').trim()
        }
      };

      await api.put('/candidate/profile', {
        headline: (headline || '').trim(),
        bio: JSON.stringify(updatedPayload),
        desiredSalary: desiredSalary ? parseFloat(desiredSalary) : null,
        currentLocation: (currentLocation || '').trim(),
        fullName: (fullName || '').trim(),
        phone: (phone || '').trim()
      });
      await fetchProfileData();
      await refreshUser();
      setIsEditing(false);
    } catch (err) {
      alert('Lỗi cập nhật hồ sơ: ' + (err.response?.data?.message || err.message));
    } finally {
      setSavingProfile(false);
    }
  };

  // Handle CV Upload
  const handleUploadCV = async (e) => {
    e.preventDefault();
    if (!cvFile) return alert('Vui lòng chọn file CV');

    const formData = new FormData();
    formData.append('cvFile', cvFile);
    formData.append('title', cvTitle);

    try {
      setUploadingCv(true);
      await api.post('/candidate/cv', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setCvTitle('');
      setCvFile(null);
      await fetchProfileData();
    } catch (err) {
      alert('Lỗi tải lên CV: ' + (err.response?.data?.message || err.message));
    } finally {
      setUploadingCv(false);
    }
  };

  // Set Primary CV
  const handleSetPrimaryCV = async (cvId) => {
    try {
      await api.put(`/candidate/cv/${cvId}/primary`);
      await fetchProfileData();
    } catch (err) {
      console.error('Set primary CV error:', err);
    }
  };

  // Delete CV
  const handleDeleteCV = async (cvId) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa bản CV này?')) return;
    try {
      await api.delete(`/candidate/cv/${cvId}`);
      await fetchProfileData();
    } catch (err) {
      console.error('Delete CV error:', err);
    }
  };

  // Handle Avatar Upload from File
  const handleAvatarFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setAvatarError('Vui lòng chọn file hình ảnh (PNG, JPG, JPEG, WEBP)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setAvatarError('Kích thước ảnh tối đa là 5MB');
      return;
    }

    const formData = new FormData();
    formData.append('avatar', file);

    setAvatarUploading(true);
    setAvatarError('');
    setAvatarSuccess('');

    try {
      const res = await api.post('/auth/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data.success) {
        setAvatarSuccess('Cập nhật ảnh đại diện thành công!');
        await refreshUser();
        await fetchProfileData();
      }
    } catch (err) {
      setAvatarError(err.response?.data?.message || 'Lỗi khi tải ảnh đại diện lên');
    } finally {
      setAvatarUploading(false);
    }
  };


  // Handle Change Password
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    const pwdErr = validatePassword(newPassword);
    if (pwdErr) {
      setPasswordError(pwdErr);
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setPasswordError('Mật khẩu mới và xác nhận mật khẩu không trùng khớp');
      return;
    }

    setPasswordLoading(true);

    try {
      const res = await api.post('/auth/change-password', {
        currentPassword,
        newPassword
      });
      if (res.data.success) {
        setPasswordSuccess('Đổi mật khẩu thành công!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
      }
    } catch (err) {
      setPasswordError(err.response?.data?.message || 'Đổi mật khẩu thất bại. Vui lòng kiểm tra lại mật khẩu hiện tại.');
    } finally {
      setPasswordLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center animate-pulse space-y-4">
        <div className="h-6 bg-gray-200 rounded w-1/4 mx-auto"></div>
        <div className="h-64 bg-gray-200 rounded-2xl max-w-4xl mx-auto"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Dashboard Top Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/80 shadow-card flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-5 flex-1">
          <div className="relative group shrink-0">
            <img
              src={user?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&q=80'}
              alt={user?.fullName}
              className="w-20 h-20 rounded-2xl object-cover border-2 border-brand-blue/30 shadow-md group-hover:opacity-90 transition-opacity"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={avatarUploading}
              title="Thay đổi ảnh đại diện"
              className="absolute -bottom-1 -right-1 p-2 rounded-xl bg-brand-blue text-white shadow-md hover:bg-brand-dark hover:scale-105 transition-all cursor-pointer"
            >
              {avatarUploading ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Camera className="w-3.5 h-3.5" />
              )}
            </button>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/png,image/jpeg,image/jpg,image/webp"
              onChange={handleAvatarFileSelect}
              className="hidden"
            />
          </div>
          <div className="space-y-1.5 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                {profile?.FullName || user?.fullName}
              </h1>
              <CheckCircle2 className="w-5 h-5 text-brand-blue fill-brand-light" />
            </div>
            <p className="text-sm font-bold text-brand-blue">
              {profile?.Headline || 'Ứng viên Jobtimize'}
            </p>
            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 pt-0.5">
              <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5 text-brand-blue" /> {profile?.Email}</span>
              {profile?.Phone && <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5 text-emerald-600" /> {profile.Phone}</span>}
              {profile?.CurrentLocation && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-red-500" /> {profile.CurrentLocation}</span>}
            </div>
            {/* Social / Portfolio Links */}
            {(parsedBioData.links?.linkedin || parsedBioData.links?.github || parsedBioData.links?.portfolio) && (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {parsedBioData.links.linkedin && (
                  <a
                    href={parsedBioData.links.linkedin.startsWith('http') ? parsedBioData.links.linkedin : `https://${parsedBioData.links.linkedin}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-[11px] font-semibold transition-colors"
                  >
                    <Linkedin className="w-3 h-3" /> LinkedIn
                  </a>
                )}
                {parsedBioData.links.github && (
                  <a
                    href={parsedBioData.links.github.startsWith('http') ? parsedBioData.links.github : `https://${parsedBioData.links.github}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-gray-100 text-gray-800 hover:bg-gray-200 text-[11px] font-semibold transition-colors"
                  >
                    <Github className="w-3 h-3" /> GitHub
                  </a>
                )}
                {parsedBioData.links.portfolio && (
                  <a
                    href={parsedBioData.links.portfolio.startsWith('http') ? parsedBioData.links.portfolio : `https://${parsedBioData.links.portfolio}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-[11px] font-semibold transition-colors"
                  >
                    <Globe className="w-3 h-3" /> Portfolio
                  </a>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Action Toggle */}
        <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-2xl border border-gray-200/80 shrink-0">
          <div className="text-right">
            <p className="text-xs font-bold text-gray-800">Trạng thái tìm việc</p>
            <p className="text-[11px] text-gray-500">{profile?.IsLookingForJob ? 'Bật hiển thị với NTD' : 'Tạm dừng tìm việc'}</p>
          </div>
          <span className={`px-3 py-1 text-xs font-bold rounded-xl ${profile?.IsLookingForJob ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-600'}`}>
            {profile?.IsLookingForJob ? 'ĐANG TÌM VIỆC' : 'ĐÃ TẮT'}
          </span>
        </div>
      </div>

      {/* Main Content Grid: Tabs Left & Panel Right */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Navigation Sidebar (1/4) */}
        <div className="lg:col-span-1 space-y-2">
          <div className="bg-white rounded-3xl p-3 border border-gray-200/80 shadow-card space-y-1">
            <button
              onClick={() => setActiveTab('profile')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all text-left ${
                activeTab === 'profile'
                  ? 'bg-brand-blue text-white shadow-md shadow-brand-blue/20'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <User className="w-4 h-4" />
              <span>Hồ sơ & Quản lý CV</span>
            </button>

            <button
              onClick={() => setActiveTab('applications')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold transition-all text-left ${
                activeTab === 'applications'
                  ? 'bg-brand-blue text-white shadow-md shadow-brand-blue/20'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <Send className="w-4 h-4" />
                <span>Việc đã ứng tuyển</span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-white/20 text-current">
                {applications.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('saved')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold transition-all text-left ${
                activeTab === 'saved'
                  ? 'bg-brand-blue text-white shadow-md shadow-brand-blue/20'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <Bookmark className="w-4 h-4" />
                <span>Việc làm đã lưu</span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-white/20 text-current">
                {savedJobs.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('skillgap')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all text-left ${
                activeTab === 'skillgap'
                  ? 'bg-gradient-to-r from-brand-purple to-indigo-600 text-white shadow-md shadow-brand-purple/20'
                  : 'text-brand-purple hover:bg-brand-purpleLight/50'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>AI Skill Gap & Khóa học</span>
            </button>

            <button
              onClick={() => setActiveTab('interview')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold transition-all text-left ${
                activeTab === 'interview'
                  ? 'bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 text-white shadow-md shadow-purple-500/20'
                  : 'text-purple-700 bg-purple-50/50 hover:bg-purple-100/80'
              }`}
            >
              <div className="flex items-center gap-3">
                <Bot className="w-4 h-4" />
                <span>Luyện phỏng vấn AI</span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold ${activeTab === 'interview' ? 'bg-white/20 text-white' : 'bg-purple-200 text-purple-800'}`}>
                UC-C15
              </span>
            </button>

            <button
              onClick={() => setActiveTab('security')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all text-left ${
                activeTab === 'security'
                  ? 'bg-brand-blue text-white shadow-md shadow-brand-blue/20'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <KeyRound className="w-4 h-4" />
              <span>Đổi mật khẩu & Avatar</span>
            </button>
          </div>
        </div>

        {/* Tab Content (3/4) */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* TAB 1: Profile & CV Manager */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              
              {/* Profile Details Edit Card */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/80 shadow-card space-y-6">
                <div className="flex items-center justify-between border-b border-gray-100 pb-4 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <User className="w-5 h-5 text-brand-blue" />
                    <h2 className="text-base font-bold text-gray-900">Thông tin cá nhân & Giới thiệu</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsCvParserOpen(true)}
                      className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-bold transition-all shadow-md shadow-purple-500/20 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>AI Trích xuất CV</span>
                    </button>
                    <button
                      onClick={() => setIsEditing(!isEditing)}
                      className="px-3.5 py-1.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      {isEditing ? 'Hủy' : 'Chỉnh sửa'}
                    </button>
                  </div>
                </div>

                {isEditing ? (
                  <form onSubmit={handleSaveProfile} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Họ và tên</label>
                        <input
                          type="text"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          className="w-full p-3 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-brand-blue/20"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Số điện thoại</label>
                        <input
                          type="text"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="w-full p-3 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-brand-blue/20"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Chức danh / Headline</label>
                        <input
                          type="text"
                          value={headline}
                          onChange={(e) => setHeadline(e.target.value)}
                          placeholder="Ví dụ: Senior Frontend Developer (React/Next.js)"
                          className="w-full p-3 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-brand-blue/20"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Địa điểm sinh sống</label>
                        <input
                          type="text"
                          value={currentLocation}
                          onChange={(e) => setCurrentLocation(e.target.value)}
                          placeholder="Hà Nội, Việt Nam"
                          className="w-full p-3 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-brand-blue/20"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Mức lương mong muốn (VNĐ / Tháng)</label>
                      <input
                        type="number"
                        value={desiredSalary}
                        onChange={(e) => setDesiredSalary(e.target.value)}
                        placeholder="25000000"
                        className="w-full p-3 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-brand-blue/20"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Tóm tắt bản thân / Mục tiêu nghề nghiệp (3-4 câu)</label>
                      <textarea
                        rows={3}
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        placeholder="Tóm tắt điểm mạnh, số năm kinh nghiệm, giá trị mang lại và định hướng sự nghiệp..."
                        className="w-full p-3 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-brand-blue/20"
                      />
                    </div>

                    {/* Social Links Editing */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                      <div>
                        <label className="block text-[11px] font-bold text-gray-600 mb-1">LinkedIn URL</label>
                        <input
                          type="text"
                          value={linkedinLink}
                          onChange={(e) => setLinkedinLink(e.target.value)}
                          placeholder="linkedin.com/in/username"
                          className="w-full p-2.5 rounded-xl border border-gray-200 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-gray-600 mb-1">GitHub URL</label>
                        <input
                          type="text"
                          value={githubLink}
                          onChange={(e) => setGithubLink(e.target.value)}
                          placeholder="github.com/username"
                          className="w-full p-2.5 rounded-xl border border-gray-200 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-gray-600 mb-1">Portfolio / Website</label>
                        <input
                          type="text"
                          value={portfolioLink}
                          onChange={(e) => setPortfolioLink(e.target.value)}
                          placeholder="portfolio.dev"
                          className="w-full p-2.5 rounded-xl border border-gray-200 text-xs"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        type="submit"
                        disabled={savingProfile}
                        className="px-6 py-2.5 rounded-xl bg-brand-blue text-white font-bold text-xs shadow-md flex items-center gap-2"
                      >
                        <Save className="w-4 h-4" />
                        {savingProfile ? 'Đang lưu...' : 'Lưu thông tin'}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-6 text-sm text-gray-700">
                    
                    {/* 1. Summary & Desired Salary */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-2xl bg-gray-50 border border-gray-100">
                      <div className="sm:col-span-2 space-y-1">
                        <p className="text-[10px] font-bold text-gray-400 uppercase">Tóm tắt bản thân & Mục tiêu</p>
                        <p className="text-gray-700 text-xs leading-relaxed whitespace-pre-line">
                          {parsedBioData.bioText || profile?.Bio || 'Chưa có thông tin tóm tắt.'}
                        </p>
                      </div>
                      <div className="space-y-1 sm:border-l sm:border-gray-200 sm:pl-4">
                        <p className="text-[10px] font-bold text-gray-400 uppercase">Mức lương mong muốn</p>
                        <p className="font-bold text-emerald-600 text-sm">
                          {profile?.DesiredSalary ? `${profile.DesiredSalary.toLocaleString()} VNĐ` : 'Thỏa thuận'}
                        </p>
                      </div>
                    </div>

                    {/* 2. Skills Section */}
                    {(parsedBioData.skills?.hardSkills?.length > 0 || parsedBioData.skills?.softSkills?.length > 0 || parsedBioData.skills?.languages?.length > 0) && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-xs font-bold text-gray-800 uppercase">
                          <Award className="w-4 h-4 text-purple-600" />
                          <span>Kỹ năng & Ngoại ngữ</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                          {/* Hard Skills */}
                          <div className="p-3.5 rounded-2xl bg-purple-50/50 border border-purple-100 space-y-2">
                            <p className="font-bold text-purple-900 text-[11px]">Kỹ năng cứng (Hard Skills):</p>
                            <div className="flex flex-wrap gap-1.5">
                              {parsedBioData.skills.hardSkills?.map((s, idx) => (
                                <span key={idx} className="px-2.5 py-1 rounded-xl bg-white text-purple-800 border border-purple-200 text-[11px] font-semibold shadow-2xs">
                                  {s}
                                </span>
                              ))}
                            </div>
                          </div>
                          {/* Soft Skills & Languages */}
                          <div className="p-3.5 rounded-2xl bg-indigo-50/50 border border-indigo-100 space-y-2">
                            <p className="font-bold text-indigo-900 text-[11px]">Kỹ năng mềm & Ngoại ngữ:</p>
                            <div className="flex flex-wrap gap-1.5">
                              {parsedBioData.skills.softSkills?.map((s, idx) => (
                                <span key={idx} className="px-2.5 py-1 rounded-xl bg-white text-indigo-800 border border-indigo-200 text-[11px] font-semibold shadow-2xs">
                                  {s}
                                </span>
                              ))}
                              {parsedBioData.skills.languages?.map((lang, idx) => (
                                <span key={idx} className="px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-semibold shadow-2xs">
                                  🌐 {typeof lang === 'object' ? `${lang.language} (${lang.level})` : lang}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 3. Work Experience */}
                    {parsedBioData.experiences && parsedBioData.experiences.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-xs font-bold text-gray-800 uppercase">
                          <Briefcase className="w-4 h-4 text-brand-blue" />
                          <span>Kinh nghiệm làm việc ({parsedBioData.experiences.length})</span>
                        </div>
                        <div className="space-y-2.5">
                          {parsedBioData.experiences.map((exp, idx) => (
                            <div key={idx} className="p-3.5 rounded-2xl bg-gray-50 border border-gray-200/80 space-y-1">
                              <div className="flex flex-wrap justify-between items-start font-bold text-gray-900">
                                <span className="text-brand-blue text-xs">{exp.position}</span>
                                <span className="text-[11px] text-gray-500 font-medium bg-white px-2 py-0.5 rounded-lg border border-gray-200">
                                  {exp.duration}
                                </span>
                              </div>
                              <p className="font-semibold text-gray-700 text-xs">{exp.company}</p>
                              {exp.description && <p className="text-gray-600 text-xs mt-1 leading-relaxed whitespace-pre-line">{exp.description}</p>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 4. Education */}
                    {parsedBioData.educations && parsedBioData.educations.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-xs font-bold text-gray-800 uppercase">
                          <GraduationCap className="w-4 h-4 text-emerald-600" />
                          <span>Học vấn & Bằng cấp ({parsedBioData.educations.length})</span>
                        </div>
                        <div className="space-y-2.5">
                          {parsedBioData.educations.map((edu, idx) => (
                            <div key={idx} className="p-3.5 rounded-2xl bg-gray-50 border border-gray-200/80 space-y-1">
                              <div className="flex flex-wrap justify-between items-start font-bold text-gray-900">
                                <span className="text-emerald-700 text-xs">{edu.school}</span>
                                <span className="text-[11px] text-gray-500 font-medium bg-white px-2 py-0.5 rounded-lg border border-gray-200">
                                  {edu.year}
                                </span>
                              </div>
                              {edu.major && <p className="text-gray-700 font-medium text-xs">Chuyên ngành: {edu.major}</p>}
                              {edu.gpa && <p className="text-emerald-600 font-bold text-[11px]">GPA: {edu.gpa}</p>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 5. Additional Information (Projects, Certifications, Activities, References) */}
                    {parsedBioData.additionalInfo && (
                      <div className="space-y-3 pt-2">
                        <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
                          <Layers className="w-4 h-4 text-brand-purple" />
                          <h4 className="text-xs font-bold text-gray-800 uppercase">Thông tin bổ sung</h4>
                        </div>

                        {/* Tabs */}
                        <div className="flex flex-wrap gap-1.5 text-xs">
                          <button
                            type="button"
                            onClick={() => setProfileAdditionalTab('projects')}
                            className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
                              profileAdditionalTab === 'projects' ? 'bg-brand-blue text-white shadow-xs' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            <FolderGit2 className="w-3.5 h-3.5" />
                            <span>Dự án ({parsedBioData.additionalInfo.projects?.length || 0})</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setProfileAdditionalTab('certifications')}
                            className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
                              profileAdditionalTab === 'certifications' ? 'bg-brand-blue text-white shadow-xs' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            <Award className="w-3.5 h-3.5" />
                            <span>Chứng chỉ & Giải thưởng ({parsedBioData.additionalInfo.certifications?.length || 0})</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setProfileAdditionalTab('activities')}
                            className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
                              profileAdditionalTab === 'activities' ? 'bg-brand-blue text-white shadow-xs' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            <Users className="w-3.5 h-3.5" />
                            <span>Hoạt động ({parsedBioData.additionalInfo.activities?.length || 0})</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setProfileAdditionalTab('references')}
                            className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
                              profileAdditionalTab === 'references' ? 'bg-brand-blue text-white shadow-xs' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            <BookOpen className="w-3.5 h-3.5" />
                            <span>Người tham chiếu ({parsedBioData.additionalInfo.references?.length || 0})</span>
                          </button>
                        </div>

                        {/* Tab Panel */}
                        <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-200/80 text-xs">
                          {profileAdditionalTab === 'projects' && (
                            <div className="space-y-2">
                              {parsedBioData.additionalInfo.projects?.length > 0 ? (
                                parsedBioData.additionalInfo.projects.map((proj, idx) => (
                                  <div key={idx} className="p-3 rounded-xl bg-white border border-gray-200 space-y-1">
                                    <p className="font-bold text-gray-900">{proj.name} {proj.role ? <span className="text-gray-500 font-normal">({proj.role})</span> : null}</p>
                                    {proj.technologies && <p className="text-[11px] text-purple-700 font-medium">Công nghệ: {proj.technologies}</p>}
                                    {proj.description && <p className="text-gray-600 leading-relaxed whitespace-pre-line">{proj.description}</p>}
                                  </div>
                                ))
                              ) : (
                                <p className="text-gray-400 italic">Chưa có thông tin dự án.</p>
                              )}
                            </div>
                          )}

                          {profileAdditionalTab === 'certifications' && (
                            <div className="space-y-2">
                              {parsedBioData.additionalInfo.certifications?.length > 0 ? (
                                parsedBioData.additionalInfo.certifications.map((cert, idx) => (
                                  <div key={idx} className="p-2.5 rounded-xl bg-white border border-gray-200 flex justify-between items-center">
                                    <div>
                                      <p className="font-bold text-gray-800">{cert.name}</p>
                                      {cert.issuer && <p className="text-[11px] text-gray-500">Cấp bởi: {cert.issuer}</p>}
                                    </div>
                                    {cert.year && <span className="text-[11px] font-semibold text-gray-400">{cert.year}</span>}
                                  </div>
                                ))
                              ) : (
                                <p className="text-gray-400 italic">Chưa có thông tin chứng chỉ hoặc giải thưởng.</p>
                              )}
                            </div>
                          )}

                          {profileAdditionalTab === 'activities' && (
                            <div className="space-y-2">
                              {parsedBioData.additionalInfo.activities?.length > 0 ? (
                                parsedBioData.additionalInfo.activities.map((act, idx) => (
                                  <div key={idx} className="p-3 rounded-xl bg-white border border-gray-200 space-y-1">
                                    <p className="font-bold text-gray-800">{act.name} {act.role ? <span className="text-gray-500 font-normal">({act.role})</span> : null}</p>
                                    {act.description && <p className="text-gray-600 leading-relaxed">{act.description}</p>}
                                  </div>
                                ))
                              ) : (
                                <p className="text-gray-400 italic">Chưa có thông tin hoạt động ngoại khóa.</p>
                              )}
                            </div>
                          )}

                          {profileAdditionalTab === 'references' && (
                            <div className="space-y-2">
                              {parsedBioData.additionalInfo.references?.length > 0 ? (
                                parsedBioData.additionalInfo.references.map((ref, idx) => (
                                  <div key={idx} className="p-3 rounded-xl bg-white border border-gray-200 flex justify-between items-start">
                                    <div>
                                      <p className="font-bold text-gray-800">{ref.name}</p>
                                      <p className="text-[11px] text-gray-500">{ref.position} - {ref.company}</p>
                                    </div>
                                    {ref.contact && <span className="text-[11px] font-semibold text-brand-blue">{ref.contact}</span>}
                                  </div>
                                ))
                              ) : (
                                <p className="text-gray-400 italic">Sẽ cung cấp khi có yêu cầu.</p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                  </div>
                )}
              </div>

              {/* CV Management Card (UC-C05, UC-C06) */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/80 shadow-card space-y-6">
                <div className="flex items-center justify-between border-b border-gray-100 pb-4 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-brand-green" />
                    <h2 className="text-base font-bold text-gray-900">Quản lý nhiều phiên bản CV (UC-C05)</h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsCvParserOpen(true)}
                    className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-bold transition-all shadow-md shadow-purple-500/20 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>⚡ AI Phân tích CV & Điền hồ sơ</span>
                  </button>
                </div>

                {/* Upload Form */}
                <form onSubmit={handleUploadCV} className="p-4 rounded-2xl bg-gray-50 border border-gray-200/80 space-y-3">
                  <p className="text-xs font-bold text-gray-700 uppercase">Tải lên file CV mới (PDF, DOCX)</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="Tên phiên bản CV (ví dụ: CV Frontend Senior - 2024)"
                      value={cvTitle}
                      onChange={(e) => setCvTitle(e.target.value)}
                      className="p-2.5 rounded-xl border border-gray-200 text-xs bg-white focus:outline-none"
                    />
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={(e) => setCvFile(e.target.files[0])}
                      className="text-xs text-gray-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-brand-blue file:text-white hover:file:bg-brand-dark"
                    />
                  </div>
                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      disabled={uploadingCv}
                      className="px-4 py-2 rounded-xl bg-brand-green text-white font-bold text-xs shadow-md shadow-brand-green/20 flex items-center gap-1.5"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      {uploadingCv ? 'Đang tải lên...' : 'Tải lên CV'}
                    </button>
                  </div>
                </form>

                {/* CVs List */}
                <div className="space-y-3">
                  {profile?.cvs && profile.cvs.length > 0 ? (
                    profile.cvs.map((cv) => (
                      <div
                        key={cv.CVID}
                        className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                          cv.IsPrimary
                            ? 'border-brand-blue/50 bg-blue-50/40 ring-1 ring-brand-blue/30'
                            : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-brand-light flex items-center justify-center text-brand-blue">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-bold text-gray-900">{cv.Title}</p>
                              {cv.IsPrimary && (
                                <span className="px-2 py-0.5 text-[10px] font-extrabold bg-brand-blue text-white rounded-full">
                                  CV Mặc Định
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-gray-400 mt-0.5">
                              Tải lên ngày: {new Date(cv.CreatedAt).toLocaleDateString('vi-VN')}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <a
                            href={cv.FileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="p-2 rounded-xl border border-gray-200 text-gray-600 hover:text-brand-blue hover:bg-gray-50 text-xs font-semibold"
                            title="Xem file CV"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>

                          {!cv.IsPrimary && (
                            <button
                              onClick={() => handleSetPrimaryCV(cv.CVID)}
                              className="px-3 py-1.5 rounded-xl border border-blue-200 bg-white text-brand-blue text-xs font-bold hover:bg-blue-50 transition-colors"
                            >
                              Đặt làm mặc định
                            </button>
                          )}

                          <button
                            onClick={() => handleDeleteCV(cv.CVID)}
                            className="p-2 rounded-xl border border-gray-200 text-gray-400 hover:text-red-500 hover:bg-red-50"
                            title="Xóa CV"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6 text-gray-400 text-xs">
                      Chưa có file CV nào. Hãy tải lên CV đầu tiên để bắt đầu ứng tuyển!
                    </div>
                  )}
                </div>

              </div>

            </div>
          )}

          {/* TAB 2: Applications List */}
          {activeTab === 'applications' && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/80 shadow-card space-y-6">
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <div className="flex items-center gap-2">
                  <Send className="w-5 h-5 text-brand-blue" />
                  <h2 className="text-base font-bold text-gray-900">Danh sách việc làm đã ứng tuyển (UC-C14)</h2>
                </div>
                <span className="text-xs font-bold text-gray-500">{applications.length} đơn nộp</span>
              </div>

              {applications.length === 0 ? (
                <div className="text-center py-12 space-y-3">
                  <p className="text-sm text-gray-500">Bạn chưa nộp hồ sơ ứng tuyển vị trí nào.</p>
                  <Link to="/" className="inline-block px-5 py-2.5 bg-brand-blue text-white rounded-xl text-xs font-bold">
                    Khám phá việc làm ngay
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {applications.map((app) => (
                    <div
                      key={app.ApplicationID}
                      className="p-5 rounded-2xl border border-gray-200 hover:border-brand-blue/40 bg-white space-y-3 transition-all"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-start gap-3.5">
                          <img
                            src={app.CompanyLogoUrl || 'https://images.unsplash.com/photo-1549923746-c502d488b3ea?w=100&q=80'}
                            alt={app.CompanyName}
                            className="w-12 h-12 rounded-xl object-cover border border-gray-100"
                          />
                          <div>
                            <Link to={`/jobs/${app.JobID}`} className="text-base font-bold text-gray-900 hover:text-brand-blue">
                              {app.JobTitle}
                            </Link>
                            <p className="text-xs font-semibold text-gray-600 mt-0.5">{app.CompanyName}</p>
                            <p className="text-[11px] text-gray-400 mt-1">
                              Ngày nộp: {new Date(app.AppliedAt).toLocaleDateString('vi-VN')} • CV sử dụng: <span className="font-semibold text-gray-700">{app.CVTitle || 'CV Mặc định'}</span>
                            </p>
                          </div>
                        </div>

                        <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2">
                          <MatchScoreBadge score={app.MatchScore} size="md" />
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                            app.Status === 'Applied' ? 'bg-blue-50 text-brand-blue' :
                            app.Status === 'Screening' ? 'bg-amber-50 text-amber-700' :
                            app.Status === 'Interviewing' ? 'bg-purple-50 text-brand-purple' :
                            app.Status === 'Offered' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
                          }`}>
                            Trạng thái: {app.Status}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Saved Jobs */}
          {activeTab === 'saved' && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/80 shadow-card space-y-6">
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <div className="flex items-center gap-2">
                  <Bookmark className="w-5 h-5 text-amber-500 fill-amber-500" />
                  <h2 className="text-base font-bold text-gray-900">Danh sách việc làm đã lưu</h2>
                </div>
                <span className="text-xs font-bold text-gray-500">{savedJobs.length} việc đã lưu</span>
              </div>

              {savedJobs.length === 0 ? (
                <div className="text-center py-12 text-sm text-gray-500">
                  Bạn chưa lưu công việc nào vào danh sách yêu thích.
                </div>
              ) : (
                <div className="space-y-4">
                  {savedJobs.map((job) => (
                    <div
                      key={job.JobID}
                      className="p-5 rounded-2xl border border-gray-200 hover:border-brand-blue/40 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all"
                    >
                      <div className="flex items-start gap-3.5">
                        <img
                          src={job.CompanyLogoUrl || 'https://images.unsplash.com/photo-1549923746-c502d488b3ea?w=100&q=80'}
                          alt={job.CompanyName}
                          className="w-12 h-12 rounded-xl object-cover border border-gray-100"
                        />
                        <div>
                          <Link to={`/jobs/${job.JobID}`} className="text-base font-bold text-gray-900 hover:text-brand-blue">
                            {job.Title}
                          </Link>
                          <p className="text-xs font-semibold text-gray-600 mt-0.5">{job.CompanyName}</p>
                          <p className="text-xs text-emerald-600 font-bold mt-1">{job.SalaryRange || 'Thỏa thuận'} • {job.Location}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Link
                          to={`/jobs/${job.JobID}`}
                          className="px-4 py-2 bg-brand-blue text-white text-xs font-bold rounded-xl shadow-xs hover:bg-brand-dark"
                        >
                          Xem chi tiết & Nộp đơn
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: Skill Gap & Learning Paths */}
          {activeTab === 'skillgap' && skillGapData && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-brand-purple/30 shadow-card space-y-8">
              
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-brand-purple animate-pulse" />
                  <h2 className="text-base font-black text-gray-900">AI Phân tích Kỹ năng & Đề xuất Khóa học (UC-C11, UC-C12)</h2>
                </div>
              </div>

              {/* Acquired Skills vs Market Demand */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Your Acquired Skills */}
                <div className="p-5 rounded-2xl bg-emerald-50/50 border border-emerald-200/80 space-y-3">
                  <h3 className="text-xs font-bold text-emerald-800 uppercase flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Kỹ năng đã phát hiện trong hồ sơ ({skillGapData.acquiredSkills.length})
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {skillGapData.acquiredSkills.map((skill) => (
                      <span key={skill.SkillID} className="px-3 py-1 bg-white text-emerald-700 text-xs font-bold rounded-xl border border-emerald-200 shadow-2xs">
                        ✓ {skill.SkillName}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Market Skill Trends */}
                <div className="p-5 rounded-2xl bg-purple-50/50 border border-purple-200/80 space-y-3">
                  <h3 className="text-xs font-bold text-purple-900 uppercase flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-brand-purple" /> Kỹ năng công nghệ Hot nhất thị trường
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {skillGapData.marketSkillTrends.map((trend) => (
                      <span key={trend.SkillID} className="px-3 py-1 bg-white text-gray-800 text-xs font-semibold rounded-xl border border-purple-200 shadow-2xs">
                        {trend.SkillName} ({trend.DemandCount} việc làm)
                      </span>
                    ))}
                  </div>
                </div>

              </div>

              {/* Course Recommendations */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-brand-purple" /> Khóa học được AI đề xuất cho bạn để nâng cao thu nhập
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {skillGapData.recommendedCourses.map((course) => (
                    <a
                      key={course.CourseID}
                      href={course.Url}
                      target="_blank"
                      rel="noreferrer"
                      className="group p-5 rounded-2xl border border-gray-200/80 hover:border-brand-purple/50 bg-white hover:bg-brand-purpleLight/20 shadow-xs transition-all space-y-2 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between text-[11px] font-bold text-brand-purple">
                          <span>Nền tảng: {course.Provider}</span>
                          <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                        <h4 className="text-sm font-bold text-gray-900 group-hover:text-brand-purple mt-1 line-clamp-2">
                          {course.Title}
                        </h4>
                      </div>
                      <div className="pt-2 border-t border-gray-100 text-xs font-semibold text-gray-500">
                        Bù đắp kỹ năng: <span className="text-brand-blue font-bold">{course.SkillName}</span>
                      </div>
                    </a>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* TAB 4: Security & Avatar Settings */}
          {activeTab === 'security' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              
              {/* Avatar Settings Card */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/80 shadow-card space-y-6">
                <div className="border-b border-gray-100 pb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Camera className="w-5 h-5 text-brand-blue" />
                    <h2 className="text-base font-bold text-gray-900">Thay đổi hình đại diện (Avatar)</h2>
                  </div>
                  <span className="text-xs text-gray-400 font-medium">Hỗ trợ PNG, JPG, WEBP tối đa 5MB</span>
                </div>

                {avatarSuccess && (
                  <div className="p-4 rounded-xl bg-green-50 border border-green-200 text-sm text-green-700 font-medium flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                    <span>{avatarSuccess}</span>
                  </div>
                )}

                {avatarError && (
                  <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600 font-medium">
                    {avatarError}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 pt-2">
                  <div className="relative group">
                    <img
                      src={user?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&q=80'}
                      alt={user?.fullName}
                      className="w-28 h-28 rounded-3xl object-cover border-4 border-white shadow-xl shadow-brand-blue/10 ring-2 ring-brand-blue/20"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={avatarUploading}
                      className="absolute -bottom-2 -right-2 p-2.5 rounded-2xl bg-brand-blue text-white shadow-lg hover:bg-brand-dark hover:scale-105 transition-all cursor-pointer"
                      title="Chọn ảnh từ máy tính"
                    >
                      {avatarUploading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                    </button>
                  </div>

                  <div className="space-y-4 flex-1 w-full text-center sm:text-left">
                    <div>
                      <h4 className="text-sm font-bold text-gray-800">Tải ảnh đại diện mới</h4>
                      <p className="text-xs text-gray-500 mt-1">
                        Hình ảnh đại diện rõ nét sẽ giúp hồ sơ của bạn thu hút sự chú ý của nhà tuyển dụng tốt hơn.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 justify-center sm:justify-start">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={avatarUploading}
                        className="px-5 py-2.5 rounded-xl bg-brand-blue text-white text-xs font-bold hover:bg-brand-dark transition-all shadow-md shadow-brand-blue/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        {avatarUploading ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Đang tải lên...</span>
                          </>
                        ) : (
                          <>
                            <Upload className="w-3.5 h-3.5" />
                            <span>Tải ảnh từ thiết bị</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* URL Option */}
                    <div className="pt-2 border-t border-gray-100">
                      <label className="block text-xs font-bold text-gray-600 mb-1.5">
                        Hoặc dán liên kết ảnh trực tiếp (URL)
                      </label>
                      <form onSubmit={handleAvatarUrlSave} className="flex gap-2">
                        <input
                          type="url"
                          placeholder="https://example.com/avatar.jpg"
                          value={customAvatarUrl}
                          onChange={(e) => setCustomAvatarUrl(e.target.value)}
                          className="flex-1 p-2.5 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue outline-none"
                        />
                        <button
                          type="submit"
                          disabled={avatarUploading || !customAvatarUrl}
                          className="px-4 py-2.5 rounded-xl bg-gray-900 text-white text-xs font-bold hover:bg-black transition-all disabled:opacity-40 cursor-pointer"
                        >
                          Lưu URL
                        </button>
                      </form>
                    </div>

                  </div>
                </div>
              </div>

              {/* Change Password Card */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/80 shadow-card space-y-6">
                <div className="border-b border-gray-100 pb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lock className="w-5 h-5 text-brand-blue" />
                    <h2 className="text-base font-bold text-gray-900">Đổi mật khẩu tài khoản</h2>
                  </div>
                  <span className="text-xs text-gray-400 font-medium">Bảo mật thông tin đăng nhập</span>
                </div>

                {passwordSuccess && (
                  <div className="p-4 rounded-xl bg-green-50 border border-green-200 text-sm text-green-700 font-medium flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                    <span>{passwordSuccess}</span>
                  </div>
                )}

                {passwordError && (
                  <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600 font-medium">
                    {passwordError}
                  </div>
                )}

                <form onSubmit={handleChangePassword} className="space-y-4 max-w-lg">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                      Mật khẩu hiện tại *
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type={showCurrentPassword ? 'text' : 'password'}
                        required
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-11 py-3 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        tabIndex={-1}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none p-1"
                      >
                        {showCurrentPassword ? <EyeOff className="w-4 h-4 text-gray-600" /> : <Eye className="w-4 h-4 text-gray-400" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                      Mật khẩu mới (Tối thiểu 6 ký tự, 1 chữ hoa, 1 số) *
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Ví dụ: Jobtimize@2025"
                        className="w-full pl-10 pr-11 py-3 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        tabIndex={-1}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none p-1"
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4 text-gray-600" /> : <Eye className="w-4 h-4 text-gray-400" />}
                      </button>
                    </div>

                    {newPassword && (
                      <div className="mt-2 p-2.5 bg-gray-50 rounded-xl border border-gray-100 text-xs space-y-1">
                        <div className={`flex items-center gap-1.5 ${newPassword.length >= 6 ? 'text-green-600 font-semibold' : 'text-gray-500'}`}>
                          <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[10px] ${newPassword.length >= 6 ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-400'}`}>
                            {newPassword.length >= 6 ? '✓' : '•'}
                          </span>
                          <span>Tối thiểu 6 ký tự</span>
                        </div>
                        <div className={`flex items-center gap-1.5 ${/[A-Z]/.test(newPassword) ? 'text-green-600 font-semibold' : 'text-gray-500'}`}>
                          <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[10px] ${/[A-Z]/.test(newPassword) ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-400'}`}>
                            {/[A-Z]/.test(newPassword) ? '✓' : '•'}
                          </span>
                          <span>Chứa ít nhất 1 chữ in hoa (A-Z)</span>
                        </div>
                        <div className={`flex items-center gap-1.5 ${/[0-9]/.test(newPassword) ? 'text-green-600 font-semibold' : 'text-gray-500'}`}>
                          <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[10px] ${/[0-9]/.test(newPassword) ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-400'}`}>
                            {/[0-9]/.test(newPassword) ? '✓' : '•'}
                          </span>
                          <span>Chứa ít nhất 1 chữ số (0-9)</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                      Xác nhận mật khẩu mới *
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type={showConfirmNewPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className={`w-full pl-10 pr-11 py-3 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 ${
                          confirmNewPassword && confirmNewPassword !== newPassword
                            ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                            : confirmNewPassword && confirmNewPassword === newPassword
                            ? 'border-green-400 focus:border-green-500 focus:ring-green-100'
                            : 'border-gray-200 focus:border-brand-blue focus:ring-brand-blue/20'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                        tabIndex={-1}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none p-1"
                      >
                        {showConfirmNewPassword ? <EyeOff className="w-4 h-4 text-gray-600" /> : <Eye className="w-4 h-4 text-gray-400" />}
                      </button>
                    </div>
                    {confirmNewPassword && confirmNewPassword !== newPassword && (
                      <p className="text-xs text-red-500 mt-1 font-medium">Mật khẩu xác nhận chưa khớp</p>
                    )}
                    {confirmNewPassword && confirmNewPassword === newPassword && (
                      <p className="text-xs text-green-600 mt-1 font-medium">✓ Mật khẩu đã khớp</p>
                    )}
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={passwordLoading}
                      className="px-6 py-3 rounded-xl bg-brand-blue text-white text-xs font-bold hover:bg-brand-dark transition-all shadow-md shadow-brand-blue/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {passwordLoading ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Đang cập nhật...</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-3.5 h-3.5" />
                          <span>Cập nhật mật khẩu mới</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>

            </div>
          )}

          {/* TAB: AI Mock Interview (UC-C15) */}
          {activeTab === 'interview' && (
            <MockInterviewSection />
          )}

        </div>

      </div>

      {/* AI CV Parser Modal */}
      <AICVParserModal
        isOpen={isCvParserOpen}
        onClose={() => setIsCvParserOpen(false)}
        onApplyExtractedData={handleApplyExtractedCVData}
      />

    </div>
  );
}
