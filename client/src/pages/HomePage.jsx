import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { getCompanyLogo, handleCompanyLogoError } from '../utils/logoHelper';
import {
  Search,
  MapPin,
  Briefcase,
  Bookmark,
  CheckCircle2,
  Clock,
  Building2,
  Upload,
  SlidersHorizontal,
  RotateCcw,
  FileText
} from 'lucide-react';

// Dữ liệu việc làm mẫu chuẩn doanh nghiệp khi chưa kết nối hoặc API trống
const SAMPLE_JOBS = [
  {
    JobID: 101,
    Title: 'Senior Frontend Engineer (ReactJS / Next.js / TypeScript)',
    CompanyName: 'VNG Corporation',
    CompanyLogoUrl: '/logos/vng.svg',
    Location: 'TP. Hồ Chí Minh',
    JobType: 'fulltime',
    ExperienceLevel: 'senior',
    SalaryRange: '30 - 52 triệu VNĐ',
    PostedAgo: 'Đăng 2 ngày trước',
    KYCStatus: 'Approved',
    requiredSkills: [
      { SkillName: 'React.js' },
      { SkillName: 'TypeScript' },
      { SkillName: 'Next.js' },
      { SkillName: 'Tailwind CSS' }
    ]
  },
  {
    JobID: 102,
    Title: 'Senior Fullstack Developer (Node.js & React.js)',
    CompanyName: 'FPT Software',
    CompanyLogoUrl: '/logos/fpt-software.svg',
    Location: 'Hà Nội',
    JobType: 'fulltime',
    ExperienceLevel: 'mid',
    SalaryRange: '28 - 45 triệu VNĐ',
    PostedAgo: 'Đăng 1 ngày trước',
    KYCStatus: 'Approved',
    requiredSkills: [
      { SkillName: 'Node.js' },
      { SkillName: 'React.js' },
      { SkillName: 'PostgreSQL' },
      { SkillName: 'Docker' }
    ]
  },
  {
    JobID: 103,
    Title: 'Senior Site Reliability Engineer (DevOps / SRE / Kubernetes)',
    CompanyName: 'Shopee (Sea Group)',
    CompanyLogoUrl: '/logos/shopee.svg',
    Location: 'TP. Hồ Chí Minh • Remote',
    JobType: 'remote',
    ExperienceLevel: 'senior',
    SalaryRange: '35 - 65 triệu VNĐ',
    PostedAgo: 'Đăng 3 ngày trước',
    KYCStatus: 'Approved',
    requiredSkills: [
      { SkillName: 'Kubernetes' },
      { SkillName: 'AWS Cloud' },
      { SkillName: 'Docker' },
      { SkillName: 'Python' }
    ]
  },
  {
    JobID: 104,
    Title: 'Senior Python Engineer / AI Platform & MLOps',
    CompanyName: 'VinAI (Vingroup)',
    CompanyLogoUrl: '/logos/vinai.svg',
    Location: 'Hà Nội',
    JobType: 'fulltime',
    ExperienceLevel: 'senior',
    SalaryRange: '35 - 65 triệu VNĐ',
    PostedAgo: 'Đăng 4 ngày trước',
    KYCStatus: 'Approved',
    requiredSkills: [
      { SkillName: 'Python' },
      { SkillName: 'Machine Learning' },
      { SkillName: 'Docker' },
      { SkillName: 'Kubernetes' }
    ]
  }
];

const JOB_TYPES = [
  { id: 'fulltime', label: 'Toàn thời gian (Full-time)' },
  { id: 'remote', label: 'Làm việc từ xa (Remote)' },
  { id: 'hybrid', label: 'Linh hoạt (Hybrid)' },
  { id: 'contract', label: 'Hợp đồng / Dự án' }
];

const EXPERIENCE_LEVELS = [
  { id: 'entry', label: 'Fresher / Mới tốt nghiệp' },
  { id: 'mid', label: 'Junior / Middle (1 - 3 năm)' },
  { id: 'senior', label: 'Senior (Trên 3 năm)' },
  { id: 'lead', label: 'Tech Lead / Chuyên gia' }
];

const SALARY_RANGES = [
  { id: 'all', label: 'Tất cả mức lương' },
  { id: 'under25', label: 'Dưới 25 triệu VNĐ' },
  { id: '25to45', label: 'Từ 25 – 45 triệu VNĐ' },
  { id: 'above45', label: 'Trên 45 triệu VNĐ' }
];

