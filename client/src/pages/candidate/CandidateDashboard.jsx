import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import MatchScoreBadge from '../../components/common/MatchScoreBadge';
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
  BookOpen
} from 'lucide-react';

export default function CandidateDashboard() {
  const { user, refreshUser } = useAuth();
  const location = useLocation();

  // Tab state
  const queryParams = new URLSearchParams(location.search);
  const initialTab = queryParams.get('tab') || 'profile';
  const [activeTab, setActiveTab] = useState(initialTab);

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
  const [savingProfile, setSavingProfile] = useState(false);

  // CV upload state
  const [cvTitle, setCvTitle] = useState('');
  const [cvFile, setCvFile] = useState(null);
  const [uploadingCv, setUploadingCv] = useState(false);

  const fetchProfileData = async () => {
    try {
      const res = await api.get('/candidate/profile');
      if (res.data.success) {
        setProfile(res.data.data);
        setHeadline(res.data.data.Headline || '');
        setBio(res.data.data.Bio || '');
        setDesiredSalary(res.data.data.DesiredSalary || '');
        setCurrentLocation(res.data.data.CurrentLocation || '');
        setFullName(res.data.data.FullName || '');
        setPhone(res.data.data.Phone || '');
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
      await api.put('/candidate/profile', {
        headline,
        bio,
        desiredSalary: desiredSalary ? parseFloat(desiredSalary) : null,
        currentLocation,
        fullName,
        phone
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
        <div className="flex items-center gap-5">
          <img
            src={user?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&q=80'}
            alt={user?.fullName}
            className="w-20 h-20 rounded-2xl object-cover border-2 border-brand-blue/30 shadow-md"
          />
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                {profile?.FullName || user?.fullName}
              </h1>
              <CheckCircle2 className="w-5 h-5 text-brand-blue fill-brand-light" />
            </div>
            <p className="text-sm font-semibold text-brand-blue">
              {profile?.Headline || 'Ứng viên Jobtimize'}
            </p>
            <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 pt-1">
              <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> {profile?.Email}</span>
              {profile?.Phone && <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {profile.Phone}</span>}
              {profile?.CurrentLocation && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {profile.CurrentLocation}</span>}
            </div>
          </div>
        </div>

        {/* Action Toggle */}
        <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-2xl border border-gray-200/80">
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
          </div>
        </div>

        {/* Tab Content (3/4) */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* TAB 1: Profile & CV Manager */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              
              {/* Profile Details Edit Card */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/80 shadow-card space-y-6">
                <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                  <div className="flex items-center gap-2">
                    <User className="w-5 h-5 text-brand-blue" />
                    <h2 className="text-base font-bold text-gray-900">Thông tin cá nhân & Giới thiệu</h2>
                  </div>
                  <button
                    onClick={() => setIsEditing(!isEditing)}
                    className="px-3.5 py-1.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-1.5"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    {isEditing ? 'Hủy' : 'Chỉnh sửa'}
                  </button>
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
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Giới thiệu bản thân & Kinh nghiệm cốt lõi</label>
                      <textarea
                        rows={4}
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        placeholder="Mô tả kỹ năng, dự án tiêu biểu, định hướng phát triển sự nghiệp..."
                        className="w-full p-3 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-brand-blue/20"
                      />
                    </div>

                    <div className="flex justify-end">
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
                  <div className="space-y-4 text-sm text-gray-700">
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase">Headline</p>
                      <p className="font-semibold text-gray-900 mt-0.5">{profile?.Headline || 'Chưa cập nhật headline'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase">Mức lương mong muốn</p>
                      <p className="font-semibold text-emerald-600 mt-0.5">
                        {profile?.DesiredSalary ? `${profile.DesiredSalary.toLocaleString()} VNĐ` : 'Thỏa thuận'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase">Giới thiệu bản thân</p>
                      <p className="text-gray-600 mt-0.5 leading-relaxed whitespace-pre-line">{profile?.Bio || 'Chưa có thông tin giới thiệu'}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* CV Management Card (UC-C05, UC-C06) */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/80 shadow-card space-y-6">
                <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-brand-green" />
                    <h2 className="text-base font-bold text-gray-900">Quản lý nhiều phiên bản CV (UC-C05)</h2>
                  </div>
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

        </div>

      </div>

    </div>
  );
}
