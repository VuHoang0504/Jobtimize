import React, { useState } from 'react';
import api from '../../services/api';
import { 
  Calendar, 
  Video, 
  MapPin, 
  Mail, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Sparkles,
  Link as LinkIcon
} from 'lucide-react';

export default function InterviewModal({ isOpen, onClose, applicant, onScheduled }) {
  const [interviewDate, setInterviewDate] = useState('');
  const [interviewType, setInterviewType] = useState('Online');
  const [locationOrLink, setLocationOrLink] = useState('https://meet.google.com/xyz-jobtimize');
  const [notes, setNotes] = useState('');
  const [scheduling, setScheduling] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen || !applicant) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!interviewDate) {
      setError('Vui lòng chọn thời gian phỏng vấn.');
      return;
    }

    if (new Date(interviewDate) < new Date()) {
      setError('Thời gian phỏng vấn không thể ở trong quá khứ.');
      return;
    }

    if (!locationOrLink.trim()) {
      setError(interviewType === 'Online' ? 'Vui lòng nhập đường dẫn họp Google Meet / Zoom' : 'Vui lòng nhập địa chỉ phòng họp');
      return;
    }

    try {
      setScheduling(true);
      const res = await api.post('/employer/interviews', {
        applicationId: applicant.ApplicationID,
        interviewDate,
        interviewType,
        locationOrLink: locationOrLink.trim(),
        notes: notes.trim()
      });

      if (res.data.success) {
        setSuccessMsg(res.data.message || 'Lên lịch phỏng vấn thành công!');
        if (onScheduled) onScheduled();
        setTimeout(() => {
          onClose();
        }, 1200);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Có lỗi xảy ra khi lên lịch phỏng vấn.');
    } finally {
      setScheduling(false);
    }
  };

  const handleTypeChange = (type) => {
    setInterviewType(type);
    if (type === 'Online' && (!locationOrLink || locationOrLink.includes('Tòa nhà') || locationOrLink.includes('Văn phòng'))) {
      setLocationOrLink('https://meet.google.com/abc-xyz-jobtimize');
    } else if (type === 'Offline' && (!locationOrLink || locationOrLink.startsWith('http'))) {
      setLocationOrLink('Văn phòng Tầng 5, Tòa nhà công ty...');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-brand-purple flex items-center justify-center border border-purple-100 shadow-xs">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-gray-900 tracking-tight">
                Thiết Lập Lịch Phỏng Vấn (UC-E10)
              </h2>
              <p className="text-xs text-gray-500">
                Ứng viên: <span className="font-bold text-gray-800">{applicant.FullName}</span> ({applicant.Email})
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

        {/* Email Notification Alert Banner */}
        <div className="p-3.5 bg-linear-to-r from-purple-50 to-blue-50 border border-purple-200/80 rounded-2xl flex items-start gap-3">
          <Mail className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
          <p className="text-xs text-purple-900 leading-relaxed font-medium">
            Hệ thống sẽ <strong>tự động gửi email thông báo</strong> với giao diện trang trọng kèm liên kết họp/địa điểm đến hòm thư <span className="underline font-bold">{applicant.Email}</span>.
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

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Interview Type Selection */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-2">
              Hình thức phỏng vấn *
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleTypeChange('Online')}
                className={`p-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  interviewType === 'Online'
                    ? 'bg-purple-50 border-purple-400 text-purple-700 shadow-xs'
                    : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Video className="w-4 h-4" />
                <span>Trực tuyến (Online)</span>
              </button>

              <button
                type="button"
                onClick={() => handleTypeChange('Offline')}
                className={`p-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  interviewType === 'Offline'
                    ? 'bg-purple-50 border-purple-400 text-purple-700 shadow-xs'
                    : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                }`}
              >
                <MapPin className="w-4 h-4" />
                <span>Trực tiếp (Offline)</span>
              </button>
            </div>
          </div>

          {/* Time Picker */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
              Thời gian phỏng vấn *
            </label>
            <input
              type="datetime-local"
              required
              min={new Date().toISOString().slice(0, 16)}
              value={interviewDate}
              onChange={(e) => setInterviewDate(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold bg-white focus:ring-2 focus:ring-purple-400/20 focus:border-purple-400 outline-none"
            />
          </div>

          {/* Link / Location */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-gray-700 uppercase">
                {interviewType === 'Online' ? 'Đường dẫn Google Meet / Zoom *' : 'Địa điểm phỏng vấn trực tiếp *'}
              </label>
              {interviewType === 'Online' && (
                <button
                  type="button"
                  onClick={() => setLocationOrLink(`https://meet.google.com/${Math.random().toString(36).substring(2, 5)}-${Math.random().toString(36).substring(2, 6)}-${Math.random().toString(36).substring(2, 5)}`)}
                  className="text-[11px] text-purple-600 hover:underline font-bold flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3" /> Sinh Meet link
                </button>
              )}
            </div>
            <input
              type="text"
              required
              value={locationOrLink}
              onChange={(e) => setLocationOrLink(e.target.value)}
              placeholder={interviewType === 'Online' ? 'https://meet.google.com/abc-xyz hoặc Zoom Link' : 'Ví dụ: Tầng 6, Tòa nhà FPT, Phố Duy Tân, Hà Nội'}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold focus:ring-2 focus:ring-purple-400/20 focus:border-purple-400 outline-none"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
              Ghi chú / Dặn dò ứng viên
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Vui lòng mang theo laptop cá nhân và trang phục lịch sự. Liên hệ lễ tân sảnh A..."
              className="w-full p-3 rounded-xl border border-gray-200 text-xs leading-relaxed focus:ring-2 focus:ring-purple-400/20 outline-none"
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
              disabled={scheduling}
              className="px-6 py-2.5 rounded-xl bg-brand-purple hover:bg-purple-700 text-white font-bold text-xs shadow-md shadow-brand-purple/20 disabled:opacity-50 flex items-center gap-2 transition-colors"
            >
              <Calendar className="w-4 h-4" />
              <span>{scheduling ? 'Đang lên lịch & gửi email...' : 'Xác nhận & Gửi Email'}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}

