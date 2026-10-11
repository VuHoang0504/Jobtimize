import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import {
  Sparkles,
  CheckCircle2,
  BookOpen,
  ExternalLink,
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
  ArrowUpRight
} from 'lucide-react';

export default function SkillGapAnalysisPage() {
  const [data, setData] = useState(null);
  const [allCourses, setAllCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProvider, setSelectedProvider] = useState('ALL');
  const [filterFreeOnly, setFilterFreeOnly] = useState(false);
  const [activeView, setActiveView] = useState('recommended'); // 'recommended' | 'all'

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [gapRes, coursesRes] = await Promise.all([
          api.get('/candidate/skill-gap'),
          api.get('/candidate/courses')
        ]);

        if (gapRes.data.success) {
          setData(gapRes.data.data);
        }
        if (coursesRes.data.success) {
          setAllCourses(coursesRes.data.data);
        }
      } catch (err) {
        console.error('Fetch skill gap and courses error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

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

  const displayedCourses = (activeView === 'recommended' ? (data?.recommendedCourses || []) : allCourses)
    .filter(course => {
      if (selectedProvider !== 'ALL' && course.Provider !== selectedProvider) return false;
      if (filterFreeOnly && !course.IsFree && course.Price > 0) return false;
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
        <div className="h-64 bg-gray-200 rounded-2xl max-w-4xl mx-auto"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      
      {/* Header Banner */}
      <div className="text-center space-y-3 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-purpleLight text-brand-purple text-xs font-bold border border-brand-purple/20 shadow-xs">
          <Sparkles className="w-4 h-4 animate-spin" style={{ animationDuration: '4s' }} />
          <span>Hệ Thống Trí Tuệ Nhân Tạo AI Jobtimize</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">
          Phân Tích Lỗ Hổng Kỹ Năng & Lộ Trình Khóa Học Thực Tế
        </h1>
        <p className="text-sm text-gray-600 leading-relaxed">
          AI tự động đối chiếu CV của bạn với kho dữ liệu thị trường việc làm, phát hiện các kỹ năng còn thiếu và kết nối trực tiếp với các khóa học cấp chứng chỉ uy tín (Coursera, Udemy, IBM, Meta, Google,...).
        </p>
      </div>

      {/* 3 Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-card space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Kỹ năng hiện có</p>
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="text-3xl font-black text-emerald-600">{data?.acquiredSkills?.length || 0}</p>
          <p className="text-xs text-gray-500">Đã nhận diện từ CV & Hồ sơ của bạn</p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-card space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Kỹ năng thị trường cần</p>
            <TrendingUp className="w-5 h-5 text-brand-blue" />
          </div>
          <p className="text-3xl font-black text-brand-blue">{data?.marketSkillTrends?.length || 0}</p>
          <p className="text-xs text-gray-500">Đang có nhu cầu tuyển dụng cao nhất</p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-card space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Khóa học trong CSDL</p>
            <BookOpen className="w-5 h-5 text-brand-purple" />
          </div>
          <p className="text-3xl font-black text-brand-purple">{allCourses.length || 0}</p>
          <p className="text-xs text-gray-500">Kèm chứng chỉ & học phí minh bạch</p>
        </div>
      </div>

      {/* Acquired Skills vs Missing Skills Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Acquired Skills */}
        <div className="bg-white rounded-3xl p-6 border border-emerald-100 shadow-card space-y-4">
          <div className="flex items-center gap-2 text-emerald-800">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <h2 className="text-base font-bold">Kỹ năng bạn đã sở hữu ({data?.acquiredSkills?.length || 0})</h2>
          </div>
          <p className="text-xs text-gray-500">
            Các kỹ năng này đã được phát hiện trong CV của bạn và đáp ứng yêu cầu nhà tuyển dụng:
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            {data?.acquiredSkills?.map((s, idx) => (
              <span key={idx} className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center gap-1.5 shadow-xs">
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                {s.SkillName}
              </span>
            ))}
            {(!data?.acquiredSkills || data.acquiredSkills.length === 0) && (
              <p className="text-xs text-gray-400 italic">Chưa phát hiện kỹ năng nào. Hãy cập nhật thêm vào CV của bạn!</p>
            )}
          </div>
        </div>

        {/* Missing Skills */}
        <div className="bg-white rounded-3xl p-6 border border-purple-100 shadow-card space-y-4">
          <div className="flex items-center gap-2 text-brand-purple">
            <Zap className="w-5 h-5 text-brand-purple" />
            <h2 className="text-base font-bold">Lỗ hổng kỹ năng cần bổ sung ({data?.missingSkills?.length || 0})</h2>
          </div>
          <p className="text-xs text-gray-500">
            Các kỹ năng nhà tuyển dụng đang săn đón nhưng bạn chưa cập nhật trong hồ sơ:
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            {data?.missingSkills?.map((s, idx) => (
              <span key={idx} className="px-3 py-1.5 rounded-xl bg-purple-50 text-brand-purple border border-purple-200 text-xs font-bold flex items-center gap-1.5 shadow-xs">
                <Tag className="w-3.5 h-3.5" />
                {s.SkillName}
              </span>
            ))}
            {(!data?.missingSkills || data.missingSkills.length === 0) && (
              <p className="text-xs text-emerald-600 font-bold">Xuất sắc! Hồ sơ của bạn đã bao phủ đầy đủ các kỹ năng trọng yếu!</p>
            )}
          </div>
        </div>

      </div>

      {/* Course Explorer Section (UC-C12: Nối CSDL Khóa học thực tế) */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/80 shadow-card space-y-6">
        
        {/* Controls & Filter Bar */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-gray-100 pb-6">
          <div className="space-y-1">
            <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
              <Compass className="w-5 h-5 text-brand-purple" />
              <span>Kho Khóa Học & Lộ Trình Đào Tạo Thực Tế</span>
            </h2>
            <p className="text-xs text-gray-500">
              Kết nối trực tiếp từ Cơ sở dữ liệu JobtimizeDB với link đăng ký, chứng chỉ và chi phí chi tiết.
            </p>
          </div>

          {/* View Switcher Tabs */}
          <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-2xl shrink-0">
            <button
              onClick={() => setActiveView('recommended')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeView === 'recommended'
                  ? 'bg-brand-purple text-white shadow-md shadow-brand-purple/20'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Gợi ý cho bạn ({data?.recommendedCourses?.length || 0})
            </button>
            <button
              onClick={() => setActiveView('all')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeView === 'all'
                  ? 'bg-brand-blue text-white shadow-md shadow-brand-blue/20'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Tất cả khóa học ({allCourses.length})
            </button>
          </div>
        </div>

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
              className={`w-full py-2 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-2 ${
                filterFreeOnly
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
                  <div className="absolute top-3 left-3 flex items-center gap-1.5">
                    <span className="px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-xs text-white text-[10px] font-bold">
                      {course.Provider}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-purple-600/90 backdrop-blur-xs text-white text-[10px] font-bold">
                      {course.SkillName}
                    </span>
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
            <p className="text-sm font-bold text-gray-700">Không tìm thấy khóa học nào phù hợp với bộ lọc</p>
            <button
              onClick={() => { setSearchQuery(''); setSelectedProvider('ALL'); setFilterFreeOnly(false); }}
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
