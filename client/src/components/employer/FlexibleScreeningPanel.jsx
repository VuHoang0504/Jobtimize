import React, { useState, useEffect } from 'react';
import {
  Sliders, ChevronDown, ChevronUp, CheckCircle2, AlertCircle, XCircle,
  Bookmark, RotateCcw, Save, Plus, Trash2, HelpCircle,
  Briefcase, GraduationCap, Globe, DollarSign, MapPin, Clock, ShieldCheck,
  Check, X, Eye, EyeOff, Layers, Search
} from 'lucide-react';
import api from '../../services/api';
import SaveFilterTemplateModal from './SaveFilterTemplateModal';

const DEFAULT_WEIGHTS = {
  experience: 25,
  skills: 25,
  projects: 20,
  education: 10,
  languages: 10,
  workConditions: 10
};

export default function FlexibleScreeningPanel({
  job,
  isFilterActive,
  onToggleFilter,
  onApplyFilters,
  onSaveConfig,
  currentConfig,
  quickFilters,
  onQuickFilterChange,
  onClearAllFilters,
  loading
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [savingJobConfig, setSavingJobConfig] = useState(false);
  const [templateNotice, setTemplateNotice] = useState('');

  // Accordion state for the 9 advanced categories
  const [expandedSection, setExpandedSection] = useState('experience');

  // Local configuration state initialized from currentConfig or defaults
  const [config, setConfig] = useState(currentConfig || {});
  const [weights, setWeights] = useState(currentConfig?.weights || DEFAULT_WEIGHTS);

  // Sync when currentConfig changes from parent
  useEffect(() => {
    if (currentConfig) {
      setConfig(currentConfig);
      if (currentConfig.weights) setWeights(currentConfig.weights);
    }
  }, [currentConfig]);

  // Load available templates for this employer
  const fetchTemplates = async () => {
    try {
      const res = await api.get('/employer/screening-templates');
      if (res.data?.success) {
        setTemplates(res.data.data || []);
      }
    } catch (err) {
      console.error('fetchTemplates error:', err);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  // Update a nested configuration field
  const updateField = (category, field, prop, value) => {
    setConfig(prev => ({
      ...prev,
      [category]: {
        ...(prev[category] || {}),
        [field]: {
          ...((prev[category] && prev[category][field]) || {}),
          [prop]: value
        }
      }
    }));
  };

  // Update weight for a category
  const handleWeightChange = (category, value) => {
    setWeights(prev => ({
      ...prev,
      [category]: Number(value)
    }));
  };

  // Apply a selected template
  const handleApplyTemplate = (e) => {
    const tmplId = e.target.value;
    setSelectedTemplateId(tmplId);
    if (!tmplId) return;

    const tmpl = templates.find(t => String(t.TemplateID) === String(tmplId));
    if (tmpl && tmpl.Config) {
      setConfig(tmpl.Config);
      if (tmpl.Config.weights) setWeights(tmpl.Config.weights);
      setTemplateNotice(`Đã nạp mẫu "${tmpl.TemplateName}". Bấm "Áp dụng cấu hình" để lưu.`);
      setTimeout(() => setTemplateNotice(''), 4000);
    }
  };

  // Save current configuration to JobPostings / JobScreeningCriteria
  const handleSaveToJob = async () => {
    setSavingJobConfig(true);
    try {
      const fullConfig = {
        ...config,
        weights,
        isEnabled: isFilterActive
      };
      await onSaveConfig?.(fullConfig);
    } finally {
      setSavingJobConfig(false);
    }
  };

  // Language management helpers
  const [newLangName, setNewLangName] = useState('');
  const [newLangCert, setNewLangCert] = useState('');
  const [newLangMode, setNewLangMode] = useState('PREFERRED');
  const [newLangSelfDeclared, setNewLangSelfDeclared] = useState(true);

  const handleAddLanguage = () => {
    if (!newLangName.trim()) return;
    const items = Array.isArray(config.languages?.items) ? [...config.languages.items] : [];
    items.push({
      language: newLangName.trim(),
      certificate: newLangCert.trim(),
      mode: newLangMode,
      allowSelfDeclared: newLangSelfDeclared
    });
    setConfig(prev => ({
      ...prev,
      languages: { ...(prev.languages || {}), items }
    }));
    setNewLangName('');
    setNewLangCert('');
  };

  const handleRemoveLanguage = (idx) => {
    const items = Array.isArray(config.languages?.items) ? [...config.languages.items] : [];
    items.splice(idx, 1);
    setConfig(prev => ({
      ...prev,
      languages: { ...(prev.languages || {}), items }
    }));
  };

  // Calculate active filter count
  const activeCount = [
    quickFilters.yoeMin,
    quickFilters.yoeMax,
    quickFilters.location,
    quickFilters.workMode && quickFilters.workMode !== 'ALL',
    quickFilters.screeningGroup && quickFilters.screeningGroup !== 'ALL',
    quickFilters.keyword,
    quickFilters.skillId,
    config.experience?.minTotalYears?.value > 0,
    config.education?.degreeLevel?.value,
    config.education?.gpa?.min > 0,
    config.projects?.hasProjects?.value,
    Array.isArray(config.languages?.items) && config.languages.items.length > 0,
    config.industrySpecific?.portfolioRequired?.value,
    config.industrySpecific?.githubRequired?.value
  ].filter(Boolean).length;

  const renderModeSelector = (category, field, currentValue) => (
    <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-[11px]">
      <button
        type="button"
        onClick={() => updateField(category, field, 'mode', 'REQUIRED')}
        className={`px-2 py-0.5 rounded font-semibold transition-all ${
          currentValue === 'REQUIRED'
            ? 'bg-rose-600 text-white shadow-2xs'
            : 'text-slate-600 hover:text-slate-900'
        }`}
      >
        Bắt buộc
      </button>
      <button
        type="button"
        onClick={() => updateField(category, field, 'mode', 'PREFERRED')}
        className={`px-2 py-0.5 rounded font-semibold transition-all ${
          currentValue === 'PREFERRED'
            ? 'bg-blue-600 text-white shadow-2xs'
            : 'text-slate-600 hover:text-slate-900'
        }`}
      >
        Ưu tiên
      </button>
      <button
        type="button"
        onClick={() => updateField(category, field, 'mode', 'INFORMATIONAL')}
        className={`px-2 py-0.5 rounded font-medium transition-all ${
          currentValue === 'INFORMATIONAL'
            ? 'bg-slate-700 text-white shadow-2xs'
            : 'text-slate-600 hover:text-slate-900'
        }`}
      >
        Tham khảo
      </button>
    </div>
  );

  return (
    <div className="my-5 rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden transition-all">
      {/* ─────────────────────────────────────────────────────────────
          1. MASTER BAR: MODE SWITCHER & EXPAND / COLLAPSE
      ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/70 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center">
            {/* Master Mode Switch Toggle */}
            <button
              type="button"
              onClick={() => onToggleFilter?.(!isFilterActive)}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                isFilterActive ? 'bg-blue-600' : 'bg-slate-300'
              }`}
              role="switch"
              aria-checked={isFilterActive}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                  isFilterActive ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-900">
                {isFilterActive ? 'Bộ lọc sàng lọc đang bật' : 'Chế độ Duyệt thông thường'}
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  isFilterActive
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-slate-200 text-slate-700'
                }`}
              >
                {isFilterActive ? 'Đang phân loại' : 'Hiển thị tất cả'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              {isFilterActive
                ? 'Tự động tính điểm phù hợp, xếp hồ sơ vào Đạt, Cần xem thêm và Chưa đạt.'
                : 'Hiển thị toàn bộ danh sách hồ sơ theo thứ tự mặc định, cấu hình lọc vẫn được lưu giữ.'}
            </p>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {activeCount > 0 && (
            <button
              type="button"
              onClick={onClearAllFilters}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-rose-600 hover:bg-slate-50"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Xóa bộ lọc ({activeCount})
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50"
          >
            <Sliders className="h-3.5 w-3.5 text-blue-600" />
            {isExpanded ? 'Thu gọn bộ lọc' : 'Mở rộng bộ lọc chuyên sâu'}
            {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {templateNotice && (
        <div className="bg-blue-50 px-4 py-2 text-xs font-medium text-blue-800 border-b border-blue-100">
          {templateNotice}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          2. QUICK FILTER BAR (Always accessible or when active)
      ───────────────────────────────────────────────────────────── */}
      <div className="p-4 sm:p-5 space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
          {/* YOE Min - Max */}
          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">Số năm KN (YOE)</label>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min="0"
                placeholder="Từ"
                value={quickFilters.yoeMin || ''}
                onChange={e => onQuickFilterChange('yoeMin', e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 focus:border-blue-500 focus:outline-none"
              />
              <span className="text-slate-400">-</span>
              <input
                type="number"
                min="0"
                placeholder="Đến"
                value={quickFilters.yoeMax || ''}
                onChange={e => onQuickFilterChange('yoeMax', e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">Địa điểm</label>
            <input
              type="text"
              placeholder="Đà Nẵng, TP.HCM..."
              value={quickFilters.location || ''}
              onChange={e => onQuickFilterChange('location', e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Work Mode */}
          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">Hình thức làm việc</label>
            <select
              value={quickFilters.workMode || 'ALL'}
              onChange={e => onQuickFilterChange('workMode', e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 focus:border-blue-500 focus:outline-none"
            >
              <option value="ALL">Tất cả hình thức</option>
              <option value="On-site">On-site (Tại văn phòng)</option>
              <option value="Hybrid">Hybrid (Linh hoạt)</option>
              <option value="Remote">Remote (Từ xa)</option>
            </select>
          </div>

          {/* Screening Group */}
          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">Nhóm sàng lọc</label>
            <select
              value={quickFilters.screeningGroup || 'ALL'}
              onChange={e => onQuickFilterChange('screeningGroup', e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 focus:border-blue-500 focus:outline-none"
            >
              <option value="ALL">Tất cả nhóm</option>
              <option value="Passed">Đạt yêu cầu</option>
              <option value="ReviewNeeded">Cần xem thêm</option>
              <option value="Failed">Chưa đạt</option>
            </select>
          </div>

          {/* Search Candidate */}
          <div className="col-span-2">
            <label className="text-[11px] font-bold text-slate-700 block mb-1">Tìm kiếm từ khóa / tên</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="search"
                placeholder="Tên ứng viên, email, kỹ năng..."
                value={quickFilters.keyword || ''}
                onChange={e => onQuickFilterChange('keyword', e.target.value)}
                className="w-full rounded-lg border border-slate-200 pl-8 pr-3 py-1.5 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Template Selector & Storage Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-600">Mẫu bộ lọc:</span>
            <select
              value={selectedTemplateId}
              onChange={handleApplyTemplate}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs focus:border-blue-500 focus:outline-none max-w-xs"
            >
              <option value="">-- Chọn mẫu có sẵn --</option>
              {templates.map(t => (
                <option key={t.TemplateID} value={t.TemplateID}>
                  {t.TemplateName}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => setShowTemplateModal(true)}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Bookmark className="h-3.5 w-3.5 text-blue-600" /> Lưu thành mẫu mới
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={savingJobConfig || loading}
              onClick={handleSaveToJob}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-blue-700 disabled:opacity-50"
            >
              <Save className="h-3.5 w-3.5" />
              {savingJobConfig ? 'Đang lưu...' : 'Lưu cấu hình cho tin này'}
            </button>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. ADVANCED FILTER ACCORDION (9 CATEGORIES & WEIGHT SLIDERS)
      ───────────────────────────────────────────────────────────── */}
      {isExpanded && (
        <div className="border-t border-slate-200 bg-slate-50/40 p-4 sm:p-6 space-y-6">
          {/* Header Info Banner */}
          <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-3.5 text-xs text-blue-900 flex items-start gap-2.5">
            <Sliders className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <span className="font-bold">Hệ thống sàng lọc linh hoạt (Flexible Screening):</span>
              <p className="mt-0.5 leading-relaxed text-blue-800">
                Mỗi tiêu chí hỗ trợ 3 chế độ: <strong>Bắt buộc</strong> (điều kiện cứng), <strong>Ưu tiên</strong> (tính điểm phù hợp), hoặc <strong>Tham khảo</strong> (thông tin xem thêm). GPA, bằng cấp và trường học mặc định là Ưu tiên hoặc Tham khảo, hồ sơ không tự động bị loại.
              </p>
            </div>
          </div>

          {/* Category Weights Sliders */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
            <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="h-4 w-4 text-blue-600" /> Trọng số các nhóm tiêu chí (Tổng chuẩn hóa: 100%)
              </span>
              <span className="text-xs font-bold text-blue-700">
                {Object.values(weights).reduce((a, b) => a + Number(b || 0), 0)}%
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 text-xs">
              <div>
                <div className="flex justify-between font-medium text-slate-700 mb-1">
                  <span>Kinh nghiệm</span>
                  <span className="font-bold text-blue-700">{weights.experience}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="50"
                  step="5"
                  value={weights.experience}
                  onChange={e => handleWeightChange('experience', e.target.value)}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>

              <div>
                <div className="flex justify-between font-medium text-slate-700 mb-1">
                  <span>Kỹ năng</span>
                  <span className="font-bold text-blue-700">{weights.skills}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="50"
                  step="5"
                  value={weights.skills}
                  onChange={e => handleWeightChange('skills', e.target.value)}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>

              <div>
                <div className="flex justify-between font-medium text-slate-700 mb-1">
                  <span>Dự án</span>
                  <span className="font-bold text-blue-700">{weights.projects}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="50"
                  step="5"
                  value={weights.projects}
                  onChange={e => handleWeightChange('projects', e.target.value)}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>

              <div>
                <div className="flex justify-between font-medium text-slate-700 mb-1">
                  <span>Học vấn & GPA</span>
                  <span className="font-bold text-blue-700">{weights.education}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="50"
                  step="5"
                  value={weights.education}
                  onChange={e => handleWeightChange('education', e.target.value)}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>

              <div>
                <div className="flex justify-between font-medium text-slate-700 mb-1">
                  <span>Ngoại ngữ</span>
                  <span className="font-bold text-blue-700">{weights.languages}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="50"
                  step="5"
                  value={weights.languages}
                  onChange={e => handleWeightChange('languages', e.target.value)}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>

              <div>
                <div className="flex justify-between font-medium text-slate-700 mb-1">
                  <span>Điều kiện & Lương</span>
                  <span className="font-bold text-blue-700">{weights.workConditions}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="50"
                  step="5"
                  value={weights.workConditions}
                  onChange={e => handleWeightChange('workConditions', e.target.value)}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>
            </div>
          </div>

          {/* 9 Categories Accordion List */}
          <div className="space-y-3">
            {/* 1. Work Experience */}
            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
              <button
                type="button"
                onClick={() => setExpandedSection(expandedSection === 'experience' ? '' : 'experience')}
                className="w-full flex items-center justify-between p-3.5 text-left text-xs font-bold text-slate-900 hover:bg-slate-50"
              >
                <div className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-blue-600" />
                  <span>1. Kinh nghiệm làm việc (Work Experience)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-normal text-slate-500">Số năm, vai trò, quản lý</span>
                  {expandedSection === 'experience' ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                </div>
              </button>

              {expandedSection === 'experience' && (
                <div className="border-t border-slate-100 p-4 space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-semibold text-slate-800">Tổng số năm kinh nghiệm</label>
                        {renderModeSelector('experience', 'minTotalYears', config.experience?.minTotalYears?.mode || 'PREFERRED')}
                      </div>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        placeholder="Số năm tối thiểu (Ví dụ: 3)"
                        value={config.experience?.minTotalYears?.value || ''}
                        onChange={e => updateField('experience', 'minTotalYears', 'value', Number(e.target.value))}
                        className="w-full rounded-lg border border-slate-200 px-3 py-1.5 focus:border-blue-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-semibold text-slate-800">Số năm KN đúng vị trí</label>
                        {renderModeSelector('experience', 'minRoleYears', config.experience?.minRoleYears?.mode || 'PREFERRED')}
                      </div>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        placeholder="Số năm trong vai trò tương đương"
                        value={config.experience?.minRoleYears?.value || ''}
                        onChange={e => updateField('experience', 'minRoleYears', 'value', Number(e.target.value))}
                        className="w-full rounded-lg border border-slate-200 px-3 py-1.5 focus:border-blue-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-semibold text-slate-800">Kinh nghiệm trong ngành</label>
                        {renderModeSelector('experience', 'industry', config.experience?.industry?.mode || 'INFORMATIONAL')}
                      </div>
                      <input
                        type="text"
                        placeholder="Ví dụ: E-commerce, Fintech, Healthcare..."
                        value={config.experience?.industry?.value || ''}
                        onChange={e => updateField('experience', 'industry', 'value', e.target.value)}
                        className="w-full rounded-lg border border-slate-200 px-3 py-1.5 focus:border-blue-500 focus:outline-none"
                      />
                    </div>

                    <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                      <div>
                        <span className="font-semibold text-slate-800 block">Kinh nghiệm quản lý đội ngũ</span>
                        <span className="text-[11px] text-slate-500">Từng giữ vai trò Lead, Manager, Trưởng nhóm</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {renderModeSelector('experience', 'managementExp', config.experience?.managementExp?.mode || 'INFORMATIONAL')}
                        <input
                          type="checkbox"
                          checked={Boolean(config.experience?.managementExp?.value)}
                          onChange={e => updateField('experience', 'managementExp', 'value', e.target.checked)}
                          className="h-4 w-4 text-blue-600 rounded"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 2. Education */}
            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
              <button
                type="button"
                onClick={() => setExpandedSection(expandedSection === 'education' ? '' : 'education')}
                className="w-full flex items-center justify-between p-3.5 text-left text-xs font-bold text-slate-900 hover:bg-slate-50"
              >
                <div className="flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-blue-600" />
                  <span>2. Học vấn & Bằng cấp (Education - Mặc định Ưu tiên, không tự loại)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-normal text-slate-500">Bậc học, chuyên ngành, GPA</span>
                  {expandedSection === 'education' ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                </div>
              </button>

              {expandedSection === 'education' && (
                <div className="border-t border-slate-100 p-4 space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-semibold text-slate-800">Bậc học tối thiểu</label>
                        {renderModeSelector('education', 'degreeLevel', config.education?.degreeLevel?.mode || 'INFORMATIONAL')}
                      </div>
                      <select
                        value={config.education?.degreeLevel?.value || ''}
                        onChange={e => updateField('education', 'degreeLevel', 'value', e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 focus:border-blue-500 focus:outline-none"
                      >
                        <option value="">Không yêu cầu bậc học cụ thể</option>
                        <option value="Cao đẳng">Cao đẳng trở lên</option>
                        <option value="Đại học">Đại học trở lên</option>
                        <option value="Thạc sĩ">Thạc sĩ trở lên</option>
                      </select>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-semibold text-slate-800">Chuyên ngành đào tạo</label>
                        {renderModeSelector('education', 'major', config.education?.major?.mode || 'INFORMATIONAL')}
                      </div>
                      <input
                        type="text"
                        placeholder="Ví dụ: Công nghệ thông tin, Khoa học máy tính..."
                        value={config.education?.major?.value || ''}
                        onChange={e => updateField('education', 'major', 'value', e.target.value)}
                        className="w-full rounded-lg border border-slate-200 px-3 py-1.5 focus:border-blue-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-semibold text-slate-800">GPA tối thiểu (Thang 4 hoặc 10)</label>
                        {renderModeSelector('education', 'gpa', config.education?.gpa?.mode || 'PREFERRED')}
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          step="0.1"
                          placeholder="Ví dụ: 3.0"
                          value={config.education?.gpa?.min || ''}
                          onChange={e => updateField('education', 'gpa', 'min', e.target.value ? Number(e.target.value) : null)}
                          className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 focus:border-blue-500 focus:outline-none"
                        />
                        <select
                          value={config.education?.gpa?.scale || 4}
                          onChange={e => updateField('education', 'gpa', 'scale', Number(e.target.value))}
                          className="w-28 rounded-lg border border-slate-200 bg-white px-2 py-1.5 focus:border-blue-500 focus:outline-none"
                        >
                          <option value={4}>Thang 4.0</option>
                          <option value={10}>Thang 10.0</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-semibold text-slate-800">Trường đào tạo</label>
                        {renderModeSelector('education', 'school', config.education?.school?.mode || 'INFORMATIONAL')}
                      </div>
                      <input
                        type="text"
                        placeholder="Ví dụ: Bách Khoa, Quốc Gia, FPT..."
                        value={config.education?.school?.value || ''}
                        onChange={e => updateField('education', 'school', 'value', e.target.value)}
                        className="w-full rounded-lg border border-slate-200 px-3 py-1.5 focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 3. Projects & Achievements */}
            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
              <button
                type="button"
                onClick={() => setExpandedSection(expandedSection === 'projects' ? '' : 'projects')}
                className="w-full flex items-center justify-between p-3.5 text-left text-xs font-bold text-slate-900 hover:bg-slate-50"
              >
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-blue-600" />
                  <span>3. Dự án & Thành tựu thực tế (Projects & Achievements)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-normal text-slate-500">Dự án thực tế, số liệu định lượng</span>
                  {expandedSection === 'projects' ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                </div>
              </button>

              {expandedSection === 'projects' && (
                <div className="border-t border-slate-100 p-4 space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                      <div>
                        <span className="font-semibold text-slate-800 block">Yêu cầu có dự án liên quan</span>
                        <span className="text-[11px] text-slate-500">Ưu tiên ứng viên có dự án thực tế trên CV</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {renderModeSelector('projects', 'hasProjects', config.projects?.hasProjects?.mode || 'INFORMATIONAL')}
                        <input
                          type="checkbox"
                          checked={Boolean(config.projects?.hasProjects?.value)}
                          onChange={e => updateField('projects', 'hasProjects', 'value', e.target.checked)}
                          className="h-4 w-4 text-blue-600 rounded"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                      <div>
                        <span className="font-semibold text-slate-800 block">Thành tựu định lượng</span>
                        <span className="text-[11px] text-slate-500">Có số liệu đo lường (users, doanh thu, tối ưu)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {renderModeSelector('projects', 'quantifiableAchievements', config.projects?.quantifiableAchievements?.mode || 'INFORMATIONAL')}
                        <input
                          type="checkbox"
                          checked={Boolean(config.projects?.quantifiableAchievements?.value)}
                          onChange={e => updateField('projects', 'quantifiableAchievements', 'value', e.target.checked)}
                          className="h-4 w-4 text-blue-600 rounded"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 4. Languages */}
            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
              <button
                type="button"
                onClick={() => setExpandedSection(expandedSection === 'languages' ? '' : 'languages')}
                className="w-full flex items-center justify-between p-3.5 text-left text-xs font-bold text-slate-900 hover:bg-slate-50"
              >
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-blue-600" />
                  <span>4. Ngoại ngữ & Chứng chỉ (Languages - Cho phép trình độ tự khai)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-normal text-slate-500">
                    {Array.isArray(config.languages?.items) ? `${config.languages.items.length} ngoại ngữ` : 'Chưa thiết lập'}
                  </span>
                  {expandedSection === 'languages' ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                </div>
              </button>

              {expandedSection === 'languages' && (
                <div className="border-t border-slate-100 p-4 space-y-4 text-xs">
                  {/* Add New Language Input Row */}
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                    <span className="font-bold text-slate-800 block">Thêm yêu cầu ngoại ngữ:</span>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                      <input
                        type="text"
                        placeholder="Ngoại ngữ (Ví dụ: Tiếng Anh)"
                        value={newLangName}
                        onChange={e => setNewLangName(e.target.value)}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 focus:border-blue-500 focus:outline-none"
                      />
                      <input
                        type="text"
                        placeholder="Chứng chỉ (Ví dụ: TOEIC 650, IELTS)"
                        value={newLangCert}
                        onChange={e => setNewLangCert(e.target.value)}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 focus:border-blue-500 focus:outline-none"
                      />
                      <select
                        value={newLangMode}
                        onChange={e => setNewLangMode(e.target.value)}
                        className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 focus:border-blue-500 focus:outline-none"
                      >
                        <option value="REQUIRED">Bắt buộc</option>
                        <option value="PREFERRED">Ưu tiên</option>
                        <option value="INFORMATIONAL">Tham khảo</option>
                      </select>
                      <button
                        type="button"
                        onClick={handleAddLanguage}
                        className="inline-flex items-center justify-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 font-bold text-white hover:bg-blue-700"
                      >
                        <Plus className="h-3.5 w-3.5" /> Thêm ngoại ngữ
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="self-declared-check"
                        checked={newLangSelfDeclared}
                        onChange={e => setNewLangSelfDeclared(e.target.checked)}
                        className="h-4 w-4 text-blue-600 rounded"
                      />
                      <label htmlFor="self-declared-check" className="text-slate-600 cursor-pointer">
                        Cho phép đánh giá trình độ tự khai báo trên CV mà không bắt buộc phải có chứng chỉ giấy tờ
                      </label>
                    </div>
                  </div>

                  {/* Languages List */}
                  {Array.isArray(config.languages?.items) && config.languages.items.length > 0 && (
                    <div className="space-y-2">
                      {config.languages.items.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-2.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800">{item.language}</span>
                            {item.certificate && (
                              <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
                                Yêu cầu: {item.certificate}
                              </span>
                            )}
                            <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                              item.mode === 'REQUIRED' ? 'bg-rose-100 text-rose-800' : 'bg-blue-100 text-blue-800'
                            }`}>
                              {item.mode === 'REQUIRED' ? 'Bắt buộc' : 'Ưu tiên'}
                            </span>
                            {item.allowSelfDeclared && (
                              <span className="text-[11px] text-emerald-700 font-medium">✓ Chấp nhận tự khai</span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveLanguage(idx)}
                            className="p-1 text-slate-400 hover:text-rose-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 5. Location & Work Mode */}
            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
              <button
                type="button"
                onClick={() => setExpandedSection(expandedSection === 'location' ? '' : 'location')}
                className="w-full flex items-center justify-between p-3.5 text-left text-xs font-bold text-slate-900 hover:bg-slate-50"
              >
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-blue-600" />
                  <span>5. Địa điểm & Hình thức làm việc (Location & Work Mode)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-normal text-slate-500">Tỉnh/thành, Remote, Hybrid</span>
                  {expandedSection === 'location' ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                </div>
              </button>

              {expandedSection === 'location' && (
                <div className="border-t border-slate-100 p-4 space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-semibold text-slate-800">Tỉnh / Thành phố làm việc</label>
                        {renderModeSelector('locationWorkMode', 'city', config.locationWorkMode?.city?.mode || 'INFORMATIONAL')}
                      </div>
                      <input
                        type="text"
                        placeholder="Ví dụ: Đà Nẵng, Hà Nội..."
                        value={config.locationWorkMode?.city?.value || ''}
                        onChange={e => updateField('locationWorkMode', 'city', 'value', e.target.value)}
                        className="w-full rounded-lg border border-slate-200 px-3 py-1.5 focus:border-blue-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-semibold text-slate-800">Hình thức làm việc</label>
                        {renderModeSelector('locationWorkMode', 'workMode', config.locationWorkMode?.workMode?.mode || 'INFORMATIONAL')}
                      </div>
                      <select
                        value={config.locationWorkMode?.workMode?.value || 'ALL'}
                        onChange={e => updateField('locationWorkMode', 'workMode', 'value', e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 focus:border-blue-500 focus:outline-none"
                      >
                        <option value="ALL">Tất cả hình thức</option>
                        <option value="On-site">On-site (Tại công ty)</option>
                        <option value="Hybrid">Hybrid</option>
                        <option value="Remote">Remote</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 6. Expected Salary */}
            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
              <button
                type="button"
                onClick={() => setExpandedSection(expandedSection === 'salary' ? '' : 'salary')}
                className="w-full flex items-center justify-between p-3.5 text-left text-xs font-bold text-slate-900 hover:bg-slate-50"
              >
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-blue-600" />
                  <span>6. Mức lương kỳ vọng (Expected Salary - Không tự loại nếu thiếu thông tin)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-normal text-slate-500">Đối chiếu ngân sách JD</span>
                  {expandedSection === 'salary' ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                </div>
              </button>

              {expandedSection === 'salary' && (
                <div className="border-t border-slate-100 p-4 space-y-4 text-xs">
                  <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 text-amber-900 leading-relaxed">
                    💡 <strong>Cơ chế sàng lọc lương:</strong> Hệ thống đối chiếu kỳ vọng lương với khoảng lương tin tuyển dụng ({job?.SalaryRange || 'Thỏa thuận'}). Nếu ứng viên chưa ghi kỳ vọng lương, hệ thống hiển thị <strong>Chưa có dữ liệu</strong> để HR chủ động trao đổi khi phỏng vấn, tuyệt đối <strong>không tự động loại</strong> ứng viên.
                  </div>

                  <div>
                    <label className="font-semibold text-slate-800 block mb-1">Mức lương tối đa chấp nhận (VNĐ / tháng)</label>
                    <input
                      type="number"
                      placeholder="Ví dụ: 35000000 (35 triệu)"
                      value={config.expectedSalary?.maxExpected?.value || ''}
                      onChange={e => updateField('expectedSalary', 'maxExpected', 'value', e.target.value ? Number(e.target.value) : null)}
                      className="w-full max-w-sm rounded-lg border border-slate-200 px-3 py-1.5 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 7. Industry-Specific Requirements */}
            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
              <button
                type="button"
                onClick={() => setExpandedSection(expandedSection === 'industry' ? '' : 'industry')}
                className="w-full flex items-center justify-between p-3.5 text-left text-xs font-bold text-slate-900 hover:bg-slate-50"
              >
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-blue-600" />
                  <span>7. Yêu cầu đặc thù ngành (Industry-Specific Requirements)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-normal text-slate-500">Portfolio, GitHub, Giấy phép</span>
                  {expandedSection === 'industry' ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                </div>
              </button>

              {expandedSection === 'industry' && (
                <div className="border-t border-slate-100 p-4 space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                      <div>
                        <span className="font-semibold text-slate-800 block">Yêu cầu Portfolio / Sản phẩm</span>
                        <span className="text-[11px] text-slate-500">Dành cho Designer, Kiến trúc sư, Content</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {renderModeSelector('industrySpecific', 'portfolioRequired', config.industrySpecific?.portfolioRequired?.mode || 'INFORMATIONAL')}
                        <input
                          type="checkbox"
                          checked={Boolean(config.industrySpecific?.portfolioRequired?.value)}
                          onChange={e => updateField('industrySpecific', 'portfolioRequired', 'value', e.target.checked)}
                          className="h-4 w-4 text-blue-600 rounded"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                      <div>
                        <span className="font-semibold text-slate-800 block">Yêu cầu GitHub / Open Source</span>
                        <span className="text-[11px] text-slate-500">Dành cho Lập trình viên, DevOps, Tech Lead</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {renderModeSelector('industrySpecific', 'githubRequired', config.industrySpecific?.githubRequired?.mode || 'INFORMATIONAL')}
                        <input
                          type="checkbox"
                          checked={Boolean(config.industrySpecific?.githubRequired?.value)}
                          onChange={e => updateField('industrySpecific', 'githubRequired', 'value', e.target.checked)}
                          className="h-4 w-4 text-blue-600 rounded"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 8. Employment History Insights (Strictly Informational) */}
            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
              <button
                type="button"
                onClick={() => setExpandedSection(expandedSection === 'history' ? '' : 'history')}
                className="w-full flex items-center justify-between p-3.5 text-left text-xs font-bold text-slate-900 hover:bg-slate-50"
              >
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-600" />
                  <span>8. Lịch sử công tác (Employment Insights - Chỉ tham khảo, không trừ điểm)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-normal text-slate-500">Thời gian làm việc, chuyển việc</span>
                  {expandedSection === 'history' ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                </div>
              </button>

              {expandedSection === 'history' && (
                <div className="border-t border-slate-100 p-4 space-y-4 text-xs">
                  <p className="text-slate-500 italic">
                    * Các chỉ số lịch sử làm việc chỉ mang tính tham khảo khi phỏng vấn, không tự động loại hồ sơ.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Save & Apply Toolbar */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              className="text-xs font-medium text-slate-500 hover:text-slate-700"
            >
              Thu gọn bảng cấu hình
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={savingJobConfig || loading}
                onClick={handleSaveToJob}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-2xs hover:bg-blue-700 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {savingJobConfig ? 'Đang lưu cấu hình...' : 'Lưu cấu hình sàng lọc'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save Filter Template Modal */}
      {showTemplateModal && (
        <SaveFilterTemplateModal
          isOpen
          config={{ ...config, weights }}
          onClose={() => setShowTemplateModal(false)}
          onSaved={(newTmpl) => {
            fetchTemplates();
            setSelectedTemplateId(newTmpl.TemplateID);
            setTemplateNotice(`Đã lưu thành công mẫu "${newTmpl.TemplateName}".`);
          }}
        />
      )}
    </div>
  );
}

