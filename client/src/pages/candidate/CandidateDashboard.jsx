import AccountPasswordForm from '../../components/common/AccountPasswordForm';
import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import CVManager from '../../components/candidate/CVManager';
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
  BookOpen,
  Camera,
  KeyRound,
  Eye,
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
  Users,
  Bell,
  Plus,
  SlidersHorizontal,
  ArrowUpRight,
  Check,
  Play,
  Pause,
  Clock,
  Download
} from 'lucide-react';
import MockInterviewSection from '../../components/candidate/MockInterviewSection';
import { candidateApplicationLabels } from '../../components/common/RecruitmentUI';
import CandidateInvitations from '../../components/candidate/CandidateInvitations';
import JobAlertModal from '../../components/candidate/JobAlertModal';
import { getCompanyLogo, handleCompanyLogoError, getUserAvatar, handleUserAvatarError } from '../../utils/logoHelper';

export default function CandidateDashboard() {
  const { user, refreshUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const selectTab = tab => { setActiveTab(tab); navigate(`/candidate/dashboard?tab=${tab}`); };

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
  const [jobAlerts, setJobAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Job Alerts Modal & Matching Jobs Drawer state
  const [isJobAlertModalOpen, setIsJobAlertModalOpen] = useState(false);
  const [selectedAlertForEdit, setSelectedAlertForEdit] = useState(null);
  const [matchingJobsDrawerAlert, setMatchingJobsDrawerAlert] = useState(null);
  const [matchingJobsList, setMatchingJobsList] = useState([]);
  const [loadingMatchingJobs, setLoadingMatchingJobs] = useState(false);

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
  const [togglingJob, setTogglingJob] = useState(false);

  const handleToggleLooking = async () => {
    try {
      setTogglingJob(true);
      await api.patch('/candidate/toggle-looking', { isLookingForJob: !profile?.IsLookingForJob });
      await fetchProfileData();
      await refreshUser();
    } catch (err) {
      alert('Không thể cập nhật trạng thái tìm việc: ' + (err.response?.data?.message || err.message));
    } finally {
      setTogglingJob(false);
    }
  };

  // Structured profile fields from AI / Bio JSON
  const [parsedBioData, setParsedBioData] = useState({
    bioText: '',
    links: { linkedin: '', github: '', portfolio: '' },
    skills: { hardSkills: [], softSkills: [], languages: [] },
    experiences: [],
    educations: [],
    additionalInfo: { projects: [], certifications: [], activities: [], references: [] }
  });

  // Avatar upload state
  const fileInputRef = useRef(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarSuccess, setAvatarSuccess] = useState('');
  const [avatarError, setAvatarError] = useState('');

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



  const fetchJobAlerts = async () => {
    try {
      const res = await api.get('/candidate/job-alerts');
      if (res.data.success) setJobAlerts(res.data.data);
    } catch (err) {
      console.error('Fetch job alerts error:', err);
    }
  };

  const handleToggleJobAlert = async (alertId, currentActive) => {
    try {
      await api.patch(`/candidate/job-alerts/${alertId}/toggle`, { isActive: !currentActive });
      await fetchJobAlerts();
    } catch (err) {
      console.error('Toggle job alert error:', err);
    }
  };

  const handleDeleteJobAlert = async (alertId) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa thông báo việc làm này?')) return;
    try {
      await api.delete(`/candidate/job-alerts/${alertId}`);
      await fetchJobAlerts();
    } catch (err) {
      console.error('Delete job alert error:', err);
    }
  };

  const handleViewMatchingJobs = async (alert) => {
    setMatchingJobsDrawerAlert(alert);
    setLoadingMatchingJobs(true);
    try {
      const res = await api.get(`/candidate/job-alerts/${alert.AlertID}/matching-jobs`);
      if (res.data.success) {
        setMatchingJobsList(res.data.data.jobs || []);
      }
    } catch (err) {
      console.error('Fetch matching jobs error:', err);
    } finally {
      setLoadingMatchingJobs(false);
    }
  };

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      await Promise.all([
        fetchProfileData(), 
        fetchApplications(), 
        fetchSavedJobs(), 
        fetchJobAlerts()
      ]);
      setLoading(false);
    };
    loadAll();
  }, [user, location.key]);

  useEffect(() => {
    const id = new URLSearchParams(location.search).get('applicationId');
    if (!loading && activeTab === 'applications' && id) document.getElementById('candidate-application-' + id)?.scrollIntoView({ block: 'center' });
  }, [loading, activeTab, location.key]);

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
      if (fileInputRef.current) fileInputRef.current.value = '';
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
      
      {activeTab !== 'cvs' && (<>
      {/* Dashboard Top Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/80 shadow-card flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-5 flex-1">
          <div className="relative group shrink-0">
            <img
              src={getUserAvatar(user, profile?.FullName || user?.fullName)}
              alt={user?.fullName}
              onError={(e) => handleUserAvatarError(e, profile?.FullName || user?.fullName)}
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

        {/* Action Toggle (Moved from Navbar into Profile) */}
        <div className="flex items-center gap-3.5 bg-slate-50 px-4 py-3 rounded-xl border border-gray-200 shrink-0">
          <div className="text-right">
            <p className="text-xs font-bold text-slate-900">Trạng thái tìm việc</p>
            <p className="text-[11px] text-slate-500">
              {profile?.IsLookingForJob ? 'Đang bật hiển thị với nhà tuyển dụng' : 'Đang tạm tắt tìm việc'}
            </p>
          </div>
          <button
            type="button"
            onClick={handleToggleLooking}
            disabled={togglingJob}
            aria-label="Bật hoặc tắt trạng thái tìm việc"
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              profile?.IsLookingForJob ? 'bg-emerald-600' : 'bg-slate-300'
            } ${togglingJob ? 'opacity-60 cursor-wait' : ''}`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                profile?.IsLookingForJob ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
          <span className={`text-xs font-bold min-w-[28px] ${profile?.IsLookingForJob ? 'text-emerald-700' : 'text-slate-500'}`}>
            {profile?.IsLookingForJob ? 'BẬT' : 'TẮT'}
          </span>
        </div>
      </div>

      </>)}
      {/* Main Content Grid: Tabs Left & Panel Right */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Navigation Sidebar (1/4) */}
        <div className="lg:col-span-1 space-y-2">
          <div className="bg-white rounded-xl p-2.5 border border-gray-200 shadow-xs space-y-1">
            <button
              onClick={() => selectTab('profile')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
                activeTab === 'profile'
                  ? 'bg-blue-600 text-white font-semibold'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <span>Hồ sơ cá nhân</span>
            </button>

            <button onClick={() => selectTab('cvs')} className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium text-left ${activeTab === 'cvs' ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-100'}`}><span>Quản lý CV</span><FileText className="h-4 w-4" /></button>

            <Link to="/candidate/dashboard?tab=invitations"
              className={`block w-full px-3.5 py-2.5 rounded-lg text-sm font-medium ${activeTab === 'invitations' ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-100'}`}>
              Lời mời & lịch phỏng vấn
            </Link>

            <button
              onClick={() => selectTab('applications')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
                activeTab === 'applications'
                  ? 'bg-blue-600 text-white font-semibold'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <span>Việc làm đã ứng tuyển</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${activeTab === 'applications' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
                {applications.length}
              </span>
            </button>

            <button
              onClick={() => selectTab('saved')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
                activeTab === 'saved'
                  ? 'bg-blue-600 text-white font-semibold'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <span>Việc làm đã lưu</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${activeTab === 'saved' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
                {savedJobs.length}
              </span>
            </button>

            <button
              onClick={() => selectTab('alerts')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
                activeTab === 'alerts'
                  ? 'bg-blue-600 text-white font-semibold'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <span>Thông báo việc làm</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${activeTab === 'alerts' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
                {jobAlerts.length}
              </span>
            </button>

            <button
              onClick={() => selectTab('skillgap')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
                activeTab === 'skillgap'
                  ? 'bg-blue-600 text-white font-semibold'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <span>Phân tích kỹ năng</span>
            </button>

            <button
              onClick={() => selectTab('interview')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
                activeTab === 'interview'
                  ? 'bg-blue-600 text-white font-semibold'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <span>Luyện phỏng vấn</span>
            </button>

            <button
              onClick={() => selectTab('security')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
                activeTab === 'security'
                  ? 'bg-blue-600 text-white font-semibold'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <span>Tài khoản & Bảo mật</span>
            </button>
          </div>
        </div>

        {/* Tab Content (3/4) */}
        <div className="lg:col-span-3 space-y-6">
          {activeTab === 'cvs' && <CVManager onChange={fetchProfileData} />}
          {activeTab === 'invitations' && <CandidateInvitations />}
          
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
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-bold text-gray-700 uppercase">Tóm tắt bản thân / Mục tiêu nghề nghiệp (3-4 câu)</label>
                        <span className={`text-[11px] font-semibold ${(bio || '').length >= 480 ? 'text-amber-600' : 'text-gray-400'}`}>
                          {(bio || '').length}/500 ký tự
                        </span>
                      </div>
                      <textarea
                        rows={3}
                        maxLength={500}
                        value={bio}
                        onChange={(e) => setBio(e.target.value.slice(0, 500))}
                        placeholder="Tóm tắt ngắn gọn 3-4 câu về điểm mạnh, số năm kinh nghiệm, giá trị mang lại và định hướng sự nghiệp..."
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
                    
                    {/* 1. Personal Info Details Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 p-4 rounded-2xl bg-slate-50/80 border border-gray-100">
                      <div className="p-3 rounded-xl bg-white border border-gray-100 shadow-2xs space-y-1">
                        <p className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-1">
                          <User className="w-3 h-3 text-brand-blue" /> Họ và tên
                        </p>
                        <p className="font-bold text-gray-900 text-xs truncate">
                          {profile?.FullName || user?.fullName || 'Chưa cập nhật'}
                        </p>
                      </div>

                      <div className="p-3 rounded-xl bg-white border border-gray-100 shadow-2xs space-y-1">
                        <p className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-1">
                          <Briefcase className="w-3 h-3 text-indigo-600" /> Chức danh / Headline
                        </p>
                        <p className="font-bold text-brand-blue text-xs truncate">
                          {profile?.Headline || 'Chưa cập nhật chức danh'}
                        </p>
                      </div>

                      <div className="p-3 rounded-xl bg-white border border-gray-100 shadow-2xs space-y-1">
                        <p className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-1">
                          <DollarSign className="w-3 h-3 text-emerald-600" /> Mức lương mong muốn
                        </p>
                        <p className="font-bold text-emerald-600 text-xs">
                          {profile?.DesiredSalary ? `${Number(profile.DesiredSalary).toLocaleString('vi-VN')} VNĐ / tháng` : 'Thỏa thuận'}
                        </p>
                      </div>

                      <div className="p-3 rounded-xl bg-white border border-gray-100 shadow-2xs space-y-1">
                        <p className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-1">
                          <Mail className="w-3 h-3 text-brand-blue" /> Email liên hệ
                        </p>
                        <p className="font-semibold text-gray-800 text-xs truncate">
                          {profile?.Email || user?.email || 'Chưa cập nhật'}
                        </p>
                      </div>

                      <div className="p-3 rounded-xl bg-white border border-gray-100 shadow-2xs space-y-1">
                        <p className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-1">
                          <Phone className="w-3 h-3 text-emerald-600" /> Số điện thoại
                        </p>
                        <p className="font-semibold text-gray-800 text-xs">
                          {profile?.Phone || 'Chưa cập nhật'}
                        </p>
                      </div>

                      <div className="p-3 rounded-xl bg-white border border-gray-100 shadow-2xs space-y-1">
                        <p className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-rose-500" /> Địa điểm sinh sống
                        </p>
                        <p className="font-semibold text-gray-800 text-xs truncate">
                          {profile?.CurrentLocation || 'Chưa cập nhật'}
                        </p>
                      </div>
                    </div>

                    {/* 1.2. Career Summary & Social Links */}
                    <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-3">
                      <div className="space-y-1.5">
                        <p className="text-[10px] font-bold text-gray-400 uppercase">Tóm tắt bản thân & Mục tiêu nghề nghiệp (3-4 câu)</p>
                        <p className="text-gray-700 text-xs leading-relaxed whitespace-pre-line">
                          {parsedBioData.bioText ||
                            (profile?.Bio && !String(profile.Bio).trim().startsWith('{') ? profile.Bio : '') ||
                            'Chưa có thông tin giới thiệu bản thân. Nhấn "Chỉnh sửa" để cập nhật mục tiêu nghề nghiệp của bạn.'}
                        </p>
                      </div>

                      {(parsedBioData.links?.linkedin || parsedBioData.links?.github || parsedBioData.links?.portfolio) && (
                        <div className="pt-2 border-t border-gray-200/70 flex flex-wrap items-center gap-2">
                          <span className="text-[10px] font-bold text-gray-400 uppercase mr-1">Liên kết cá nhân:</span>
                          {parsedBioData.links.linkedin && (
                            <a
                              href={parsedBioData.links.linkedin.startsWith('http') ? parsedBioData.links.linkedin : `https://${parsedBioData.links.linkedin}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-blue-200 text-blue-700 hover:bg-blue-50 text-[11px] font-semibold transition-colors"
                            >
                              <Linkedin className="w-3 h-3" /> {parsedBioData.links.linkedin}
                            </a>
                          )}
                          {parsedBioData.links.github && (
                            <a
                              href={parsedBioData.links.github.startsWith('http') ? parsedBioData.links.github : `https://${parsedBioData.links.github}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-gray-300 text-gray-800 hover:bg-gray-100 text-[11px] font-semibold transition-colors"
                            >
                              <Github className="w-3 h-3" /> {parsedBioData.links.github}
                            </a>
                          )}
                          {parsedBioData.links.portfolio && (
                            <a
                              href={parsedBioData.links.portfolio.startsWith('http') ? parsedBioData.links.portfolio : `https://${parsedBioData.links.portfolio}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-emerald-200 text-emerald-700 hover:bg-emerald-50 text-[11px] font-semibold transition-colors"
                            >
                              <Globe className="w-3 h-3" /> {parsedBioData.links.portfolio}
                            </a>
                          )}
                        </div>
                      )}
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


            </div>
          )}

          {/* TAB 2: Applications List */}
          {activeTab === 'applications' && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/80 shadow-card space-y-6">
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <div className="flex items-center gap-2">
                  <Send className="w-5 h-5 text-brand-blue" />
                  <h2 className="text-base font-bold text-gray-900">Danh sách việc làm đã ứng tuyển</h2>
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
                      key={app.ApplicationID} id={`candidate-application-${app.ApplicationID}`}
                      className="p-5 rounded-2xl border border-gray-200 hover:border-brand-blue/40 bg-white space-y-3 transition-all"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-start gap-3.5">
                          <img
                            src={getCompanyLogo(app.CompanyLogoUrl, app.CompanyName)}
                            alt={app.CompanyName}
                            onError={(e) => handleCompanyLogoError(e, app.CompanyName)}
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
                            Trạng thái: {candidateApplicationLabels[app.Status] || app.Status}
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
                          src={getCompanyLogo(job.CompanyLogoUrl, job.CompanyName)}
                          alt={job.CompanyName}
                          onError={(e) => handleCompanyLogoError(e, job.CompanyName)}
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

          {/* TAB: Job Alerts */}
          {activeTab === 'alerts' && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/80 shadow-card space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-100 pb-4 gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-50 text-brand-blue flex items-center justify-center">
                    <Bell className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-gray-900">Thông báo việc làm theo tiêu chí</h2>
                    <p className="text-[11px] text-gray-500">Nhận thông báo các vị trí tuyển dụng khớp với kỳ vọng của bạn</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedAlertForEdit(null);
                    setIsJobAlertModalOpen(true);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-brand-blue hover:bg-brand-dark text-white text-xs font-bold shadow-md shadow-brand-blue/20 transition-all flex items-center gap-1.5 shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tạo thông báo mới</span>
                </button>
              </div>

              {/* Alert List */}
              {jobAlerts.length === 0 ? (
                <div className="text-center py-12 space-y-3 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200 p-8">
                  <Bell className="w-10 h-10 text-gray-300 mx-auto" />
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-gray-700">Chưa có thông báo việc làm nào được thiết lập</p>
                    <p className="text-xs text-gray-400">
                      Tạo tiêu chí để nhận thông báo hàng ngày hoặc hàng tuần khi có việc làm mới phù hợp.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedAlertForEdit(null);
                      setIsJobAlertModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-blue text-white text-xs font-bold shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" /> Thiết lập ngay
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {jobAlerts.map((alert) => (
                    <div
                      key={alert.AlertID}
                      className={`p-5 rounded-2xl border transition-all space-y-4 flex flex-col justify-between ${
                        alert.IsActive
                          ? 'border-gray-200/90 bg-white hover:border-brand-blue/40 shadow-xs'
                          : 'border-gray-200 bg-gray-50/60 opacity-75'
                      }`}
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="text-sm font-bold text-gray-900">{alert.Keywords}</h3>
                            <p className="text-[11px] text-gray-500 mt-0.5">
                              {alert.CategoryName || 'Tất cả ngành nghề'}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleToggleJobAlert(alert.AlertID, alert.IsActive)}
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition-colors flex items-center gap-1 cursor-pointer ${
                              alert.IsActive
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-gray-200 text-gray-600 border-gray-300'
                            }`}
                          >
                            {alert.IsActive ? <Check className="w-3 h-3 text-emerald-600" /> : <Pause className="w-3 h-3" />}
                            <span>{alert.IsActive ? 'Đang bật' : 'Tạm dừng'}</span>
                          </button>
                        </div>

                        {/* Criteria tags */}
                        <div className="flex flex-wrap gap-2 text-xs text-gray-600">
                          {alert.Location && (
                            <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-100 font-medium text-[11px]">
                              <MapPin className="w-3 h-3 text-red-500" /> {alert.Location}
                            </span>
                          )}
                          {alert.MinSalary && (
                            <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 font-bold text-[11px]">
                              <DollarSign className="w-3 h-3 text-emerald-600" /> &gt;= {new Intl.NumberFormat('vi-VN').format(alert.MinSalary)} đ
                            </span>
                          )}
                          <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 font-medium text-[11px]">
                            <Clock className="w-3 h-3 text-purple-600" /> {alert.Frequency === 'Daily' ? 'Hàng ngày' : 'Hàng tuần'}
                          </span>
                        </div>
                      </div>

                      {/* Footer Actions */}
                      <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => handleViewMatchingJobs(alert)}
                          className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-brand-blue font-bold text-xs flex items-center gap-1.5 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Xem việc phù hợp ({alert.MatchCount || 0})</span>
                        </button>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedAlertForEdit(alert);
                              setIsJobAlertModalOpen(true);
                            }}
                            className="p-2 rounded-xl text-gray-500 hover:text-brand-blue hover:bg-gray-100"
                            title="Sửa tiêu chí"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteJobAlert(alert.AlertID)}
                            className="p-2 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50"
                            title="Xóa thông báo"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'skillgap' && (
            <section className="rounded-xl border border-slate-200 bg-white p-8">
              <h2 className="text-xl font-semibold text-slate-900">Tìm việc phù hợp với CV</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">Chọn CV đã xác nhận để tìm việc đang tuyển, đối chiếu từng yêu cầu và xem khóa học cho kỹ năng cần bổ sung.</p>
              <Link to="/candidate/skill-gap" className="mt-6 inline-block rounded-lg bg-blue-700 px-5 py-3 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">Tìm việc từ CV</Link>
            </section>
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
                      src={getUserAvatar(user, user?.fullName)}
                      alt={user?.fullName}
                      onError={(e) => handleUserAvatarError(e, user?.fullName)}
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
                      <h4 className="text-sm font-bold text-gray-800">Tải ảnh đại diện mới từ thiết bị</h4>
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

                  </div>
                </div>
              </div>

              <AccountPasswordForm />

            </div>
          )}

          {/* TAB: AI Mock Interview (UC-C15) */}
          {activeTab === 'interview' && (
            <MockInterviewSection />
          )}

        </div>

      </div>

      {/* Job Alert Modal (UC-C09) */}
      <JobAlertModal
        isOpen={isJobAlertModalOpen}
        onClose={() => {
          setIsJobAlertModalOpen(false);
          setSelectedAlertForEdit(null);
        }}
        initialAlert={selectedAlertForEdit}
        onSaved={fetchJobAlerts}
      />

      {/* Matching Jobs Modal (UC-C09) */}
      {matchingJobsDrawerAlert && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in duration-150 flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="bg-gradient-to-r from-brand-blue to-indigo-600 p-6 text-white flex items-start justify-between">
              <div>
                <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-bold">
                  Khớp tiêu chí thông báo
                </span>
                <h3 className="text-lg font-black tracking-tight mt-1">
                  Việc làm phù hợp với: "{matchingJobsDrawerAlert.Keywords}"
                </h3>
                <p className="text-xs text-blue-100">
                  {matchingJobsList.length} vị trí tuyển dụng đang mở phù hợp
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMatchingJobsDrawerAlert(null)}
                className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white"
              >
                ✕
              </button>
            </div>

            {/* List */}
            <div className="p-6 overflow-y-auto space-y-3.5 flex-1">
              {loadingMatchingJobs ? (
                <div className="py-12 text-center text-gray-400 space-y-2">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-brand-blue" />
                  <p className="text-xs">Đang tìm kiếm các tin tuyển dụng khớp tiêu chí...</p>
                </div>
              ) : matchingJobsList.length === 0 ? (
                <div className="py-12 text-center text-gray-400 space-y-2">
                  <Bell className="w-10 h-10 text-gray-300 mx-auto" />
                  <p className="text-sm font-bold text-gray-700">Chưa có tin tuyển dụng nào khớp trực tiếp</p>
                  <p className="text-xs text-gray-400">Hệ thống sẽ tự động cập nhật ngay khi có nhà tuyển dụng đăng tin mới.</p>
                </div>
              ) : (
                matchingJobsList.map((job) => (
                  <div
                    key={job.JobID}
                    className="p-4 rounded-2xl border border-gray-200 hover:border-brand-blue/40 bg-white shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all"
                  >
                    <div className="flex items-start gap-3.5">
                      <img
                        src={getCompanyLogo(job.CompanyLogoUrl, job.CompanyName)}
                        alt={job.CompanyName}
                        onError={(e) => handleCompanyLogoError(e, job.CompanyName)}
                        className="w-11 h-11 rounded-xl object-cover border border-gray-100 shrink-0"
                      />
                      <div>
                        <Link
                          to={`/jobs/${job.JobID}`}
                          onClick={() => setMatchingJobsDrawerAlert(null)}
                          className="text-sm font-bold text-gray-900 hover:text-brand-blue line-clamp-1"
                        >
                          {job.Title}
                        </Link>
                        <p className="text-xs font-semibold text-gray-600 mt-0.5">{job.CompanyName}</p>
                        <p className="text-xs text-emerald-600 font-bold mt-1">
                          {job.SalaryRange || 'Thỏa thuận'} • {job.Location || 'Toàn quốc'}
                        </p>
                      </div>
                    </div>

                    <Link
                      to={`/jobs/${job.JobID}`}
                      onClick={() => setMatchingJobsDrawerAlert(null)}
                      className="px-4 py-2 bg-brand-blue hover:bg-brand-dark text-white text-xs font-bold rounded-xl shrink-0 text-center shadow-xs"
                    >
                      Ứng tuyển ngay
                    </Link>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
