import React, { useState, useEffect } from 'react';
import { Bell, X, DollarSign, MapPin, Briefcase, Clock, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import api from '../../services/api';

const PROVINCES = [
  'Toàn quốc',
  'Hà Nội',
  'TP. Hồ Chí Minh',
  'Đà Nẵng',
  'Cần Thơ',
  'Hải Phòng',
  'Bình Dương',
  'Đồng Nai',
  'Remote / Từ xa'
];

export default function JobAlertModal({ isOpen, onClose, onSaved, initialAlert = null }) {
  const [keywords, setKeywords] = useState('');
  const [minSalary, setMinSalary] = useState('');
  const [location, setLocation] = useState('Toàn quốc');
  const [categoryId, setCategoryId] = useState('');
  const [frequency, setFrequency] = useState('Daily');
  const [isActive, setIsActive] = useState(true);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Fetch categories
    const fetchCategories = async () => {
      try {
        const res = await api.get('/categories');
        if (res.data.success) {
          setCategories(res.data.data);
        }
      } catch (err) {
        console.error('Fetch categories error:', err);
      }
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    if (initialAlert) {
      setKeywords(initialAlert.Keywords || '');
      setMinSalary(initialAlert.MinSalary ? initialAlert.MinSalary.toString() : '');
      setLocation(initialAlert.Location || 'Toàn quốc');
      setCategoryId(initialAlert.CategoryID ? initialAlert.CategoryID.toString() : '');
      setFrequency(initialAlert.Frequency || 'Daily');
      setIsActive(initialAlert.IsActive !== undefined ? !!initialAlert.IsActive : true);
    } else {
      setKeywords('');
      setMinSalary('');
      setLocation('Toàn quốc');
      setCategoryId('');
      setFrequency('Daily');
      setIsActive(true);
    }
    setError('');
  }, [initialAlert, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!keywords.trim()) {
      setError('Vui lòng nhập vị trí hoặc từ khóa công việc mong muốn');
      return;
    }

    setLoading(true);
    setError('');

    const payload = {
      keywords: keywords.trim(),
      minSalary: minSalary ? parseFloat(minSalary) : null,
      location: location === 'Toàn quốc' ? null : location,
      categoryId: categoryId ? parseInt(categoryId, 10) : null,
      frequency,
      isActive
    };

    try {
      if (initialAlert && initialAlert.AlertID) {
        await api.put(`/candidate/job-alerts/${initialAlert.AlertID}`, payload);
      } else {
        await api.post('/candidate/job-alerts', payload);
      }
      onSaved?.();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Có lỗi xảy ra khi lưu thông báo việc làm');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in duration-150">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-brand-blue to-indigo-600 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
          
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center shadow-inner">
              <Bell className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-black tracking-tight">
                {initialAlert ? 'Chỉnh Sửa Thông Báo Việc Làm' : 'Thiết Lập Thông Báo Việc Làm (Job Alert)'}
              </h3>
              <p className="text-xs text-blue-100 mt-0.5">
                Nhận cơ hội việc làm phù hợp nhất theo đúng tiêu chí của bạn
              </p>
            </div>
          </div>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Keywords / Desired Position */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-700 uppercase">
              Vị trí / Kỹ năng mong muốn <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Briefcase className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="VD: React Developer, Kế toán, Marketing..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20 text-sm font-medium text-gray-800 transition-all"
                required
              />
            </div>
            <p className="text-[11px] text-gray-400">
              Hệ thống sẽ tìm các tin tuyển dụng có tiêu đề hoặc mô tả chứa từ khóa này.
            </p>
          </div>

          {/* Min Salary & Location */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700 uppercase">
                Mức lương tối thiểu (VNĐ)
              </label>
              <div className="relative">
                <DollarSign className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
                <input
                  type="number"
                  value={minSalary}
                  onChange={(e) => setMinSalary(e.target.value)}
                  placeholder="VD: 15000000"
                  step="500000"
                  min="0"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20 text-sm font-medium text-gray-800 transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700 uppercase">
                Tỉnh / Thành phố
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
                <select
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20 text-sm font-medium text-gray-800 transition-all bg-white"
                >
                  {PROVINCES.map((prov) => (
                    <option key={prov} value={prov}>{prov}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-700 uppercase">
              Ngành nghề / Lĩnh vực
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20 text-sm font-medium text-gray-800 transition-all bg-white"
            >
              <option value="">Tất cả ngành nghề</option>
              {categories.map((cat) => (
                <option key={cat.CategoryID} value={cat.CategoryID}>
                  {cat.CategoryName}
                </option>
              ))}
            </select>
          </div>

          {/* Frequency & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700 uppercase">
                Tần suất nhận thông báo
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setFrequency('Daily')}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                    frequency === 'Daily'
                      ? 'bg-brand-blue text-white border-brand-blue shadow-sm'
                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  Hàng ngày
                </button>
                <button
                  type="button"
                  onClick={() => setFrequency('Weekly')}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                    frequency === 'Weekly'
                      ? 'bg-brand-blue text-white border-brand-blue shadow-sm'
                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  Hàng tuần
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700 uppercase">
                Trạng thái kích hoạt
              </label>
              <button
                type="button"
                onClick={() => setIsActive(!isActive)}
                className={`w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                    : 'bg-gray-100 text-gray-500 border-gray-300'
                }`}
              >
                <CheckCircle2 className={`w-4 h-4 ${isActive ? 'text-emerald-600' : 'text-gray-400'}`} />
                <span>{isActive ? 'Đang bật nhận tin' : 'Tạm dừng thông báo'}</span>
              </button>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-bold text-xs hover:bg-gray-50 transition-colors"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-brand-blue hover:bg-brand-dark text-white font-bold text-xs shadow-md shadow-brand-blue/20 hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-60"
            >
              <Sparkles className="w-4 h-4" />
              <span>{loading ? 'Đang lưu...' : (initialAlert ? 'Lưu cập nhật' : 'Tạo thông báo việc làm')}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
