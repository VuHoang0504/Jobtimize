import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import {
  Sparkles,
  CheckCircle2,
  BookOpen,
  ArrowRight,
  TrendingUp,
  Compass,
  Award,
  DollarSign,
  Clock,
  Star,
  Search,
  Filter,
  Check,
  Zap,
  Tag,
  ArrowUpRight,
  Target,
  AlertTriangle,
  FileText,
  Briefcase,
  RefreshCw,
  Layers,
  ChevronRight,
  HelpCircle,
  Flame,
  CheckCircle
} from 'lucide-react';

export default function SkillGapAnalysisPage() {
  const [data, setData] = useState(null);
  const [allCourses, setAllCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);

  // User Flow State (Target Point B)
  const [mode, setMode] = useState('role'); // 'role' | 'job' | 'jd'
  const [selectedRole, setSelectedRole] = useState('backend-node');
  const [selectedJobId, setSelectedJobId] = useState('');
  const [customJdText, setCustomJdText] = useState('');

  // Course exploration state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProvider, setSelectedProvider] = useState('ALL');
  const [filterFreeOnly, setFilterFreeOnly] = useState(false);
  const [activeView, setActiveView] = useState('recommended'); // 'recommended' | 'all'
  const [focusedSkill, setFocusedSkill] = useState(null); // skill object to filter courses

  // Initial fetch
  useEffect(() => {
    fetchSkillGap({ mode: 'role', targetRole: 'backend-node' });
  }, []);

  const fetchSkillGap = async (params = {}) => {
    setAnalyzing(true);
    try {
      const [gapRes, coursesRes] = await Promise.all([
        api.post('/candidate/skill-gap', params),
        allCourses.length === 0 ? api.get('/candidate/courses') : Promise.resolve({ data: { success: true, data: allCourses } })
      ]);

      if (gapRes.data?.success) {
        setData(gapRes.data.data);
      }
      if (coursesRes.data?.success && coursesRes.data.data?.length > 0) {
        setAllCourses(coursesRes.data.data);
      }
    } catch (err) {
      console.error('Fetch skill gap error:', err);
    } finally {
      setLoading(false);
      setAnalyzing(false);
    }
  };

  const handleApplyTarget = (e) => {
    if (e) e.preventDefault();
    setFocusedSkill(null);

    if (mode === 'role') {
      fetchSkillGap({ mode: 'role', targetRole: selectedRole });
    } else if (mode === 'job') {
      if (!selectedJobId) return;
      fetchSkillGap({ mode: 'job', jobId: selectedJobId });
    } else if (mode === 'jd') {
      if (!customJdText.trim()) return;
      fetchSkillGap({ mode: 'jd', customJd: customJdText.trim() });
    }
  };

  const formatPrice = (price, isFree) => {
    if (isFree || price === 0 || !price) {
      return <span className="text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg font-black text-xs">Miễn phí 100%</span>;
    }
    return (
      <span className="text-gray-900 font-black text-sm">
        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price)}
      </span>
    );
  };

  // Filter courses
  const baseCourses = activeView === 'recommended' ? (data?.recommendedCourses || []) : allCourses;
  const displayedCourses = baseCourses.filter((course) => {
    if (selectedProvider !== 'ALL' && course.Provider !== selectedProvider) return false;
    if (filterFreeOnly && !course.IsFree && course.Price > 0) return false;
    if (focusedSkill && course.SkillID !== focusedSkill.SkillID) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        course.Title.toLowerCase().includes(q) ||
        course.SkillName?.toLowerCase().includes(q) ||
        course.Provider?.toLowerCase().includes(q) ||
        course.CertificateName?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/3 mx-auto"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
        <div className="h-64 bg-gray-200 rounded-3xl max-w-4xl mx-auto mt-8"></div>
      </div>
    );
  }

  const matchScore = data?.matchScore ?? 0;
  const scoreColor =
    matchScore >= 75
      ? 'text-emerald-600 bg-emerald-50 border-emerald-200'
      : matchScore >= 45
        ? 'text-amber-600 bg-amber-50 border-amber-200'
        : 'text-rose-600 bg-rose-50 border-rose-200';

  const progressBg =
    matchScore >= 75
      ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
      : matchScore >= 45
        ? 'bg-gradient-to-r from-amber-500 to-orange-500'
        : 'bg-gradient-to-r from-rose-500 to-pink-500';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">

      {/* 1. Header Banner */}
      <div className="text-center space-y-3 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-200">
          <span>Đánh giá năng lực & Lộ trình phát triển nghề nghiệp</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
          Phân tích kỹ năng theo vị trí mục tiêu
        </h1>
        <p className="text-sm text-slate-600 leading-relaxed">
          Đối chiếu năng lực hiện tại trong hồ sơ của bạn với tiêu chuẩn tuyển dụng cụ thể của từng vị trí, xác định kỹ năng cốt lõi cần bổ sung và khóa học phù hợp.
        </p>
      </div>

      {/* 2. CONTEXT BAR (Xác định Điểm B: Vị trí mục tiêu) */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-gray-200 shadow-card space-y-6">

        {/* Context Bar Header & Active Status */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-blue-50 text-blue-600">
                <Target className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Mục tiêu ứng tuyển
                </h2>
                <p className="text-xs text-slate-500">
                  Chọn vị trí chuẩn hoặc dán mô tả công việc cụ thể để đối chiếu 1-1
                </p>
              </div>
            </div>
          </div>

          {/* Active Target Status Badge & Match Score pill */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="px-3.5 py-1.5 rounded-2xl bg-gray-50 border border-gray-200/80 flex items-center gap-2 text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="text-gray-500">Đang phân tích cho:</span>
              <strong className="text-gray-900 font-bold line-clamp-1 max-w-[280px]">
                {data?.targetTitle || 'Senior Backend Developer (Node.js)'}
              </strong>
            </div>

            <div className={`px-3.5 py-1.5 rounded-2xl border font-bold text-xs flex items-center gap-1.5 ${scoreColor}`}>
              <span>Độ phù hợp:</span>
              <span className="text-sm">{matchScore}%</span>
            </div>
          </div>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setMode('role')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${mode === 'role'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:text-gray-900 hover:bg-gray-200'
              }`}
          >
            <span>Vị trí chuẩn thị trường</span>
          </button>

          <button
            type="button"
            onClick={() => setMode('job')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${mode === 'job'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:text-gray-900 hover:bg-gray-200'
              }`}
          >
            <span>Việc làm trên Jobtimize</span>
          </button>

          <button
            type="button"
            onClick={() => setMode('jd')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${mode === 'jd'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:text-gray-900 hover:bg-gray-200'
              }`}
          >
            <span>Mô tả công việc cụ thể</span>
          </button>
        </div>

        {/* Input Form based on Mode */}
        <form onSubmit={handleApplyTarget} className="space-y-4">

          {mode === 'role' && (
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
              <div className="sm:col-span-9 relative">
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-xs sm:text-sm font-semibold text-gray-900 bg-gray-50/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                >
                  {(data?.availableRoles || []).map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.title} — [{role.category}]
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-3">
                <button
                  type="submit"
                  disabled={analyzing}
                  className="w-full py-3 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${analyzing ? 'animate-spin' : ''}`} />
                  <span>{analyzing ? 'Đang phân tích...' : 'Phân tích vị trí'}</span>
                </button>
              </div>
            </div>
          )}

          {mode === 'job' && (
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
              <div className="sm:col-span-9 relative">
                <select
                  value={selectedJobId}
                  onChange={(e) => setSelectedJobId(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-xs sm:text-sm font-semibold text-gray-900 bg-gray-50/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                >
                  <option value="">-- Chọn tin tuyển dụng trên hệ thống --</option>
                  {(data?.availableJobs || []).map((job) => (
                    <option key={job.JobID} value={job.JobID}>
                      {job.Title} — {job.CompanyName} ({job.Location})
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-3">
                <button
                  type="submit"
                  disabled={analyzing || !selectedJobId}
                  className="w-full py-3 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${analyzing ? 'animate-spin' : ''}`} />
                  <span>{analyzing ? 'Đang so khớp...' : 'So khớp việc làm'}</span>
                </button>
              </div>
            </div>
          )}

          {mode === 'jd' && (
            <div className="space-y-3">
              <textarea
                rows={4}
                value={customJdText}
                onChange={(e) => setCustomJdText(e.target.value)}
                placeholder="Dán nội dung Mô tả công việc (JD) bạn muốn ứng tuyển vào đây (bao gồm Yêu cầu kỹ thuật, Kỹ năng bắt buộc, Kinh nghiệm mong muốn)..."
                className="w-full p-4 rounded-xl border border-gray-200 text-xs sm:text-sm font-medium text-gray-800 bg-gray-50/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all placeholder:text-gray-400"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={analyzing || !customJdText.trim()}
                  className="py-2.5 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  <span>{analyzing ? 'Đang phân tích...' : 'Bắt đầu đối chiếu'}</span>
                </button>
              </div>
            </div>
          )}

        </form>

        {/* Progress Bar Visualizer */}
        <div className="pt-2 border-t border-gray-100 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-gray-500">Mức độ hoàn thiện kỹ năng cho vị trí mục tiêu</span>
            <span className="text-gray-900">{matchScore}% sẵn sàng</span>
          </div>
          <div className="w-full h-3 rounded-full bg-gray-100 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${progressBg}`}
              style={{ width: `${matchScore}%` }}
            ></div>
          </div>
        </div>

      </div>

      {/* 3. BỐN THẺ THỐNG KÊ (STATS CARDS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">

        {/* Thẻ 1: Kỹ năng hiện có */}
        <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-card space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Kỹ năng hiện có</p>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-emerald-600">{data?.acquiredSkillsCount ?? 0}</p>
          <p className="text-xs text-gray-500">Đã phát hiện trên CV & Hồ sơ của bạn</p>
        </div>

        {/* Thẻ 2: Kỹ năng yêu cầu cho vị trí này */}
        <div className="bg-white p-6 rounded-3xl border border-blue-100 shadow-card space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Kỹ năng yêu cầu cho vị trí này</p>
            <div className="p-2 rounded-xl bg-blue-50 text-brand-blue">
              <Target className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-brand-blue">{data?.requiredSkillsCount ?? 0}</p>
          <p className="text-xs text-gray-500">Tiêu chuẩn tuyển dụng của vị trí này</p>
        </div>

        {/* Thẻ 3: Lỗ hổng kỹ năng cần bổ sung */}
        <div className="bg-white p-6 rounded-3xl border border-amber-100 shadow-card space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Lỗ hổng cần bổ sung</p>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-amber-600">{data?.missingSkillsCount ?? 0}</p>
          <p className="text-xs text-gray-500">
            {data?.mustHaveCount || 0} cốt lõi • {data?.niceToHaveCount || 0} điểm cộng
          </p>
        </div>

        {/* Thẻ 4: Mức độ đáp ứng */}
        <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-card space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Mức độ đáp ứng</p>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-blue-600">{matchScore}%</p>
          <p className="text-xs text-gray-500">Độ tương thích hồ sơ theo trọng số</p>
        </div>

      </div>

      {/* 4. SO KHỚP KỸ NĂNG: ĐÃ CÓ VS PHÂN NHÓM LỖ HỔNG (MUST-HAVE & NICE-TO-HAVE) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* CỘT TRÁI (5 Cột): KỸ NĂNG BẠN ĐÃ SỞ HỮU */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-6 sm:p-7 border border-emerald-100 shadow-card space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2 text-emerald-800">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
                <h2 className="text-base font-extrabold">Kỹ năng bạn đã sở hữu ({data?.acquiredSkills?.length || 0})</h2>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold">
                Khớp vị trí
              </span>
            </div>

            <p className="text-xs text-gray-500 leading-relaxed">
              Các kỹ năng này đã được phát hiện trong CV/Hồ sơ của bạn và đáp ứng yêu cầu nhà tuyển dụng:
            </p>

            <div className="flex flex-wrap gap-2 pt-1">
              {(data?.acquiredSkills || []).map((skill) => (
                <span
                  key={skill.SkillID}
                  className="px-3.5 py-2 rounded-2xl bg-emerald-50 text-emerald-900 border border-emerald-200/80 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all hover:bg-emerald-100/70"
                >
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>{skill.SkillName}</span>
                </span>
              ))}

              {(!data?.acquiredSkills || data.acquiredSkills.length === 0) && (
                <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 text-center space-y-1 w-full">
                  <p className="text-xs text-gray-500 font-medium">
                    Chưa phát hiện kỹ năng nào khớp với vị trí này.
                  </p>
                  <p className="text-[11px] text-gray-400">
                    Hãy cập nhật thêm kỹ năng vào hồ sơ hoặc CV của bạn.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-gray-50/80 border border-gray-100 text-[11px] text-gray-500 space-y-1">
            <span className="font-bold text-gray-700">💡 Gợi ý cải thiện:</span>
            <p>Kỹ năng đã sở hữu giúp bạn chứng minh năng lực ngay trong buổi phỏng vấn. Hãy chuẩn bị các dự án thực tế minh họa cho các kỹ năng này.</p>
          </div>
        </div>

        {/* CỘT PHẢI (7 Cột): PHÂN NHÓM LỖ HỔNG (MUST-HAVE & NICE-TO-HAVE) */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-7 border border-gray-200/80 shadow-card space-y-6">

          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2 text-gray-900">
              <Zap className="w-5 h-5 text-amber-500" />
              <h2 className="text-base font-extrabold">
                Lỗ hổng kỹ năng cần bổ sung ({data?.missingSkillsCount || 0})
              </h2>
            </div>
            <span className="text-xs text-gray-400">
              Chỉ tính riêng cho vị trí mục tiêu
            </span>
          </div>

          {/* NHÓM 1: KỸ NĂNG CỐT LÕI BỊ THIẾU (MUST-HAVE) */}
          <div className="p-5 rounded-2xl bg-rose-50/40 border border-rose-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-rose-800">
                <Flame className="w-4 h-4 text-rose-600" />
                <h3 className="text-xs sm:text-sm font-extrabold uppercase tracking-wide">
                  Kỹ năng cốt lõi bị thiếu (Must-have) ({data?.mustHaveCount || 0})
                </h3>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold">
                Bắt buộc phải có
              </span>
            </div>

            <p className="text-xs text-rose-700/80">
              Nhà tuyển dụng bắt buộc yêu cầu các kỹ năng này. Nếu thiếu, hồ sơ của bạn dễ bị loại ngay vòng lọc CV:
            </p>

            <div className="flex flex-wrap gap-2 pt-1">
              {(data?.mustHaveMissing || []).map((skill) => {
                const isSelected = focusedSkill?.SkillID === skill.SkillID;
                return (
                  <button
                    key={skill.SkillID}
                    type="button"
                    onClick={() => setFocusedSkill(isSelected ? null : skill)}
                    className={`px-3.5 py-2 rounded-2xl text-xs font-bold flex items-center gap-2 border transition-all ${isSelected
                      ? 'bg-rose-600 text-white border-rose-600 shadow-md shadow-rose-600/30 ring-2 ring-rose-400'
                      : 'bg-white text-rose-900 border-rose-200 hover:border-rose-400 hover:shadow-xs'
                      }`}
                  >
                    <AlertTriangle className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-rose-600'}`} />
                    <span>{skill.SkillName}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${isSelected ? 'bg-rose-700 text-white' : 'bg-rose-100 text-rose-800'}`}>
                      Cần học gấp
                    </span>
                  </button>
                );
              })}

              {(!data?.mustHaveMissing || data.mustHaveMissing.length === 0) && (
                <p className="text-xs text-emerald-700 font-bold flex items-center gap-1.5 py-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Tuyệt vời! Bạn đã bao phủ đầy đủ tất cả các kỹ năng cốt lõi (Must-have)!
                </p>
              )}
            </div>
          </div>

          {/* NHÓM 2: KỸ NĂNG ĐIỂM CỘNG (NICE-TO-HAVE) */}
          <div className="p-5 rounded-2xl bg-indigo-50/40 border border-indigo-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-indigo-900">
                <Star className="w-4 h-4 text-indigo-600" />
                <h3 className="text-xs sm:text-sm font-extrabold uppercase tracking-wide">
                  Kỹ năng điểm cộng (Nice-to-have) ({data?.niceToHaveCount || 0})
                </h3>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-bold">
                Tăng lợi thế cạnh tranh
              </span>
            </div>

            <p className="text-xs text-indigo-700/80">
              Bổ sung các kỹ năng này sẽ giúp bạn deal mức lương cao hơn và vượt trội hơn các ứng viên khác:
            </p>

            <div className="flex flex-wrap gap-2 pt-1">
              {(data?.niceToHaveMissing || []).map((skill) => {
                const isSelected = focusedSkill?.SkillID === skill.SkillID;
                return (
                  <button
                    key={skill.SkillID}
                    type="button"
                    onClick={() => setFocusedSkill(isSelected ? null : skill)}
                    className={`px-3.5 py-2 rounded-2xl text-xs font-bold flex items-center gap-2 border transition-all ${isSelected
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/30 ring-2 ring-indigo-400'
                      : 'bg-white text-indigo-900 border-indigo-200 hover:border-indigo-400 hover:shadow-xs'
                      }`}
                  >
                    <Tag className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-indigo-600'}`} />
                    <span>{skill.SkillName}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${isSelected ? 'bg-indigo-700 text-white' : 'bg-indigo-100 text-indigo-800'}`}>
                      Điểm cộng
                    </span>
                  </button>
                );
              })}

              {(!data?.niceToHaveMissing || data.niceToHaveMissing.length === 0) && (
                <p className="text-xs text-emerald-700 font-bold flex items-center gap-1.5 py-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Bạn đã có tất cả các kỹ năng điểm cộng được gợi ý!
                </p>
              )}
            </div>
          </div>

          {/* Quick notice when clicking a skill */}
          {focusedSkill && (
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-between text-xs">
              <span className="text-amber-900 font-semibold">
                Đang lọc khóa học bổ trợ cho kỹ năng: <strong>{focusedSkill.SkillName}</strong>
              </span>
              <button
                type="button"
                onClick={() => setFocusedSkill(null)}
                className="text-amber-700 underline font-bold text-[11px] hover:text-amber-900"
              >
                Hủy lọc
              </button>
            </div>
          )}

        </div>

      </div>

      {/* 5. KHỐI KHO KHÓA HỌC & LỘ TRÌNH ĐÀO TẠO THỰC TẾ (MAPPING TRỰC TIẾP TỪ LỖ HỔNG) */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/80 shadow-card space-y-6">

        {/* Controls & Filter Bar */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-gray-100 pb-6">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Compass className="w-5 h-5 text-blue-600" />
              <span>Kho khóa học & Lộ trình bổ sung kỹ năng</span>
            </h2>
            <p className="text-xs text-slate-500">
              Danh sách khóa học đề xuất kèm liên kết đăng ký, chứng chỉ và học phí chi tiết.
            </p>
          </div>

          {/* View Switcher Tabs */}
          <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-2xl shrink-0">
            <button
              onClick={() => { setActiveView('recommended'); setFocusedSkill(null); }}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${activeView === 'recommended'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              Đề xuất cho mục tiêu này ({data?.recommendedCourses?.length || 0})
            </button>
            <button
              onClick={() => { setActiveView('all'); setFocusedSkill(null); }}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${activeView === 'all'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              Tất cả khóa học ({allCourses.length})
            </button>
          </div>
        </div>

        {/* Skill Quick Filter Bar */}
        {activeView === 'recommended' && data?.missingSkills?.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            <span className="text-gray-400 font-bold shrink-0 text-[11px] uppercase tracking-wider">Lọc theo kỹ năng:</span>
            <button
              type="button"
              onClick={() => setFocusedSkill(null)}
              className={`px-3 py-1.5 rounded-xl font-bold shrink-0 transition-all ${!focusedSkill ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
            >
              Tất cả ({data?.recommendedCourses?.length || 0})
            </button>
            {data.missingSkills.map((sk) => (
              <button
                key={sk.SkillID}
                type="button"
                onClick={() => setFocusedSkill(focusedSkill?.SkillID === sk.SkillID ? null : sk)}
                className={`px-3 py-1.5 rounded-xl font-bold shrink-0 transition-all flex items-center gap-1.5 ${focusedSkill?.SkillID === sk.SkillID
                  ? sk.isMandatory ? 'bg-rose-600 text-white' : 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
              >
                {sk.isMandatory ? <Flame className="w-3 h-3 text-rose-500 shrink-0" /> : <Star className="w-3 h-3 text-indigo-500 shrink-0" />}
                <span>{sk.SkillName}</span>
              </button>
            ))}
          </div>
        )}

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
          {/* Search Input */}
          <div className="sm:col-span-6 relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo tên khóa học, kỹ năng, chứng chỉ..."
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 text-xs font-medium focus:border-brand-purple focus:outline-none bg-gray-50/50"
            />
          </div>

          {/* Platform Filter */}
          <div className="sm:col-span-3">
            <select
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 bg-gray-50/50 focus:outline-none"
            >
              <option value="ALL">Tất cả nền tảng</option>
              <option value="Coursera">Coursera</option>
              <option value="Udemy">Udemy</option>
              <option value="edX">edX</option>
            </select>
          </div>

          {/* Free Only Toggle */}
          <div className="sm:col-span-3 flex items-center">
            <button
              type="button"
              onClick={() => setFilterFreeOnly(!filterFreeOnly)}
              className={`w-full py-2 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-2 ${filterFreeOnly
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                }`}
            >
              <CheckCircle2 className={`w-3.5 h-3.5 ${filterFreeOnly ? 'text-emerald-600' : 'text-gray-400'}`} />
              <span>Chỉ xem Khóa học miễn phí</span>
            </button>
          </div>
        </div>

        {/* Courses Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
          {displayedCourses.map((course) => (
            <div
              key={course.CourseID}
              className="group rounded-3xl border border-gray-200/90 hover:border-brand-purple/50 bg-white hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col justify-between"
            >
              <div>
                {/* Thumbnail Image */}
                <div className="relative h-40 w-full overflow-hidden bg-gray-100">
                  <img
                    src={course.ThumbnailUrl || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=500&q=80'}
                    alt={course.Title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />

                  {/* Badges */}
                  <div className="absolute top-3 left-3 flex flex-wrap items-center gap-1.5">
                    <span className="px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-xs text-white text-[10px] font-bold">
                      {course.Provider}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-purple-600/90 backdrop-blur-xs text-white text-[10px] font-bold">
                      {course.SkillName}
                    </span>
                    {course.isMustHave && (
                      <span className="px-2.5 py-1 rounded-lg bg-rose-600 text-white text-[10px] font-black shadow-xs flex items-center gap-1">
                        <Flame className="w-3 h-3" /> Must-have
                      </span>
                    )}
                  </div>

                  {course.Rating && (
                    <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-500 text-white text-[10px] font-bold shadow">
                      <Star className="w-3 h-3 fill-white" />
                      <span>{course.Rating.toFixed(1)}</span>
                    </div>
                  )}
                </div>

                {/* Body Content */}
                <div className="p-5 space-y-3.5">
                  <h3 className="text-sm font-bold text-gray-900 group-hover:text-brand-purple transition-colors line-clamp-2 leading-snug">
                    {course.Title}
                  </h3>

                  {/* Certificate Badge */}
                  {course.CertificateName && (
                    <div className="flex items-start gap-1.5 p-2 rounded-xl bg-amber-50/80 border border-amber-200/70 text-[11px] font-semibold text-amber-900">
                      <Award className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <span className="line-clamp-1">{course.CertificateName}</span>
                    </div>
                  )}

                  {/* Meta Specs */}
                  <div className="flex flex-wrap items-center justify-between text-[11px] text-gray-500 pt-1 border-t border-gray-100">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-gray-400" />
                      {course.Duration || 'Tự học theo tiến độ'}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-gray-100 font-semibold text-gray-700 text-[10px]">
                      {course.Level || 'Mọi cấp độ'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom Price & Direct Link Action */}
              <div className="p-5 pt-0">
                <div className="flex items-center justify-between pt-3 border-t border-gray-100 mb-3">
                  <span className="text-[11px] text-gray-400 font-semibold">Học phí:</span>
                  {formatPrice(course.Price, course.IsFree)}
                </div>

                <a
                  href={course.Url}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-2.5 px-4 rounded-xl bg-gray-900 group-hover:bg-brand-purple text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
                >
                  <span>Truy cập & Đăng ký học</span>
                  <ArrowUpRight className="w-4 h-4" />
                </a>
              </div>

            </div>
          ))}
        </div>

        {displayedCourses.length === 0 && (
          <div className="py-16 text-center space-y-3">
            <BookOpen className="w-10 h-10 text-gray-300 mx-auto" />
            <p className="text-sm font-bold text-gray-700">Không tìm thấy khóa học nào phù hợp với bộ lọc hiện tại</p>
            <button
              onClick={() => { setSearchQuery(''); setSelectedProvider('ALL'); setFilterFreeOnly(false); setFocusedSkill(null); }}
              className="text-xs text-brand-purple font-bold hover:underline"
            >
              Đặt lại bộ lọc
            </button>
          </div>
        )}

      </div>

    </div>
  );
}
