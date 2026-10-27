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
  Building2
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
  const [paymentMethod, setPaymentMethod] = useState('MoMo');
  const [checkoutData, setCheckoutData] = useState(null);
  const [checkingOut, setCheckingOut] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [copiedField, setCopiedField] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [packRes, subRes, histRes] = await Promise.allSettled([
        api.get('/employer/packages'),
        api.get('/employer/subscription'),
        api.get('/employer/payment/history')
      ]);

      if (packRes.status === 'fulfilled' && packRes.value.data.success) {
        setPackages(packRes.value.data.data);
      }
      if (subRes.status === 'fulfilled' && subRes.value.data.success) {
        setSubscription(subRes.value.data.data);
      }
      if (histRes.status === 'fulfilled' && histRes.value.data.success) {
        setHistory(histRes.value.data.data);
      }
    } catch (err) {
      console.error('Fetch pricing error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Handle initiate purchase
  const handleOpenCheckout = async (pack) => {
    setSelectedPackage(pack);
    setError('');
    setSuccessMsg('');
    setCheckoutData(null);
    setCheckoutModalOpen(true);

    try {
      setCheckingOut(true);
      const res = await api.post('/employer/checkout', {
        packageId: pack.PackageID,
        paymentMethod
      });

      if (res.data.success) {
        if (res.data.directSuccess) {
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
      const res = await api.post('/employer/checkout', {
        packageId: selectedPackage.PackageID,
        paymentMethod: newMethod
      });
      if (res.data.success && !res.data.directSuccess) {
        setCheckoutData(res.data.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Lỗi chuyển phương thức thanh toán');
    } finally {
      setCheckingOut(false);
    }
  };

  // Confirm payment completion
  const handleConfirmPayment = async () => {
    if (!checkoutData?.transactionRef) return;

    try {
      setConfirming(true);
      setError('');
      const res = await api.post('/employer/payment/confirm', {
        transactionRef: checkoutData.transactionRef,
        gatewayTransactionNo: paymentMethod === 'VNPay' ? 'VNPAY_SANDBOX_' + Date.now() : 'MB_VIETQR_' + Date.now()
      });

      if (res.data.success) {
        setSuccessMsg(res.data.message);
        await fetchData();
        setTimeout(() => {
          setCheckoutModalOpen(false);
        }, 3500);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể xác nhận thanh toán.');
    } finally {
      setConfirming(false);
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

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {packages.map((pack) => {
          const isCurrent = subscription && subscription.PackageID === pack.PackageID && !subscription.IsExpired;
          const isFeatured = pack.PackageID === 2; // Pro Recruiter

          return (
            <div
              key={pack.PackageID}
              className={`rounded-3xl p-8 flex flex-col justify-between transition-all duration-200 relative ${
                isFeatured
                  ? 'bg-white border-2 border-brand-green shadow-xl shadow-brand-green/10 ring-4 ring-brand-green/5'
                  : 'bg-white border border-gray-200/90 shadow-card hover:border-gray-300'
              }`}
            >
              {isFeatured && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-brand-green text-white text-[11px] font-black uppercase tracking-wider shadow-md">
                  Phổ biến nhất
                </div>
              )}

              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-black text-gray-900">{pack.PackageName}</h3>
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
                <button
                  type="button"
                  onClick={() => handleOpenCheckout(pack)}
                  disabled={isCurrent}
                  className={`w-full py-3.5 rounded-2xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 ${
                    isCurrent
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'
                      : isFeatured
                      ? 'bg-brand-green hover:bg-brand-greenDark text-white shadow-brand-green/20 hover:scale-[1.02]'
                      : 'bg-gray-900 hover:bg-black text-white shadow-gray-900/10'
                  }`}
                >
                  <span>{isCurrent ? 'Đang kích hoạt gói này' : pack.Price === 0 ? 'Kích hoạt dùng thử' : 'Mua gói ngay'}</span>
                  {!isCurrent && <ArrowRight className="w-3.5 h-3.5" />}
                </button>
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
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleSwitchMethod('MoMo')}
                className={`p-3.5 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  paymentMethod === 'MoMo'
                    ? 'bg-emerald-50 border-emerald-400 text-emerald-800 shadow-xs ring-1 ring-emerald-300'
                    : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                }`}
              >
                <QrCode className="w-4 h-4 text-emerald-600" />
                <span>Chuyển khoản MBBank (VietQR)</span>
              </button>

              <button
                type="button"
                onClick={() => handleSwitchMethod('VNPay')}
                className={`p-3.5 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  paymentMethod === 'VNPay'
                    ? 'bg-blue-50 border-blue-400 text-blue-700 shadow-xs ring-1 ring-blue-300'
                    : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                }`}
              >
                <CreditCard className="w-4 h-4 text-blue-600" />
                <span>VNPay Sandbox</span>
              </button>
            </div>

            {checkingOut ? (
              <div className="py-12 text-center text-xs text-gray-500">Đang khởi tạo mã giao dịch...</div>
            ) : paymentMethod === 'MoMo' ? (
              /* MBBank VietQR Layout */
              <div className="space-y-4">
                <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100 text-center space-y-3">
                  <p className="text-xs font-bold text-emerald-950">Quét mã VietQR bằng bất kỳ ứng dụng Ngân hàng nào</p>
                  
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
                    className="px-6 py-2.5 rounded-xl bg-brand-green hover:bg-brand-greenDark text-white font-bold text-xs shadow-md shadow-brand-green/20 disabled:opacity-50 flex items-center gap-2 transition-colors"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{confirming ? 'Đang gửi...' : 'Tôi đã chuyển khoản (Gửi xác nhận)'}</span>
                  </button>
                </div>
              </div>
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

