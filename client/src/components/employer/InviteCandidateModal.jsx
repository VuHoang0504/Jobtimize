import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { 
  Send, 
  Briefcase, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  Mail, 
  User,
  PlusCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function InviteCandidateModal({ isOpen, onClose, candidate, onInvited }) {
  const [jobs, setJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadEmployerJobs();
    }
  }, [isOpen]);

  useEffect(() => {
    if (candidate) {
      setMessage(`Chào ${candidate.FullName},\nChúng tôi rất ấn tượng với hồ sơ và các kỹ năng của bạn trên Jobtimize. Chúng tôi trân trọng mời bạn tìm hiểu và ứng tuyển vị trí này để cùng đồng hành phát triển!`);
    }
  }, [candidate]);

  const loadEmployerJobs = async () => {
    try {
      setLoading(true);
      setError('');
      setSuccessMsg('');
      const res = await api.get('/employer/jobs');
      if (res.data.success) {
        const publishedJobs = res.data.data.filter(j => j.Status === 'Published');
        setJobs(publishedJobs);
        if (publishedJobs.length > 0) {
          setSelectedJobId(publishedJobs[0].JobID);
        }
      }
    } catch (err) {
      setError('Lỗi khi tải danh sách tin tuyển dụng');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !candidate) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!selectedJobId) {
      setError('Vui lòng chọn vị trí công việc cần mời ứng tuyển.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.post('/employer/invite-candidate', {
        profileId: candidate.ProfileID,
        jobId: selectedJobId,
        message: message.trim()
      });

      if (res.data.success) {
        setSuccessMsg(res.data.message || 'Đã gửi lời mời ứng tuyển thành công!');
        if (onInvited) onInvited();
        setTimeout(() => {
          onClose();
        }, 1500);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Có lỗi xảy ra khi gửi lời mời ứng tuyển.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-brand-green flex items-center justify-center border border-emerald-100 shadow-xs">
              <Send className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-gray-900 tracking-tight">
                Gửi Lời Mời Ứng Tuyển (UC-E12)
              </h2>
              <p className="text-xs text-gray-500">
                Chủ động kết nối với nhân tài đang bật trạng thái tìm việc.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Candidate Summary Card */}
        <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 flex items-center gap-3.5">
          <img
            src={candidate.AvatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&q=80'}
            alt={candidate.FullName}
            className="w-12 h-12 rounded-2xl object-cover border border-gray-200"
          />
          <div className="space-y-0.5">
            <h4 className="text-sm font-bold text-gray-900">{candidate.FullName}</h4>
            <p className="text-xs text-brand-blue font-semibold">{candidate.Headline || 'Ứng viên tiềm năng'}</p>
            <p className="text-[11px] text-gray-500">{candidate.CurrentLocation} • {candidate.Email}</p>
          </div>
        </div>

        {/* Notification Alert */}
        <div className="p-3 bg-blue-50 border border-blue-200 text-blue-900 rounded-xl text-xs flex items-start gap-2.5">
          <Mail className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            Hệ thống sẽ <strong>tự động gửi email mời ứng tuyển</strong> đến ứng viên và lưu vào danh sách lời mời trực tiếp của họ trên Jobtimize.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {loading ? (
          <div className="py-8 text-center text-xs text-gray-500">Đang tải danh sách tin tuyển dụng...</div>
        ) : jobs.length === 0 ? (
          <div className="p-6 text-center border border-dashed border-gray-200 rounded-2xl space-y-3">
            <p className="text-xs text-gray-600">Bạn chưa có tin tuyển dụng nào đang mở (Published) để mời ứng viên.</p>
            <Link
              to="/employer/post-job"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-green text-white rounded-xl text-xs font-bold"
            >
              <PlusCircle className="w-3.5 h-3.5" /> Đăng tin tuyển dụng mới
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                Chọn tin tuyển dụng mời ứng tuyển *
              </label>
              <select
                required
                value={selectedJobId}
                onChange={(e) => setSelectedJobId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold bg-white focus:ring-2 focus:ring-brand-green/20 outline-none"
              >
                {jobs.map((j) => (
                  <option key={j.JobID} value={j.JobID}>
                    {j.Title} ({j.SalaryRange || 'Thỏa thuận'} - {j.Location})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                Lời nhắn gửi ứng viên
              </label>
              <textarea
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full p-3 rounded-xl border border-gray-200 text-xs leading-relaxed focus:ring-2 focus:ring-brand-green/20 outline-none"
                placeholder="Nhập nội dung lời nhắn mời phỏng vấn hoặc ứng tuyển..."
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-3 border-t border-gray-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 rounded-xl bg-brand-green hover:bg-brand-greenDark text-white font-bold text-xs shadow-md shadow-brand-green/20 disabled:opacity-50 flex items-center gap-2 transition-colors"
              >
                <Send className="w-4 h-4" />
                <span>{submitting ? 'Đang gửi lời mời...' : 'Gửi lời mời ngay'}</span>
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}

