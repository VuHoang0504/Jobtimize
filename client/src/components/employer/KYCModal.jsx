import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { 
  ShieldCheck, 
  UploadCloud, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  X, 
  Building2, 
  Sparkles,
  ExternalLink
} from 'lucide-react';

export default function KYCModal({ isOpen, onClose, onKycUpdated, initialStatus = 'Pending' }) {
  const [taxCode, setTaxCode] = useState('');
  const [businessLicenseFile, setBusinessLicenseFile] = useState(null);
  const [taxCertificateFile, setTaxCertificateFile] = useState(null);
  const [currentKyc, setCurrentKyc] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fetchKycStatus = async () => {
    try {
      setLoading(true);
      const res = await api.get('/employer/kyc-status');
      if (res.data.success) {
        setCurrentKyc(res.data.data);
        if (res.data.data.document?.TaxCode) {
          setTaxCode(res.data.data.document.TaxCode);
        }
      }
    } catch (err) {
      console.error('Fetch KYC error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setError('');
      setSuccessMsg('');
      fetchKycStatus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    const taxCodeClean = taxCode.trim();
    if (!taxCodeClean) {
      setError('Vui lòng nhập Mã số thuế doanh nghiệp.');
      return;
    }

    if (!/^[0-9]{10}(-[0-9]{3})?$/.test(taxCodeClean)) {
      setError('Mã số thuế không đúng định dạng. Vui lòng nhập 10 chữ số (hoặc 13 chữ số dạng xxxxxxxxxx-xxx).');
      return;
    }

    if (!businessLicenseFile && !currentKyc?.document?.BusinessLicenseUrl) {
      setError('Vui lòng tải lên file Giấy phép kinh doanh (PDF, JPG, PNG).');
      return;
    }

    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append('taxCode', taxCode.trim());
      if (businessLicenseFile) {
        formData.append('businessLicense', businessLicenseFile);
      }
      if (taxCertificateFile) {
        formData.append('taxCertificate', taxCertificateFile);
      }

      const res = await api.post('/employer/kyc', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data.success) {
        setSuccessMsg('Nộp hồ sơ pháp lý thành công! Hồ sơ đang được kiểm duyệt.');
        await fetchKycStatus();
        if (onKycUpdated) onKycUpdated('Pending');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Có lỗi xảy ra khi nộp hồ sơ KYC.');
    } finally {
      setSubmitting(false);
    }
  };


  const status = currentKyc?.kycStatus || initialStatus;
  const doc = currentKyc?.document;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shadow-xs">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
                Xác Thực Doanh Nghiệp (KYC)
                {status === 'Approved' && (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Đã xác thực
                  </span>
                )}
              </h2>
              <p className="text-xs text-gray-500">
                Nộp hồ sơ pháp lý để nhận huy hiệu tích xanh uy tín thu hút ứng viên chất lượng cao (UC-E04).
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

        {/* Current Status Banner */}
        <div className={`p-4 rounded-2xl border flex items-start gap-3.5 ${
          status === 'Approved' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
            : status === 'Rejected'
            ? 'bg-rose-50 border-rose-200 text-rose-900'
            : 'bg-amber-50 border-amber-200 text-amber-900'
        }`}>
          {status === 'Approved' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : status === 'Rejected' ? (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          ) : (
            <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          )}
          <div className="space-y-1 text-xs">
            <p className="font-bold">
              {status === 'Approved' && '✓ Doanh nghiệp đã được xác thực thành công!'}
              {status === 'Rejected' && '✕ Hồ sơ pháp lý đã bị từ chối'}
              {status === 'Pending' && '⏳ Hồ sơ KYC đang chờ kiểm duyệt'}
            </p>
            <p className="text-gray-600 leading-relaxed">
              {status === 'Approved' && 'Huy hiệu "Doanh nghiệp đã xác thực" đang hiển thị trên trang chủ, bảng tin và chi tiết tin tuyển dụng của công ty.'}
              {status === 'Rejected' && (doc?.RejectionReason || 'Vui lòng kiểm tra lại ảnh chụp rõ nét Giấy phép kinh doanh và mã số thuế đúng với cơ quan nhà nước.')}
              {status === 'Pending' && 'Hồ sơ pháp lý đang được Ban Quản trị Jobtimize đối chiếu thông tin trên Cổng Đăng ký Doanh nghiệp Quốc gia.'}
            </p>
            {doc?.SubmittedAt && (
              <p className="text-[11px] text-gray-500 pt-1">
                Lần nộp gần nhất: {new Date(doc.SubmittedAt).toLocaleString('vi-VN')}
              </p>
            )}
          </div>
        </div>

        {/* Feedback messages */}
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

        {/* KYC Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
              Mã số thuế doanh nghiệp (MST) *
            </label>
            <input
              type="text"
              required
              value={taxCode}
              onChange={(e) => setTaxCode(e.target.value)}
              placeholder="Ví dụ: 0101248141"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Business License Upload */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                Giấy phép kinh doanh (ĐKKD) *
              </label>
              <div className="border-2 border-dashed border-gray-200 hover:border-emerald-500 rounded-2xl p-4 text-center transition-colors bg-gray-50/50 cursor-pointer relative">
                <input
                  type="file"
                  accept=".pdf,image/png,image/jpeg,image/webp"
                  onChange={(e) => setBusinessLicenseFile(e.target.files[0] || null)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <UploadCloud className="w-6 h-6 text-gray-400 mx-auto mb-1.5" />
                <p className="text-xs font-bold text-gray-700 truncate">
                  {businessLicenseFile ? businessLicenseFile.name : 'Tải lên Giấy phép (PDF/Ảnh)'}
                </p>
                <p className="text-[10px] text-gray-400 mt-0.5">Tối đa 10MB (PDF, PNG, JPG)</p>
              </div>
              {doc?.BusinessLicenseUrl && !businessLicenseFile && (
                <a
                  href={doc.BusinessLicenseUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 hover:underline"
                >
                  <FileText className="w-3 h-3" /> Xem file đã nộp <ExternalLink className="w-2.5 h-2.5" />
                </a>
              )}
            </div>

            {/* Tax Certificate Upload */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                Giấy nộp thuế / Đăng ký thuế (Tùy chọn)
              </label>
              <div className="border-2 border-dashed border-gray-200 hover:border-emerald-500 rounded-2xl p-4 text-center transition-colors bg-gray-50/50 cursor-pointer relative">
                <input
                  type="file"
                  accept=".pdf,image/png,image/jpeg,image/webp"
                  onChange={(e) => setTaxCertificateFile(e.target.files[0] || null)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <UploadCloud className="w-6 h-6 text-gray-400 mx-auto mb-1.5" />
                <p className="text-xs font-bold text-gray-700 truncate">
                  {taxCertificateFile ? taxCertificateFile.name : 'Tải lên Giấy tờ bổ sung'}
                </p>
                <p className="text-[10px] text-gray-400 mt-0.5">Tối đa 10MB</p>
              </div>
              {doc?.TaxCertificateUrl && !taxCertificateFile && (
                <a
                  href={doc.TaxCertificateUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 hover:underline"
                >
                  <FileText className="w-3 h-3" /> Xem file đã nộp <ExternalLink className="w-2.5 h-2.5" />
                </a>
              )}
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between border-t border-gray-100">
            {/* Admin Verification Notice */}
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Hồ sơ được Ban Quản trị Jobtimize xác thực độc lập</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl"
              >
                Đóng
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 disabled:opacity-50 transition-colors"
              >
                {submitting ? 'Đang lưu...' : 'Nộp hồ sơ pháp lý'}
              </button>
            </div>
          </div>
        </form>

      </div>
    </div>
  );
}

