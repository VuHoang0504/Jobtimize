import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  Briefcase, 
  Search, 
  Sparkles, 
  Bookmark, 
  FileText, 
  Building2, 
  PlusCircle, 
  LogOut, 
  User, 
  Layers, 
  Menu, 
  X,
  CheckCircle2,
  KeyRound
} from 'lucide-react';
import api from '../../services/api';

export default function Navbar() {
  const { user, logout, refreshUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [togglingJob, setTogglingJob] = useState(false);

  const isCandidate = user?.role === 'Candidate';
  const isEmployer = user?.role === 'Employer';
  const isLooking = user?.profile?.IsLookingForJob;

  const handleToggleLooking = async () => {
    try {
      setTogglingJob(true);
      await api.patch('/candidate/toggle-looking', { isLookingForJob: !isLooking });
      await refreshUser();
    } catch (err) {
      console.error('Failed to toggle looking for job status:', err);
    } finally {
      setTogglingJob(false);
    }
  };

  return (
    <nav className="sticky top-0 z-50 glass-nav border-b border-gray-200/80 shadow-sm transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo */}
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-blue via-brand-dark to-brand-green flex items-center justify-center text-white shadow-md shadow-brand-blue/20 group-hover:scale-105 transition-transform">
                <Briefcase className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-black tracking-tight text-gray-900 leading-none">
                  Job<span className="text-brand-blue">timize</span>
                </span>
                <span className="text-[10px] font-semibold tracking-wider text-brand-green uppercase mt-0.5">
                  IT Recruitment
                </span>
              </div>
            </Link>

            {/* Main Nav Links */}
            <div className="hidden md:flex items-center space-x-1">
              <Link
                to="/"
                className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                  location.pathname === '/' 
                    ? 'text-brand-blue bg-brand-light font-semibold' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                Việc làm
              </Link>

              {isCandidate && (
                <>
                  <Link
                    to="/candidate/dashboard"
                    className={`px-3.5 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors ${
                      location.pathname.startsWith('/candidate/dashboard') 
                        ? 'text-brand-blue bg-brand-light font-semibold' 
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <User className="w-4 h-4 text-brand-blue" />
                    Hồ sơ & CV
                  </Link>

                  <Link
                    to="/candidate/skill-gap"
                    className={`px-3.5 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors ${
                      location.pathname === '/candidate/skill-gap'
                        ? 'text-brand-purple bg-brand-purpleLight font-semibold'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <Sparkles className="w-4 h-4 text-brand-purple animate-pulse" />
                    Phân tích AI Skill Gap
                  </Link>
                </>
              )}

              {isEmployer && (
                <>
                  <Link
                    to="/employer/dashboard"
                    className={`px-3.5 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors ${
                      location.pathname === '/employer/dashboard'
                        ? 'text-brand-blue bg-brand-light font-semibold'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <Layers className="w-4 h-4 text-brand-blue" />
                    Bảng điều khiển
                  </Link>

                  <Link
                    to="/employer/post-job"
                    className={`px-3.5 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors ${
                      location.pathname === '/employer/post-job'
                        ? 'text-brand-green bg-brand-greenLight font-semibold'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <PlusCircle className="w-4 h-4 text-brand-green" />
                    Đăng tin tuyển dụng
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Right Action & User Profile */}
          <div className="hidden md:flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-3">
                {/* IsLookingForJob Switch for Candidate */}
                {isCandidate && (
                  <div className="flex items-center gap-2 bg-gray-100 px-3 py-1.5 rounded-full border border-gray-200">
                    <span className="text-xs font-medium text-gray-600">Tìm việc:</span>
                    <button
                      onClick={handleToggleLooking}
                      disabled={togglingJob}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        isLooking ? 'bg-brand-green' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          isLooking ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                    <span className={`text-xs font-semibold ${isLooking ? 'text-brand-green' : 'text-gray-500'}`}>
                      {isLooking ? 'BẬT' : 'TẮT'}
                    </span>
                  </div>
                )}

                {/* User Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                    className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-gray-100 transition-colors focus:outline-none"
                  >
                    <img
                      src={user.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&q=80'}
                      alt={user.fullName}
                      className="w-9 h-9 rounded-full object-cover border-2 border-brand-blue/30"
                    />
                    <div className="text-left">
                      <div className="text-xs font-bold text-gray-800 leading-tight flex items-center gap-1">
                        {user.fullName}
                        <CheckCircle2 className="w-3.5 h-3.5 text-brand-blue fill-brand-light" />
                      </div>
                      <div className="text-[11px] text-gray-500 capitalize">
                        {user.role === 'Employer' ? 'Nhà tuyển dụng' : 'Ứng viên'}
                      </div>
                    </div>
                  </button>

                  {profileDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                      <div className="px-4 py-2 border-b border-gray-100">
                        <p className="text-xs text-gray-400">Đăng nhập với email</p>
                        <p className="text-xs font-semibold text-gray-800 truncate">{user.email}</p>
                      </div>

                      {isCandidate && (
                        <>
                          <Link
                            to="/candidate/dashboard"
                            onClick={() => setProfileDropdownOpen(false)}
                            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <FileText className="w-4 h-4 text-gray-400" />
                            Quản lý hồ sơ & CV
                          </Link>
                          <Link
                            to="/candidate/dashboard?tab=saved"
                            onClick={() => setProfileDropdownOpen(false)}
                            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <Bookmark className="w-4 h-4 text-gray-400" />
                            Việc làm đã lưu
                          </Link>
                          <Link
                            to="/candidate/dashboard?tab=security"
                            onClick={() => setProfileDropdownOpen(false)}
                            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <KeyRound className="w-4 h-4 text-gray-400" />
                            Đổi mật khẩu & Avatar
                          </Link>
                        </>
                      )}

                      {isEmployer && (
                        <>
                          <Link
                            to="/employer/dashboard"
                            onClick={() => setProfileDropdownOpen(false)}
                            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <Building2 className="w-4 h-4 text-gray-400" />
                            Quản lý tuyển dụng
                          </Link>
                          <Link
                            to="/employer/post-job"
                            onClick={() => setProfileDropdownOpen(false)}
                            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <PlusCircle className="w-4 h-4 text-gray-400" />
                            Đăng tin JD mới
                          </Link>
                        </>
                      )}

                      <div className="border-t border-gray-100 my-1"></div>

                      <button
                        onClick={() => {
                          setProfileDropdownOpen(false);
                          logout();
                        }}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 text-left"
                      >
                        <LogOut className="w-4 h-4" />
                        Đăng xuất
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  to="/login"
                  className="text-sm font-semibold text-gray-700 hover:text-brand-blue px-4 py-2 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  Đăng nhập
                </Link>
                <Link
                  to="/register"
                  className="text-sm font-semibold text-white bg-gradient-to-r from-brand-blue to-brand-green px-5 py-2.5 rounded-xl shadow-md shadow-brand-blue/20 hover:opacity-95 transition-all hover:shadow-lg"
                >
                  Đăng ký miễn phí
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white px-4 pt-2 pb-6 space-y-3">
          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-base font-medium text-gray-800 hover:bg-gray-100"
          >
            Tìm việc làm
          </Link>
          {user ? (
            <>
              {isCandidate && (
                <>
                  <Link
                    to="/candidate/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-lg text-base font-medium text-gray-800 hover:bg-gray-100"
                  >
                    Hồ sơ & CV của tôi
                  </Link>
                  <Link
                    to="/candidate/skill-gap"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-lg text-base font-medium text-brand-purple hover:bg-gray-100"
                  >
                    Phân tích AI Skill Gap
                  </Link>
                </>
              )}
              {isEmployer && (
                <>
                  <Link
                    to="/employer/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-lg text-base font-medium text-gray-800 hover:bg-gray-100"
                  >
                    Quản lý ATS & Tin đăng
                  </Link>
                  <Link
                    to="/employer/post-job"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-lg text-base font-medium text-brand-green hover:bg-gray-100"
                  >
                    Đăng tin tuyển dụng
                  </Link>
                </>
              )}
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  logout();
                }}
                className="w-full text-left px-3 py-2 rounded-lg text-base font-medium text-red-600 hover:bg-red-50"
              >
                Đăng xuất
              </button>
            </>
          ) : (
            <div className="pt-4 flex flex-col gap-2">
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2.5 rounded-xl border border-gray-300 font-semibold text-gray-700"
              >
                Đăng nhập
              </Link>
              <Link
                to="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2.5 rounded-xl bg-brand-blue text-white font-semibold shadow"
              >
                Đăng ký tài khoản
              </Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
