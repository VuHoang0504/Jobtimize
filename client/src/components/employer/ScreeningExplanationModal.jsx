import React, { useState } from 'react';
import {
  X, CheckCircle2, AlertCircle, XCircle, HelpCircle,
  FileText, Calendar, DollarSign, Briefcase, GraduationCap,
  Award, Globe, Layers, AlertTriangle, ShieldCheck, Clock
} from 'lucide-react';
import { openProtectedCV } from '../../services/cv';

const RESULT_GROUP_CONFIG = {
  Passed: {
    label: 'Đạt yêu cầu',
    color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    badgeBg: 'bg-emerald-600 text-white',
    ringColor: 'ring-emerald-500/20',
    icon: CheckCircle2,
    desc: 'Hồ sơ đáp ứng tốt các điều kiện bắt buộc và đạt điểm phù hợp cao.'
  },
  ReviewNeeded: {
    label: 'Cần xem thêm',
    color: 'text-amber-700 bg-amber-50 border-amber-200',
    badgeBg: 'bg-amber-600 text-white',
    ringColor: 'ring-amber-500/20',
    icon: AlertCircle,
    desc: 'Hồ sơ có tiềm năng nhưng thiếu dữ liệu hoặc cần làm rõ trong phỏng vấn.'
  },
  Failed: {
    label: 'Chưa đạt',
    color: 'text-rose-700 bg-rose-50 border-rose-200',
    badgeBg: 'bg-rose-600 text-white',
    ringColor: 'ring-rose-500/20',
    icon: XCircle,
    desc: 'Hồ sơ chưa đạt các điều kiện bắt buộc hoặc điểm kỹ năng dưới ngưỡng.'
  },
  Normal: {
    label: 'Duyệt thông thường',
    color: 'text-blue-700 bg-blue-50 border-blue-200',
    badgeBg: 'bg-blue-600 text-white',
    ringColor: 'ring-blue-500/20',
    icon: HelpCircle,
    desc: 'Bộ lọc sàng lọc đang tắt. Hồ sơ được hiển thị theo thứ tự mặc định.'
  }
};

const CATEGORY_LABELS = {
  skills: { label: 'Kỹ năng', icon: Award },
  experience: { label: 'Kinh nghiệm', icon: Briefcase },
  projects: { label: 'Dự án & Thành tựu', icon: Layers },
  education: { label: 'Học vấn & GPA', icon: GraduationCap },
  languages: { label: 'Ngoại ngữ & Chứng chỉ', icon: Globe },
  workConditions: { label: 'Điều kiện làm việc & Lương', icon: DollarSign }
};