function formatPostedAgo(dateStr, fallback = 'Đăng 2 ngày trước') {
  if (!dateStr) return fallback;
  const created = new Date(dateStr);
  if (isNaN(created.getTime())) return fallback;
  const diffHours = Math.floor((Date.now() - created.getTime()) / (1000 * 60 * 60));
  if (diffHours < 24) return 'Đăng hôm nay';
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Đăng 1 ngày trước';
  if (diffDays < 30) return `Đăng ${diffDays} ngày trước`;
  return 'Đăng gần đây';
}

function calculateJobMatchScore(job, user) {
  if (typeof job.matchScore === 'number') {
    return Math.max(0, Math.min(100, Math.round(job.matchScore)));
  }

  const reqSkills = Array.isArray(job.requiredSkills) ? job.requiredSkills : [];
  if (!user || user.role !== 'Candidate' || !user.profile || reqSkills.length === 0) {
    return 0;
  }

  const candidateText = `${user.profile.Headline || ''} ${user.profile.Bio || ''}`.toLowerCase();
  if (!candidateText.trim()) return 0;

  let matched = 0;
  for (const s of reqSkills) {
    const rawName = (typeof s === 'string' ? s : s.SkillName || '').toLowerCase().trim();
    if (!rawName) continue;
    const baseName = rawName.replace(/\.js$/, '');
    if (candidateText.includes(rawName) || (baseName.length > 2 && candidateText.includes(baseName))) {
      matched += 1;
    }
  }

  if (matched === 0) return 0;
  return Math.round((matched / reqSkills.length) * 100);
}

