import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import MatchScoreBadge from '../../components/common/MatchScoreBadge';
import { 
  Building2, 
  MapPin, 
  DollarSign, 
  Clock, 
  Sparkles, 
  CheckCircle2, 
  XCircle, 
  BookOpen, 
  ExternalLink, 
  Send, 
  Bookmark, 
  FileText, 
  Upload, 
  ArrowLeft,
  Briefcase
} from 'lucide-react';

export default function JobDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [selectedCvId, setSelectedCvId] = useState('');
  const [applying, setApplying] = useState(false);
  const [applySuccess, setApplySuccess] = useState(false);

  const fetchJobDetail = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/jobs/${id}`);
      if (res.data.success) {
        setJob(res.data.data);
        if (res.data.data.candidateContext?.candidateCVs?.length > 0) {
          const primaryCv = res.data.data.candidateContext.candidateCVs.find(c => c.IsPrimary) || res.data.data.candidateContext.candidateCVs[0];
          setSelectedCvId(primaryCv.CVID);
        }
      }
    } catch (err) {
      console.error('Fetch job detail error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobDetail();
  }, [id, user]);

  const handleApply = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (user.role !== 'Candidate') return;

    try {
      setApplying(true);
      const res = await api.post('/jobs/apply', {
        jobId: job.JobID,
        cvId: selectedCvId
      });
      if (res.data.success) {
        setApplySuccess(true);
        setTimeout(() => {
          setApplyModalOpen(false);
          fetchJobDetail();
        }, 1500);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Ứng tuyển thất bại.');
    } finally {
      setApplying(false);
    }
  };

  const handleToggleSave = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      const res = await api.post('/jobs/save-toggle', { jobId: job.JobID });
      if (res.data.success) {
        setJob(prev => ({
          ...prev,
          candidateContext: {
            ...prev.candidateContext,
            isSaved: res.data.isSaved
          }
        }));
      }
    } catch (err) {
      console.error('Save error:', err);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/3 mx-auto"></div>
        <div className="h-64 bg-gray-200 rounded-2xl max-w-4xl mx-auto"></div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-4">
        <h2 className="text-xl font-bold text-gray-800">Không tìm thấy tin tuyển dụng</h2>
        <Link to="/" className="inline-block px-5 py-2.5 bg-brand-blue text-white rounded-xl font-bold text-sm">
          Về trang chủ
        </Link>
      </div>
    );
  }

  const aiAnalysis = job.candidateContext?.aiAnalysis;
  const isApplied = job.candidateContext?.isApplied;
  const isSaved = job.candidateContext?.isSaved;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Back link */}
      <div>
        <Link to="/" className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-brand-blue transition-colors">
          <ArrowLeft className="w-4 h-4" /> Quay lại danh sách việc làm
        </Link>
      </div>

      {/* Main Grid: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column (2/3): JD Content */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Header Card */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/80 shadow-card space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
              
              <div className="flex items-start gap-4">
                <img
                  src={job.CompanyLogoUrl || 'https://images.unsplash.com/photo-1549923746-c502d488b3ea?w=150&q=80'}
                  alt={job.CompanyName}
                  className="w-16 h-16 rounded-2xl object-cover border border-gray-100 shadow-sm"
                />
                <div className="space-y-1">
                  <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                    {job.Title}
                  </h1>
                  <p className="text-sm font-semibold text-gray-600 flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-brand-blue" />
                    {job.CompanyName}
                  </p>
                </div>
              </div>

              {/* Action Buttons on Mobile / Desktop */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleToggleSave}
                  className={`p-3 rounded-2xl border transition-colors ${
                    isSaved
                      ? 'bg-amber-50 border-amber-200 text-amber-500'
                      : 'bg-gray-50 border-gray-200 text-gray-400 hover:text-amber-500 hover:bg-amber-50'
                  }`}
                  title={isSaved ? 'Bỏ lưu' : 'Lưu tin'}
                >
                  <Bookmark className={`w-5 h-5 ${isSaved ? 'fill-amber-500' : ''}`} />
                </button>

                {isApplied ? (
                  <div className="px-5 py-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-sm flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5" />
                    Đã ứng tuyển
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      if (!user) navigate('/login');
                      else setApplyModalOpen(true);
                    }}
                    className="px-6 py-3 rounded-2xl bg-gradient-to-r from-brand-blue to-brand-green text-white font-bold text-sm shadow-md shadow-brand-blue/20 hover:opacity-95 transition-all flex items-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    Ứng tuyển ngay
                  </button>
                )}
              </div>

            </div>

            {/* Quick Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-4 border-t border-gray-100 text-xs">
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                <p className="text-gray-400 font-medium">Mức lương</p>
                <p className="font-bold text-emerald-600 mt-0.5 text-sm">{job.SalaryRange || 'Thỏa thuận'}</p>
              </div>

              <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                <p className="text-gray-400 font-medium">Địa điểm</p>
                <p className="font-bold text-gray-800 mt-0.5 text-sm">{job.Location}</p>
              </div>

              <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 col-span-2 sm:col-span-1">
                <p className="text-gray-400 font-medium">Ngành nghề</p>
                <p className="font-bold text-brand-blue mt-0.5 text-sm">{job.CategoryName || 'IT / Phần mềm'}</p>
              </div>
            </div>

          </div>

          {/* Job Description & Requirements Card */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/80 shadow-card space-y-8">
            
            {/* 1. Job Description */}
            <div className="space-y-3">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-2">
                <Briefcase className="w-5 h-5 text-brand-blue" />
                Mô tả công việc (Job Description)
              </h2>
              <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                {job.Description}
              </div>
            </div>

            {/* 2. Requirements */}
            <div className="space-y-3">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-2">
                <CheckCircle2 className="w-5 h-5 text-brand-green" />
                Yêu cầu ứng viên (Requirements)
              </h2>
              <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                {job.Requirements}
              </div>
            </div>

            {/* 3. Skill Tags */}
            {job.requiredSkills && job.requiredSkills.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">
                  Kỹ năng yêu cầu
                </h3>
                <div className="flex flex-wrap gap-2">
                  {job.requiredSkills.map((s) => (
                    <span
                      key={s.SkillID}
                      className={`px-3 py-1 rounded-xl text-xs font-semibold ${
                        s.IsMandatory
                          ? 'bg-blue-50 text-brand-blue border border-blue-200'
                          : 'bg-gray-100 text-gray-700 border border-gray-200'
                      }`}
                    >
                      {s.SkillName} {s.IsMandatory ? '★ (Bắt buộc)' : ''}
                    </span>
                  ))}
                </div>
              </div>
            )}

          </div>

        </div>

        {/* Right Column (1/3): AI Matching, Skills Gap, Course Suggestions & Company Card */}
        <div className="space-y-6">
          
          {/* AI Matching Widget (If Candidate Logged In) */}
          {aiAnalysis && (
            <div className="bg-white rounded-3xl p-6 border border-brand-purple/20 shadow-ai-glow space-y-5 relative overflow-hidden">
              <div className="absolute -right-8 -top-8 w-24 h-24 bg-brand-purple/10 rounded-full blur-xl pointer-events-none"></div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-brand-purple animate-pulse" />
                  <h3 className="text-base font-black text-gray-900">AI Match Score</h3>
                </div>
                <MatchScoreBadge score={aiAnalysis.matchScore} size="lg" />
              </div>

              <p className="text-xs text-gray-600 leading-relaxed bg-brand-purpleLight/60 p-3 rounded-2xl border border-brand-purple/10">
                {aiAnalysis.summary}
              </p>

              {/* Matched Skills */}
              <div className="space-y-2">
                <p className="text-xs font-bold text-emerald-700 flex items-center gap-1 uppercase tracking-wider">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Kỹ năng bạn đã đáp ứng ({aiAnalysis.matchedSkills?.length || 0})
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {aiAnalysis.matchedSkills && aiAnalysis.matchedSkills.length > 0 ? (
                    aiAnalysis.matchedSkills.map((s) => (
                      <span key={s.skillId} className="text-[11px] font-semibold bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-lg border border-emerald-200">
                        ✓ {s.skillName}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-gray-400 italic">Chưa phát hiện kỹ năng khớp</span>
                  )}
                </div>
              </div>

              {/* Missing Skills (Skill Gap) */}
              {aiAnalysis.missingSkills && aiAnalysis.missingSkills.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-gray-100">
                  <p className="text-xs font-bold text-amber-700 flex items-center gap-1 uppercase tracking-wider">
                    <XCircle className="w-3.5 h-3.5" /> Lỗ hổng kỹ năng cần bổ sung ({aiAnalysis.missingSkills.length})
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {aiAnalysis.missingSkills.map((s) => (
                      <span key={s.skillId} className="text-[11px] font-semibold bg-amber-50 text-amber-800 px-2.5 py-1 rounded-lg border border-amber-200">
                        ! {s.skillName}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommended Courses (UC-C12) */}
              {aiAnalysis.recommendedCourses && aiAnalysis.recommendedCourses.length > 0 && (
                <div className="space-y-3 pt-3 border-t border-gray-100">
                  <p className="text-xs font-bold text-gray-800 flex items-center gap-1.5 uppercase tracking-wider">
                    <BookOpen className="w-4 h-4 text-brand-purple" /> Khóa học gợi ý từ AI
                  </p>
                  
                  <div className="space-y-2">
                    {aiAnalysis.recommendedCourses.map((course) => (
                      <a
                        key={course.CourseID}
                        href={course.Url}
                        target="_blank"
                        rel="noreferrer"
                        className="group flex items-center justify-between p-3 rounded-2xl bg-gray-50 hover:bg-brand-purpleLight/40 border border-gray-200/80 hover:border-brand-purple/40 transition-all text-xs"
                      >
                        <div className="space-y-0.5">
                          <p className="font-bold text-gray-800 group-hover:text-brand-purple line-clamp-1">
                            {course.Title}
                          </p>
                          <p className="text-[11px] text-gray-500">
                            Nền tảng: <span className="font-semibold">{course.Provider}</span> • Bổ sung: <span className="text-brand-purple font-semibold">{course.SkillName}</span>
                          </p>
                        </div>
                        <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-brand-purple shrink-0 ml-2" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}

          {/* Company Card */}
          <div className="bg-white rounded-3xl p-6 border border-gray-200/80 shadow-card space-y-4">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
              Về nhà tuyển dụng
            </h3>
            <div className="flex items-center gap-3">
              <img
                src={job.CompanyLogoUrl || 'https://images.unsplash.com/photo-1549923746-c502d488b3ea?w=100&q=80'}
                alt={job.CompanyName}
                className="w-12 h-12 rounded-xl object-cover border border-gray-100"
              />
              <div>
                <p className="font-bold text-gray-900 text-sm">{job.CompanyName}</p>
                <p className="text-xs text-gray-500">{job.CompanySize || '50-100 nhân viên'}</p>
              </div>
            </div>

            {job.Address && (
              <p className="text-xs text-gray-600 flex items-start gap-1.5">
                <MapPin className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                <span>{job.Address}</span>
              </p>
            )}

            {job.CompanyDescription && (
              <p className="text-xs text-gray-500 line-clamp-3 leading-relaxed">
                {job.CompanyDescription}
              </p>
            )}

            {job.Website && (
              <a
                href={job.Website}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs font-bold text-brand-blue hover:underline"
              >
                Ghé thăm website <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>

        </div>

      </div>

      {/* 1-Click Apply Modal */}
      {applyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-gray-100">
            
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-brand-light flex items-center justify-center text-brand-blue">
                  <Send className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Ứng tuyển công việc</h3>
                  <p className="text-xs text-gray-500 line-clamp-1">{job.Title}</p>
                </div>
              </div>
              <button
                onClick={() => setApplyModalOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            {applySuccess ? (
              <div className="py-8 text-center space-y-3">
                <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500 mx-auto">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <h4 className="text-base font-bold text-gray-900">Nộp hồ sơ thành công!</h4>
                <p className="text-xs text-gray-500">AI đã chuyển hồ sơ cùng điểm số Match Score đến Nhà tuyển dụng.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                    Chọn phiên bản CV ứng tuyển (UC-C05)
                  </label>
                  
                  {job.candidateContext?.candidateCVs && job.candidateContext.candidateCVs.length > 0 ? (
                    <div className="space-y-2">
                      {job.candidateContext.candidateCVs.map((cv) => (
                        <label
                          key={cv.CVID}
                          className={`flex items-center justify-between p-3.5 rounded-2xl border cursor-pointer transition-all ${
                            selectedCvId === cv.CVID
                              ? 'border-brand-blue bg-brand-light/50 ring-1 ring-brand-blue'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="radio"
                              name="cvSelection"
                              checked={selectedCvId === cv.CVID}
                              onChange={() => setSelectedCvId(cv.CVID)}
                              className="text-brand-blue focus:ring-brand-blue"
                            />
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-brand-blue" />
                              <span className="text-xs font-bold text-gray-800">{cv.Title}</span>
                              {cv.IsPrimary && (
                                <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-100 text-brand-blue rounded-full">
                                  Mặc định
                                </span>
                              )}
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-800 space-y-2">
                      <p>Bạn chưa tải lên CV nào trong hồ sơ cá nhân.</p>
                      <Link to="/candidate/dashboard" className="font-bold underline text-brand-blue">
                        Tới trang Quản lý CV để tải lên ngay
                      </Link>
                    </div>
                  )}
                </div>

                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setApplyModalOpen(false)}
                    className="px-4 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="button"
                    disabled={applying}
                    onClick={handleApply}
                    className="px-6 py-2.5 text-xs font-bold text-white bg-brand-blue hover:bg-brand-dark rounded-xl shadow-md shadow-brand-blue/20 disabled:opacity-50 flex items-center gap-2"
                  >
                    {applying ? 'Đang gửi hồ sơ...' : 'Xác nhận nộp đơn'}
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
