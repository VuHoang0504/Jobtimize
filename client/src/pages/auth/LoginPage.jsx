import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Briefcase, Lock, Mail, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';

export default function LoginPage() {
  const { login, googleLogin } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
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

  const handleGoogleMock = async (roleName) => {
    setError('');
    setLoading(true);
    try {
      const mockEmail = roleName === 'Employer' ? 'employer.demo@company.com' : 'candidate.demo@jobtimize.vn';
      const mockName = roleName === 'Employer' ? 'Tech Corp Recruiter' : 'Nguyễn Văn Ứng Viên (AI Demo)';
      
      const data = await googleLogin({
        email: mockEmail,
        fullName: mockName,
        roleName: roleName,
        avatarUrl: roleName === 'Employer' 
          ? 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=120&q=80'
          : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&q=80'
      });

      if (data.user.role === 'Employer') {
        navigate('/employer/dashboard');
      } else {
        navigate('/');
      }
    } catch (err) {
      setError('Lỗi đăng nhập Google giả lập: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
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

        {/* Form */}
        <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
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
                placeholder="example@domain.com"
                className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue text-sm transition-all"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                Mật khẩu
              </label>
              <a href="#" className="text-xs font-semibold text-brand-blue hover:underline">
                Quên mật khẩu?
              </a>
            </div>
            <div className="relative">
              <Lock className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue text-sm transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 rounded-xl text-white font-bold bg-brand-blue hover:bg-brand-dark transition-all shadow-md shadow-brand-blue/20 flex items-center justify-center gap-2 hover:gap-3 disabled:opacity-50"
          >
            {loading ? 'Đang xác thực...' : 'Đăng nhập'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center text-xs uppercase font-bold text-gray-400">
            <span className="bg-white px-3">Hoặc trải nghiệm nhanh</span>
          </div>
        </div>

        {/* Google Mock 1-Click Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => handleGoogleMock('Candidate')}
            disabled={loading}
            className="flex items-center justify-center gap-2 py-2.5 px-3 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Sparkles className="w-4 h-4 text-brand-purple" />
            Vào vai Ứng viên
          </button>
          
          <button
            type="button"
            onClick={() => handleGoogleMock('Employer')}
            disabled={loading}
            className="flex items-center justify-center gap-2 py-2.5 px-3 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <CheckCircle2 className="w-4 h-4 text-brand-green" />
            Vào vai Tuyển dụng
          </button>
        </div>

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
    </div>
  );
}
