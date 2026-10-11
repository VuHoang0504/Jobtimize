import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import InviteCandidateModal from '../../components/employer/InviteCandidateModal';
import { 
  Search, 
  MapPin, 
  DollarSign, 
  FileText, 
  Send, 
  ExternalLink, 
  Filter, 
  Sparkles, 
  CheckCircle2, 
  UserCheck, 
  Tag, 
  History, 
  Layers,
  ArrowRight,
  Briefcase
} from 'lucide-react';

export default function CandidateSearchPage() {
  const [candidates, setCandidates] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('search'); // 'search' | 'invitations'

  // Filters
  const [keyword, setKeyword] = useState('');
  const [skill, setSkill] = useState('');
  const [location, setLocation] = useState('');
  const [salaryRange, setSalaryRange] = useState('');

  // Invite Modal
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);

  const fetchCandidates = async () => {
    try {
      setLoading(true);
      const params = {};
      if (keyword.trim()) params.keyword = keyword.trim();
      if (skill.trim()) params.skill = skill.trim();
      if (location.trim()) params.location = location.trim();
      if (salaryRange) params.salaryRange = salaryRange;

      const res = await api.get('/employer/candidates', { params });
      if (res.data.success) {
        setCandidates(res.data.data);
      }
    } catch (err) {
      console.error('Fetch candidates error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchInvitations = async () => {
    try {
      const res = await api.get('/employer/invitations');
      if (res.data.success) {
        setInvitations(res.data.data);
      }
    } catch (err) {
      console.error('Fetch invitations error:', err);
    }
  };

  useEffect(() => {
    fetchCandidates();
    fetchInvitations();
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchCandidates();
  };

  const handleResetFilters = () => {
    setKeyword('');
    setSkill('');
    setLocation('');
    setSalaryRange('');
    setTimeout(() => {
      api.get('/employer/candidates').then(res => {
        if (res.data.success) setCandidates(res.data.data);
      });
    }, 0);
  };

  const quickSkills = ['React', 'Node.js', 'Python', 'AWS Cloud', 'Docker', 'C# / .NET', 'TypeScript', 'UI/UX'];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/80 shadow-card flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-brand-blue text-xs font-bold border border-blue-200">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Săn Hồ Sơ Thụ Động (UC-E11 & UC-E12)</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
            Kho CV Ứng Viên Đang Bật Tìm Việc
          </h1>
          <p className="text-xs text-gray-500 max-w-2xl leading-relaxed">
            Tiếp cận các chuyên gia công nghệ đang chủ động bật chế độ tìm việc. Lọc nhanh theo kỹ năng, khu vực và gửi lời mời phỏng vấn trực tiếp kèm email thông báo tự động.
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex items-center gap-2 p-1.5 bg-gray-100 rounded-2xl border border-gray-200 w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('search')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'search'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Kho CV ({candidates.length})
          </button>
          <button
            onClick={() => setActiveTab('invitations')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'invitations'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <History className="w-3.5 h-3.5 text-brand-purple" />
            <span>Lời mời đã gửi ({invitations.length})</span>
          </button>
        </div>
      </div>

      {activeTab === 'search' ? (
        <>
          {/* Filter Bar */}
          <div className="bg-white rounded-3xl p-6 border border-gray-200/80 shadow-card space-y-4">
            <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Keyword */}
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="Tên ứng viên, chức danh..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-xs font-medium focus:ring-2 focus:ring-brand-blue/20 outline-none"
                />
              </div>

              {/* Skill Filter */}
              <div className="relative">
                <Tag className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={skill}
                  onChange={(e) => setSkill(e.target.value)}
                  placeholder="Kỹ năng (React, Node, Python...)"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-xs font-medium focus:ring-2 focus:ring-brand-blue/20 outline-none"
                />
              </div>

              {/* Location */}
              <div className="relative">
                <MapPin className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <select
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-xs font-medium bg-white focus:ring-2 focus:ring-brand-blue/20 outline-none"
                >
                  <option value="">Tất cả địa điểm</option>
                  <option value="Hà Nội">Hà Nội</option>
                  <option value="TP. Hồ Chí Minh">TP. Hồ Chí Minh</option>
                  <option value="Đà Nẵng">Đà Nẵng</option>
                </select>
              </div>

              {/* Salary Range */}
              <div className="relative">
                <DollarSign className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <select
                  value={salaryRange}
                  onChange={(e) => setSalaryRange(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-xs font-medium bg-white focus:ring-2 focus:ring-brand-blue/20 outline-none"
                >
                  <option value="">Tất cả mức lương</option>
                  <option value="under15">Dưới 15 triệu</option>
                  <option value="15to25">15 - 25 triệu</option>
                  <option value="25to40">25 - 40 triệu</option>
                  <option value="over40">Trên 40 triệu</option>
                </select>
              </div>

              <div className="sm:col-span-2 lg:col-span-4 flex items-center justify-between pt-1">
                {/* Quick Skill Tags */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] font-bold text-gray-400 mr-1">Gợi ý kỹ năng:</span>
                  {quickSkills.map((sk) => (
                    <button
                      type="button"
                      key={sk}
                      onClick={() => {
                        setSkill(sk);
                        setTimeout(() => fetchCandidates(), 0);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                        skill === sk
                          ? 'bg-brand-blue text-white shadow-2xs'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {sk}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="px-3 py-2 text-xs font-bold text-gray-500 hover:text-gray-800"
                  >
                    Xóa lọc
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-brand-blue hover:bg-brand-dark text-white font-bold text-xs shadow-md shadow-brand-blue/20 transition-colors"
                  >
                    Lọc hồ sơ
                  </button>
                </div>
              </div>

            </form>
          </div>

          {/* Results List */}
          {loading ? (
            <div className="py-20 text-center space-y-3">
              <div className="w-8 h-8 border-3 border-brand-blue border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-gray-500">Đang tìm kiếm hồ sơ ứng viên...</p>
            </div>
          ) : candidates.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-gray-200/80 shadow-card max-w-lg mx-auto space-y-3">
              <UserCheck className="w-12 h-12 text-gray-300 mx-auto" />
              <h3 className="text-base font-bold text-gray-800">Không tìm thấy ứng viên phù hợp</h3>
              <p className="text-xs text-gray-500">Thử nới lỏng bộ lọc kỹ năng, khu vực hoặc mức lương mong muốn.</p>
              <button
                onClick={handleResetFilters}
                className="px-4 py-2 bg-brand-blue text-white rounded-xl text-xs font-bold"
              >
                Xem tất cả ứng viên
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {candidates.map((cand) => (
                <div
                  key={cand.ProfileID}
                  className="bg-white rounded-3xl p-6 border border-gray-200/80 hover:border-brand-blue/40 shadow-card hover:shadow-card-hover transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-4">
                    {/* Header info */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3.5">
                        <img
                          src={cand.AvatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&q=80'}
                          alt={cand.FullName}
                          className="w-14 h-14 rounded-2xl object-cover border border-gray-100 shadow-xs"
                        />
                        <div className="space-y-0.5">
                          <h3 className="text-base font-bold text-gray-900">{cand.FullName}</h3>
                          <p className="text-xs font-semibold text-brand-blue">{cand.Headline || 'Ứng viên tiềm năng'}</p>
                          <div className="flex items-center gap-3 text-[11px] text-gray-500 pt-1">
                            {cand.CurrentLocation && (
                              <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {cand.CurrentLocation}</span>
                            )}
                            {cand.DesiredSalary && (
                              <span className="flex items-center gap-1 font-bold text-emerald-600">
                                <DollarSign className="w-3 h-3" /> {Number(cand.DesiredSalary).toLocaleString()} đ
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-extrabold border border-emerald-200 flex items-center gap-1 shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Đang tìm việc
                      </span>
                    </div>

                    {/* Bio Snippet */}
                    {cand.bioText && (
                      <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed bg-gray-50/60 p-3 rounded-xl border border-gray-100">
                        {cand.bioText}
                      </p>
                    )}

                    {/* Skills Tags */}
                    {cand.skills?.hardSkills?.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Kỹ năng cốt lõi:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {cand.skills.hardSkills.map((sk, idx) => (
                            <span
                              key={idx}
                              className="px-2.5 py-0.5 rounded-lg bg-blue-50 text-blue-700 text-[11px] font-semibold border border-blue-100"
                            >
                              {sk}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-3">
                    {cand.CVFileUrl ? (
                      <a
                        href={cand.CVFileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3.5 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold flex items-center gap-1.5 transition-colors"
                      >
                        <FileText className="w-4 h-4 text-brand-blue" />
                        <span>Xem CV</span>
                        <ExternalLink className="w-3 h-3 text-gray-400" />
                      </a>
                    ) : (
                      <span className="text-[11px] text-gray-400 italic">Dùng CV Hồ sơ trực tuyến</span>
                    )}

                    <button
                      onClick={() => {
                        setSelectedCandidate(cand);
                        setInviteModalOpen(true);
                      }}
                      className="px-4 py-2 rounded-xl bg-brand-green hover:bg-brand-greenDark text-white text-xs font-bold shadow-md shadow-brand-green/20 flex items-center gap-1.5 transition-colors"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Gửi lời mời ứng tuyển</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        /* Tab: Lời mời đã gửi (UC-E12 History) */
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/80 shadow-card space-y-6">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <div className="flex items-center gap-2.5">
              <History className="w-5 h-5 text-brand-purple" />
              <h2 className="text-base font-bold text-gray-900">Danh sách Lời mời Ứng tuyển Đã Gửi Trực Tiếp</h2>
            </div>
            <span className="text-xs font-semibold text-gray-500">{invitations.length} lời mời</span>
          </div>

          {invitations.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <Send className="w-12 h-12 text-gray-300 mx-auto" />
              <h3 className="text-base font-bold text-gray-800">Chưa có lời mời ứng tuyển nào</h3>
              <p className="text-xs text-gray-500">Chuyển sang tab Kho CV để tìm kiếm ứng viên và bấm nút "Gửi lời mời ứng tuyển".</p>
              <button
                onClick={() => setActiveTab('search')}
                className="px-4 py-2 bg-brand-green text-white rounded-xl text-xs font-bold"
              >
                Khám phá kho CV ngay
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {invitations.map((inv) => (
                <div
                  key={inv.InvitationID}
                  className="p-5 rounded-2xl border border-gray-200 hover:border-brand-purple/40 bg-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all"
                >
                  <div className="flex items-start gap-4">
                    <img
                      src={inv.CandidateAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&q=80'}
                      alt={inv.CandidateName}
                      className="w-12 h-12 rounded-2xl object-cover border border-gray-100"
                    />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-gray-900">{inv.CandidateName}</h4>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700">
                          {inv.Status === 'Sent' ? 'Đã gửi tới ứng viên' : inv.Status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600">
                        Vị trí mời: <span className="font-bold text-brand-blue">{inv.JobTitle}</span>
                      </p>
                      {inv.Message && (
                        <p className="text-[11px] text-gray-500 line-clamp-1 italic">
                          "{inv.Message}"
                        </p>
                      )}
                      <p className="text-[10px] text-gray-400">
                        Gửi ngày: {new Date(inv.SentAt).toLocaleString('vi-VN')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                    <Link
                      to={`/jobs/${inv.JobID}`}
                      className="px-3.5 py-1.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs font-semibold"
                    >
                      Xem JD vị trí
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Invite Candidate Modal */}
      {selectedCandidate && (
        <InviteCandidateModal
          isOpen={inviteModalOpen}
          onClose={() => {
            setInviteModalOpen(false);
            setSelectedCandidate(null);
          }}
          candidate={selectedCandidate}
          onInvited={() => {
            fetchInvitations();
          }}
        />
      )}

    </div>
  );
}

