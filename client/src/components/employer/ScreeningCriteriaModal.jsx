import React, { useState, useEffect } from 'react';
import { X, Sliders, Check, Plus, Trash2, HelpCircle } from 'lucide-react';
import api from '../../services/api';

const SCREENING_LEVELS = [
  {
    key: 'Relaxed',
    name: 'Nới lỏng',
    threshold: 50,
    desc: 'Ngưỡng 50%. Sàng lọc mở rộng, không bắt buộc chặt chẽ kỹ năng bắt buộc.'
  },
  {
    key: 'Balanced',
    name: 'Cân bằng',
    threshold: 70,
    desc: 'Ngưỡng 70%. Kỹ năng bắt buộc có trọng số cao; thiếu kỹ năng bắt buộc chuyển sang Cần xem thêm.'
  },
  {
    key: 'Strict',
    name: 'Nghiêm ngặt',
    threshold: 85,
    desc: 'Ngưỡng 85%. Tiêu chuẩn chọn lọc cao, chỉ những hồ sơ thực sự vượt trội mới Đạt.'
  }
];

export default function ScreeningCriteriaModal({ isOpen, onClose, job, onSaved }) {
  const [level, setLevel] = useState('Balanced');
  const [minGpa, setMinGpa] = useState('');
  const [gpaScale, setGpaScale] = useState(4);
  const [mandatoryCertificates, setMandatoryCertificates] = useState([]);
  const [certInput, setCertInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (job?.screeningCriteria) {
      const c = job.screeningCriteria;
      setLevel(c.ScreeningLevel || 'Balanced');
      setMinGpa(c.MinGPA != null ? String(c.MinGPA) : '');
      setGpaScale(c.GPAScale === 10 ? 10 : 4);
      setMandatoryCertificates(Array.isArray(c.MandatoryCertificates) ? c.MandatoryCertificates : []);
    }
  }, [job]);

  if (!isOpen) return null;

  const handleAddCert = () => {
    const val = certInput.trim();
    if (val && !mandatoryCertificates.some(c => c.toLowerCase() === val.toLowerCase())) {
      setMandatoryCertificates([...mandatoryCertificates, val]);
      setCertInput('');
    }
  };

  const handleRemoveCert = (index) => {
    setMandatoryCertificates(mandatoryCertificates.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      if (!job?.JobID) throw new Error('Không tìm thấy thông tin tin tuyển dụng.');
      const payload = {
        title: job.Title || '',
        categoryId: job.CategoryID || null,
        description: job.Description || '',
        requirements: job.Requirements || '',
        salaryRange: job.SalaryRange || '',
        location: job.Location || '',
        skills: job.skills || [],
        screeningLevel: level,
        minGpa: minGpa.trim() ? parseFloat(minGpa) : null,
        gpaScale: minGpa.trim() ? Number(gpaScale) : null,
        mandatoryCertificates
      };

      const res = await api.put(`/employer/jobs/${job.JobID}`, payload);
      if (res.data?.success) {
        onSaved?.();
        onClose();
      } else {
        throw new Error(res.data?.message || 'Không thể lưu tiêu chí.');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Lỗi lưu tiêu chí.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-xl rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
              <Sliders className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Thiết lập tiêu chí sàng lọc</h2>
              <p className="text-xs text-slate-500">{job?.Title}</p>
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

        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-200">
              {error}
            </div>
          )}

          {/* Screening Level Selection */}
          <div>
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 block">
              Mức độ sàng lọc hồ sơ
            </label>
            <div className="grid gap-2.5 sm:grid-cols-3">
              {SCREENING_LEVELS.map(item => {
                const isSelected = level === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setLevel(item.key)}
                    className={`flex flex-col text-left rounded-xl border p-3 transition-all ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-600/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">{item.name}</span>
                      <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-700">
                        {item.threshold}%
                      </span>
                    </div>
                    <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500">{item.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Min GPA */}
          <div className="border-t border-slate-100 pt-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                GPA tối thiểu <span className="font-normal text-slate-400">(Không bắt buộc)</span>
              </label>
              <span className="text-[11px] text-slate-400">Dưới ngưỡng: Chưa đạt · Không có GPA: Cần xem thêm</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max={gpaScale === 10 ? 10 : 4}
                  placeholder={`Ví dụ: ${gpaScale === 10 ? '7.5' : '3.0'}`}
                  value={minGpa}
                  onChange={e => setMinGpa(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={gpaScale}
                  onChange={e => setGpaScale(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs bg-white focus:border-blue-500 focus:outline-none"
                >
                  <option value={4}>Thang điểm 4.0</option>
                  <option value={10}>Thang điểm 10.0</option>
                </select>
              </div>
            </div>
          </div>

          {/* Mandatory Certificates */}
          <div className="border-t border-slate-100 pt-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Chứng chỉ bắt buộc <span className="font-normal text-slate-400">(Tất cả đều bắt buộc)</span>
              </label>
              <span className="text-[11px] text-slate-400">Không phân biệt hoa thường</span>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Ví dụ: AWS Certified, IELTS 6.5, PMP..."
                value={certInput}
                onChange={e => setCertInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddCert(); } }}
                className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleAddCert}
                className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
              >
                <Plus className="h-3.5 w-3.5" /> Thêm
              </button>
            </div>

            {mandatoryCertificates.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {mandatoryCertificates.map((cert, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700"
                  >
                    {cert}
                    <button
                      type="button"
                      onClick={() => handleRemoveCert(idx)}
                      className="text-slate-400 hover:text-red-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4 bg-slate-50 rounded-b-2xl">
          <p className="text-[11px] text-slate-500">
            Hồ sơ cũ sẽ được tính toán lại trong hàng đợi nền sau khi lưu.
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-lg bg-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-300"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Đang lưu...' : 'Lưu tiêu chí'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

