import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Briefcase, User, Building2, Lock, Mail, Phone, ArrowRight } from 'lucide-react';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [roleName, setRoleName] = useState('Candidate'); // 'Candidate' or 'Employer'
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await register({
        roleName,
        fullName,
        email,
        phone,
        password,
        companyName: roleName === 'Employer' ? companyName : undefined
      });

      if (data.user.role === 'Employer') {
        navigate('/employer/dashboard');
      } else {
        navigate('/candidate/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Đăng ký thất bại. Vui lòng kiểm tra lại thông tin.');
    } finally {
      setLoading(false);
    }
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
            Khám phá cơ hội việc làm hoặc tìm kiếm nhân tài bằng sức mạnh của AI
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
                Email
              </label>
              <div className="relative">
                <Mail className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@domain.com"
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
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue text-sm"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3.5 px-4 rounded-xl text-white font-bold transition-all shadow-md flex items-center justify-center gap-2 hover:gap-3 disabled:opacity-50 ${
                roleName === 'Employer'
                  ? 'bg-brand-green hover:bg-brand-greenDark shadow-brand-green/20'
                  : 'bg-brand-blue hover:bg-brand-dark shadow-brand-blue/20'
              }`}
            >
              {loading ? 'Đang tạo tài khoản...' : 'Hoàn tất Đăng ký'}
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
    </div>
  );
}