export default function ScreeningExplanationModal({
  isOpen,
  onClose,
  applicant,
  job,
  onScheduleInterview
}) {
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'matched', 'unmet', 'missing', 'insights'

  if (!isOpen || !applicant) return null;

  const details = applicant.screeningDetails || applicant.matchAnalysis || {};
  const group = details.resultGroup || applicant.ScreeningResultGroup || 'ReviewNeeded';
  const groupInfo = RESULT_GROUP_CONFIG[group] || RESULT_GROUP_CONFIG.ReviewNeeded;
  const GroupIcon = groupInfo.icon;

  const score = details.screeningScore ?? applicant.ScreeningScore ?? applicant.MatchScore ?? 0;
  const categoryScores = details.categoryScores || {};
  const activeWeights = details.activeWeights || {};

  const matchedCriteria = Array.isArray(details.matchedCriteria) ? details.matchedCriteria : [];
  const unmetCriteria = Array.isArray(details.unmetCriteria) ? details.unmetCriteria : [];
  const missingDataCriteria = Array.isArray(details.missingDataCriteria) ? details.missingDataCriteria : [];
  const reasons = Array.isArray(details.reasons) ? details.reasons : [];

  const salaryInsight = details.salaryInsight || null;
  const employmentInsights = details.employmentInsights || null;

  // Auto-generate suggested interview probe questions
  const interviewQuestions = [];
  if (missingDataCriteria.length > 0) {
    missingDataCriteria.forEach(item => {
      if (item.category === 'workConditions') {
        interviewQuestions.push('Xác nhận mức lương kỳ vọng và chế độ đãi ngộ mong muốn.');
      } else if (item.category === 'experience') {
        interviewQuestions.push('Làm rõ kinh nghiệm thực tế và trách nhiệm chính trong các công việc trước.');
      } else if (item.category === 'education') {
        interviewQuestions.push('Xác minh thông tin quá trình đào tạo và bằng cấp liên quan.');
      } else if (item.category === 'languages') {
        interviewQuestions.push('Đánh giá khả năng sử dụng ngoại ngữ trong môi trường làm việc thực tế.');
      }
    });
  }
  if (unmetCriteria.some(c => c.category === 'skills')) {
    interviewQuestions.push('Kiểm tra khả năng tự học và mức độ sẵn sàng tiếp cận các công nghệ còn thiếu.');
  }
  if (employmentInsights?.hasCareerGap) {
    interviewQuestions.push('Tìm hiểu thêm về khoảng thời gian gián đoạn giữa các công việc để hiểu rõ định hướng.');
  }

  const getModeBadge = (mode) => {
    switch (mode) {
      case 'REQUIRED':
        return <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-800">Bắt buộc</span>;
      case 'PREFERRED':
        return <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-800">Ưu tiên</span>;
      case 'INFORMATIONAL':
      default:
        return <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">Tham khảo</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-3xl rounded-2xl bg-white shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className={`flex h-11 w-11 items-center justify-center rounded-xl border ${groupInfo.color}`}>
              <GroupIcon className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">{applicant.FullName}</h2>
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold border ${groupInfo.color}`}>
                  <GroupIcon className="h-3.5 w-3.5" />
                  {groupInfo.label}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {applicant.Headline || 'Ứng viên'} · Ứng tuyển: <span className="font-semibold text-slate-700">{job?.Title}</span>
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

        {/* Content Area */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Matching Score & High-Level Rationale */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200/60">
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Điểm phù hợp tổng thể</span>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-3xl font-extrabold text-blue-700">{score}%</span>
                  <span className="text-xs text-slate-500">
                    (Mức sàng lọc: <strong>{details.screeningLevel || 'Cân bằng'}</strong> · Ngưỡng đạt: {details.threshold || 70}%)
                  </span>
                </div>
              </div>
              <div className="w-full sm:w-48">
                <div className="h-2.5 w-full rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      score >= 70 ? 'bg-emerald-500' : score >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(5, score))}%` }}
                  />
                </div>
                <p className="mt-1 text-[11px] text-right font-medium text-slate-500">{groupInfo.label}</p>
              </div>
            </div>

            {/* Rationale Reasons */}
            <div className="mt-3">
              <span className="text-xs font-bold text-slate-700 block mb-1.5">Lý do xếp loại & tiêu chuẩn đánh giá:</span>
              <ul className="space-y-1.5 text-xs text-slate-600">
                {reasons.length > 0 ? (
                  reasons.map((r, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                      <span>{r}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-slate-500 italic">Chưa có ghi chú đặc biệt cho hồ sơ này.</li>
                )}
              </ul>
            </div>
          </div>

          {/* Category Scores Breakdown */}
          {Object.keys(categoryScores).length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2.5">
                Phân tích điểm theo từng nhóm tiêu chí
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {Object.entries(CATEGORY_LABELS).map(([catKey, catMeta]) => {
                  const catScore = categoryScores[catKey];
                  const weight = activeWeights[catKey] || 0;
                  const Icon = catMeta.icon;
                  if (catScore == null && weight === 0) return null;

                  return (
                    <div key={catKey} className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-slate-700">
                          <Icon className="h-4 w-4 text-blue-600" />
                          <span className="text-xs font-semibold">{catMeta.label}</span>
                        </div>
                        <span className="text-xs font-bold text-slate-900">{catScore ?? '—'}%</span>
                      </div>
                      <div className="mt-2 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-blue-600"
                          style={{ width: `${Math.min(100, Math.max(0, catScore || 0))}%` }}
                        />
                      </div>
                      <span className="mt-1 text-[10px] text-slate-400 block text-right">
                        Trọng số: {weight > 0 ? `${weight}%` : 'Tham khảo'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Navigation Filter Tabs for Criteria Details */}
          <div>
            <div className="flex border-b border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`px-3.5 py-2 font-bold border-b-2 transition-colors ${
                  activeTab === 'all'
                    ? 'border-blue-600 text-blue-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Tất cả tiêu chí ({matchedCriteria.length + unmetCriteria.length + missingDataCriteria.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('matched')}
                className={`px-3.5 py-2 font-bold border-b-2 transition-colors ${
                  activeTab === 'matched'
                    ? 'border-emerald-600 text-emerald-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Đã đạt ({matchedCriteria.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('unmet')}
                className={`px-3.5 py-2 font-bold border-b-2 transition-colors ${
                  activeTab === 'unmet'
                    ? 'border-rose-600 text-rose-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Chưa đạt ({unmetCriteria.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('missing')}
                className={`px-3.5 py-2 font-bold border-b-2 transition-colors ${
                  activeTab === 'missing'
                    ? 'border-amber-600 text-amber-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Cần xác minh ({missingDataCriteria.length})
              </button>
            </div>

            {/* Criteria Items List */}
            <div className="mt-3 space-y-2.5">
              {/* Matched Criteria */}
              {(activeTab === 'all' || activeTab === 'matched') && matchedCriteria.map((item, idx) => (
                <div key={`m-${idx}`} className="flex items-start justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50/50 p-2.5 text-xs">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-slate-900">{item.label}</span>
                        {getModeBadge(item.mode)}
                      </div>
                      {item.evidence && (
                        <p className="mt-1 text-[11px] text-emerald-900 font-medium">
                          Bằng chứng CV: <span className="font-normal italic">"{item.evidence}"</span>
                        </p>
                      )}
                    </div>
                  </div>
                  <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 flex-shrink-0">
                    Đạt
                  </span>
                </div>
              ))}

              {/* Unmet Criteria */}
              {(activeTab === 'all' || activeTab === 'unmet') && unmetCriteria.map((item, idx) => (
                <div key={`u-${idx}`} className="flex items-start justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50/50 p-2.5 text-xs">
                  <div className="flex items-start gap-2">
                    <XCircle className="h-4 w-4 text-rose-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-slate-900">{item.label}</span>
                        {getModeBadge(item.mode)}
                      </div>
                      {item.evidence && (
                        <p className="mt-1 text-[11px] text-rose-800">
                          Thực tế: <span className="font-normal italic">{item.evidence}</span>
                        </p>
                      )}
                    </div>
                  </div>
                  <span className="rounded bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800 flex-shrink-0">
                    Chưa đạt
                  </span>
                </div>
              ))}

              {/* Missing Data Criteria */}
              {(activeTab === 'all' || activeTab === 'missing') && missingDataCriteria.map((item, idx) => (
                <div key={`ms-${idx}`} className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-xs">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-slate-800">{item.label}</span>
                        {getModeBadge(item.mode)}
                      </div>
                      <p className="mt-1 text-[11px] text-slate-500">
                        {item.evidence || item.reason || 'Chưa tìm thấy dữ liệu trong CV để đối chiếu. Hồ sơ không bị loại tự động.'}
                      </p>
                    </div>
                  </div>
                  <span className="rounded bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-700 flex-shrink-0">
                    Cần xác minh
                  </span>
                </div>
              ))}

              {matchedCriteria.length === 0 && unmetCriteria.length === 0 && missingDataCriteria.length === 0 && (
                <p className="text-center py-6 text-xs text-slate-400">Không có tiêu chí nào trong danh mục này.</p>
              )}
            </div>
          </div>

          {/* Expected Salary Insights */}
          {salaryInsight && (
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <DollarSign className="h-4 w-4 text-emerald-600" /> Kỳ vọng lương & Ngân sách tuyển dụng
                </span>
                <span className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${
                  salaryInsight.status === 'FOUND'
                    ? 'bg-emerald-100 text-emerald-800'
                    : salaryInsight.status === 'MISMATCH'
                    ? 'bg-rose-100 text-rose-800'
                    : 'bg-slate-100 text-slate-600'
                }`}>
                  {salaryInsight.label}
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">{salaryInsight.note}</p>
            </div>
          )}

          {/* Employment History Insights (Purely Informational) */}
          {employmentInsights && (
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-blue-600" /> Thông tin lịch sử công tác
                </span>
                <span className="text-[10px] font-bold text-slate-500 bg-slate-200/80 rounded px-1.5 py-0.5">
                  Chỉ tham khảo
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="rounded-lg bg-white p-2.5 border border-slate-200/80">
                  <span className="text-[11px] text-slate-500 block">Thời gian TB / cty:</span>
                  <span className="font-bold text-slate-800">{employmentInsights.formattedAvgTenure}</span>
                </div>
                <div className="rounded-lg bg-white p-2.5 border border-slate-200/80">
                  <span className="text-[11px] text-slate-500 block">Số vị trí đã qua:</span>
                  <span className="font-bold text-slate-800">{employmentInsights.jobHopsCount} công ty</span>
                </div>
                <div className="rounded-lg bg-white p-2.5 border border-slate-200/80">
                  <span className="text-[11px] text-slate-500 block">Khoảng trống &gt;6th:</span>
                  <span className={`font-bold ${employmentInsights.hasCareerGap ? 'text-amber-700' : 'text-slate-800'}`}>
                    {employmentInsights.careerGapsCount > 0 ? `${employmentInsights.careerGapsCount} khoảng trống` : 'Không có'}
                  </span>
                </div>
              </div>
              <p className="mt-2 text-[11px] text-slate-400 italic">
                * {employmentInsights.note}
              </p>
            </div>
          )}

          {/* Suggested Interview Questions */}
          {interviewQuestions.length > 0 && (
            <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4">
              <span className="text-xs font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                <HelpCircle className="h-4 w-4 text-blue-600" /> Gợi ý câu hỏi phỏng vấn làm rõ
              </span>
              <ul className="space-y-1.5 text-xs text-blue-900/90">
                {interviewQuestions.map((q, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                    <span>{q}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4 bg-slate-50 rounded-b-2xl">
          <div className="flex items-center gap-2">
            {applicant.CVFileUrl && (
              <button
                type="button"
                onClick={() => openProtectedCV(applicant.CVFileUrl)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50"
              >
                <FileText className="h-3.5 w-3.5 text-blue-600" /> Xem CV gốc
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-300"
            >
              Đóng
            </button>
            {onScheduleInterview && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onScheduleInterview(applicant);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
              >
                <Calendar className="h-3.5 w-3.5" /> Hẹn phỏng vấn
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

