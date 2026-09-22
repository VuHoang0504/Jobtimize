import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../../context/AuthContext';
import { Briefcase, Lock, Mail, ArrowRight, Eye, EyeOff, ShieldCheck, KeyRound, CheckCircle2, RefreshCw, X } from 'lucide-react';

export default function LoginPage() {
  const { login, googleLogin, forgotPassword, verifyResetOtp, resetPassword } = useAuth();
  const navigate = useNavigate();

  // Login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loginSuccess, setLoginSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // Forgot Password Modal State
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotStep, setForgotStep] = useState(1); // 1: Email, 2: OTP, 3: New Password, 4: Success
  const [forgotEmail, setForgotEmail] = useState('');
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccessMsg, setForgotSuccessMsg] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [countdown, setCountdown] = useState(60);

  const otpInputRefs = useRef([]);

  // Countdown timer for resend OTP in forgot password modal
  useEffect(() => {
    let timer;
    if (showForgotModal && forgotStep === 2 && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [showForgotModal, forgotStep, countdown]);

  const openForgotModal = () => {
    setForgotEmail(email || '');
    setForgotStep(1);
    setOtpDigits(['', '', '', '', '', '']);
    setNewPassword('');
    setConfirmNewPassword('');
    setForgotError('');
    setForgotSuccessMsg('');
    setShowForgotModal(true);
  };

  const closeForgotModal = () => {
    setShowForgotModal(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoginSuccess('');
    setLoading(true);

    try {
      const data = await login(email, password);
      if (data.user.role === 'Employer') {
        navigate('/employer/dashboard');
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại email/mật khẩu.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setError('');
    setLoading(true);
    try {
      const data = await googleLogin({
        credential: credentialResponse.credential,
        roleName: 'Candidate' // Default role if new user
      });

      if (data.user.role === 'Employer') {
        navigate('/employer/dashboard');
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Đăng nhập Google thất bại. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError('Xác thực với Google không thành công. Vui lòng thử lại.');
  };

  // Forgot Password: Step 1 - Send OTP
  const handleSendForgotOtp = async (e) => {
    e.preventDefault();
    if (!forgotEmail) {
      setForgotError('Vui lòng nhập địa chỉ email');
      return;
    }

    setForgotError('');
    setForgotLoading(true);

    try {
      await forgotPassword(forgotEmail);
      setForgotStep(2);
      setCountdown(60);
      setOtpDigits(['', '', '', '', '', '']);
      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 300);
    } catch (err) {
      setForgotError(err.response?.data?.message || 'Không thể gửi mã xác thực. Vui lòng thử lại sau.');
    } finally {
      setForgotLoading(false);
    }
  };

  // Forgot Password: Step 2 - OTP change & paste
  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;

    const newDigits = [...otpDigits];
    newDigits[index] = value.slice(-1);
    setOtpDigits(newDigits);
    setForgotError('');

    if (value && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }

    const fullCode = newDigits.join('');
    if (fullCode.length === 6 && !newDigits.includes('')) {
      handleVerifyForgotOtp(fullCode);
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').trim();
    if (/^\d{6}$/.test(pasted)) {
      const digits = pasted.split('');
      setOtpDigits(digits);
      otpInputRefs.current[5]?.focus();
      handleVerifyForgotOtp(pasted);
    }
  };

  const handleVerifyForgotOtp = async (codeToVerify) => {
    const code = codeToVerify || otpDigits.join('');
    if (code.length !== 6) {
      setForgotError('Vui lòng nhập đủ 6 chữ số mã OTP');
      return;
    }

    setForgotError('');
    setForgotLoading(true);

    try {
      await verifyResetOtp(forgotEmail, code);
      setForgotStep(3);
    } catch (err) {
      setForgotError(err.response?.data?.message || 'Mã OTP không đúng hoặc đã hết hạn.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResendForgotOtp = async () => {
    if (countdown > 0 || forgotLoading) return;
    setForgotLoading(true);
    setForgotError('');
    setForgotSuccessMsg('');

    try {
      await forgotPassword(forgotEmail);
      setCountdown(60);
      setForgotSuccessMsg('Đã gửi lại mã OTP mới vào hòm thư Gmail của bạn!');
    } catch (err) {
      setForgotError(err.response?.data?.message || 'Không thể gửi lại mã OTP. Vui lòng thử lại sau.');
    } finally {
      setForgotLoading(false);
    }
  };

  // Forgot Password: Step 3 - Reset Password
  const handleResetSubmit = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setForgotError('Mật khẩu mới phải có tối thiểu 6 ký tự');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setForgotError('Mật khẩu và xác nhận mật khẩu không trùng khớp');
      return;
    }

    setForgotError('');
    setForgotLoading(true);

    try {
      const code = otpDigits.join('');
      await resetPassword(forgotEmail, code, newPassword);
      setForgotStep(4);
    } catch (err) {
      setForgotError(err.response?.data?.message || 'Không thể đặt lại mật khẩu. Vui lòng thử lại.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleFinishReset = () => {
    setEmail(forgotEmail);
    setPassword('');
    setShowForgotModal(false);
    setLoginSuccess('Đặt lại mật khẩu thành công! Vui lòng đăng nhập với mật khẩu mới.');
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 sm:p-10 rounded-3xl shadow-xl border border-gray-100">
        
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-blue to-brand-green flex items-center justify-center text-white shadow-lg shadow-brand-blue/20 mb-4">
            <Briefcase className="w-6 h-6" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
            Chào mừng trở lại!
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            Đăng nhập vào <span className="font-semibold text-brand-blue">Jobtimize</span> để tiếp tục
          </p>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600 font-medium">
            {error}
          </div>
        )}

        {loginSuccess && (
          <div className="p-4 rounded-xl bg-green-50 border border-green-200 text-sm text-green-700 font-medium flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <span>{loginSuccess}</span>
          </div>
        )}

        {/* Real Google Sign-in Button */}
        <div className="flex flex-col items-center justify-center w-full">
          <div className="w-full flex justify-center [&>div]:w-full">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              shape="rectangular"
              theme="outline"
              size="large"
              text="signin_with"
              width="100%"
            />
          </div>
        </div>

        {/* Divider */}
        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center text-xs uppercase font-bold text-gray-400">
            <span className="bg-white px-3">Hoặc đăng nhập bằng email</span>
          </div>
        </div>

        {/* Form */}
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
              Địa chỉ Email
            </label>
            <div className="relative">
              <Mail className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue text-sm transition-all"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                Mật khẩu
              </label>
              <button
                type="button"
                onClick={openForgotModal}
                className="text-xs font-semibold text-brand-blue hover:underline cursor-pointer"
              >
                Quên mật khẩu?
              </button>
            </div>
            <div className="relative">
              <Lock className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-11 pr-11 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue text-sm transition-all"
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

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 rounded-xl text-white font-bold bg-brand-blue hover:bg-brand-dark transition-all shadow-md shadow-brand-blue/20 flex items-center justify-center gap-2 hover:gap-3 disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'Đang xác thực...' : 'Đăng nhập'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Footer link */}
        <div className="text-center pt-2">
          <p className="text-sm text-gray-600">
            Chưa có tài khoản?{' '}
            <Link to="/register" className="font-bold text-brand-blue hover:underline">
              Đăng ký ngay
            </Link>
          </p>
        </div>

      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-gray-100 relative">
            
            <button
              onClick={closeForgotModal}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Step 1: Input Email */}
            {forgotStep === 1 && (
              <div>
                <div className="text-center mb-6">
                  <div className="mx-auto w-14 h-14 rounded-2xl bg-brand-light text-brand-blue flex items-center justify-center shadow-inner mb-3">
                    <KeyRound className="w-8 h-8 text-brand-blue" />
                  </div>
                  <h3 className="text-2xl font-black text-gray-900">Quên mật khẩu?</h3>
                  <p className="text-xs text-gray-500 mt-1.5 px-2">
                    Nhập địa chỉ email đăng ký tài khoản Jobtimize của bạn để nhận mã xác thực OTP qua Gmail.
                  </p>
                </div>

                {forgotError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 font-medium text-center">
                    {forgotError}
                  </div>
                )}

                <form onSubmit={handleSendForgotOtp} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                      Email đã đăng ký
                    </label>
                    <div className="relative">
                      <Mail className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="email"
                        required
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        placeholder="email@gmail.com"
                        className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue text-sm"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="w-full py-3.5 px-4 rounded-xl text-white font-bold bg-brand-blue hover:bg-brand-dark transition-all shadow-md shadow-brand-blue/20 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {forgotLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Đang gửi mã OTP...</span>
                      </>
                    ) : (
                      <>
                        <span>Gửi mã xác thực OTP</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}

            {/* Step 2: Input OTP */}
            {forgotStep === 2 && (
              <div>
                <div className="text-center mb-6">
                  <div className="mx-auto w-14 h-14 rounded-2xl bg-brand-light text-brand-blue flex items-center justify-center shadow-inner mb-3">
                    <ShieldCheck className="w-8 h-8 text-brand-blue" />
                  </div>
                  <h3 className="text-2xl font-black text-gray-900">Xác thực mã OTP</h3>
                  <p className="text-xs text-gray-500 mt-1.5 px-2">
                    Mã xác thực gồm 6 chữ số đã được gửi đến email:
                  </p>
                  <p className="text-sm font-bold text-brand-blue mt-0.5">{forgotEmail}</p>
                </div>

                {forgotSuccessMsg && (
                  <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl text-xs text-green-700 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    <span>{forgotSuccessMsg}</span>
                  </div>
                )}

                {forgotError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 font-medium text-center">
                    {forgotError}
                  </div>
                )}

                <div className="flex justify-center gap-2 sm:gap-3 my-6" onPaste={handleOtpPaste}>
                  {otpDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => (otpInputRefs.current[idx] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      className="w-11 h-13 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-black font-mono rounded-xl border-2 border-gray-200 focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20 outline-none transition-all shadow-sm"
                    />
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => handleVerifyForgotOtp()}
                  disabled={forgotLoading || otpDigits.join('').length !== 6}
                  className="w-full py-3.5 px-4 rounded-xl text-white font-bold bg-brand-blue hover:bg-brand-dark transition-all shadow-md shadow-brand-blue/20 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {forgotLoading ? 'Đang xác thực...' : 'Xác thực OTP'}
                  <ArrowRight className="w-4 h-4" />
                </button>

                <div className="text-center mt-5">
                  {countdown > 0 ? (
                    <p className="text-xs text-gray-500 font-medium">
                      Gửi lại mã OTP sau: <span className="font-bold text-brand-blue">{countdown}s</span>
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResendForgotOtp}
                      disabled={forgotLoading}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-blue hover:text-brand-dark hover:underline cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${forgotLoading ? 'animate-spin' : ''}`} />
                      Chưa nhận được mã? Gửi lại mã OTP
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Step 3: Set New Password */}
            {forgotStep === 3 && (
              <div>
                <div className="text-center mb-6">
                  <div className="mx-auto w-14 h-14 rounded-2xl bg-brand-light text-brand-blue flex items-center justify-center shadow-inner mb-3">
                    <Lock className="w-8 h-8 text-brand-blue" />
                  </div>
                  <h3 className="text-2xl font-black text-gray-900">Thiết lập mật khẩu mới</h3>
                  <p className="text-xs text-gray-500 mt-1.5 px-2">
                    Nhập mật khẩu mới an toàn cho tài khoản <strong>{forgotEmail}</strong>.
                  </p>
                </div>

                {forgotError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 font-medium text-center">
                    {forgotError}
                  </div>
                )}

                <form onSubmit={handleResetSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                      Mật khẩu mới (Tối thiểu 6 ký tự) *
                    </label>
                    <div className="relative">
                      <Lock className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-11 pr-11 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        tabIndex={-1}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none p-1"
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4 text-gray-600" /> : <Eye className="w-4 h-4 text-gray-400" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                      Xác nhận mật khẩu mới *
                    </label>
                    <div className="relative">
                      <Lock className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type={showConfirmNewPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className={`w-full pl-11 pr-11 py-3 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 ${
                          confirmNewPassword && confirmNewPassword !== newPassword
                            ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                            : confirmNewPassword && confirmNewPassword === newPassword
                            ? 'border-green-400 focus:border-green-500 focus:ring-green-100'
                            : 'border-gray-200 focus:border-brand-blue focus:ring-brand-blue/20'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                        tabIndex={-1}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none p-1"
                      >
                        {showConfirmNewPassword ? <EyeOff className="w-4 h-4 text-gray-600" /> : <Eye className="w-4 h-4 text-gray-400" />}
                      </button>
                    </div>
                    {confirmNewPassword && confirmNewPassword !== newPassword && (
                      <p className="text-xs text-red-500 mt-1 font-medium">Mật khẩu xác nhận chưa khớp</p>
                    )}
                    {confirmNewPassword && confirmNewPassword === newPassword && (
                      <p className="text-xs text-green-600 mt-1 font-medium">✓ Mật khẩu đã khớp</p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="w-full py-3.5 px-4 rounded-xl text-white font-bold bg-brand-blue hover:bg-brand-dark transition-all shadow-md shadow-brand-blue/20 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {forgotLoading ? 'Đang lưu mật khẩu...' : 'Lưu mật khẩu mới'}
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                </form>
              </div>
            )}

            {/* Step 4: Success */}
            {forgotStep === 4 && (
              <div className="text-center py-4">
                <div className="mx-auto w-16 h-16 rounded-full bg-green-100 text-green-600 flex items-center justify-center mb-4 shadow-sm animate-bounce">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-black text-gray-900">Đổi mật khẩu thành công!</h3>
                <p className="text-sm text-gray-500 mt-2 px-4">
                  Mật khẩu tài khoản của bạn đã được cập nhật an toàn. Bây giờ bạn có thể đăng nhập bằng mật khẩu mới.
                </p>
                <button
                  type="button"
                  onClick={handleFinishReset}
                  className="mt-6 w-full py-3.5 px-4 rounded-xl text-white font-bold bg-brand-blue hover:bg-brand-dark transition-all shadow-md shadow-brand-blue/20 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Đăng nhập ngay</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}

