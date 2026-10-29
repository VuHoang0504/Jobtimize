import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import KYCModal from '../../components/employer/KYCModal';
import EditJobModal from '../../components/employer/EditJobModal';
import { getCompanyLogo, handleCompanyLogoError } from '../../utils/logoHelper';
import { 
  Building2, 
  PlusCircle, 
  Briefcase, 
  Users, 
  Calendar, 
  ArrowRight, 
  Clock, 
  ExternalLink, 
  Sparkles, 
  Layers,
  ShieldCheck,
  Edit,
  PauseCircle,
  PlayCircle,
  Trash2,
  AlertCircle,
  CheckCircle2,
  CreditCard,
  Search,
  CheckCircle
} from 'lucide-react';

export default function EmployerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [profile, setProfile] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filter jobs by status
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'Published' | 'Closed'

  // Modals
  const [kycModalOpen, setKycModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingJobId, setEditingJobId] = useState(null);

  // Delete confirm modal
  const [deleteConfirmJob, setDeleteConfirmJob] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const jobId = Number(params.get('jobId'));
    if (jobId > 0) { setStatusFilter('ALL'); if (!loading) requestAnimationFrame(() => document.getElementById(`job-${jobId}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' })); }
    if (params.get('section') === 'kyc' && !loading) setKycModalOpen(true);
  }, [location.search, location.key, loading]);

  const fetchData = async () => {
    try {
      const [profRes, jobsRes, subRes] = await Promise.all([
        api.get('/employer/profile'),
        api.get('/employer/jobs'),
        api.get('/employer/subscription')
      ]);
      if (profRes.data.success) setProfile(profRes.data.data);
      if (jobsRes.data.success) setJobs(jobsRes.data.data);
      if (subRes.data.success) setSubscription(subRes.data.data);
    } catch (err) {
      console.error('Employer dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const totalApplicants = jobs.reduce((sum, j) => sum + (j.TotalApplicants || 0), 0);
  const totalInterviewing = jobs.reduce((sum, j) => sum + (j.TotalInterviewing || 0), 0);

  // Handle Toggle Job Status (Đóng tin / Mở lại tin) (UC-E06)
  const handleToggleJobStatus = async (jobId, currentStatus) => {
    const nextStatus = currentStatus === 'Published' ? 'Closed' : 'Published';
    try {
      setActionLoading(true);
      const res = await api.patch(`/employer/jobs/${jobId}/status`, { status: nextStatus });
      if (res.data.success) {
        setFeedback({
          type: 'success',
          message: nextStatus === 'Closed' ? 'Đã đóng (tạm dừng) tin tuyển dụng.' : 'Đã mở lại tin tuyển dụng thành công!'
        });
        await fetchData();
      }
    } catch (err) {
      setFeedback({ type: 'error', message: err.response?.data?.message || 'Lỗi cập nhật trạng thái tin' });
    } finally {
      setActionLoading(false);
      setTimeout(() => setFeedback({ type: '', message: '' }), 4000);
    }
  };

  // Handle Delete Job (UC-E06)
  const handleDeleteJob = async () => {
    if (!deleteConfirmJob) return;
    try {
      setActionLoading(true);
      const res = await api.delete(`/employer/jobs/${deleteConfirmJob.JobID}`);
      if (res.data.success) {
        setFeedback({ type: 'success', message: 'Đã xóa tin tuyển dụng thành công!' });
        setDeleteConfirmJob(null);
        await fetchData();
      }
    } catch (err) {
      setFeedback({ type: 'error', message: err.response?.data?.message || 'Lỗi khi xóa tin tuyển dụng' });
    } finally {
      setActionLoading(false);
      setTimeout(() => setFeedback({ type: '', message: '' }), 4000);
    }
  };

  const filteredJobs = statusFilter === 'ALL'
    ? jobs
    : jobs.filter(j => j.Status === statusFilter);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center animate-pulse space-y-4">
        <div className="h-6 bg-gray-200 rounded w-1/4 mx-auto"></div>
        <div className="h-64 bg-gray-200 rounded-3xl max-w-4xl mx-auto"></div>
      </div>
    );
  }

  const kycStatus = profile?.KYCStatus || 'Pending';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Toast Feedback */}
      {feedback.message && (
        <div className={`p-4 rounded-2xl text-xs font-bold flex items-center justify-between shadow-md animate-in fade-in duration-200 ${
          feedback.type === 'success'
            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
            : 'bg-rose-50 text-rose-800 border border-rose-200'
        }`}>
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback({ type: '', message: '' })} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
      )}

      {/* Employer Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/80 shadow-card flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <img
            src={getCompanyLogo(profile?.CompanyLogoUrl, profile?.CompanyName)}
            alt={profile?.CompanyName}
            onError={(e) => handleCompanyLogoError(e, profile?.CompanyName)}
            className="w-14 h-14 rounded-2xl object-contain shrink-0 border-2 border-brand-green/30 shadow-md"
          />
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                {profile?.CompanyName || 'Công ty Tuyển dụng'}
              </h1>

              {/* Dynamic KYC Badge (UC-E04) */}
              {kycStatus === 'Approved' ? (
                <span 
                  onClick={() => setKycModalOpen(true)}
                  className="cursor-pointer inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-black border border-emerald-200 shadow-2xs hover:bg-emerald-100 transition-colors"
                  title="Nhấn để xem chi tiết hồ sơ pháp lý"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Doanh nghiệp đã xác thực</span>
                </span>
              ) : kycStatus === 'Rejected' ? (
                <span 
                  onClick={() => setKycModalOpen(true)}
                  className="cursor-pointer inline-flex items-center gap-1 px-3 py-1 rounded-full bg-rose-50 text-rose-700 text-xs font-bold border border-rose-200 hover:bg-rose-100 transition-colors"
                >
                  <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                  <span>KYC bị từ chối (Nộp lại)</span>
                </span>
              ) : (
                <span 
                  onClick={() => setKycModalOpen(true)}
                  className="cursor-pointer inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-bold border border-amber-200 hover:bg-amber-100 transition-colors"
                >
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  <span>Chờ duyệt KYC / Cập nhật</span>
                </span>
              )}
            </div>

            <p className="text-xs text-gray-500 font-semibold">
              Người đại diện: <span className="text-gray-800">{profile?.FullName || user?.fullName}</span> • {profile?.Email}
            </p>
          </div>
        </div>

        {/* Action Shortcuts */}
        <div className="flex items-center gap-3 flex-wrap w-full md:w-auto">
          <button
            onClick={() => setKycModalOpen(true)}
            className="px-4 py-3 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs flex items-center gap-1.5 transition-colors"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Hồ sơ pháp lý KYC</span>
          </button>

          <Link
            to="/employer/post-job"
            className="px-6 py-3 rounded-2xl bg-brand-green hover:bg-brand-greenDark text-white font-bold text-xs shadow-md shadow-brand-green/20 flex items-center gap-2 transition-all hover:gap-3"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Đăng tin tuyển dụng mới</span>
          </Link>
        </div>
      </div>

      {/* Feature Navigation Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          to="/employer/talents"
          className="bg-white p-5 rounded-2xl border border-gray-200/80 hover:border-brand-blue/50 shadow-card hover:shadow-card-hover transition-all flex items-center gap-3.5 group"
        >
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-brand-blue flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
            <Search className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-gray-900 group-hover:text-brand-blue">Tìm kiếm ứng viên</h4>
            <p className="text-[11px] text-gray-500">Tra cứu CV đang bật tìm việc (UC-E11)</p>
          </div>
        </Link>

        <Link
          to="/employer/pricing"
          className="bg-white p-5 rounded-2xl border border-gray-200/80 hover:border-emerald-500/50 shadow-card hover:shadow-card-hover transition-all flex items-center gap-3.5 group"
        >
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-gray-900 group-hover:text-emerald-600">Gói dịch vụ & Thanh toán</h4>
            <p className="text-[11px] text-gray-500">VNPay & MoMo QR (UC-E07)</p>
          </div>
        </Link>

        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-card flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-purple-50 text-brand-purple flex items-center justify-center shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-gray-900">Phỏng vấn tự động</h4>
            <p className="text-[11px] text-gray-500">{totalInterviewing} ứng viên đang xếp lịch</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-card flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-gray-900">Điểm phù hợp</h4>
            <p className="text-[11px] text-gray-500">{totalApplicants} hồ sơ được đánh giá độ phù hợp</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-card space-y-2">
          <p className="text-xs font-bold text-gray-400 uppercase">Tin đang đăng tuyển</p>
          <p className="text-3xl font-black text-brand-blue">{jobs.length}</p>
          <p className="text-xs text-gray-500">Chiến dịch tuyển dụng của doanh nghiệp</p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-card space-y-2">
          <p className="text-xs font-bold text-gray-400 uppercase">Tổng lượt ứng viên nộp hồ sơ</p>
          <p className="text-3xl font-black text-brand-green">{totalApplicants}</p>
          <p className="text-xs text-gray-500">Tự động đối chiếu kỹ năng với yêu cầu tuyển dụng</p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-card space-y-2">
          <p className="text-xs font-bold text-gray-400 uppercase">Ứng viên đang phỏng vấn</p>
          <p className="text-3xl font-black text-brand-purple">{totalInterviewing}</p>
          <p className="text-xs text-gray-500">Đã lên lịch Google Meet / Trực tiếp (UC-E10)</p>
        </div>
      </div>

      {/* Job Postings & Job Management Actions (UC-E06) */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/80 shadow-card space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
          <div className="flex items-center gap-2.5">
            <Layers className="w-5 h-5 text-brand-blue" />
            <div>
              <h2 className="text-base font-bold text-gray-900">Quản lý Tin tuyển dụng & Hệ thống ATS</h2>
              <p className="text-xs text-gray-500">Chỉnh sửa nội dung, tạm dừng (đóng tin), mở lại hoặc xóa tin tuyển dụng</p>
            </div>
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center gap-2 flex-wrap">
            {[
              { id: 'ALL', label: 'Tất cả (' + jobs.length + ')' },
              { id: 'Published', label: 'Đang mở (' + jobs.filter(j => j.Status === 'Published').length + ')' },
              { id: 'PendingApproval', label: 'Chờ duyệt (' + jobs.filter(j => j.Status === 'PendingApproval').length + ')' },
              { id: 'Closed', label: 'Đã đóng (' + jobs.filter(j => j.Status === 'Closed').length + ')' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  statusFilter === tab.id
                    ? 'bg-brand-blue text-white shadow-2xs'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {filteredJobs.length === 0 ? (
          <div className="text-center py-12 space-y-4">
            <p className="text-sm text-gray-500">Không có tin tuyển dụng nào trong mục này.</p>
            <Link
              to="/employer/post-job"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-green text-white rounded-xl text-xs font-bold shadow-md shadow-brand-green/20"
            >
              <PlusCircle className="w-4 h-4" />
              Tạo tin tuyển dụng đầu tiên
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredJobs.map((job) => (
              <div
                key={job.JobID} id={`job-${job.JobID}`}
                className="p-5 rounded-2xl border border-gray-200 hover:border-brand-blue/40 bg-white flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 transition-all"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-bold text-gray-900">{job.Title}</h3>
                    {job.Status === 'Published' && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800">
                        ✓ Đã xuất bản
                      </span>
                    )}
                    {job.Status === 'PendingApproval' && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800">
                        ⏳ Chờ Admin duyệt
                      </span>
                    )}
                    {job.Status === 'RequiresRevision' && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-100 text-purple-800">
                        ✏ Cần chỉnh sửa
                      </span>
                    )}
                    {job.Status === 'Rejected' && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-800">
                        ✕ Bị từ chối
                      </span>
                    )}
                    {job.Status === 'Closed' && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-gray-100 text-gray-700">
                        Đã đóng
                      </span>
                    )}
                  </div>
                  {job.AdminNote && ['RequiresRevision', 'Rejected'].includes(job.Status) && (
                    <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium">
                      <strong>Phản hồi từ Admin:</strong> {job.AdminNote}
                    </div>
                  )}
                  <p className="text-xs text-gray-500 font-semibold">
                    Lương: <span className="text-emerald-600">{job.SalaryRange || 'Thỏa thuận'}</span> • Khu vực: {job.Location} • Ngành nghề: {job.CategoryName || 'IT'}
                  </p>

                  <div className="flex items-center gap-4 text-[11px] text-gray-400">
                    <span>Đăng ngày: {new Date(job.CreatedAt).toLocaleDateString('vi-VN')}</span>
                    <Link
                      to={`/jobs/${job.JobID}`}
                      className="inline-flex items-center gap-1 text-brand-blue hover:underline font-bold"
                    >
                      <span>Xem trang công khai</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                </div>

                {/* Right: ATS badge + Action Buttons (UC-E06) */}
                <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-between lg:justify-end pt-3 lg:pt-0 border-t lg:border-t-0 border-gray-100">
                  
                  {/* Applicants Counter */}
                  <div className="text-right px-3.5 py-1.5 bg-gray-50 rounded-xl border border-gray-100 shrink-0">
                    <p className="text-[10px] uppercase font-bold text-gray-400">Ứng viên</p>
                    <p className="text-base font-black text-brand-blue">{job.TotalApplicants || 0}</p>
                  </div>

                  {/* Button 1: Chỉnh sửa nội dung JD */}
                  <button
                    onClick={() => {
                      setEditingJobId(job.JobID);
                      setEditModalOpen(true);
                    }}
                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                    title="Chỉnh sửa nội dung tin tuyển dụng"
                  >
                    <Edit className="w-3.5 h-3.5 text-brand-blue" />
                    <span>Sửa tin</span>
                  </button>

                  {/* Button 2: Đóng tin (Tạm dừng) hoặc Mở lại */}
                  <button
                    onClick={() => handleToggleJobStatus(job.JobID, job.Status)}
                    disabled={actionLoading}
                    className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors ${
                      job.Status === 'Published'
                        ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200'
                        : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200'
                    }`}
                    title={job.Status === 'Published' ? 'Tạm dừng nhận thêm hồ sơ' : 'Kích hoạt lại tin tuyển dụng'}
                  >
                    {job.Status === 'Published' ? (
                      <>
                        <PauseCircle className="w-3.5 h-3.5 text-amber-600" />
                        <span>Đóng tin</span>
                      </>
                    ) : (
                      <>
                        <PlayCircle className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Mở lại</span>
                      </>
                    )}
                  </button>

                  {/* Button 3: Xóa tin */}
                  <button
                    onClick={() => setDeleteConfirmJob(job)}
                    className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                    title="Xóa tin tuyển dụng"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  {/* Button 4: Mở ATS Xếp hạng AI */}
                  <Link
                    to={`/employer/ats/${job.JobID}`}
                    className="px-4 py-2 bg-brand-blue hover:bg-brand-dark text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 transition-colors shrink-0"
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Mở ATS ({job.TotalApplicants || 0})</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>

                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* KYC Modal (UC-E04) */}
      <KYCModal
        isOpen={kycModalOpen}
        onClose={() => setKycModalOpen(false)}
        initialStatus={kycStatus}
        onKycUpdated={(newStatus) => {
          setProfile(prev => prev ? { ...prev, KYCStatus: newStatus } : prev);
        }}
      />

      {/* Edit Job Modal (UC-E06) */}
      <EditJobModal
        isOpen={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setEditingJobId(null);
        }}
        jobId={editingJobId}
        onJobUpdated={() => {
          fetchData();
        }}
      />

      {/* Delete Job Confirmation Modal (UC-E06) */}
      {deleteConfirmJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-5 shadow-2xl border border-gray-100">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-gray-900">Xác nhận xóa tin tuyển dụng</h3>
                <p className="text-xs text-gray-500 line-clamp-1">{deleteConfirmJob.Title}</p>
              </div>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              Bạn có chắc chắn muốn xóa tin tuyển dụng này? Toàn bộ danh sách ứng tuyển và điểm Điểm phù hợp liên quan sẽ bị xóa vĩnh viễn và không thể khôi phục.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmJob(null)}
                className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleDeleteJob}
                disabled={actionLoading}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/20 disabled:opacity-50"
              >
                {actionLoading ? 'Đang xóa...' : 'Xác nhận xóa'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
