import React, { useEffect, useState } from 'react';
import { X, Sparkles, CheckCircle2, AlertTriangle, Clock, HelpCircle, RefreshCw } from 'lucide-react';
import api from '../../services/api';

export default function DeepReviewModal({ isOpen, onClose, applicant, jobTitle }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [review, setReview] = useState(null);

  useEffect(() => {
    if (isOpen && applicant) {
      loadReview();
    } else {
      setReview(null);
      setError('');
    }
  }, [isOpen, applicant]);

  const loadReview = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.post(`/employer/applications/${applicant.ApplicationID}/deep-review`);
      if (res.data?.success) {
        setReview(res.data.data);
      } else {
        throw new Error(res.data?.message || 'Không thể tạo nhận xét.');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Chưa thể tạo nhận xét sâu. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-purple-700">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Nhận xét chuyên sâu AI</h2>
              <p className="text-xs text-slate-500">
                Ứng viên: <span className="font-semibold text-slate-700">{applicant?.FullName}</span> · Vị trí: {jobTitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <RefreshCw className="h-8 w-8 animate-spin text-purple-600 mb-3" />
              <p className="text-sm font-semibold text-slate-800">AI đang đối chiếu CV và tạo nhận xét chuyên sâu...</p>
              <p className="mt-1 text-xs text-slate-500">Phân tích kỹ năng, học vấn, kinh nghiệm và tính ổn định nghề nghiệp</p>
            </div>
          )}

          {error && !loading && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <p className="font-semibold">Lỗi tạo nhận xét:</p>
              <p className="mt-1 text-xs">{error}</p>
              <button
                type="button"
                onClick={loadReview}
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Thử lại
              </button>
            </div>
          )}

          {review && !loading && (
            <>
              {/* Overview */}
              <div className="rounded-xl border border-purple-100 bg-purple-50/50 p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-purple-900">Đánh giá tổng quan</h3>
                  <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-[11px] font-medium text-purple-700">
                    {review.isCached ? 'Kết quả đã lưu' : 'Phân tích mới nhất'}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-slate-700">{review.summary}</p>
              </div>

              {/* Strengths & Concerns Grid */}
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Strengths */}
                <div className="rounded-xl border border-emerald-100 bg-emerald-50/30 p-4">
                  <div className="flex items-center gap-2 text-emerald-800 mb-3">
                    <CheckCircle2 className="h-4 w-4" />
                    <h3 className="text-xs font-bold uppercase tracking-wider">Điểm mạnh nổi bật</h3>
                  </div>
                  <ul className="space-y-2 text-xs leading-relaxed text-slate-700">
                    {review.strengths?.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-500" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Concerns */}
                <div className="rounded-xl border border-amber-100 bg-amber-50/30 p-4">
                  <div className="flex items-center gap-2 text-amber-800 mb-3">
                    <AlertTriangle className="h-4 w-4" />
                    <h3 className="text-xs font-bold uppercase tracking-wider">Điểm cần làm rõ / Lưu ý</h3>
                  </div>
                  <ul className="space-y-2 text-xs leading-relaxed text-slate-700">
                    {review.concerns?.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-500" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Stability and Fit */}
              {review.stabilityAndFit && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center gap-2 text-slate-800 mb-2">
                    <Clock className="h-4 w-4 text-blue-600" />
                    <h3 className="text-xs font-bold uppercase tracking-wider">Tín hiệu ổn định & Độ gắn bó</h3>
                  </div>
                  <p className="text-xs leading-relaxed text-slate-600">{review.stabilityAndFit}</p>
                </div>
              )}

              {/* Suggested Interview Questions */}
              {review.interviewQuestions?.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <HelpCircle className="h-4 w-4 text-purple-600" />
                    <h3 className="text-sm font-bold text-slate-900">Bộ câu hỏi gợi ý khi phỏng vấn</h3>
                  </div>
                  <div className="space-y-3">
                    {review.interviewQuestions.map((q, idx) => (
                      <div key={idx} className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs">
                        <p className="text-xs font-semibold text-slate-800">
                          {idx + 1}. {q.question}
                        </p>
                        {q.purpose && (
                          <p className="mt-1.5 text-[11px] text-slate-500">
                            <span className="font-medium text-purple-700">Mục đích:</span> {q.purpose}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-slate-100 px-6 py-4 bg-slate-50 rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-300"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}

