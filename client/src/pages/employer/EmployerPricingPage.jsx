import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import { 
  CreditCard, 
  Check, 
  Zap, 
  ShieldCheck, 
  Sparkles, 
  Clock, 
  Layers, 
  Search, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  Copy, 
  ExternalLink, 
  QrCode,
  History,
  Building2,
  UploadCloud,
  Image as ImageIcon,
  FileText,
  ArrowLeft,
  Trash2,
  Eye,
  X
} from 'lucide-react';

export default function EmployerPricingPage() {
  const [searchParams] = useSearchParams();
  const [packages, setPackages] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  // Checkout modal
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('PayOS');
  const [checkoutData, setCheckoutData] = useState(null);
  const [checkingOut, setCheckingOut] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [copiedField, setCopiedField] = useState('');
  const [checkoutStep, setCheckoutStep] = useState('qr'); // 'qr' | 'upload_receipt'
  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptPreview, setReceiptPreview] = useState(null);
  const [receiptNote, setReceiptNote] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isPaidSuccess, setIsPaidSuccess] = useState(false);
  const [paidSuccessData, setPaidSuccessData] = useState(null);
  const [switching, setSwitching] = useState(false);

  const handleSwitchActivePackage = async (pack) => {
    try {
      setSwitching(true);
      setError('');
      setSuccessMsg('');
      const res = await api.post('/employer/subscription/switch', { packageId: pack.PackageID });
      if (res.data.success) {
        setSuccessMsg(res.data.message || `Đã chuyển sang ${pack.PackageName}!`);
        await fetchData();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể chuyển đổi gói dịch vụ.');
    } finally {
      setSwitching(false);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [packRes, subRes, histRes] = await Promise.all([
        api.get('/employer/packages'),
        api.get('/employer/subscription'),
        api.get('/employer/payment/history')
      ]);

      if (packRes.data.success) setPackages(packRes.data.data);
      if (subRes.data.success) setSubscription(subRes.data.data);
      if (histRes.data.success) setHistory(histRes.data.data);
    } catch (err) {
      console.error('Fetch pricing error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Polling for PayOS payment confirmation
  useEffect(() => {
    let interval = null;
    if (checkoutModalOpen && paymentMethod === 'PayOS' && checkoutData?.orderCode && !isPaidSuccess) {
      interval = setInterval(async () => {
        try {
          const res = await api.get(`/payments/${checkoutData.orderCode}/status`);
          if (res.data?.success && res.data.data?.isSuccess) {
            setIsPaidSuccess(true);
            setPaidSuccessData(res.data.data);
            setSuccessMsg(`Thanh toán thành công! Gói ${res.data.data.packageName} đã được kích hoạt tự động.`);
            await fetchData();
            clearInterval(interval);
          }
        } catch (err) {
          // Silent polling error
        }
      }, 2500);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [checkoutModalOpen, paymentMethod, checkoutData?.orderCode, isPaidSuccess]);

  // Handle initiate purchase
  const handleOpenCheckout = async (pack) => {
    setSelectedPackage(pack);
    setError('');
    setSuccessMsg('');
    setCheckoutData(null);
    setIsPaidSuccess(false);
    setPaidSuccessData(null);
    setCheckoutStep('qr');
    setReceiptFile(null);
    setReceiptPreview(null);
    setReceiptNote('');
    setCheckoutModalOpen(true);

    try {
      setCheckingOut(true);
      let res;
      if (paymentMethod === 'PayOS') {
        res = await api.post('/payments/create', { packageId: pack.PackageID });
      } else {
        res = await api.post('/employer/checkout', {
          packageId: pack.PackageID,
          paymentMethod
        });
      }

      if (res.data.success) {
        if (res.data.directSuccess) {
          setIsPaidSuccess(true);
          setPaidSuccessData(res.data.data);
          setSuccessMsg(res.data.message);
          await fetchData();
        } else {
          setCheckoutData(res.data.data);
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Có lỗi khi khởi tạo thanh toán');
    } finally {
      setCheckingOut(false);
    }
  };

  // Switch payment method in modal
  const handleSwitchMethod = async (newMethod) => {
    setPaymentMethod(newMethod);
    if (!selectedPackage) return;

    try {
      setCheckingOut(true);
      setError('');
      let res;
      if (newMethod === 'PayOS') {
        res = await api.post('/payments/create', { packageId: selectedPackage.PackageID });
      } else {
        res = await api.post('/employer/checkout', {
          packageId: selectedPackage.PackageID,
          paymentMethod: newMethod
        });
      }

      if (res.data.success) {
        if (res.data.directSuccess) {
          setIsPaidSuccess(true);
          setPaidSuccessData(res.data.data);
          setSuccessMsg(res.data.message);
          await fetchData();
        } else {
          setCheckoutData(res.data.data);
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Lỗi chuyển phương thức thanh toán');
    } finally {
      setCheckingOut(false);
    }
  };

  // Confirm payment completion (with optional uploaded receipt bill)
  const handleConfirmPayment = async (skipReceipt = false) => {
    if (!checkoutData?.transactionRef) return;

    try {
      setConfirming(true);
      setError('');

      const formData = new FormData();
      formData.append('transactionRef', checkoutData.transactionRef);
      formData.append('gatewayTransactionNo', paymentMethod === 'VNPay' ? 'VNPAY_SANDBOX_' + Date.now() : 'MB_VIETQR_' + Date.now());
      if (!skipReceipt && receiptFile) {
        formData.append('receiptImage', receiptFile);
      }
      if (!skipReceipt && receiptNote.trim()) {
        formData.append('note', receiptNote.trim());
      }

      const res = await api.post('/employer/payment/confirm', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data.success) {
        setSuccessMsg(res.data.message);
        await fetchData();
        setTimeout(() => {
          setCheckoutModalOpen(false);
          setCheckoutStep('qr');
          setReceiptFile(null);
          setReceiptPreview(null);
          setReceiptNote('');
        }, 3500);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể xác nhận thanh toán.');
    } finally {
      setConfirming(false);
    }
  };

  const handleSelectReceiptFile = (file) => {
    if (!file) return;
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!allowed.includes(file.type.toLowerCase())) {
      setError('Vui lòng chọn ảnh định dạng JPG, PNG hoặc WEBP.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Dung lượng ảnh không được vượt quá 10MB.');
      return;
    }
    setError('');
    setReceiptFile(file);
    const previewUrl = URL.createObjectURL(file);
    setReceiptPreview(previewUrl);
  };

  const handleRemoveReceipt = () => {
    setReceiptFile(null);
    if (receiptPreview) {
      URL.revokeObjectURL(receiptPreview);
    }
    setReceiptPreview(null);
  };

  const copyToClipboard = (text, fieldName) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(''), 2000);
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/3 mx-auto"></div>
        <div className="h-64 bg-gray-200 rounded-3xl max-w-4xl mx-auto"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
      
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200 shadow-2xs">
          <Zap className="w-3.5 h-3.5 text-emerald-600" />
          <span>Gói dịch vụ tuyển dụng & AI Matching (UC-E07)</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">
          Bảng Giá Dịch Vụ Tuyển Dụng Jobtimize
        </h1>
        <p className="text-sm text-gray-600 leading-relaxed">
          Nâng cấp quyền lợi đăng tin không giới hạn, tiếp cận kho ứng viên chất lượng cao và tích hợp xếp hạng ứng viên tự động bằng thuật toán AI.
        </p>
      </div>

      {/* Current Subscription Active Banner */}
      {subscription && (
        <div className="bg-linear-to-r from-emerald-600 to-teal-700 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-emerald-700/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-0.5 rounded-full bg-white/20 text-white text-[11px] font-extrabold uppercase tracking-wider backdrop-blur-xs">
                Gói Đang Sử Dụng
              </span>
              <span className="text-emerald-200 text-xs font-semibold">
                Hạn đến: {new Date(subscription.EndDate).toLocaleDateString('vi-VN')}
              </span>
            </div>
            <h3 className="text-2xl font-black">{subscription.PackageName}</h3>
            <p className="text-xs text-emerald-100 max-w-xl">
              Bạn đang sở hữu đặc quyền tiếp cận ứng viên cao cấp và AI hỗ trợ phân tích độ khớp kỹ năng (Match Score).
            </p>
          </div>

          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-4 border border-white/20 text-center flex-1 md:w-36">
              <p className="text-[10px] uppercase font-bold text-emerald-200">Tin đăng còn lại</p>
              <p className="text-2xl font-black">{subscription.RemainingPosts}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-4 border border-white/20 text-center flex-1 md:w-36">
              <p className="text-[10px] uppercase font-bold text-emerald-200">Lượt tìm kiếm CV</p>
              <p className="text-2xl font-black">{subscription.RemainingSearches}</p>
            </div>
          </div>
        </div>
      )}

      {/* Tier Privilege Notice */}
      {subscription && (
        <div className="bg-amber-50/80 rounded-2xl p-4 sm:p-5 border border-amber-200/90 text-amber-900 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 border border-amber-200">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <p className="font-extrabold text-amber-950 text-sm">
                Đặc quyền cấp bậc: Đã mở khóa quyền lợi đến mức {Number(subscription.maxUnlockedPrice || subscription.Price).toLocaleString()} đ!
              </p>
              <p className="text-[11px] text-amber-800 mt-0.5">
                Khi đã sở hữu gói cấp cao, bạn có thể tự do luân chuyển hoặc sử dụng quyền lợi của gói này và tất cả các gói có giá thấp hơn bất cứ lúc nào mà <strong>không cần trả tiền lại</strong>!
              </p>
            </div>
          </div>
          <span className="shrink-0 text-[11px] font-extrabold px-3.5 py-1.5 bg-white rounded-xl border border-amber-300 text-amber-900 shadow-2xs">
            {subscription.unlockedPackageIds?.length || 1} gói đã mở khóa
          </span>
        </div>
      )}

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {packages.map((pack) => {
          const isCurrent = subscription && subscription.PackageID === pack.PackageID && !subscription.IsExpired;
          const maxUnlocked = Number(subscription?.maxUnlockedPrice || 0);
          const isUnlocked = pack.Price === 0 || 
                             Boolean(subscription?.unlockedPackageIds?.includes(pack.PackageID)) || 
                             maxUnlocked >= Number(pack.Price);
          const isFeatured = pack.PackageID === 2; // Pro Recruiter

          return (
            <div
              key={pack.PackageID}
              className={`rounded-3xl p-8 flex flex-col justify-between transition-all duration-200 relative ${
                isCurrent
                  ? 'bg-emerald-50/30 border-2 border-emerald-500 shadow-xl shadow-emerald-500/10 ring-4 ring-emerald-500/5'
                  : isFeatured
                  ? 'bg-white border-2 border-brand-green shadow-xl shadow-brand-green/10 ring-4 ring-brand-green/5'
                  : 'bg-white border border-gray-200/90 shadow-card hover:border-gray-300'
              }`}
            >
              {isCurrent ? (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-emerald-600 text-white text-[11px] font-black uppercase tracking-wider shadow-md flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Đang sử dụng</span>
                </div>
              ) : isFeatured ? (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-brand-green text-white text-[11px] font-black uppercase tracking-wider shadow-md">
                  Phổ biến nhất
                </div>
              ) : null}

              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-black text-gray-900">{pack.PackageName}</h3>
                    {isUnlocked && !isCurrent && (
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                        Đã mở khóa
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {pack.Price === 0 ? 'Dành cho doanh nghiệp trải nghiệm' : `Thời hạn gói: ${pack.DurationDays} ngày`}
                  </p>
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="text-3xl sm:text-4xl font-black text-gray-900">
                    {pack.Price === 0 ? 'Miễn phí' : Number(pack.Price).toLocaleString() + ' đ'}
                  </span>
                  {pack.Price > 0 && (
                    <span className="text-xs font-semibold text-gray-500">/{pack.DurationDays} ngày</span>
                  )}
                </div>

                <div className="border-t border-gray-100 pt-6 space-y-3.5">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Quyền lợi bao gồm:</p>
                  
                  <div className="flex items-center gap-2.5 text-xs text-gray-700 font-semibold">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span><strong>{pack.PostLimit}</strong> tin tuyển dụng đăng đồng thời</span>
                  </div>

                  <div className="flex items-center gap-2.5 text-xs text-gray-700 font-semibold">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span><strong>{pack.SearchLimit}</strong> lượt tra cứu kho CV thụ động (UC-E11)</span>
                  </div>

                  <div className="flex items-center gap-2.5 text-xs text-gray-700 font-semibold">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Tự động chấm điểm AI Match Score cho mọi ứng viên</span>
                  </div>

                  <div className="flex items-center gap-2.5 text-xs text-gray-700 font-semibold">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Gửi lời mời ứng tuyển trực tiếp & thông báo email (UC-E12)</span>
                  </div>

                  <div className="flex items-center gap-2.5 text-xs text-gray-700 font-semibold">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Lên lịch phỏng vấn Google Meet/Zoom tự động (UC-E10)</span>
                  </div>
                </div>
              </div>

              <div className="pt-8">
                {isCurrent ? (
                  <div className="w-full py-3.5 rounded-2xl font-black text-xs bg-emerald-50 text-emerald-800 border-2 border-emerald-500/40 shadow-xs flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Đang kích hoạt gói này</span>
                  </div>
                ) : isUnlocked ? (
                  <button
                    type="button"
                    onClick={() => handleSwitchActivePackage(pack)}
                    disabled={switching}
                    className="w-full py-3.5 rounded-2xl font-bold text-xs bg-white hover:bg-emerald-50 text-emerald-700 border-2 border-emerald-600 shadow-md hover:scale-[1.02] transition-all flex items-center justify-center gap-2 group cursor-pointer"
                  >
                    <Zap className="w-4 h-4 text-emerald-600 group-hover:scale-125 transition-transform" />
                    <span>{switching ? 'Đang chuyển...' : 'Sử dụng gói này (Đã mở khóa)'}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleOpenCheckout(pack)}
                    className="w-full py-3.5 rounded-2xl font-bold text-xs bg-gray-900 hover:bg-black text-white shadow-gray-900/10 hover:scale-[1.02] transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Nâng cấp gói ({Number(pack.Price).toLocaleString()} đ)</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Payment History Section */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/80 shadow-card space-y-6">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div className="flex items-center gap-2.5">
            <History className="w-5 h-5 text-brand-blue" />
            <h2 className="text-base font-bold text-gray-900">Lịch sử Giao dịch & Hóa đơn</h2>
          </div>
          <span className="text-xs font-semibold text-gray-500">{history.length} giao dịch</span>
        </div>

        {history.length === 0 ? (
          <div className="text-center py-8 text-xs text-gray-500">Chưa có lịch sử giao dịch nào phát sinh.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-100 text-gray-400 font-bold uppercase text-[10px]">
                  <th className="pb-3">Mã tham chiếu</th>
                  <th className="pb-3">Gói dịch vụ</th>
                  <th className="pb-3">Số tiền</th>
                  <th className="pb-3">Phương thức</th>
                  <th className="pb-3">Thời gian</th>
                  <th className="pb-3 text-right">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 font-medium">
                {history.map((item) => (
                  <tr key={item.PaymentID} className="hover:bg-gray-50/50">
                    <td className="py-3 font-mono font-bold text-gray-900">{item.TransactionRef}</td>
                    <td className="py-3 font-bold text-gray-800">{item.PackageName}</td>
                    <td className="py-3 text-emerald-600 font-bold">{Number(item.Amount).toLocaleString()} đ</td>
                    <td className="py-3">{item.PaymentMethod}</td>
                    <td className="py-3 text-gray-500">{new Date(item.CreatedAt).toLocaleString('vi-VN')}</td>
                    <td className="py-3 text-right">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                        item.Status === 'Success' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {item.Status === 'Success' ? 'Thành công' : 'Đang chờ'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Checkout / Payment Modal (VNPay Sandbox hoặc MoMo QR) */}
      {checkoutModalOpen && selectedPackage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-gray-100 max-h-[92vh] overflow-y-auto">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-brand-green/10 text-brand-green flex items-center justify-center border border-brand-green/20">
                  <CreditCard className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-gray-900">
                    Cổng Thanh Toán Gói Dịch Vụ
                  </h3>
                  <p className="text-xs text-gray-500">
                    {selectedPackage.PackageName} • <span className="font-bold text-emerald-600">{Number(selectedPackage.Price).toLocaleString()} đ</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setCheckoutModalOpen(false)}
                className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                ✕
              </button>
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

            {/* Payment Method Switch Tabs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => handleSwitchMethod('PayOS')}
                className={`p-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  paymentMethod === 'PayOS'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-xs ring-2 ring-emerald-300'
                    : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="truncate">payOS VietQR (Tự động)</span>
              </button>

              <button
                type="button"
                onClick={() => handleSwitchMethod('MoMo')}
                className={`p-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  paymentMethod === 'MoMo'
                    ? 'bg-purple-50 border-purple-500 text-purple-800 shadow-xs ring-2 ring-purple-300'
                    : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Building2 className="w-4 h-4 text-purple-600 shrink-0" />
                <span className="truncate">Chuyển khoản (Tải bill)</span>
              </button>

              <button
                type="button"
                onClick={() => handleSwitchMethod('VNPay')}
                className={`p-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  paymentMethod === 'VNPay'
                    ? 'bg-blue-50 border-blue-500 text-blue-800 shadow-xs ring-2 ring-blue-300'
                    : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                }`}
              >
                <CreditCard className="w-4 h-4 text-blue-600 shrink-0" />
                <span className="truncate">VNPay Sandbox</span>
              </button>
            </div>

            {isPaidSuccess ? (
              /* CELEBRATION / SUCCESS SCREEN */
              <div className="py-8 px-4 text-center space-y-5 animate-in zoom-in-95 duration-200">
                <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-600/20">
                  <CheckCircle2 className="w-12 h-12" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-2xl font-black text-gray-900">Thanh Toán Thành Công!</h3>
                  <p className="text-sm text-gray-600">
                    Gói <strong>{selectedPackage.PackageName}</strong> đã được hệ thống kích hoạt tự động.
                  </p>
                </div>
                {paidSuccessData?.quota && (
                  <div className="bg-emerald-50/60 rounded-2xl p-4 border border-emerald-200 text-left text-xs max-w-sm mx-auto space-y-2">
                    <p className="font-bold text-emerald-950 uppercase text-[10px] tracking-wider">Hạn mức mới của bạn:</p>
                    <div className="flex justify-between py-1 border-b border-emerald-100">
                      <span className="text-gray-600">Tin đăng còn lại:</span>
                      <span className="font-black text-emerald-700">{paidSuccessData.quota.remainingPosts} tin</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-emerald-100">
                      <span className="text-gray-600">Lượt tìm kiếm CV:</span>
                      <span className="font-black text-emerald-700">{paidSuccessData.quota.remainingSearches} lượt</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-gray-600">Hạn sử dụng đến:</span>
                      <span className="font-bold text-gray-900">{new Date(paidSuccessData.quota.endDate).toLocaleDateString('vi-VN')}</span>
                    </div>
                  </div>
                )}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setCheckoutModalOpen(false)}
                    className="px-8 py-3 rounded-2xl bg-brand-green hover:bg-brand-greenDark text-white font-black text-sm shadow-lg shadow-brand-green/25 transition-all"
                  >
                    Bắt đầu sử dụng ngay 🚀
                  </button>
                </div>
              </div>
            ) : checkingOut ? (
              <div className="py-12 text-center text-xs text-gray-500">Đang khởi tạo mã giao dịch...</div>
            ) : paymentMethod === 'PayOS' ? (
              /* PAYOS VIETQR AUTO FLOW */
              <div className="space-y-4">
                <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-200 text-center space-y-3">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-extrabold">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Tự động kích hoạt ngay sau khi quét mã • Không cần tải bill</span>
                  </div>

                  {checkoutData && (
                    <div className="inline-block p-3 bg-white rounded-2xl border border-gray-200 shadow-md">
                      <img
                        src={checkoutData.qrCode || checkoutData.qrCodeUrl || '/qr-bank.png'}
                        onError={(e) => { e.currentTarget.src = '/qr-bank.png'; }}
                        alt="PayOS VietQR"
                        className="w-56 h-56 object-contain mx-auto"
                      />
                    </div>
                  )}

                  {/* Dynamic Polling Status Badge */}
                  <div className="flex items-center justify-center gap-2 text-xs font-semibold text-emerald-800 bg-white py-2 px-4 rounded-xl border border-emerald-200 shadow-2xs max-w-md mx-auto">
                    <div className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                    </div>
                    <span>Hệ thống đang tự động lắng nghe giao dịch chuyển khoản...</span>
                  </div>
                </div>

                <div className="space-y-2 text-xs bg-gray-50 p-4 rounded-2xl border border-gray-100">
                  <div className="flex items-center justify-between py-1 border-b border-gray-200/60">
                    <span className="text-gray-500">Ngân hàng thụ hưởng:</span>
                    <span className="font-bold text-gray-800">{checkoutData?.bankInfo?.bankName || 'MBBank (Ngân hàng Quân Đội)'}</span>
                  </div>

                  <div className="flex items-center justify-between py-1 border-b border-gray-200/60">
                    <span className="text-gray-500">Số tài khoản:</span>
                    <div className="flex items-center gap-2 font-mono font-bold text-gray-900">
                      <span>{checkoutData?.bankInfo?.accountNumber || '0387887153'}</span>
                      <button
                        onClick={() => copyToClipboard(checkoutData?.bankInfo?.accountNumber || '0387887153', 'stk')}
                        className="text-brand-blue hover:underline text-[11px]"
                      >
                        {copiedField === 'stk' ? '✓ Đã chép' : 'Chép'}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between py-1 border-b border-gray-200/60">
                    <span className="text-gray-500">Chủ tài khoản:</span>
                    <span className="font-bold text-gray-800">{checkoutData?.bankInfo?.accountHolder || 'MAI XUAN QUY'}</span>
                  </div>

                  <div className="flex items-center justify-between py-1 border-b border-gray-200/60">
                    <span className="text-gray-500">Số tiền thanh toán:</span>
                    <div className="flex items-center gap-2 font-black text-emerald-600 text-sm">
                      <span>{checkoutData ? Number(checkoutData.amount).toLocaleString() + ' đ' : ''}</span>
                      <button
                        onClick={() => copyToClipboard(String(checkoutData?.amount), 'amount')}
                        className="text-brand-blue hover:underline text-[11px] font-normal"
                      >
                        {copiedField === 'amount' ? '✓ Đã chép' : 'Chép'}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between py-1">
                    <span className="text-gray-500">Nội dung chuyển khoản:</span>
                    <div className="flex items-center gap-2 font-mono font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-200">
                      <span>{checkoutData?.description || `JOBTIMIZE ${checkoutData?.orderCode || checkoutData?.transactionRef}`}</span>
                      <button
                        onClick={() => copyToClipboard(checkoutData?.description || `JOBTIMIZE ${checkoutData?.orderCode || checkoutData?.transactionRef}`, 'memo')}
                        className="text-brand-purple hover:underline text-[11px]"
                      >
                        {copiedField === 'memo' ? '✓ Đã chép' : 'Chép'}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setCheckoutModalOpen(false)}
                    className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl w-full sm:w-auto"
                  >
                    Đóng
                  </button>
                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    {checkoutData?.checkoutUrl && (
                      <a
                        href={checkoutData.checkoutUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-all w-full sm:w-auto"
                      >
                        <span>Mở cổng payOS</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ) : paymentMethod === 'MoMo' ? (
              checkoutStep === 'qr' ? (
                /* STEP 1: MBBank VietQR Layout */
                <div className="space-y-4">
                  <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100 text-center space-y-3">
                    <p className="text-xs font-bold text-emerald-950">Bước 1: Quét mã VietQR bằng bất kỳ ứng dụng Ngân hàng nào</p>
                    
                    {checkoutData && (
                      <div className="inline-block p-3 bg-white rounded-2xl border border-gray-200 shadow-md">
                        <img
                          src={checkoutData.qrCodeUrl || '/qr-bank.png'}
                          onError={(e) => { e.currentTarget.src = '/qr-bank.png'; }}
                          alt="QR MBBank MAI XUAN QUY"
                          className="w-52 h-52 object-contain mx-auto"
                        />
                      </div>
                    )}

                    <p className="text-[11px] text-gray-500">Mã QR đã tự động điền sẵn số tài khoản MBBank, số tiền và nội dung chuyển khoản.</p>
                  </div>

                  <div className="space-y-2 text-xs bg-gray-50 p-4 rounded-2xl border border-gray-100">
                    <div className="flex items-center justify-between py-1 border-b border-gray-200/60">
                      <span className="text-gray-500">Ngân hàng thụ hưởng:</span>
                      <span className="font-bold text-gray-800">{checkoutData?.bankInfo?.bankName || 'MBBank (Ngân hàng Quân Đội)'}</span>
                    </div>

                    <div className="flex items-center justify-between py-1 border-b border-gray-200/60">
                      <span className="text-gray-500">Số tài khoản:</span>
                      <div className="flex items-center gap-2 font-mono font-bold text-gray-900">
                        <span>{checkoutData?.bankInfo?.accountNumber || '0387887153'}</span>
                        <button
                          onClick={() => copyToClipboard(checkoutData?.bankInfo?.accountNumber || '0387887153', 'stk')}
                          className="text-brand-blue hover:underline text-[11px]"
                        >
                          {copiedField === 'stk' ? '✓ Đã chép' : 'Chép'}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between py-1 border-b border-gray-200/60">
                      <span className="text-gray-500">Chủ tài khoản:</span>
                      <span className="font-bold text-gray-800">{checkoutData?.bankInfo?.accountHolder || 'MAI XUAN QUY'}</span>
                    </div>

                    <div className="flex items-center justify-between py-1 border-b border-gray-200/60">
                      <span className="text-gray-500">Số tiền thanh toán:</span>
                      <span className="font-black text-emerald-600 text-sm">
                        {checkoutData ? Number(checkoutData.amount).toLocaleString() + ' đ' : ''}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-1">
                      <span className="text-gray-500">Nội dung chuyển khoản:</span>
                      <div className="flex items-center gap-2 font-mono font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-200">
                        <span>JOBTIMIZE {checkoutData?.transactionRef}</span>
                        <button
                          onClick={() => copyToClipboard(`JOBTIMIZE ${checkoutData?.transactionRef}`, 'memo')}
                          className="text-brand-purple hover:underline text-[11px]"
                        >
                          {copiedField === 'memo' ? '✓ Đã chép' : 'Chép'}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setCheckoutModalOpen(false)}
                      className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl w-full sm:w-auto"
                    >
                      Đóng
                    </button>
                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                      <button
                        type="button"
                        onClick={() => handleConfirmPayment(true)}
                        disabled={confirming}
                        className="text-[11px] text-gray-500 hover:text-gray-700 underline px-2 py-1"
                      >
                        Bỏ qua tải bill
                      </button>
                      <button
                        type="button"
                        onClick={() => setCheckoutStep('upload_receipt')}
                        className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all w-full sm:w-auto"
                      >
                        <span>Tôi đã chuyển tiền (Tải bill)</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* STEP 2: UPLOAD RECEIPT / BILL CHUYỂN TIỀN */
                <div className="space-y-4 animate-fadeIn">
                  <div className="p-4 bg-emerald-50/70 border border-emerald-100 rounded-2xl flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-emerald-950 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Bước 2: Gửi hóa đơn / Bill chuyển khoản</span>
                      </div>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        Đơn #{checkoutData?.transactionRef} • {Number(checkoutData?.amount).toLocaleString()} đ
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCheckoutStep('qr')}
                      className="text-xs text-brand-blue hover:underline font-semibold flex items-center gap-1"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" /> Xem lại mã QR
                    </button>
                  </div>

                  {/* Upload Box / Dropzone */}
                  {!receiptPreview ? (
                    <label
                      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsDragging(false);
                        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                          handleSelectReceiptFile(e.dataTransfer.files[0]);
                        }
                      }}
                      className={`block p-6 sm:p-8 rounded-2xl border-2 border-dashed text-center cursor-pointer transition-all ${
                        isDragging
                          ? 'border-emerald-500 bg-emerald-50/60 scale-[1.01]'
                          : 'border-gray-300 hover:border-emerald-400 bg-gray-50/50 hover:bg-emerald-50/20'
                      }`}
                    >
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/jpg"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            handleSelectReceiptFile(e.target.files[0]);
                          }
                        }}
                        className="hidden"
                      />
                      <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3 shadow-xs">
                        <UploadCloud className="w-6 h-6" />
                      </div>
                      <p className="text-xs font-bold text-gray-800">
                        Nhấn để chọn ảnh hoặc kéo thả hình bill vào đây
                      </p>
                      <p className="text-[11px] text-gray-400 mt-1">
                        Hỗ trợ ảnh chụp màn hình chuyển khoản (JPG, PNG, WEBP tối đa 10MB)
                      </p>
                    </label>
                  ) : (
                    <div className="p-4 bg-white border border-gray-200 rounded-2xl space-y-3 shadow-xs">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-gray-700 flex items-center gap-1.5">
                          <ImageIcon className="w-4 h-4 text-emerald-600" />
                          Ảnh biên lai đã chọn:
                        </span>
                        <button
                          type="button"
                          onClick={handleRemoveReceipt}
                          className="text-rose-600 hover:text-rose-700 font-semibold text-xs flex items-center gap-1 hover:underline"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Xóa ảnh
                        </button>
                      </div>

                      <div className="relative rounded-xl overflow-hidden border border-gray-200 bg-gray-900/5 max-h-56 flex items-center justify-center">
                        <img
                          src={receiptPreview}
                          alt="Bill preview"
                          className="max-h-56 w-auto object-contain rounded-lg"
                        />
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-gray-500">
                        <span className="truncate max-w-[220px] font-mono">{receiptFile?.name}</span>
                        <span>{receiptFile ? (receiptFile.size / 1024).toFixed(1) + ' KB' : ''}</span>
                      </div>
                    </div>
                  )}

                  {/* Optional Note input */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-gray-700">
                      Ghi chú / Mã giao dịch ngân hàng (không bắt buộc):
                    </label>
                    <input
                      type="text"
                      value={receiptNote}
                      onChange={(e) => setReceiptNote(e.target.value)}
                      placeholder="Ví dụ: Mã GD ngân hàng MB 12345678 hoặc lưu ý thêm..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 bg-white"
                    />
                  </div>

                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200/80 text-[11px] text-amber-800 leading-relaxed">
                    💡 <strong>Mẹo:</strong> Đính kèm hình ảnh bill giúp Ban Quản trị đối soát và kích hoạt gói dịch vụ cho bạn nhanh hơn!
                  </div>

                  <div className="pt-2 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setCheckoutStep('qr')}
                      className="px-4 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl flex items-center gap-1"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" /> Quay lại
                    </button>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleConfirmPayment(false)}
                        disabled={confirming}
                        className="px-6 py-2.5 rounded-xl bg-brand-green hover:bg-brand-greenDark text-white font-bold text-xs shadow-md shadow-brand-green/20 disabled:opacity-50 flex items-center gap-2 transition-colors"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{confirming ? 'Đang gửi xác nhận...' : 'Xác nhận gửi bill & Chờ duyệt'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )
            ) : (
              /* VNPay Sandbox Layout */
              <div className="space-y-4">
                <div className="bg-blue-50 p-5 rounded-2xl border border-blue-200/80 space-y-3 text-xs">
                  <div className="flex items-center gap-2 text-blue-900 font-bold">
                    <CreditCard className="w-4 h-4 text-blue-600" />
                    <span>Môi trường thử nghiệm VNPay Sandbox</span>
                  </div>
                  <p className="text-blue-800 leading-relaxed">
                    Sử dụng thông tin thẻ nội địa mô phỏng do cổng VNPay cấp để kiểm thử luồng thanh toán:
                  </p>
                  <div className="space-y-1.5 font-mono text-[11px] bg-white p-3 rounded-xl border border-blue-100 text-gray-700">
                    <p>Ngân hàng test: <strong>NCB</strong></p>
                    <p>Số thẻ test: <strong>9704198526191432198</strong></p>
                    <p>Tên chủ thẻ: <strong>NGUYEN VAN A</strong></p>
                    <p>Ngày phát hành: <strong>07/15</strong></p>
                    <p>Mã OTP xác thực: <strong>123456</strong></p>
                  </div>
                  <p className="text-[11px] text-amber-800 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                    ⚠️ <strong>Lưu ý:</strong> Trong môi trường demo chưa cấu hình khóa bí mật VNPay IPN, giao dịch sẽ ở trạng thái Chờ xác nhận (Pending) và cần Ban Quản trị đối soát kích hoạt.
                  </p>
                </div>

                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between text-xs">
                  <span className="text-gray-500">Mã đơn hàng:</span>
                  <span className="font-mono font-bold text-gray-800">{checkoutData?.transactionRef}</span>
                </div>

                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setCheckoutModalOpen(false)}
                    className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl"
                  >
                    Đóng
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmPayment}
                    disabled={confirming}
                    className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/20 disabled:opacity-50 flex items-center gap-2 transition-colors"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>{confirming ? 'Đang gửi...' : 'Gửi yêu cầu xác nhận thanh toán'}</span>
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}

