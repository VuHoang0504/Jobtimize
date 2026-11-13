import React, { useState } from 'react';
import { X, Bookmark, Check, Save } from 'lucide-react';
import api from '../../services/api';

export default function SaveFilterTemplateModal({
  isOpen,
  onClose,
  config,
  onSaved
}) {
  const [templateName, setTemplateName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSave = async (e) => {
    e.preventDefault();
    if (!templateName.trim()) {
      setError('Vui lòng nhập tên mẫu bộ lọc.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const res = await api.post('/employer/screening-templates', {
        templateName: templateName.trim(),
        description: description.trim(),
        config: config || {}
      });

      if (res.data?.success) {
        onSaved?.(res.data.data);
        onClose();
      } else {
        throw new Error(res.data?.message || 'Không thể lưu mẫu bộ lọc.');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Lỗi lưu mẫu bộ lọc.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
              <Bookmark className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Lưu mẫu bộ lọc tuyển dụng</h2>
              <p className="text-xs text-slate-500">Tái sử dụng cho các tin tuyển dụng sau</p>
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

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 space-y-4">
          {error && (
            <div className="rounded-lg bg-rose-50 p-3 text-xs text-rose-700 border border-rose-200">
              {error}
            </div>
          )}

          <div>
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-1">
              Tên mẫu bộ lọc <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Ví dụ: Lọc Senior React/Node.js, Lọc QA Tester..."
              value={templateName}
              onChange={e => setTemplateName(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-1">
              Mô tả ngắn <span className="text-slate-400 font-normal">(Tùy chọn)</span>
            </label>
            <textarea
              rows={3}
              placeholder="Ghi chú về nhóm đối tượng áp dụng hoặc mục tiêu của mẫu..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="rounded-lg bg-slate-50 p-3 text-[11px] text-slate-600 border border-slate-200/60 space-y-1">
            <span className="font-bold text-slate-700 block">Cấu hình sẽ được lưu trữ:</span>
            <p>• Trọng số các nhóm tiêu chí (Kinh nghiệm, Kỹ năng, Dự án, Học vấn...)</p>
            <p>• Chế độ tiêu chí (Bắt buộc, Ưu tiên, Tham khảo)</p>
            <p>• Ngưỡng điểm và tiêu chuẩn ngôn ngữ, ngoại ngữ</p>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-lg bg-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-300"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              <Save className="h-3.5 w-3.5" />
              {saving ? 'Đang lưu...' : 'Lưu mẫu'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

