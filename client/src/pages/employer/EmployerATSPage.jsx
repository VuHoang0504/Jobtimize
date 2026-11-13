import React, { useEffect, useState, useCallback } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import {
  CheckCircle2, AlertCircle, XCircle, Clock, Search, Sliders,
  Lock, ChevronLeft, ChevronRight, RefreshCw, FileText,
  Filter, Check, X, Award, GraduationCap, HelpCircle, Briefcase,
  DollarSign, Globe, Layers, ArrowUpRight
} from 'lucide-react';
import api from '../../services/api';
import { openProtectedCV } from '../../services/cv';
import InterviewModal from '../../components/employer/InterviewModal';
import ApplicationConfirmationModal from '../../components/employer/ApplicationConfirmationModal';
import ApplicationNoticeModal from '../../components/employer/ApplicationNoticeModal';
import DeepReviewModal from '../../components/employer/DeepReviewModal';
import ScreeningExplanationModal from '../../components/employer/ScreeningExplanationModal';
import FlexibleScreeningPanel from '../../components/employer/FlexibleScreeningPanel';
import MatchScoreBadge from '../../components/common/MatchScoreBadge';
import { StatusPill, InterviewDetails, applicationLabels, formatDate } from '../../components/common/RecruitmentUI';

const SCREENING_GROUP_CONFIG = {
  Passed: {
    label: 'Đạt',
    color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    badgeBg: 'bg-emerald-600 text-white',
    icon: CheckCircle2
  },
  ReviewNeeded: {
    label: 'Cần xem thêm',
    color: 'text-amber-700 bg-amber-50 border-amber-200',
    badgeBg: 'bg-amber-600 text-white',
    icon: AlertCircle
  },
  Failed: {
    label: 'Chưa đạt',
    color: 'text-rose-700 bg-rose-50 border-rose-200',
    badgeBg: 'bg-rose-600 text-white',
    icon: XCircle
  },
  Normal: {
    label: 'Duyệt thông thường',
    color: 'text-blue-700 bg-blue-50 border-blue-200',
    badgeBg: 'bg-blue-600 text-white',
    icon: HelpCircle
  }
};

