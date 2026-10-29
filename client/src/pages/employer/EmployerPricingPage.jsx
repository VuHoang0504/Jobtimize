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
  const paymentMethod = 'PayOS';
  const [checkoutData, setCheckoutData] = useState(null);
  const [checkingOut, setCheckingOut] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [copiedField, setCopiedField] = useState('');
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
    setCheckoutModalOpen(true);

    try {
      setCheckingOut(true);
      const res = await api.post('/payments/create', { packageId: pack.PackageID });

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
          <span>Gói dịch vụ tuyển dụng</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">
          Bảng Giá Dịch Vụ Tuyển Dụng Jobtimize
        </h1>
        <p className="text-sm text-gray-600 leading-relaxed">
          Nâng cấp quyền lợi đăng tin không giới hạn, tiếp cận kho ứng viên chất lượng cao và tích hợp xếp hạng ứng viên tự động theo mức độ phù hợp.
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
              Bạn đang sở hữu đặc quyền tiếp cận ứng viên cao cấp và công cụ phân tích độ phù hợp kỹ năng.
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
                    <span>Tự động đánh giá độ phù hợp của ứng viên</span>
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

            <p className="text-xs text-emerald-800">Thanh toán PayOS · Đối soát và kích hoạt tự động</p>

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
            ) : checkoutData ? (
              /* PAYOS VIETQR AUTO FLOW */
              <div className="space-y-4">
                <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-200 text-center space-y-3">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-extrabold">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Tự động kích hoạt sau khi thanh toán thành công • Không cần tải bill</span>
                  </div>

                  {checkoutData && (
                    <div className="inline-block p-3 bg-white rounded-2xl border border-gray-200 shadow-md">
                      <img
                        src={checkoutData.qrCodeUrl}
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
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
                    <span className="font-bold text-gray-800">{checkoutData?.bankInfo?.bankName || 'Theo mã QR PayOS'}</span>
                  </div>

                  <div className="flex items-center justify-between py-1 border-b border-gray-200/60">
                    <span className="text-gray-500">Số tài khoản:</span>
                    <div className="flex items-center gap-2 font-mono font-bold text-gray-900">
                      <span>{checkoutData?.bankInfo?.accountNumber || '—'}</span>
                      <button
                        onClick={() => copyToClipboard(checkoutData?.bankInfo?.accountNumber || '—', 'stk')}
                        className="text-brand-blue hover:underline text-[11px]"
                      >
                        {copiedField === 'stk' ? '✓ Đã chép' : 'Chép'}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between py-1 border-b border-gray-200/60">
                    <span className="text-gray-500">Chủ tài khoản:</span>
                    <span className="font-bold text-gray-800">{checkoutData?.bankInfo?.accountHolder || '—'}</span>
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
            ) : (
              <div className="p-4 text-sm text-gray-600">Chưa tạo được giao dịch. Vui lòng đóng cửa sổ và thử lại sau khi cấu hình PayOS.</div>
            )}


          </div>
        </div>
      )}

    </div>
  );
}

