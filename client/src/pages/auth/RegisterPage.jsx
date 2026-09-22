import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../../context/AuthContext';
import { Briefcase, User, Building2, Lock, Mail, Phone, ArrowRight, Eye, EyeOff, ShieldCheck, RefreshCw, X, CheckCircle2 } from 'lucide-react';

export default function RegisterPage() {
  const { register, verifyOtp, resendOtp, googleLogin } = useAuth();
  const navigate = useNavigate();

  const [roleName, setRoleName] = useState('Candidate'); // 'Candidate' or 'Employer'
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // OTP Verification Modal State
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [otpError, setOtpError] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState('');
  const [countdown, setCountdown] = useState(60);

  const inputRefs = useRef([]);

  // Countdown timer for resend OTP
  useEffect(() => {
    let timer;
    if (showOtpModal && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [showOtpModal, countdown]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Mật khẩu và xác nhận mật khẩu không trùng khớp. Vui lòng kiểm tra lại!');
      return;
    }

    setLoading(true);

    try {
      const res = await register({
        roleName,
        fullName,
        email,
        phone,
        password,
        companyName: roleName === 'Employer' ? companyName : undefined
      });

      if (res.requireOtp) {
        setShowOtpModal(true);
        setCountdown(60);
        setOtpDigits(['', '', '', '', '', '']);
        setOtpError('');
        setResendSuccess('');
        setTimeout(() => {
          inputRefs.current[0]?.focus();
        }, 300);
      } else if (res.data?.token) {
        if (res.data.user.role === 'Employer') {
          navigate('/employer/dashboard');
        } else {
          navigate('/candidate/dashboard');
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Đăng ký thất bại. Vui lòng kiểm tra lại thông tin.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;

    const newDigits = [...otpDigits];
    newDigits[index] = value.slice(-1);
    setOtpDigits(newDigits);
    setOtpError('');

    // Auto-advance to next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit if all 6 digits are filled
    const fullCode = newDigits.join('');
    if (fullCode.length === 6 && !newDigits.includes('')) {
      handleVerifyOtp(fullCode);
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').trim();
    if (/^\d{6}$/.test(pasted)) {
      const digits = pasted.split('');
      setOtpDigits(digits);
      inputRefs.current[5]?.focus();
      handleVerifyOtp(pasted);
    }
  };

  const handleVerifyOtp = async (codeToVerify) => {
    const code = codeToVerify || otpDigits.join('');
    if (code.length !== 6) {
      setOtpError('Vui lòng nhập đủ 6 chữ số mã OTP');
      return;
    }

    setOtpError('');
    setOtpLoading(true);

    try {
      const userData = await verifyOtp(email, code);
      if (userData?.user?.role === 'Employer') {
        navigate('/employer/dashboard');
      } else {
        navigate('/candidate/dashboard');
      }
    } catch (err) {
      setOtpError(err.response?.data?.message || 'Mã OTP không đúng hoặc đã hết hạn.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0 || resendLoading) return;

    setResendLoading(true);
    setOtpError('');
    setResendSuccess('');

    try {
      const res = await resendOtp(email);
      setCountdown(60);
      setResendSuccess('Đã gửi lại mã OTP mới vào hòm thư Gmail của bạn!');
    } catch (err) {
      setOtpError(err.response?.data?.message || 'Không thể gửi lại mã. Vui lòng thử lại sau.');
    } finally {
      setResendLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setError('');
    setLoading(true);
    try {
      const data = await googleLogin({
        credential: credentialResponse.credential,
        roleName: roleName
      });

      if (data.user.role === 'Employer') {
        navigate('/employer/dashboard');
      } else {
        navigate('/candidate/dashboard');
      }
    } catch (err) {
      setError('Lỗi đăng ký qua Google: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError('Đăng ký qua Google không thành công. Vui lòng thử lại.');
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-lg w-full space-y-8 bg-white p-8 sm:p-10 rounded-3xl shadow-xl border border-gray-100">
        
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-blue to-brand-green flex items-center justify-center text-white shadow-lg shadow-brand-blue/20 mb-4">
            <Briefcase className="w-6 h-6" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
            Tạo tài khoản Jobtimize
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            Khám phá cơ hội việc làm IT hấp dẫn hoặc tìm kiếm nhân tài công nghệ thông tin
          </p>
        </div>

        {/* Role Selector Tabs */}
        <div className="grid grid-cols-2 p-1.5 bg-gray-100 rounded-2xl">
          <button
            type="button"
            onClick={() => setRoleName('Candidate')}
            className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${
              roleName === 'Candidate'
                ? 'bg-white text-brand-blue shadow-sm'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <User className="w-4 h-4" />
            Tôi là Ứng viên
          </button>
          
          <button
            type="button"
            onClick={() => setRoleName('Employer')}
            className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${
              roleName === 'Employer'
                ? 'bg-white text-brand-green shadow-sm'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <Building2 className="w-4 h-4" />
            Nhà tuyển dụng
          </button>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600 font-medium">
            {error}
          </div>
        )}

        {/* Real Google Sign-up Button */}
        <div className="flex flex-col items-center justify-center w-full">
          <div className="w-full flex justify-center [&>div]:w-full">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              shape="rectangular"
              theme="outline"
              size="large"
              text="signup_with"
              width="100%"
            />
          </div>
        </div>

        {/* Divider */}
        <div className="relative my-2">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center text-xs uppercase font-bold text-gray-400">
            <span className="bg-white px-3">Hoặc điền thông tin đăng ký</span>
          </div>
        </div>

        {/* Form */}
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Họ và tên
            </label>
            <div className="relative">
              <User className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={roleName === 'Candidate' ? 'Nguyễn Văn A' : 'Người đại diện tuyển dụng'}
                className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue text-sm"
              />
            </div>
          </div>

          {roleName === 'Employer' && (
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Tên công ty / Doanh nghiệp *
              </label>
              <div className="relative">
                <Building2 className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Ví dụ: Công ty Cổ phần Công nghệ AI Việt"
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green text-sm"
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Email nhận mã OTP *
              </label>
              <div className="relative">
                <Mail className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@gmail.com"
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Số điện thoại
              </label>
              <div className="relative">
                <Phone className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0912 345 678"
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue text-sm"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Mật khẩu (Tối thiểu 6 ký tự)
            </label>
            <div className="relative">
              <Lock className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-11 pr-11 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none p-1"
                title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4 text-gray-600" />
                ) : (
                  <Eye className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                )}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Xác nhận mật khẩu *
            </label>
            <div className="relative">
              <Lock className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Nhập lại mật khẩu"
                className={`w-full pl-11 pr-11 py-3 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 ${
                  confirmPassword && confirmPassword !== password
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                    : confirmPassword && confirmPassword === password
                    ? 'border-green-400 focus:border-green-500 focus:ring-green-100'
                    : 'border-gray-200 focus:border-brand-blue focus:ring-brand-blue/20'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                tabIndex={-1}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none p-1"
                title={showConfirmPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                {showConfirmPassword ? (
                  <EyeOff className="w-4 h-4 text-gray-600" />
                ) : (
                  <Eye className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                )}
              </button>
            </div>
            {confirmPassword && confirmPassword !== password && (
              <p className="text-xs text-red-500 mt-1 font-medium">Mật khẩu xác nhận chưa khớp</p>
            )}
            {confirmPassword && confirmPassword === password && (
              <p className="text-xs text-green-600 mt-1 font-medium">✓ Mật khẩu đã khớp</p>
            )}
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3.5 px-4 rounded-xl text-white font-bold transition-all shadow-md flex items-center justify-center gap-2 hover:gap-3 disabled:opacity-50 cursor-pointer ${
                roleName === 'Employer'
                  ? 'bg-brand-green hover:bg-brand-greenDark shadow-brand-green/20'
                  : 'bg-brand-blue hover:bg-brand-dark shadow-brand-blue/20'
              }`}
            >
              {loading ? 'Đang gửi mã xác thực OTP...' : 'Đăng ký & Nhận mã OTP'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>

        {/* Footer */}
        <div className="text-center pt-2">
          <p className="text-sm text-gray-600">
            Đã có tài khoản?{' '}
            <Link to="/login" className="font-bold text-brand-blue hover:underline">
              Đăng nhập ngay
            </Link>
          </p>
        </div>

      </div>

      {/* OTP Verification Modal */}
      {showOtpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-gray-100 relative">
            
            <button
              onClick={() => setShowOtpModal(false)}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-6">
              <div className="mx-auto w-14 h-14 rounded-2xl bg-brand-light text-brand-blue flex items-center justify-center shadow-inner mb-3">
                <ShieldCheck className="w-8 h-8 text-brand-blue" />
              </div>
              <h3 className="text-2xl font-black text-gray-900">Xác thực mã OTP</h3>
              <p className="text-xs text-gray-500 mt-1.5 px-2">
                Mã xác thực gồm 6 chữ số đã được gửi đến email:
              </p>
              <p className="text-sm font-bold text-brand-blue mt-0.5">{email}</p>
            </div>

            {resendSuccess && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl text-xs text-green-700 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>{resendSuccess}</span>
              </div>
            )}

            {otpError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 font-medium text-center">
                {otpError}
              </div>
            )}

            {/* 6 Digit Inputs */}
            <div className="flex justify-center gap-2 sm:gap-3 my-6" onPaste={handlePaste}>
              {otpDigits.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => (inputRefs.current[idx] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(idx, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(idx, e)}
                  className="w-11 h-13 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-black font-mono rounded-xl border-2 border-gray-200 focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20 outline-none transition-all shadow-sm"
                />
              ))}
            </div>

            <button
              type="button"
              onClick={() => handleVerifyOtp()}
              disabled={otpLoading || otpDigits.join('').length !== 6}
              className="w-full py-3.5 px-4 rounded-xl text-white font-bold bg-brand-blue hover:bg-brand-dark transition-all shadow-md shadow-brand-blue/20 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {otpLoading ? 'Đang xác thực...' : 'Xác thực & Kích hoạt tài khoản'}
              <CheckCircle2 className="w-4 h-4" />
            </button>

            {/* Resend OTP */}
            <div className="text-center mt-5">
              {countdown > 0 ? (
                <p className="text-xs text-gray-500 font-medium">
                  Gửi lại mã OTP sau: <span className="font-bold text-brand-blue">{countdown}s</span>
                </p>
              ) : (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendLoading}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-blue hover:text-brand-dark hover:underline cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${resendLoading ? 'animate-spin' : ''}`} />
                  {resendLoading ? 'Đang gửi lại...' : 'Chưa nhận được mã? Gửi lại mã OTP'}
                </button>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
