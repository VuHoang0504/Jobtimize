import React, { useState, useEffect } from 'react';
import {
  X, Zap, ShieldCheck, Crown, CheckCircle2, AlertCircle,
  Calendar, Layers, Search, FileText, Check, HelpCircle
} from 'lucide-react';
import api from '../../services/api';

const DURATION_OPTIONS = [
  { label: 'Mặc định theo gói', value: 'default' },
  { label: '30 ngày (1 tháng)', value: '30' },
  { label: '60 ngày (2 tháng)', value: '60' },
  { label: '90 ngày (1 quý)', value: '90' },
  { label: '180 ngày (6 tháng)', value: '180' },
  { label: '365 ngày (1 năm)', value: '365' },
  { label: 'Tùy chỉnh số ngày', value: 'custom' }
];

export default function AdminUnlockPackageModal({
  isOpen,
  onClose,
  employer,
  onSuccess
}) {
  const [packages, setPackages] = useState([]);
  const [loadingPackages, setLoadingPackages] = useState(true);
  const [selectedPackageId, setSelectedPackageId] = useState('');
  const [durationPreset, setDurationPreset] = useState('default');
  const [customDays, setCustomDays] = useState('30');
  const [customPosts, setCustomPosts] = useState('');
  const [customSearches, setCustomSearches] = useState('');
  const [adminNote, setAdminNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Fetch available packages
  useEffect(() => {
    if (!isOpen) return;
    const fetchPkgs = async () => {
      setLoadingPackages(true);
      setError('');
      try {
        const res = await api.get('/admin/subscription-packages');
        if (res.data?.success && Array.isArray(res.data.data)) {
          setPackages(res.data.data);
          // Default to first paid package or package with ID 2 / 3
          const defaultPkg = res.data.data.find(p => p.Price > 0) || res.data.data[0];
          if (defaultPkg) {
            setSelectedPackageId(String(defaultPkg.PackageID));
            setCustomPosts(String(defaultPkg.PostLimit));
            setCustomSearches(String(defaultPkg.SearchLimit));
          }
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Không thể tải danh sách gói dịch vụ');
      } finally {
        setLoadingPackages(false);
      }
    };
    fetchPkgs();
  }, [isOpen]);

  // Update post/search defaults when package selection changes
  const handlePackageChange = (e) => {
    const pkgId = e.target.value;
    setSelectedPackageId(pkgId);
    const pkg = packages.find(p => String(p.PackageID) === String(pkgId));
    if (pkg) {
      setCustomPosts(String(pkg.PostLimit));
      setCustomSearches(String(pkg.SearchLimit));
      if (durationPreset === 'default') {
        setCustomDays(String(pkg.DurationDays || 30));
      }
    }
  };

  const selectedPkg = packages.find(p => String(p.PackageID) === String(selectedPackageId));

  const effectiveDays = durationPreset === 'default'
    ? (selectedPkg?.DurationDays || 30)
    : durationPreset === 'custom'
    ? Number(customDays) || 30
    : Number(durationPreset);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPackageId) {
      setError('Vui lòng chọn gói dịch vụ cần mở khóa.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const payload = {
        packageId: Number(selectedPackageId),
        durationDays: effectiveDays,
        posts: customPosts !== '' ? Number(customPosts) : selectedPkg?.PostLimit,
        searches: customSearches !== '' ? Number(customSearches) : selectedPkg?.SearchLimit,
        note: adminNote.trim() || 'Admin mở khóa gói trực tiếp'
      };

      const res = await api.post(`/admin/employers/${employer.EmployerID}/unlock-package`, payload);
      if (res.data?.success) {
        onSuccess?.(res.data.data);
        onClose();
      } else {
        throw new Error(res.data?.message || 'Không thể mở khóa gói');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Lỗi khi mở khóa gói');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen || !employer) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-xl rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-gradient-to-r from-purple-50 to-indigo-50">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-600 text-white shadow-sm">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                Mở khóa gói dịch vụ tuyển dụng
                <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-800">
                  Admin Action
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Cấp quyền trực tiếp cho: <strong className="text-slate-800">{employer.CompanyName}</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-white hover:text-slate-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content / Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
          {error && (
            <div className="rounded-xl bg-rose-50 p-3 text-rose-700 border border-rose-200 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Current Status Info */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-medium text-slate-500 block">Tài khoản & Người đại diện:</span>
              <span className="font-bold text-slate-800">{employer.FullName}</span> &bull; <span className="text-slate-600">{employer.Email}</span>
            </div>
            {employer.CurrentPackageName && (
              <span className="rounded-lg bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 text-[11px]">
                {employer.CurrentPackageName}
              </span>
            )}
          </div>

          {/* Package Selection */}
          <div>
            <label className="font-bold text-slate-800 uppercase tracking-wider block mb-1.5">
              Chọn gói dịch vụ muốn cấp <span className="text-rose-500">*</span>
            </label>
            {loadingPackages ? (
              <div className="py-4 text-center text-slate-400">Đang tải gói dịch vụ...</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {packages.map(pkg => {
                  const isSelected = String(pkg.PackageID) === String(selectedPackageId);
                  const isPaid = pkg.Price > 0;
                  return (
                    <label
                      key={pkg.PackageID}
                      className={`flex flex-col p-3 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'border-purple-600 bg-purple-50/60 ring-2 ring-purple-600/20'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="radio"
                            name="selectedPackage"
                            value={pkg.PackageID}
                            checked={isSelected}
                            onChange={handlePackageChange}
                            className="text-purple-600 focus:ring-purple-500"
                          />
                          <span className="font-bold text-slate-900">{pkg.PackageName}</span>
                        </div>
                        {isPaid && (
                          <span className="rounded bg-purple-100 text-purple-700 px-1.5 py-0.5 text-[10px] font-extrabold">
                            Trả phí
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 space-y-0.5 pl-5">
                        <p>• {pkg.PostLimit} tin đăng &bull; {pkg.SearchLimit} lượt tìm CV</p>
                        <p>• Thời hạn mặc định: {pkg.DurationDays} ngày</p>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* Duration Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
            <div>
              <label className="font-bold text-slate-800 uppercase tracking-wider block mb-1">
                Thời hạn kích hoạt
              </label>
              <select
                value={durationPreset}
                onChange={e => setDurationPreset(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs focus:border-purple-500 focus:outline-none"
              >
                {DURATION_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {durationPreset === 'custom' && (
              <div>
                <label className="font-bold text-slate-800 uppercase tracking-wider block mb-1">
                  Số ngày cụ thể
                </label>
                <input
                  type="number"
                  min="1"
                  max="3650"
                  value={customDays}
                  onChange={e => setCustomDays(e.target.value)}
                  placeholder="Ví dụ: 45"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-purple-500 focus:outline-none"
                />
              </div>
            )}
          </div>

          {/* Quota Limits Customization */}
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
            <div>
              <label className="font-bold text-slate-800 block mb-1">
                Số tin tuyển dụng (Post Limit)
              </label>
              <input
                type="number"
                min="0"
                value={customPosts}
                onChange={e => setCustomPosts(e.target.value)}
                placeholder="Theo gói"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-purple-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="font-bold text-slate-800 block mb-1">
                Lượt tìm kiếm CV (Search Limit)
              </label>
              <input
                type="number"
                min="0"
                value={customSearches}
                onChange={e => setCustomSearches(e.target.value)}
                placeholder="Theo gói"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-purple-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Admin Note */}
          <div className="pt-2 border-t border-slate-100">
            <label className="font-bold text-slate-800 uppercase tracking-wider block mb-1">
              Lý do / Ghi chú cấp quyền <span className="text-slate-400 font-normal">(Lưu lịch sử hệ thống)</span>
            </label>
            <input
              type="text"
              placeholder="Ví dụ: Tài khoản đối tác chiến lược KMS, Demo tuyển dụng, Hợp đồng offline..."
              value={adminNote}
              onChange={e => setAdminNote(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-purple-500 focus:outline-none"
            />
          </div>

          {/* Feature Unlock Highlights */}
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 space-y-1.5 text-[11px] text-emerald-900">
            <span className="font-bold flex items-center gap-1 text-emerald-800">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              Doanh nghiệp sẽ được mở khóa ngay lập tức:
            </span>
            <p>✓ Mở khóa toàn bộ hệ thống Sàng lọc linh hoạt & Xếp loại ứng viên (Đạt / Cần xem thêm / Chưa đạt).</p>
            <p>✓ Không cần qua thanh toán PayOS / VNPay / MoMo trên màn hình doanh nghiệp.</p>
            <p>✓ Tự động gửi thông báo hệ thống thông báo kích hoạt thành công tới tài khoản doanh nghiệp.</p>
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-lg bg-slate-200 px-3.5 py-1.5 font-semibold text-slate-700 hover:bg-slate-300"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting || !selectedPackageId}
              className="inline-flex items-center gap-1.5 rounded-lg bg-purple-600 px-4 py-1.5 font-bold text-white shadow-sm hover:bg-purple-700 disabled:opacity-50"
            >
              <Zap className="h-4 w-4" />
              {submitting ? 'Đang kích hoạt...' : 'Xác nhận mở khóa gói'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