export default function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Trạng thái thanh tìm kiếm
  const [keyword, setKeyword] = useState(searchParams.get('keyword') || '');
  const [location, setLocation] = useState(searchParams.get('location') || '');

  // Trạng thái bộ lọc cột trái
  const [selectedJobTypes, setSelectedJobTypes] = useState([]);
  const [selectedExpLevels, setSelectedExpLevels] = useState([]);
  const [selectedSalaryRange, setSelectedSalaryRange] = useState('all');

  const fetchJobs = async (customParams) => {
    setLoading(true);
    try {
      const kw = customParams?.keyword !== undefined ? customParams.keyword : keyword;
      const loc = customParams?.location !== undefined ? customParams.location : location;

      const params = {};
      if (kw) params.keyword = kw;
      if (loc) params.location = loc;

      const res = await api.get('/jobs', { params });
      if (res.data?.success && Array.isArray(res.data.data)) {
        setJobs(res.data.data);
      } else {
        setJobs(SAMPLE_JOBS);
      }
    } catch (err) {
      console.error('Fetch jobs error:', err);
      setJobs(SAMPLE_JOBS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const kw = searchParams.get('keyword') || '';
    const loc = searchParams.get('location') || '';
    setKeyword(kw);
    setLocation(loc);
    fetchJobs({ keyword: kw, location: loc });
  }, [searchParams, user]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const params = {};
    if (keyword.trim()) params.keyword = keyword.trim();
    if (location.trim()) params.location = location.trim();
    setSearchParams(params);
  };

  const handleToggleCheckbox = (value, list, setList) => {
    if (list.includes(value)) {
      setList(list.filter((item) => item !== value));
    } else {
      setList([...list, value]);
    }
  };

  const handleResetFilters = () => {
    setKeyword('');
    setLocation('');
    setSelectedJobTypes([]);
    setSelectedExpLevels([]);
    setSelectedSalaryRange('all');
    setSearchParams({});
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
        setJobs((prev) =>
          prev.map((j) => (j.JobID === jobId ? { ...j, isSaved: res.data.isSaved } : j))
        );
      }
    } catch (err) {
      console.error('Save job error:', err);
    }
  };

  // Lọc dữ liệu trực tiếp theo các checkbox bộ lọc cột trái
  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      const titleAndDesc = `${job.Title || ''} ${job.Description || ''} ${job.Requirements || ''} ${job.Location || ''}`.toLowerCase();

      if (selectedJobTypes.length > 0) {
        const matchesType = selectedJobTypes.some((typeId) => {
          if (typeId === 'remote') return titleAndDesc.includes('remote') || titleAndDesc.includes('từ xa') || job.JobType === 'remote';
          if (typeId === 'hybrid') return titleAndDesc.includes('hybrid') || titleAndDesc.includes('linh hoạt') || job.JobType === 'hybrid';
          if (typeId === 'contract') return titleAndDesc.includes('contract') || titleAndDesc.includes('hợp đồng') || job.JobType === 'contract';
          return true; // Mặc định Toàn thời gian (Full-time)
        });
        if (!matchesType) return false;
      }

      if (selectedExpLevels.length > 0) {
        const matchesExp = selectedExpLevels.some((levelId) => {
          if (levelId === 'senior') return titleAndDesc.includes('senior') || titleAndDesc.includes('3+ năm') || titleAndDesc.includes('3 năm') || titleAndDesc.includes('3-5 năm');
          if (levelId === 'lead') return titleAndDesc.includes('lead') || titleAndDesc.includes('principal') || titleAndDesc.includes('architect') || titleAndDesc.includes('trưởng nhóm');
          if (levelId === 'entry') return titleAndDesc.includes('fresher') || titleAndDesc.includes('intern') || titleAndDesc.includes('mới tốt nghiệp') || titleAndDesc.includes('1 năm');
          if (levelId === 'mid') return titleAndDesc.includes('2 năm') || titleAndDesc.includes('2+ năm') || titleAndDesc.includes('2-4 năm') || !titleAndDesc.includes('senior');
          return true;
        });
        if (!matchesExp) return false;
      }

      if (selectedSalaryRange !== 'all') {
        const numbers = String(job.SalaryRange || '').match(/\d+/g)?.map(Number) || [];
        const maxSalary = numbers.length > 0 ? Math.max(...numbers) : 30;
        if (selectedSalaryRange === 'under25' && maxSalary > 25) return false;
        if (selectedSalaryRange === '25to45' && (maxSalary < 25 || maxSalary > 48)) return false;
        if (selectedSalaryRange === 'above45' && maxSalary < 45) return false;
      }

      return true;
    });
  }, [jobs, selectedJobTypes, selectedExpLevels, selectedSalaryRange]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      {/* B. Hero Section (Thực tế, rõ ràng & hướng hành động) */}
      <section className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-14">
          <div className="max-w-3xl">
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight leading-tight">
              Tìm công việc phù hợp với kỹ năng của bạn.
            </h1>
            <p className="mt-3 text-base text-slate-600 leading-relaxed">
              Tra cứu các vị trí công nghệ từ doanh nghiệp đã xác thực, đối chiếu trực tiếp với bộ kỹ năng chuyên môn và mục tiêu nghề nghiệp của bạn.
            </p>
          </div>

          {/* Thanh tìm kiếm 2 ô nhập liệu nổi bật */}
          <form
            onSubmit={handleSearchSubmit}
            className="mt-7 bg-white p-2 rounded-lg border border-gray-300 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center gap-2 max-w-4xl focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-600/15 transition-all"
          >
            {/* Ô 1: Chức danh, kỹ năng hoặc công ty */}
            <div className="flex-1 flex items-center gap-3 px-3.5 py-2.5 border-b md:border-b-0 md:border-r border-gray-200">
              <Search className="w-5 h-5 text-slate-400 shrink-0" />
              <div className="w-full">
                <label htmlFor="search-keyword" className="sr-only">
                  Chức danh hoặc từ khóa kỹ năng
                </label>
                <input
                  id="search-keyword"
                  type="text"
                  placeholder="Chức danh, kỹ năng hoặc tên công ty (VD: React, Node.js, DevOps)..."
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  className="w-full text-sm text-slate-900 placeholder-slate-400 focus:outline-none bg-transparent"
                />
              </div>
            </div>

            {/* Ô 2: Địa điểm làm việc */}
            <div className="flex-1 flex items-center gap-3 px-3.5 py-2.5">
              <MapPin className="w-5 h-5 text-slate-400 shrink-0" />
              <div className="w-full">
                <label htmlFor="search-location" className="sr-only">
                  Địa điểm làm việc
                </label>
                <input
                  id="search-location"
                  type="text"
                  placeholder="Địa điểm (Hà Nội, TP. Hồ Chí Minh, Đà Nẵng, Remote)..."
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full text-sm text-slate-900 placeholder-slate-400 focus:outline-none bg-transparent"
                />
              </div>
            </div>

            {/* Nút Tìm kiếm màu xanh chủ đạo */}
            <button
              type="submit"
              className="px-7 py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-semibold rounded-md transition-colors shrink-0 cursor-pointer"
            >
              Tìm việc
            </button>
          </form>

          {/* Gợi ý từ khóa kỹ năng nhanh */}
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-600">
            <span className="font-medium text-slate-500">Từ khóa phổ biến:</span>
            {['React.js', 'Node.js', 'TypeScript', 'Python', 'Kubernetes', 'AWS Cloud'].map((skill) => (
              <button
                key={skill}
                type="button"
                onClick={() => {
                  setKeyword(skill);
                  setSearchParams({ keyword: skill });
                }}
                className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors cursor-pointer"
              >
                {skill}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Khung nội dung chính */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        {/* C. Thẻ giới thiệu Phân tích Kỹ năng & Độ phù hợp hồ sơ */}
        <section
          aria-label="Phân tích Kỹ năng & Độ phù hợp hồ sơ"
          className="bg-white border border-gray-200 rounded-lg p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs"
        >
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-11 h-11 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-semibold text-slate-900">
                  Phân tích kỹ năng & Độ phù hợp hồ sơ
                </h2>
                <span className="px-2 py-0.5 text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded">
                  Đánh giá độ tương thích CV
                </span>
              </div>
              <p className="text-sm text-slate-600 mt-0.5">
                Tải lên CV của bạn để xem mức độ phù hợp và các kỹ năng cần bổ sung cho từng vị trí tuyển dụng.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              to={user ? '/candidate/dashboard' : '/login'}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-slate-800 text-sm font-semibold transition-colors shadow-2xs"
            >
              <Upload className="w-4 h-4 text-blue-600" />
              <span>Tải lên CV</span>
            </Link>
            {user?.role === 'Candidate' && (
              <Link
                to="/candidate/skill-gap"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-sm font-semibold transition-colors"
              >
                <span>Báo cáo kỹ năng</span>
              </Link>
            )}
          </div>
        </section>

        {/* D. Nội dung chính - Bố cục 2 cột (Cột trái Bộ lọc 25% / Cột phải Danh sách việc làm 75%) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Cột trái: Bộ lọc tìm kiếm (25% -> 3/12 cột) */}
          <aside className="lg:col-span-3 bg-white border border-gray-200 rounded-lg p-5 space-y-6">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3.5">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <SlidersHorizontal className="w-4 h-4 text-slate-500" />
                <span>Bộ lọc tìm kiếm</span>
              </div>
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-xs font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                Đặt lại
              </button>
            </div>

            {/* Nhóm lọc 1: Hình thức làm việc */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                Hình thức làm việc
              </h3>
              <div className="space-y-2.5">
                {JOB_TYPES.map((type) => (
                  <label
                    key={type.id}
                    className="flex items-center gap-2.5 text-sm text-slate-600 hover:text-slate-900 cursor-pointer select-none"
                  >
                    <input
                      type="checkbox"
                      checked={selectedJobTypes.includes(type.id)}
                      onChange={() =>
                        handleToggleCheckbox(type.id, selectedJobTypes, setSelectedJobTypes)
                      }
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>{type.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Nhóm lọc 2: Cấp bậc kinh nghiệm */}
            <div className="space-y-3 pt-4 border-t border-gray-100">
              <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                Cấp bậc kinh nghiệm
              </h3>
              <div className="space-y-2.5">
                {EXPERIENCE_LEVELS.map((level) => (
                  <label
                    key={level.id}
                    className="flex items-center gap-2.5 text-sm text-slate-600 hover:text-slate-900 cursor-pointer select-none"
                  >
                    <input
                      type="checkbox"
                      checked={selectedExpLevels.includes(level.id)}
                      onChange={() =>
                        handleToggleCheckbox(level.id, selectedExpLevels, setSelectedExpLevels)
                      }
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>{level.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Nhóm lọc 3: Mức lương */}
            <div className="space-y-3 pt-4 border-t border-gray-100">
              <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                Mức lương
              </h3>
              <div className="space-y-2.5">
                {SALARY_RANGES.map((range) => (
                  <label
                    key={range.id}
                    className="flex items-center gap-2.5 text-sm text-slate-600 hover:text-slate-900 cursor-pointer select-none"
                  >
                    <input
                      type="radio"
                      name="salaryRange"
                      checked={selectedSalaryRange === range.id}
                      onChange={() => setSelectedSalaryRange(range.id)}
                      className="w-4 h-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>{range.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </aside>

          {/* Cột phải: Danh sách Thẻ Việc làm (75% -> 9/12 cột) */}
          <section className="lg:col-span-9 space-y-4">
            {/* Tiêu đề danh sách */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <p className="text-sm text-slate-600">
                Hiển thị <span className="font-semibold text-slate-900">{filteredJobs.length}</span> vị trí đang tuyển dụng
              </p>
              <span className="text-xs text-slate-500">
                Sắp xếp theo: <strong className="font-semibold text-slate-800">Độ phù hợp cao nhất (Match Score)</strong>
              </span>
            </div>

            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="bg-white p-6 rounded-lg border border-gray-200 animate-pulse space-y-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-11 h-11 bg-gray-200 rounded-lg"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                        <div className="h-3 bg-gray-100 rounded w-1/3"></div>
                      </div>
                    </div>
                    <div className="h-8 bg-gray-100 rounded"></div>
                  </div>
                ))}
              </div>
            ) : filteredJobs.length === 0 ? (
              <div className="bg-white rounded-lg p-12 text-center border border-gray-200 space-y-3">
                <div className="w-12 h-12 rounded-lg bg-slate-50 border border-gray-200 flex items-center justify-center mx-auto text-slate-400">
                  <Briefcase className="w-6 h-6" />
                </div>
                <h3 className="text-base font-semibold text-slate-900">
                  Không tìm thấy công việc phù hợp
                </h3>
                <p className="text-sm text-slate-600 max-w-md mx-auto">
                  Hãy thử thay đổi từ khóa tìm kiếm, địa điểm hoặc đặt lại các tiêu chí lọc ở cột bên trái.
                </p>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-md transition-colors cursor-pointer"
                >
                  Xóa bộ lọc tìm kiếm
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredJobs.map((job) => {
                  const matchScore = calculateJobMatchScore(job, user);
                  const postedText = job.PostedAgo || formatPostedAgo(job.CreatedAt);

                  return (
                    /* E. Thẻ Việc làm (Job Card Component) */
                    <article
                      key={job.JobID}
                      onClick={() => navigate(`/jobs/${job.JobID}`)}
                      className="group bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md hover:border-gray-300 transition-all duration-150 cursor-pointer"
                    >
                      {/* Header: Logo, Chức danh, Tên công ty, Địa điểm, Thời gian đăng & Huy hiệu Match Score góc phải */}
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3.5 min-w-0">
                          <img
                            src={getCompanyLogo(job.CompanyLogoUrl, job.CompanyName)}
                            alt={job.CompanyName}
                            onError={(e) => handleCompanyLogoError(e, job.CompanyName)}
                            className="w-11 h-11 rounded-lg object-contain shrink-0 border border-gray-200 bg-white"
                          />
                          <div className="min-w-0">
                            <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                              {job.Title}
                            </h3>
                            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
                              <span className="font-medium text-slate-800 inline-flex items-center gap-1">
                                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                                {job.CompanyName}
                                {job.KYCStatus === 'Approved' && (
                                  <CheckCircle2
                                    title="Doanh nghiệp đã xác thực KYC"
                                    className="w-3.5 h-3.5 text-blue-600 inline ml-0.5"
                                  />
                                )}
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                {job.Location || 'Toàn quốc'}
                              </span>
                              <span className="inline-flex items-center gap-1 text-slate-500">
                                <Clock className="w-3.5 h-3.5 text-slate-400" />
                                {postedText}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Huy hiệu Match Score góc trên bên phải */}
                        <div className="shrink-0">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                              matchScore > 0
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-slate-100 text-slate-600 border-gray-200'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                matchScore > 0 ? 'bg-emerald-500' : 'bg-slate-400'
                              }`}
                            ></span>
                            {matchScore}% Phù hợp
                          </span>
                        </div>
                      </div>

                      {/* Center: Danh sách thẻ kỹ năng yêu cầu màu xám tinh tế */}
                      {job.requiredSkills && job.requiredSkills.length > 0 && (
                        <div className="mt-4 flex flex-wrap items-center gap-2">
                          {job.requiredSkills.map((skill, idx) => (
                            <span
                              key={idx}
                              className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-medium"
                            >
                              {skill.SkillName || skill}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Footer: Mức lương & Nút Lưu tin */}
                      <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between">
                        <div className="text-sm font-semibold text-slate-900">
                          {job.SalaryRange || 'Thỏa thuận'}
                        </div>

                        <div className="flex items-center gap-2">
                          {job.isApplied && (
                            <span className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
                              Đã ứng tuyển
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={(e) => handleToggleSave(e, job.JobID)}
                            aria-label={job.isSaved ? 'Bỏ lưu tin' : 'Lưu tin'}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-medium transition-colors cursor-pointer ${
                              job.isSaved
                                ? 'bg-blue-50 border-blue-200 text-blue-600'
                                : 'bg-white border-gray-200 text-slate-600 hover:bg-gray-50 hover:text-slate-900'
                            }`}
                          >
                            <Bookmark
                              className={`w-3.5 h-3.5 ${job.isSaved ? 'fill-blue-600 text-blue-600' : ''}`}
                            />
                            <span>{job.isSaved ? 'Đã lưu' : 'Lưu tin'}</span>
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
