import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import MatchScoreBadge from '../components/common/MatchScoreBadge';
import {
  Search,
  MapPin,
  Briefcase,
  DollarSign,
  Sparkles,
  Bookmark,
  CheckCircle2,
  Clock,
  Building2,
  ArrowRight,
  Filter,
  Layers,
  ChevronDown,
  Check,
  X
} from 'lucide-react';

export default function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [jobs, setJobs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search states
  const [keyword, setKeyword] = useState(searchParams.get('keyword') || '');
  const [location, setLocation] = useState(searchParams.get('location') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('categoryId') || '');
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const categoryDropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target)) {
        setCategoryDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchJobs = async (customParams) => {
    setLoading(true);
    try {
      const kw = customParams?.keyword !== undefined ? customParams.keyword : keyword;
      const loc = customParams?.location !== undefined ? customParams.location : location;
      const cat = customParams?.categoryId !== undefined ? customParams.categoryId : selectedCategory;

      const params = {};
      if (kw) params.keyword = kw;
      if (loc) params.location = loc;
      if (cat) params.categoryId = cat;

      const res = await api.get('/jobs', { params });
      if (res.data.success) {
        setJobs(res.data.data);
      }
    } catch (err) {
      console.error('Fetch jobs error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await api.get('/metadata/categories');
      if (res.data.success) {
        setCategories(res.data.data);
      }
    } catch (err) {
      console.error('Fetch categories error:', err);
    }
  };

  // Sync state and fetch jobs whenever URL query params change or user changes
  useEffect(() => {
    const kw = searchParams.get('keyword') || '';
    const loc = searchParams.get('location') || '';
    const cat = searchParams.get('categoryId') || '';

    setKeyword(kw);
    setLocation(loc);
    setSelectedCategory(cat);

    fetchJobs({ keyword: kw, location: loc, categoryId: cat });
  }, [searchParams, user]);

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const params = {};
    if (keyword) params.keyword = keyword;
    if (location) params.location = location;
    if (selectedCategory) params.categoryId = selectedCategory;
    setSearchParams(params);
  };

  const handleSelectCategory = (catId) => {
    setSelectedCategory(catId);
    setCategoryDropdownOpen(false);
  };

  const handleSelectPosition = (posName) => {
    setKeyword(posName.replace('Việc làm ', ''));
    setSelectedCategory('');
    setCategoryDropdownOpen(false);
  };

  const handleToggleSave = async (e, jobId) => {
    e.stopPropagation();
    if (!user) {
      navigate('/login');
      return;
    }
    if (user.role !== 'Candidate') return;

    try {
      const res = await api.post('/jobs/save-toggle', { jobId });
      if (res.data.success) {
        setJobs(prev => prev.map(j => j.JobID === jobId ? { ...j, isSaved: res.data.isSaved } : j));
      }
    } catch (err) {
      console.error('Save job error:', err);
    }
  };

  // Get current selected category name for button display
  const selectedCatObj = categories.find(c => String(c.CategoryID) === String(selectedCategory));
  const categoryButtonLabel = selectedCatObj ? selectedCatObj.CategoryName : 'Tất cả ngành nghề';

  return (
    <div className="space-y-12 pb-20">

      {/* 1. Hero Search Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-brand-blue/10 via-brand-purpleLight/40 to-transparent pt-12 pb-16 px-4 sm:px-6 lg:px-8 border-b border-gray-100">
        <div className="max-w-6xl mx-auto text-center space-y-6">

          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-xs font-bold text-brand-blue shadow-sm">
            <Briefcase className="w-4 h-4 text-brand-blue" />
            <span>Nền tảng Tuyển dụng & Việc làm hàng đầu Việt Nam</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-gray-900 tracking-tight leading-tight">
            Tìm kiếm và tuyển dụng việc làm <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-brand-blue via-brand-dark to-brand-green bg-clip-text text-transparent">
              trên toàn quốc
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-gray-600 text-sm sm:text-base leading-relaxed">
            Khám phá hàng ngàn cơ hội việc làm IT hấp dẫn, kết nối trực tiếp với các nhà tuyển dụng công nghệ hàng đầu và phát triển sự nghiệp lập trình của bạn.
          </p>

          {/* Search Box */}
          <form
            onSubmit={handleSearchSubmit}
            className="max-w-4xl mx-auto bg-white p-3 rounded-2xl shadow-xl border border-gray-200/80 flex flex-col md:flex-row items-center gap-2 relative z-30"
          >
            {/* Keyword */}
            <div className="flex-1 flex items-center gap-2 px-3 py-2 w-full border-b md:border-b-0 md:border-r border-gray-100">
              <Search className="w-5 h-5 text-brand-blue shrink-0" />
              <input
                type="text"
                placeholder="Vị trí, tên công ty"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="w-full text-sm text-gray-800 placeholder-gray-400 focus:outline-none bg-transparent"
              />
            </div>

            {/* Location */}
            <div className="flex-1 flex items-center gap-2 px-3 py-2 w-full border-b md:border-b-0 md:border-r border-gray-100">
              <MapPin className="w-5 h-5 text-brand-green shrink-0" />
              <input
                type="text"
                placeholder="Địa điểm (Hà Nội, TP.HCM, Remote)..."
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full text-sm text-gray-800 placeholder-gray-400 focus:outline-none bg-transparent"
              />
            </div>

            {/* Category / Position Mega Dropdown */}
            <div className="flex-1 w-full relative" ref={categoryDropdownRef}>
              <button
                type="button"
                onClick={() => setCategoryDropdownOpen(!categoryDropdownOpen)}
                className="w-full flex items-center justify-between gap-2 px-3 py-2 text-sm text-gray-700 hover:text-brand-blue rounded-xl transition-colors focus:outline-none text-left"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Layers className="w-5 h-5 text-brand-purple shrink-0" />
                  <span className="truncate font-medium text-gray-800">
                    {categoryButtonLabel}
                  </span>
                </div>
                <ChevronDown className={`w-4 h-4 text-gray-400 shrink-0 transition-transform duration-200 ${categoryDropdownOpen ? 'rotate-180 text-brand-purple' : ''}`} />
              </button>

              {/* Mega Dropdown Popup */}
              {categoryDropdownOpen && (
                <div className="absolute top-full left-0 md:left-auto md:right-0 mt-3 w-full md:w-[780px] bg-white rounded-2xl shadow-2xl border border-gray-200/90 p-5 z-50 text-left animate-in fade-in slide-in-from-top-2 duration-150">
                  
                  {/* Dropdown Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
                    <button
                      type="button"
                      onClick={() => handleSelectCategory('')}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        !selectedCategory 
                          ? 'bg-brand-blue text-white shadow-xs' 
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <Check className={`w-3.5 h-3.5 ${!selectedCategory ? 'text-white' : 'text-transparent'}`} />
                      <span>Tất cả ngành nghề (Mặc định)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCategoryDropdownOpen(false)}
                      className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                    {/* Cột 1 & 2: VIỆC LÀM THEO VỊ TRÍ (7/12) */}
                    <div className="md:col-span-7 space-y-3 md:border-r md:border-gray-100 md:pr-4">
                      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                        VIỆC LÀM THEO VỊ TRÍ
                      </h3>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                        {/* Sub-col 1 */}
                        <div className="space-y-1">
                          {[
                            'Việc làm Nhân viên kinh doanh',
                            'Việc làm Kế toán',
                            'Việc làm Marketing',
                            'Việc làm Hành chính nhân sự',
                            'Việc làm Chăm sóc khách hàng',
                            'Việc làm Ngân hàng',
                            'Việc làm IT',
                          ].map((pos, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => handleSelectPosition(pos)}
                              className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-700 hover:text-brand-blue hover:bg-blue-50/60 transition-colors truncate"
                            >
                              {pos}
                            </button>
                          ))}
                        </div>

                        {/* Sub-col 2 */}
                        <div className="space-y-1">
                          {[
                            'Việc làm Lao động phổ thông',
                            'Việc làm Senior',
                            'Việc làm Kỹ sư xây dựng',
                            'Việc làm Thiết kế đồ hoạ',
                            'Việc làm Bất động sản',
                            'Việc làm Giáo dục',
                            'Việc làm Telesales',
                          ].map((pos, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => handleSelectPosition(pos)}
                              className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-700 hover:text-brand-blue hover:bg-blue-50/60 transition-colors truncate"
                            >
                              {pos}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Cột 3: VIỆC LÀM THEO LĨNH VỰC / NGÀNH NGHỀ (5/12) */}
                    <div className="md:col-span-5 space-y-3">
                      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                        VIỆC LÀM THEO LĨNH VỰC
                      </h3>
                      <div className="space-y-1">
                        {/* Database categories */}
                        {categories.map((cat) => (
                          <button
                            key={cat.CategoryID}
                            type="button"
                            onClick={() => handleSelectCategory(cat.CategoryID)}
                            className={`w-full text-left flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                              String(selectedCategory) === String(cat.CategoryID)
                                ? 'bg-purple-50 text-brand-purple font-bold'
                                : 'text-gray-700 hover:text-brand-purple hover:bg-purple-50/50'
                            }`}
                          >
                            <span className="truncate">{cat.CategoryName}</span>
                            {String(selectedCategory) === String(cat.CategoryID) && (
                              <Check className="w-3.5 h-3.5 text-brand-purple shrink-0 ml-1" />
                            )}
                          </button>
                        ))}

                        {/* Extended general categories */}
                        {[
                          'Việc làm Sản xuất',
                          'Việc làm Bán lẻ - Hàng tiêu dùng - FMCG',
                          'Việc làm IT - Phần mềm',
                          'Việc làm Xây dựng',
                          'Việc làm Giáo dục/Đào tạo',
                        ].map((item, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleSelectPosition(item)}
                            className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-700 hover:text-brand-purple hover:bg-purple-50/50 transition-colors truncate"
                          >
                            {item}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                </div>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full md:w-auto px-8 py-3.5 bg-gradient-to-r from-brand-blue to-brand-green text-white font-bold rounded-xl shadow-md shadow-brand-blue/20 hover:opacity-95 transition-all shrink-0 flex items-center justify-center gap-2"
            >
              <Search className="w-4 h-4" />
              Tìm việc
            </button>
          </form>

          {/* Quick Keywords */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2 text-xs text-gray-500">
            <span className="font-semibold text-gray-400">Từ khóa gợi ý:</span>
            {['React.js', 'Node.js', 'TypeScript', 'SQL Server', 'Python', 'DevOps', 'Machine Learning'].map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => { setKeyword(tag); fetchJobs({ keyword: tag }); }}
                className="px-2.5 py-1 rounded-lg bg-white border border-gray-200 text-gray-700 hover:border-brand-blue hover:text-brand-blue transition-colors shadow-xs"
              >
                {tag}
              </button>
            ))}
          </div>

        </div>
      </section>

      {/* 2. Job Listings Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-black text-gray-900 tracking-tight">
                Cơ Hội Việc Làm Hot
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-brand-greenLight text-brand-green text-xs font-bold">
                {jobs.length} việc làm
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              {user?.role === 'Candidate'
                ? '🎯 Các cơ hội việc làm IT được đề xuất phù hợp nhất với hồ sơ chuyên môn của bạn'
                : 'Khám phá các việc làm công nghệ thông tin hàng đầu từ các nhà tuyển dụng uy tín'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchJobs}
              className="px-4 py-2 text-xs font-bold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors shadow-xs flex items-center gap-1.5"
            >
              <Filter className="w-3.5 h-3.5" />
              Làm mới danh sách
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white p-6 rounded-2xl border border-gray-100 animate-pulse space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-gray-200 rounded-xl"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
                <div className="h-10 bg-gray-100 rounded-xl"></div>
              </div>
            ))}
          </div>
        ) : jobs.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 shadow-sm max-w-xl mx-auto space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-gray-50 border border-gray-200 flex items-center justify-center mx-auto text-gray-400">
              <Briefcase className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-gray-800">Không tìm thấy công việc phù hợp</h3>
            <p className="text-sm text-gray-500">
              Hãy thử thay đổi từ khóa tìm kiếm, địa điểm hoặc xóa bộ lọc ngành nghề.
            </p>
            <button
              onClick={() => { setKeyword(''); setLocation(''); setSelectedCategory(''); fetchJobs(); }}
              className="px-5 py-2.5 bg-brand-blue text-white text-xs font-bold rounded-xl hover:bg-brand-dark transition-colors shadow-md"
            >
              Xóa bộ lọc tìm kiếm
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {jobs.map((job) => (
              <div
                key={job.JobID}
                onClick={() => navigate(`/jobs/${job.JobID}`)}
                className="group relative bg-white rounded-2xl p-6 border border-gray-200/70 hover:border-brand-blue/50 shadow-card hover:shadow-card-hover transition-all duration-200 cursor-pointer flex flex-col justify-between"
              >
                {/* Top: Logo & Main Info */}
                <div>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      <img
                        src={job.CompanyLogoUrl || 'https://images.unsplash.com/photo-1549923746-c502d488b3ea?w=120&q=80'}
                        alt={job.CompanyName}
                        className="w-13 h-13 rounded-xl object-cover border border-gray-100 shadow-xs group-hover:scale-105 transition-transform"
                      />
                      <div>
                        <h3 className="text-base font-bold text-gray-900 group-hover:text-brand-blue transition-colors line-clamp-1">
                          {job.Title}
                        </h3>
                        <p className="text-xs font-semibold text-gray-600 flex items-center gap-1 mt-0.5">
                          <Building2 className="w-3.5 h-3.5 text-gray-400" />
                          {job.CompanyName}
                        </p>
                      </div>
                    </div>

                    {/* Bookmark Button */}
                    <button
                      type="button"
                      onClick={(e) => handleToggleSave(e, job.JobID)}
                      className={`p-2 rounded-xl border transition-colors ${job.isSaved
                        ? 'bg-amber-50 border-amber-200 text-amber-500'
                        : 'bg-gray-50 border-gray-200 text-gray-400 hover:text-amber-500 hover:bg-amber-50'
                        }`}
                      title={job.isSaved ? 'Bỏ lưu' : 'Lưu tin'}
                    >
                      <Bookmark className={`w-4 h-4 ${job.isSaved ? 'fill-amber-500' : ''}`} />
                    </button>
                  </div>

                  {/* Highlights: Salary & Location */}
                  <div className="flex flex-wrap items-center gap-3 mt-4 text-xs font-semibold">
                    <div className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg">
                      <DollarSign className="w-3.5 h-3.5" />
                      <span>{job.SalaryRange || 'Thỏa thuận'}</span>
                    </div>

                    <div className="flex items-center gap-1 text-gray-600 bg-gray-100 px-2.5 py-1 rounded-lg">
                      <MapPin className="w-3.5 h-3.5 text-gray-400" />
                      <span>{job.Location}</span>
                    </div>

                    {job.CategoryName && (
                      <span className="text-brand-blue bg-brand-light px-2.5 py-1 rounded-lg">
                        {job.CategoryName}
                      </span>
                    )}
                  </div>

                  {/* Required Skills Tags */}
                  {job.requiredSkills && job.requiredSkills.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3.5">
                      {job.requiredSkills.slice(0, 4).map((skill, idx) => (
                        <span
                          key={idx}
                          className={`text-[11px] px-2 py-0.5 rounded-md font-medium ${skill.IsMandatory
                            ? 'bg-blue-50 text-brand-blue border border-blue-200'
                            : 'bg-gray-50 text-gray-600 border border-gray-200'
                            }`}
                        >
                          {skill.SkillName}
                        </span>
                      ))}
                      {job.requiredSkills.length > 4 && (
                        <span className="text-[11px] px-1.5 py-0.5 rounded-md text-gray-400 font-medium">
                          +{job.requiredSkills.length - 4}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Bottom Card Footer */}
                <div className="mt-5 pt-3.5 border-t border-gray-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-gray-400">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Hôm nay</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* AI Match Score (Candidate mode) */}
                    {job.matchScore !== undefined && (
                      <MatchScoreBadge score={job.matchScore} size="sm" />
                    )}

                    {job.isApplied ? (
                      <span className="px-3 py-1 bg-emerald-100 text-emerald-700 font-bold rounded-xl flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Đã nộp đơn
                      </span>
                    ) : (
                      <span className="font-bold text-brand-blue group-hover:translate-x-1 transition-transform flex items-center gap-1">
                        Chi tiết <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </div>
                </div>

              </div>
            ))}
          </div>
        )}

      </section>

    </div>
  );
}
