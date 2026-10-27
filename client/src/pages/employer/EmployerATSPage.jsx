import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../services/api';
import MatchScoreBadge from '../../components/common/MatchScoreBadge';
import InterviewModal from '../../components/employer/InterviewModal';
import { 
  Users, 
  ArrowLeft, 
  Sparkles, 
  FileText, 
  Calendar, 
  ExternalLink, 
  CheckCircle2, 
  Clock, 
  Mail, 
  Phone, 
  MapPin, 
  DollarSign,
  Filter,
  Send,
  Video
} from 'lucide-react';

export default function EmployerATSPage() {
  const { jobId } = useParams();

  const [job, setJob] = useState(null);
  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading] = useState(true);

  // Status Filter
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Interview Modal state
  const [interviewModalOpen, setInterviewModalOpen] = useState(false);
  const [selectedApplicant, setSelectedApplicant] = useState(null);

  const fetchATS = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/employer/jobs/${jobId}/ats`);
      if (res.data.success) {
        setJob(res.data.data.job);
        setApplicants(res.data.data.applicants);
      }
    } catch (err) {
      console.error('Fetch ATS error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchATS();
  }, [jobId]);

  // Handle status update
  const handleStatusChange = async (applicationId, newStatus) => {
    try {
      await api.patch(`/employer/applications/${applicationId}/status`, { status: newStatus });
      setApplicants(prev => prev.map(a => a.ApplicationID === applicationId ? { ...a, Status: newStatus } : a));
    } catch (err) {
      alert('Lỗi cập nhật trạng thái: ' + (err.response?.data?.message || err.message));
    }
  };

  const filteredApplicants = statusFilter === 'ALL'
    ? applicants
    : applicants.filter(a => a.Status === statusFilter);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/3 mx-auto"></div>
        <div className="h-64 bg-gray-200 rounded-3xl max-w-4xl mx-auto"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Back button */}
      <div>
        <Link to="/employer/dashboard" className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-brand-blue transition-colors">
          <ArrowLeft className="w-4 h-4" /> Quay lại Bảng điều khiển
        </Link>
      </div>

      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/80 shadow-card flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-light text-brand-blue text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Xếp hạng mức độ phù hợp của ứng viên</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
            ATS Quản lý Ứng viên: <span className="text-brand-blue">{job?.Title}</span>
          </h1>
          <p className="text-xs text-gray-500">
            Hồ sơ được sắp xếp tự động từ cao xuống thấp dựa trên điểm phù hợp kỹ năng.
          </p>
        </div>

        {/* Filter Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          {['ALL', 'Applied', 'Screening', 'Interviewing', 'Offered', 'Rejected'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                statusFilter === status
                  ? 'bg-brand-blue text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {status === 'ALL' ? 'Tất cả (' + applicants.length + ')' : status}
            </button>
          ))}
        </div>
      </div>

      {/* Applicants List */}
      <div className="space-y-4">
        {filteredApplicants.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 shadow-sm space-y-3">
            <Users className="w-12 h-12 text-gray-300 mx-auto" />
            <h3 className="text-base font-bold text-gray-800">Chưa có ứng viên nào ở trạng thái này</h3>
            <p className="text-xs text-gray-500">Khi ứng viên nộp hồ sơ, hệ thống sẽ tự động đối chiếu và đưa vào danh sách này.</p>
          </div>
        ) : (
          filteredApplicants.map((applicant, idx) => (
            <div
              key={applicant.ApplicationID}
              className="bg-white rounded-3xl p-6 border border-gray-200/80 hover:border-brand-blue/40 shadow-card transition-all space-y-4"
            >
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                
                {/* Left: Avatar & Candidate Info */}
                <div className="flex items-start gap-4">
                  
                  {/* Rank Badge */}
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 ${
                    idx === 0 ? 'bg-amber-400 text-white shadow-md shadow-amber-400/20' :
                    idx === 1 ? 'bg-slate-300 text-slate-800' :
                    idx === 2 ? 'bg-amber-700 text-white' : 'bg-gray-100 text-gray-600'
                  }`}>
                    #{idx + 1}
                  </div>

                  <img
                    src={applicant.AvatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&q=80'}
                    alt={applicant.FullName}
                    className="w-14 h-14 rounded-2xl object-cover border border-gray-100 shadow-xs"
                  />

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-gray-900">{applicant.FullName}</h3>
                      <MatchScoreBadge score={applicant.MatchScore} size="sm" />
                    </div>
                    
                    <p className="text-xs font-semibold text-brand-blue">
                      {applicant.Headline || 'Ứng viên tiềm năng'}
                    </p>

                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-gray-500 pt-0.5">
                      <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {applicant.Email}</span>
                      {applicant.Phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {applicant.Phone}</span>}
                      {applicant.CurrentLocation && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {applicant.CurrentLocation}</span>}
                      {applicant.DesiredSalary && <span className="flex items-center gap-1 font-bold text-emerald-600"><DollarSign className="w-3 h-3" /> {applicant.DesiredSalary.toLocaleString()} đ</span>}
                    </div>
                  </div>

                </div>

                {/* Right: Actions & Status */}
                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-between md:justify-end pt-3 md:pt-0 border-t md:border-t-0 border-gray-100">
                  
                  {/* View CV Button */}
                  {applicant.CVFileUrl ? (
                    <a
                      href={applicant.CVFileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3.5 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold flex items-center gap-1.5 transition-colors"
                    >
                      <FileText className="w-4 h-4 text-brand-blue" />
                      <span>Xem CV</span>
                      <ExternalLink className="w-3 h-3 text-gray-400" />
                    </a>
                  ) : (
                    <span className="text-xs text-gray-400 italic">Dùng CV Profile</span>
                  )}

                  {/* Schedule Interview (UC-E10) */}
                  <button
                    onClick={() => {
                      setSelectedApplicant(applicant);
                      setInterviewModalOpen(true);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-brand-purple text-xs font-bold flex items-center gap-1.5 border border-purple-200 transition-colors"
                  >
                    <Calendar className="w-4 h-4" />
                    <span>Lên lịch phỏng vấn</span>
                  </button>

                  {/* Status Select */}
                  <select
                    value={applicant.Status}
                    onChange={(e) => handleStatusChange(applicant.ApplicationID, e.target.value)}
                    className="px-3 py-2 rounded-xl text-xs font-bold border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/20 cursor-pointer"
                  >
                    <option value="Applied">Đã nộp (Applied)</option>
                    <option value="Screening">Lọc hồ sơ (Screening)</option>
                    <option value="Interviewing">Phỏng vấn (Interviewing)</option>
                    <option value="Offered">Đề nghị việc (Offered)</option>
                    <option value="Rejected">Từ chối (Rejected)</option>
                  </select>

                </div>

              </div>

              {/* Scheduled Interview Callout if already scheduled */}
              {applicant.interview && (
                <div className="p-3.5 rounded-2xl bg-purple-50/70 border border-purple-200 text-xs text-purple-900 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-purple-200/60 text-purple-700 flex items-center justify-center shrink-0">
                    {applicant.interview.InterviewType === 'Online' ? <Video className="w-4 h-4" /> : <MapPin className="w-4 h-4" />}
                  </div>
                  <div className="space-y-0.5 flex-1">
                    <p className="font-bold flex items-center gap-2">
                      <span>Lịch phỏng vấn ({applicant.interview.InterviewType || 'Online'}):</span>
                      <span className="text-purple-700">{new Date(applicant.interview.InterviewDate).toLocaleString('vi-VN')}</span>
                    </p>
                    <p className="text-[11px] text-purple-800 truncate">
                      <strong>{applicant.interview.InterviewType === 'Online' ? 'Đường dẫn họp:' : 'Địa điểm:'}</strong> {applicant.interview.LocationOrLink}
                    </p>
                    {applicant.interview.Notes && (
                      <p className="text-[11px] text-purple-700/80 italic">Ghi chú: {applicant.interview.Notes}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Bio summary if any */}
              {applicant.Bio && (
                <div className="p-3 rounded-2xl bg-gray-50 border border-gray-100 text-xs text-gray-600 leading-relaxed">
                  <span className="font-bold text-gray-700">Tóm tắt hồ sơ: </span>
                  {applicant.Bio}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Schedule Interview Modal (UC-E10) */}
      {interviewModalOpen && selectedApplicant && (
        <InterviewModal
          isOpen={interviewModalOpen}
          onClose={() => {
            setInterviewModalOpen(false);
            setSelectedApplicant(null);
          }}
          applicant={selectedApplicant}
          onScheduled={() => {
            fetchATS();
          }}
        />
      )}

    </div>
  );
}