export default function EmployerATSPage() {
  const { jobId } = useParams();
  const location = useLocation();
  const selectedId = new URLSearchParams(location.search).get('applicationId');

  // Job & Applicants State
  const [job, setJob] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [matchingAccess, setMatchingAccess] = useState(false);
  const [summary, setSummary] = useState({ total: 0, passed: 0, reviewNeeded: 0, failed: 0, preparing: 0 });
  const [pagination, setPagination] = useState({ page: 1, limit: 10, totalItems: 0, totalPages: 1 });

  // Master Mode State: True = Filtered Mode, False = Normal Browsing Mode
  const [isFilterActive, setIsFilterActive] = useState(true);

  // Quick Filters State
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [quickFilters, setQuickFilters] = useState({
    yoeMin: '',
    yoeMax: '',
    location: '',
    workMode: 'ALL',
    screeningGroup: 'ALL',
    keyword: '',
    skillId: '',
    scoreMin: '',
    gpaMin: ''
  });

  // Modals & Action State
  const [selectedInterview, setSelectedInterview] = useState(null);
  const [confirmation, setConfirmation] = useState(null);
  const [notice, setNotice] = useState(null);
  const [deepReviewApp, setDeepReviewApp] = useState(null);
  const [explanationApp, setExplanationApp] = useState(null);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const fetchApplicants = useCallback(async (page = 1) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('limit', pagination.limit);
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (quickFilters.keyword.trim()) params.append('search', quickFilters.keyword.trim());

      // Master Mode Flag
      params.append('filterMode', isFilterActive ? 'filtered' : 'normal');

      // Only apply screening filters if matchingAccess and filter is active
      if (isFilterActive && matchingAccess) {
        if (quickFilters.screeningGroup !== 'ALL') params.append('screeningGroup', quickFilters.screeningGroup);
        if (quickFilters.yoeMin) params.append('yoeMin', quickFilters.yoeMin);
        if (quickFilters.yoeMax) params.append('yoeMax', quickFilters.yoeMax);
        if (quickFilters.location.trim()) params.append('location', quickFilters.location.trim());
        if (quickFilters.scoreMin) params.append('scoreMin', quickFilters.scoreMin);
        if (quickFilters.gpaMin) params.append('gpaMin', quickFilters.gpaMin);
      }

      const res = await api.get(`/employer/jobs/${jobId}/ats?${params.toString()}`);
      if (res.data?.success) {
        const jobData = res.data.data.job;
        setJob(jobData);
        setItems(res.data.data.applicants || []);
        setMatchingAccess(res.data.data.matchingAccess === true);
        if (res.data.data.summary) setSummary(res.data.data.summary);
        if (res.data.data.pagination) setPagination(res.data.data.pagination);

        // Sync master switch if specified by job criteria
        if (jobData?.screeningCriteria?.IsEnabled !== undefined) {
          setIsFilterActive(jobData.screeningCriteria.IsEnabled !== false && jobData.screeningCriteria.IsEnabled !== 0);
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Chưa tải được hồ sơ ứng tuyển. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }, [jobId, statusFilter, isFilterActive, matchingAccess, quickFilters, pagination.limit]);

  useEffect(() => {
    fetchApplicants(1);
  }, [jobId, statusFilter, isFilterActive, quickFilters.screeningGroup, pagination.limit]);

  // Master switch toggling
  const handleToggleFilter = async (nextState) => {
    try {
      setIsFilterActive(nextState);
      await api.patch(`/employer/jobs/${jobId}/screening-toggle`, { isEnabled: nextState });
      setMessage(nextState ? 'Đã bật chức năng sàng lọc tự động.' : 'Đã chuyển sang chế độ duyệt hồ sơ thông thường.');
      setTimeout(() => setMessage(''), 4000);
      await fetchApplicants(1);
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể chuyển đổi trạng thái bộ lọc.');
    }
  };

  // Save full screening configuration
  const handleSaveConfig = async (fullConfig) => {
    setError('');
    setMessage('');
    try {
      const payload = {
        config: fullConfig,
        screeningLevel: fullConfig.screeningLevel || job?.screeningCriteria?.ScreeningLevel || 'Balanced',
        minGpa: fullConfig.education?.gpa?.min != null ? Number(fullConfig.education.gpa.min) : null,
        gpaScale: fullConfig.education?.gpa?.scale === 10 ? 10 : 4,
        mandatoryCertificates: (fullConfig.languages?.items || [])
          .filter(i => i.mode === 'REQUIRED' && i.certificate)
          .map(i => i.certificate)
      };

      const res = await api.put(`/employer/jobs/${jobId}/screening-config`, payload);
      if (res.data?.success) {
        setMessage('Cập nhật cấu hình bộ lọc thành công. Hồ sơ đang được đồng bộ lại.');
        setTimeout(() => setMessage(''), 5000);
        await fetchApplicants(pagination.page);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Lỗi khi lưu cấu hình bộ lọc.');
    }
  };

  const handleQuickFilterChange = (field, value) => {
    setQuickFilters(prev => ({ ...prev, [field]: value }));
  };

  const handleClearAllFilters = () => {
    setStatusFilter('ALL');
    setQuickFilters({
      yoeMin: '',
      yoeMax: '',
      location: '',
      workMode: 'ALL',
      screeningGroup: 'ALL',
      keyword: '',
      skillId: '',
      scoreMin: '',
      gpaMin: ''
    });
  };

  const updateStatus = async (item, status) => {
    if (busy) return false;
    setBusy(true);
    setMessage('');
    setError('');
    try {
      const response = await api.patch(`/employer/applications/${item.ApplicationID}/status`, { status });
      setMessage(response.data.message);
      await fetchApplicants(pagination.page);
      window.dispatchEvent(new Event('notifications-changed'));
      return true;
    } catch (err) {
      setError(err.response?.data?.message || 'Chưa cập nhật được trạng thái hồ sơ. Vui lòng thử lại.');
      return false;
    } finally {
      setBusy(false);
    }
  };

  // Active filter count calculation
  const activeQuickCount = [
    quickFilters.yoeMin,
    quickFilters.yoeMax,
    quickFilters.location,
    quickFilters.workMode !== 'ALL' && quickFilters.workMode,
    quickFilters.screeningGroup !== 'ALL' && quickFilters.screeningGroup,
    quickFilters.keyword,
    quickFilters.scoreMin,
    quickFilters.gpaMin,
    statusFilter !== 'ALL' && statusFilter
  ].filter(Boolean).length;

  return (
    <div className="recruit-workspace max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* Breadcrumb & Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <Link className="text-blue-700 hover:underline flex items-center gap-1 font-medium" to="/employer/dashboard">
          <ChevronLeft className="h-4 w-4" /> Quản lý tin tuyển dụng
        </Link>
        {matchingAccess && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Mức độ sàng lọc hiện tại:</span>
            <span className="rounded-md bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-800">
              {job?.screeningCriteria?.ScreeningLevel || 'Cân bằng (70%)'}
            </span>
          </div>
        )}
      </div>

      {/* Header */}
      <header className="recruit-header mt-4">
        <div className="recruit-row">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Sàng lọc hồ sơ ứng viên</h1>
            <p className="mt-1 font-semibold text-slate-800 text-base">{job?.Title}</p>
            <p className="recruit-muted text-xs">
              Hệ thống đánh giá năng lực thực tế, kinh nghiệm, kỹ năng và dự án. Nhà tuyển dụng luôn tự quyết định kết quả tuyển dụng.
            </p>
          </div>
          <button
            className="recruit-button"
            disabled={loading || busy}
            onClick={() => fetchApplicants(pagination.page)}
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} /> Tải lại
          </button>
        </div>
      </header>

      {/* Feedback notices */}
      {message && <p role="status" className="recruit-notice">{message}</p>}
      {error && <p role="alert" className="recruit-notice recruit-error">{error}</p>}

      {/* Subscription Status Banner */}
      {!loading && (
        <div className={`my-4 rounded-xl border p-4 text-xs ${matchingAccess
            ? 'border-emerald-200 bg-emerald-50/50 text-emerald-900'
            : 'border-amber-200 bg-amber-50/60 text-amber-900'
          }`}>
          {matchingAccess ? (
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                Đã mở khóa hệ thống Sàng lọc linh hoạt
              </span>
              <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
                Gói trả phí đang hoạt động
              </span>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="flex items-center gap-1.5">
                <Lock className="h-4 w-4 text-amber-600" />
                Tính năng sàng lọc tự động và phân loại hồ sơ dành riêng cho tài khoản nhà tuyển dụng có gói dịch vụ.
              </span>
              <Link className="font-bold underline text-brand-greenDark hover:text-emerald-700" to="/employer/pricing">
                Xem bảng giá và nâng cấp
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Summary Counters Bar */}
      <div className="my-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* Passed */}
        <button
          type="button"
          disabled={!isFilterActive}
          onClick={() => {
            if (matchingAccess && isFilterActive) {
              handleQuickFilterChange('screeningGroup', quickFilters.screeningGroup === 'Passed' ? 'ALL' : 'Passed');
            }
          }}
          className={`flex flex-col text-left rounded-xl border p-3.5 transition-all ${quickFilters.screeningGroup === 'Passed'
              ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500/20'
              : 'border-slate-200 bg-white hover:border-slate-300'
            } ${!isFilterActive ? 'opacity-60 cursor-default' : ''}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Đạt yêu cầu
            </span>
            <span className="text-lg font-extrabold text-emerald-700">
              {matchingAccess && isFilterActive ? summary.passed : '—'}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">Đạt điều kiện bắt buộc và điểm kỹ năng cao</p>
        </button>

        {/* Review Needed */}
        <button
          type="button"
          disabled={!isFilterActive}
          onClick={() => {
            if (matchingAccess && isFilterActive) {
              handleQuickFilterChange('screeningGroup', quickFilters.screeningGroup === 'ReviewNeeded' ? 'ALL' : 'ReviewNeeded');
            }
          }}
          className={`flex flex-col text-left rounded-xl border p-3.5 transition-all ${quickFilters.screeningGroup === 'ReviewNeeded'
              ? 'border-amber-500 bg-amber-50 ring-2 ring-amber-500/20'
              : 'border-slate-200 bg-white hover:border-slate-300'
            } ${!isFilterActive ? 'opacity-60 cursor-default' : ''}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-800 flex items-center gap-1.5">
              <AlertCircle className="h-4 w-4 text-amber-600" /> Cần xem thêm
            </span>
            <span className="text-lg font-extrabold text-amber-700">
              {matchingAccess && isFilterActive ? summary.reviewNeeded : '—'}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">Thiếu dữ liệu CV hoặc cần làm rõ khi phỏng vấn</p>
        </button>

        {/* Failed */}
        <button
          type="button"
          disabled={!isFilterActive}
          onClick={() => {
            if (matchingAccess && isFilterActive) {
              handleQuickFilterChange('screeningGroup', quickFilters.screeningGroup === 'Failed' ? 'ALL' : 'Failed');
            }
          }}
          className={`flex flex-col text-left rounded-xl border p-3.5 transition-all ${quickFilters.screeningGroup === 'Failed'
              ? 'border-rose-500 bg-rose-50 ring-2 ring-rose-500/20'
              : 'border-slate-200 bg-white hover:border-slate-300'
            } ${!isFilterActive ? 'opacity-60 cursor-default' : ''}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-800 flex items-center gap-1.5">
              <XCircle className="h-4 w-4 text-rose-600" /> Chưa đạt
            </span>
            <span className="text-lg font-extrabold text-rose-700">
              {matchingAccess && isFilterActive ? summary.failed : '—'}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">Chưa đạt điều kiện bắt buộc hoặc điểm dưới ngưỡng</p>
        </button>

        {/* Total / Preparing */}
        <div className="flex flex-col rounded-xl border border-slate-200 bg-white p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Layers className="h-4 w-4 text-slate-500" /> Tổng hồ sơ
            </span>
            <span className="text-lg font-extrabold text-slate-900">
              {summary.total || pagination.totalItems || 0}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            {summary.preparing > 0 ? `${summary.preparing} CV đang chuẩn bị xử lý` : 'Đã nộp vào tin tuyển dụng này'}
          </p>
        </div>
      </div>

      {/* Recruitment Status Tabs */}
      <div className="my-4 flex items-center justify-between flex-wrap gap-2">
        <div className="recruit-tabs">
          {[['ALL', 'Tất cả trạng thái'], ...Object.entries(applicationLabels)].map(([key, label]) => (
            <button
              key={key}
              className="recruit-button text-xs"
              aria-pressed={statusFilter === key}
              onClick={() => setStatusFilter(key)}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Clear filters pill */}
        {activeQuickCount > 0 && (
          <button
            type="button"
            onClick={handleClearAllFilters}
            className="text-xs font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1"
          >
            <X className="h-3.5 w-3.5" /> Xóa {activeQuickCount} điều kiện lọc
          </button>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          UPGRADED FLEXIBLE RECRUITMENT SCREENING PANEL
      ───────────────────────────────────────────────────────────── */}
      {matchingAccess && (
        <FlexibleScreeningPanel
          job={job}
          isFilterActive={isFilterActive}
          onToggleFilter={handleToggleFilter}
          onSaveConfig={handleSaveConfig}
          currentConfig={job?.screeningCriteria?.Config}
          quickFilters={quickFilters}
          onQuickFilterChange={handleQuickFilterChange}
          onClearAllFilters={handleClearAllFilters}
          loading={loading}
        />
      )}

      {/* Applicants List Section */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-slate-800">
            Danh sách hồ sơ ứng tuyển ({pagination.totalItems || items.length})
            {!isFilterActive && (
              <span className="ml-2 font-normal text-xs text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                Chế độ duyệt thông thường
              </span>
            )}
          </h2>
          <span className="text-xs text-slate-500">
            Trang {pagination.page} / {pagination.totalPages || 1}
          </span>
        </div>

        {loading ? (
          <div className="py-20 text-center bg-white rounded-2xl border border-slate-200">
            <RefreshCw className="mx-auto h-7 w-7 animate-spin text-blue-600 mb-2" />
            <p className="text-sm text-slate-600 font-medium">Đang tải và xếp loại hồ sơ ứng tuyển...</p>
          </div>
        ) : !items.length ? (
          <div className="recruit-panel text-center py-16 bg-white rounded-2xl border border-slate-200">
            <HelpCircle className="mx-auto h-10 w-10 text-slate-300 mb-2" />
            <p className="text-sm font-bold text-slate-700">Chưa có hồ sơ nào phù hợp với bộ lọc hiện tại.</p>
            <p className="text-xs text-slate-400 mt-1">
              Thử bấm "Xóa bộ lọc" hoặc chuyển sang "Duyệt thông thường" để xem toàn bộ danh sách.
            </p>
            <button
              type="button"
              onClick={handleClearAllFilters}
              className="mt-3 inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
            >
              Xóa bộ lọc
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map(item => {
              const details = item.screeningDetails || item.matchAnalysis || {};
              const groupKey = isFilterActive ? (item.ScreeningResultGroup || details.resultGroup || 'ReviewNeeded') : 'Normal';
              const groupInfo = SCREENING_GROUP_CONFIG[groupKey] || SCREENING_GROUP_CONFIG.ReviewNeeded;
              const GroupIcon = groupInfo.icon;

              const score = item.ScreeningScore != null ? item.ScreeningScore : (item.MatchScore != null ? item.MatchScore : null);
              const matchedList = Array.isArray(details.matchedCriteria) ? details.matchedCriteria : [];
              const unmetList = Array.isArray(details.unmetCriteria) ? details.unmetCriteria : [];
              const missingList = Array.isArray(details.missingDataCriteria) ? details.missingDataCriteria : [];
              const salaryInsight = details.salaryInsight;
              const employmentInsights = details.employmentInsights;

              return (
                <article
                  key={item.ApplicationID}
                  id={`application-${item.ApplicationID}`}
                  className={`recruit-panel transition-all rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-slate-300 ${String(item.ApplicationID) === selectedId ? 'ring-2 ring-blue-500' : ''
                    }`}
                >
                  {/* Candidate Header Row */}
                  <div className="recruit-row items-start">
                    <div>
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h3 className="text-base font-bold text-slate-900">{item.FullName}</h3>
                        {/* Result Group Badge */}
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold border ${groupInfo.color}`}>
                          <GroupIcon className="h-3.5 w-3.5" />
                          {groupInfo.label}
                        </span>

                        {/* CV Data Processing Status */}
                        {item.CVDataStatus && item.CVDataStatus !== 'Ready' && (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                            CV: {item.CVDataStatus}
                          </span>
                        )}
                      </div>

                      <p className="recruit-muted text-xs mt-1">
                        {item.Headline || 'Ứng viên'} · Nộp lúc {formatDate(item.AppliedAt)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <StatusPill value={item.Status} labels={applicationLabels} />
                    </div>
                  </div>

                  {/* Contact Info */}
                  <dl className="recruit-details mt-2">
                    <div><dt>Email</dt><dd>{item.Email}</dd></div>
                    <div><dt>Điện thoại</dt><dd>{item.Phone || 'Chưa cung cấp'}</dd></div>
                    {item.CurrentLocation && <div><dt>Địa điểm</dt><dd>{item.CurrentLocation}</dd></div>}
                  </dl>

                  {/* ─────────────────────────────────────────────────────────────
                      SCREENING ASSESSMENT CARD BLOCK
                  ───────────────────────────────────────────────────────────── */}
                  <div className="my-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-3">
                    {/* Score Bar & Modal Action Row */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/60 pb-2.5">
                      <div className="flex items-center gap-3">
                        {score != null ? (
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-700">Điểm phù hợp:</span>
                            <span className={`rounded-md px-2 py-0.5 text-xs font-extrabold ${score >= 70 ? 'bg-emerald-100 text-emerald-800' : score >= 50 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                              }`}>
                              {score}%
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-500">Chưa đối chiếu điểm</span>
                        )}

                        {/* Salary Insight Tag */}
                        {salaryInsight && (
                          <span className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${salaryInsight.status === 'FOUND'
                              ? 'bg-emerald-100 text-emerald-800'
                              : salaryInsight.status === 'MISMATCH'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-slate-100 text-slate-600'
                            }`}>
                            Lương: {salaryInsight.label}
                          </span>
                        )}

                        {/* Employment Tenure Insight */}
                        {employmentInsights?.formattedAvgTenure && employmentInsights.formattedAvgTenure !== 'Chưa đủ dữ liệu' && (
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600 font-medium">
                            TB: {employmentInsights.formattedAvgTenure}
                          </span>
                        )}
                      </div>

                      {/* Detail Modal Triggers */}
                      <div className="flex items-center gap-2">
                        {/* Detail Modal Button */}
                        <button
                          type="button"
                          onClick={() => setExplanationApp(item)}
                          className="inline-flex items-center rounded-lg border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 hover:bg-blue-100 transition-colors shadow-2xs"
                        >
                          Xem chi tiết
                        </button>
                      </div>
                    </div>

                    {/* Criteria Chips Grid */}
                    <div className="space-y-2 text-xs">
                      {/* Matched Criteria Chips */}
                      {matchedList.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-emerald-800 flex items-center gap-0.5">
                            <Check className="h-3 w-3" /> Đạt:
                          </span>
                          {matchedList.slice(0, 4).map((c, i) => (
                            <span key={i} className="rounded bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-800">
                              {c.label} {c.mode === 'REQUIRED' && '★'}
                            </span>
                          ))}
                          {matchedList.length > 4 && (
                            <button
                              type="button"
                              onClick={() => setExplanationApp(item)}
                              className="text-[11px] text-emerald-700 hover:underline font-bold"
                            >
                              +{matchedList.length - 4} tiêu chí khác
                            </button>
                          )}
                        </div>
                      )}

                      {/* Unmet Criteria Chips */}
                      {unmetList.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-rose-800 flex items-center gap-0.5">
                            <X className="h-3 w-3" /> Chưa đạt:
                          </span>
                          {unmetList.slice(0, 3).map((c, i) => (
                            <span
                              key={i}
                              className={`rounded px-2 py-0.5 text-[11px] font-medium ${c.mode === 'REQUIRED'
                                  ? 'bg-rose-100 text-rose-800 border border-rose-200 font-bold'
                                  : 'bg-slate-200 text-slate-700'
                                }`}
                            >
                              {c.label} {c.mode === 'REQUIRED' && '(Bắt buộc)'}
                            </span>
                          ))}
                          {unmetList.length > 3 && (
                            <button
                              type="button"
                              onClick={() => setExplanationApp(item)}
                              className="text-[11px] text-rose-700 hover:underline font-bold"
                            >
                              +{unmetList.length - 3} tiêu chí khác
                            </button>
                          )}
                        </div>
                      )}

                      {/* Missing Data Chips */}
                      {missingList.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-slate-600 flex items-center gap-0.5">
                            <AlertCircle className="h-3 w-3 text-amber-500" /> Cần xác minh:
                          </span>
                          {missingList.slice(0, 2).map((c, i) => (
                            <span key={i} className="rounded bg-slate-200 px-2 py-0.5 text-[11px] text-slate-700">
                              {c.label}
                            </span>
                          ))}
                          {missingList.length > 2 && (
                            <button
                              type="button"
                              onClick={() => setExplanationApp(item)}
                              className="text-[11px] text-slate-600 hover:underline font-bold"
                            >
                              +{missingList.length - 2} khác
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Interview details if scheduled */}
                  {item.interview && <InterviewDetails interview={item.interview} />}

                  {/* Recruitment Workflow Action Buttons */}
                  <div className="recruit-actions mt-3">
                    {item.CVFileUrl && (
                      <button
                        className="recruit-button"
                        onClick={() => openProtectedCV(item.CVFileUrl).catch(() => setError('Chưa mở được CV. Vui lòng thử lại.'))}
                      >
                        <FileText className="h-3.5 w-3.5 mr-1" /> Xem CV gốc
                      </button>
                    )}
                    {item.Status === 'Applied' && (
                      <button
                        className="recruit-button recruit-primary"
                        disabled={busy}
                        onClick={() => updateStatus(item, 'Screening')}
                      >
                        Duyệt vào xét tuyển
                      </button>
                    )}
                    {item.Status === 'Offered' && (
                      <button
                        className="recruit-button recruit-primary"
                        onClick={() => setNotice(item)}
                      >
                        Gửi thông báo trúng tuyển
                      </button>
                    )}
                    {!['Rejected', 'Offered'].includes(item.Status) && (
                      <>
                        <button
                          className="recruit-button"
                          disabled={busy}
                          onClick={() => setSelectedInterview({ ...item, JobTitle: job?.Title })}
                        >
                          {item.interview ? 'Điều chỉnh lịch' : 'Hẹn phỏng vấn'}
                        </button>
                        {['Screening', 'Interviewing'].includes(item.Status) && (
                          <button
                            className="recruit-button"
                            disabled={busy}
                            onClick={() => { setError(''); setConfirmation(item); }}
                          >
                            Xác nhận ứng tuyển
                          </button>
                        )}
                        <button
                          className="recruit-button"
                          disabled={busy}
                          onClick={() => updateStatus(item, 'Rejected')}
                        >
                          Từ chối hồ sơ
                        </button>
                      </>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* Server Pagination */}
        {pagination.totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between border-t border-slate-200 pt-4 text-xs text-slate-600">
            <span>
              Hiển thị trang <strong>{pagination.page}</strong> / <strong>{pagination.totalPages}</strong> (Tổng số {pagination.totalItems} hồ sơ)
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={pagination.page <= 1 || loading}
                onClick={() => fetchApplicants(pagination.page - 1)}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Trước
              </button>
              <button
                type="button"
                disabled={pagination.page >= pagination.totalPages || loading}
                onClick={() => fetchApplicants(pagination.page + 1)}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
              >
                Sau <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          MODALS
      ───────────────────────────────────────────────────────────── */}
      {/* Explanation Modal */}
      {explanationApp && (
        <ScreeningExplanationModal
          isOpen
          applicant={explanationApp}
          job={job}
          onClose={() => setExplanationApp(null)}
          onScheduleInterview={(app) => setSelectedInterview({ ...app, JobTitle: job?.Title })}
        />
      )}

      {/* Interview Modal */}
      {selectedInterview && (
        <InterviewModal
          isOpen
          applicant={selectedInterview}
          onClose={() => setSelectedInterview(null)}
          onScheduled={() => fetchApplicants(pagination.page)}
        />
      )}

      {/* Confirmation Modal */}
      {confirmation && (
        <ApplicationConfirmationModal
          applicant={confirmation}
          jobTitle={job?.Title}
          busy={busy}
          error={error}
          onCancel={() => setConfirmation(null)}
          onConfirm={async () => {
            if (await updateStatus(confirmation, 'Offered')) setConfirmation(null);
          }}
        />
      )}

      {/* Notice Modal */}
      {notice && (
        <ApplicationNoticeModal
          applicant={notice}
          jobTitle={job?.Title}
          onClose={() => setNotice(null)}
        />
      )}

      {/* Deep AI Review Modal */}
      {deepReviewApp && (
        <DeepReviewModal
          isOpen
          applicant={deepReviewApp}
          jobTitle={job?.Title}
          onClose={() => setDeepReviewApp(null)}
        />
      )}
    </div>
  );
}
