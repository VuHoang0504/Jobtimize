import React, { useState, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Menu, X, ChevronDown } from 'lucide-react';
import { getUserAvatar, handleUserAvatarError } from '../../utils/logoHelper';
import NotificationDropdown from './NotificationDropdown';
import JobBrowseMenu from './JobBrowseMenu';

export default function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileJobSubmenuOpen, setMobileJobSubmenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [jobMenuOpen, setJobMenuOpen] = useState(false);
  const jobMenuTimeoutRef = useRef(null);

  const isCandidate = user?.role === 'Candidate';
  const isEmployer = user?.role === 'Employer';
  const isAdmin = user?.role === 'Admin';

  const handleMouseEnterJob = () => {
    if (jobMenuTimeoutRef.current) clearTimeout(jobMenuTimeoutRef.current);
    setJobMenuOpen(true);
  };

  const handleMouseLeaveJob = () => {
    jobMenuTimeoutRef.current = setTimeout(() => {
      setJobMenuOpen(false);
    }, 180);
  };

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-200 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Main Nav Links */}
          <div className="flex items-center gap-6 lg:gap-8">
            <Link to="/" className="flex items-center gap-2.5 group shrink-0">
              <img 
                src="/logo-icon.png" 
                alt="Jobtimize" 
                className="w-9 h-9 object-contain transition-transform" 
              />
              <div className="flex flex-col">
                <span className="text-xl font-black tracking-tight text-slate-900 leading-none">
                  Job<span className="text-blue-600">timize</span>
                </span>
                <span className="text-[10px] font-semibold tracking-wider text-slate-500 uppercase mt-0.5">
                  Tuyển dụng
                </span>
              </div>
            </Link>

            {/* Main Nav Links (Text Only) */}
            <div className="hidden md:flex items-center space-x-1">
              {/* Mega Dropdown Việc làm */}
              <div 
                className="relative"
                onMouseEnter={handleMouseEnterJob}
                onMouseLeave={handleMouseLeaveJob}
              >
                <button
                  type="button"
                  onClick={() => setJobMenuOpen(!jobMenuOpen)}
                  className={`flex items-center gap-1 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                    location.pathname === '/' || jobMenuOpen
                      ? 'text-slate-900 font-semibold bg-slate-100' 
                      : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <span>Việc làm</span>
                  <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${jobMenuOpen ? 'rotate-180 text-slate-900' : 'text-slate-500'}`} />
                </button>

                {/* Mega Menu Popover */}
                {jobMenuOpen && (
                  <div 
                    className={`absolute top-full left-0 mt-1.5 ${isEmployer ? 'w-[min(880px,calc(100vw-200px))]' : 'w-[min(1120px,calc(100vw-200px))]'} bg-white rounded-xl shadow-lg border border-gray-200 p-6 z-50`}
                    onMouseEnter={handleMouseEnterJob}
                    onMouseLeave={handleMouseLeaveJob}
                  >
                    <div className="grid grid-cols-12 gap-6">
                      
                      {/* Cột 1: VIỆC LÀM & CÔNG TY */}
                      {!isEmployer && (
                          <div className="col-span-3 space-y-5 border-r border-gray-100 pr-4">
                            <div>
                              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">
                                VIỆC LÀM
                              </h3>
                              <ul className="space-y-1">
                                <li>
                                  <Link
                                    to="/"
                                    onClick={() => setJobMenuOpen(false)}
                                    className="block px-2.5 py-1.5 rounded-lg text-sm font-medium text-slate-800 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                                  >
                                    Tìm việc làm
                                  </Link>
                                </li>
                                <li>
                                  <Link
                                    to="/candidate/cv-builder"
                                    onClick={() => setJobMenuOpen(false)}
                                    className="block px-2.5 py-1.5 rounded-lg text-sm font-medium text-slate-800 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                                  >
                                    Thiết kế CV
                                  </Link>
                                </li>
                                <li>
                                  <Link
                                    to="/candidate/dashboard?tab=saved"
                                    onClick={() => setJobMenuOpen(false)}
                                    className="block px-2.5 py-1.5 rounded-lg text-sm font-medium text-slate-800 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                                  >
                                    Việc làm đã lưu
                                  </Link>
                                </li>
                                <li>
                                  <Link
                                    to="/candidate/dashboard?tab=applications"
                                    onClick={() => setJobMenuOpen(false)}
                                    className="block px-2.5 py-1.5 rounded-lg text-sm font-medium text-slate-800 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                                  >
                                    Việc làm đã ứng tuyển
                                  </Link>
                                </li>
                                <li>
                                  <Link
                                    to="/candidate/skill-gap"
                                    onClick={() => setJobMenuOpen(false)}
                                    className="block px-2.5 py-1.5 rounded-lg text-sm font-medium text-slate-800 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                                  >
                                    Phân tích kỹ năng
                                  </Link>
                                </li>
                              </ul>
                            </div>

                            <div>
                              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">
                                DOANH NGHIỆP
                              </h3>
                              <ul className="space-y-1">
                                <li>
                                  <Link
                                    to="/?keyword=Công ty"
                                    onClick={() => setJobMenuOpen(false)}
                                    className="block px-2.5 py-1.5 rounded-lg text-sm font-medium text-slate-800 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                                  >
                                    Danh sách công ty
                                  </Link>
                                </li>
                              </ul>
                            </div>
                          </div>

                        )}

                        <div className={isEmployer ? 'col-span-12' : 'col-span-9'}>
                          <JobBrowseMenu onSelect={() => setJobMenuOpen(false)} />
                        </div>

                      </div>
                    </div>
                )}
              </div>

              {/* Public or Candidate Quick CV Builder Link */}
              {!isEmployer && !isAdmin && (
                <Link
                  to="/candidate/cv-builder"
                  className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                    location.pathname === '/candidate/cv-builder'
                      ? 'text-slate-900 font-semibold bg-slate-100'
                      : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  Thiết kế CV
                </Link>
              )}

              {isCandidate && (
                <>
                  <Link
                    to="/candidate/skill-gap"
                    className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                      location.pathname === '/candidate/skill-gap'
                        ? 'text-slate-900 font-semibold bg-slate-100'
                        : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    Phân tích kỹ năng
                  </Link>

                  <Link
                    to="/candidate/dashboard?tab=interview"
                    className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                      location.search.includes('tab=interview')
                        ? 'text-slate-900 font-semibold bg-slate-100'
                        : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    Luyện phỏng vấn
                  </Link>
                </>
              )}

              {isEmployer && (
                <>
                  <Link
                    to="/employer/dashboard"
                    className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                      location.pathname === '/employer/dashboard'
                        ? 'text-slate-900 font-semibold bg-slate-100'
                        : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    Quản lý tuyển dụng
                  </Link>

                  <Link
                    to="/employer/post-job"
                    className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                      location.pathname === '/employer/post-job'
                        ? 'text-slate-900 font-semibold bg-slate-100'
                        : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    Đăng tin tuyển dụng
                  </Link>

                  <Link
                    to="/employer/talents"
                    className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                      location.pathname === '/employer/talents'
                        ? 'text-slate-900 font-semibold bg-slate-100'
                        : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    Tìm kiếm ứng viên
                  </Link>

                  <Link
                    to="/employer/pricing"
                    className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                      location.pathname === '/employer/pricing'
                        ? 'text-slate-900 font-semibold bg-slate-100'
                        : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    Bảng giá dịch vụ
                  </Link>
                </>
              )}

              {isAdmin && (
                <>
                  <Link
                    to="/admin/dashboard"
                    className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                      location.pathname === '/admin/dashboard'
                        ? 'text-slate-900 font-semibold bg-slate-100'
                        : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    Báo cáo & Thống kê
                  </Link>

                  <Link
                    to="/admin/users"
                    className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                      location.pathname.startsWith('/admin/users')
                        ? 'text-slate-900 font-semibold bg-slate-100'
                        : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    Quản lý & Duyệt tin
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Right Action & User Profile */}
          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-3">
                {/* Notification Bell & Dropdown */}
                <NotificationDropdown key={`${user.userId}:${user.role}`} />

                {/* User Dropdown */}
                <div className="relative hidden md:block">
                  <button
                    onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                    className="flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-slate-100 transition-colors focus:outline-none"
                  >
                    <img
                      src={getUserAvatar(user, user.fullName, user.role)}
                      alt={user.fullName}
                      onError={(e) => handleUserAvatarError(e, user.profile?.CompanyName || user.fullName)}
                      className="w-9 h-9 rounded-full object-cover border border-gray-200"
                    />
                    <div className="text-left">
                      <div className="text-xs font-semibold text-slate-900 leading-tight">
                        {user.fullName}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {user.role === 'Admin' ? 'Quản trị viên' : user.role === 'Employer' ? 'Nhà tuyển dụng' : 'Ứng viên'}
                      </div>
                    </div>
                  </button>

                  {profileDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-200 py-1.5 z-50">
                      <div className="px-4 py-2.5 border-b border-gray-100">
                        <p className="text-xs text-slate-400">Đăng nhập với email</p>
                        <p className="text-xs font-semibold text-slate-900 truncate mt-0.5">{user.email}</p>
                      </div>

                      {isAdmin && (
                        <>
                          <Link
                            to="/admin/dashboard"
                            onClick={() => setProfileDropdownOpen(false)}
                            className="block px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-100 transition-colors"
                          >
                            Báo cáo & Thống kê
                          </Link>
                          <Link
                            to="/admin/users"
                            onClick={() => setProfileDropdownOpen(false)}
                            className="block px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-100 transition-colors"
                          >
                            Quản lý & Duyệt tin
                          </Link>
                        </>
                      )}

                      {isCandidate && (
                        <>
                          <Link
                            to="/candidate/dashboard"
                            onClick={() => setProfileDropdownOpen(false)}
                            className="block px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-100 transition-colors"
                          >
                            Hồ sơ & CV
                          </Link>
                          <Link
                            to="/candidate/cv-builder"
                            onClick={() => setProfileDropdownOpen(false)}
                            className="block px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-100 transition-colors"
                          >
                            Thiết kế CV
                          </Link>
                          <Link
                            to="/candidate/skill-gap"
                            onClick={() => setProfileDropdownOpen(false)}
                            className="block px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-100 transition-colors"
                          >
                            Phân tích kỹ năng
                          </Link>
                          <Link
                            to="/candidate/dashboard?tab=interview"
                            onClick={() => setProfileDropdownOpen(false)}
                            className="block px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-100 transition-colors"
                          >
                            Luyện phỏng vấn
                          </Link>
                          <Link
                            to="/candidate/dashboard?tab=saved"
                            onClick={() => setProfileDropdownOpen(false)}
                            className="block px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-100 transition-colors"
                          >
                            Việc làm đã lưu
                          </Link>
                        </>
                      )}

                      {isEmployer && (
                        <>
                          <Link
                            to="/employer/dashboard"
                            onClick={() => setProfileDropdownOpen(false)}
                            className="block px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-100 transition-colors"
                          >
                            Quản lý tuyển dụng
                          </Link>
                          <Link
                            to="/employer/post-job"
                            onClick={() => setProfileDropdownOpen(false)}
                            className="block px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-100 transition-colors"
                          >
                            Đăng tin tuyển dụng
                          </Link>
                          <Link
                            to="/employer/talents"
                            onClick={() => setProfileDropdownOpen(false)}
                            className="block px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-100 transition-colors"
                          >
                            Tìm kiếm ứng viên
                          </Link>
                          <Link
                            to="/employer/pricing"
                            onClick={() => setProfileDropdownOpen(false)}
                            className="block px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-100 transition-colors"
                          >
                            Bảng giá dịch vụ
                          </Link>
                        </>
                      )}

                      <div className="border-t border-gray-100 my-1"></div>

                      <button
                        onClick={() => {
                          setProfileDropdownOpen(false);
                          logout();
                        }}
                        className="w-full text-left px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-100 transition-colors"
                      >
                        Đăng xuất
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="hidden md:flex items-center gap-3">
                <Link
                  to="/login"
                  className="text-sm font-medium text-slate-700 hover:text-slate-900 px-4 py-2 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  Đăng nhập
                </Link>
                <Link
                  to="/register"
                  className="text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors"
                >
                  Đăng ký
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white px-4 pt-2 pb-6 space-y-2">
          {/* Việc làm Mobile Accordion */}
          <div>
            <button
              onClick={() => setMobileJobSubmenuOpen(!mobileJobSubmenuOpen)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium text-slate-900 hover:bg-slate-100"
            >
              <span>Việc làm & Danh mục</span>
              <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${mobileJobSubmenuOpen ? 'rotate-180 text-slate-900' : ''}`} />
            </button>

            {mobileJobSubmenuOpen && (
              <div className="pl-3 pr-1 py-2 space-y-3 border-l-2 border-gray-200 ml-2 mt-1 bg-slate-50 rounded-r-lg text-sm">
                {!isEmployer && (
                <div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 px-2">Truy cập nhanh</p>
                  <div className="grid grid-cols-2 gap-1">
                    <Link
                      to="/"
                      onClick={() => { setMobileMenuOpen(false); setMobileJobSubmenuOpen(false); }}
                      className="px-2 py-1.5 rounded-lg text-xs font-medium text-slate-900 hover:bg-slate-100"
                    >
                      Tìm việc làm
                    </Link>
                    <Link
                      to="/candidate/dashboard?tab=saved"
                      onClick={() => { setMobileMenuOpen(false); setMobileJobSubmenuOpen(false); }}
                      className="px-2 py-1.5 rounded-lg text-xs font-medium text-slate-900 hover:bg-slate-100"
                    >
                      Việc làm đã lưu
                    </Link>
                    <Link
                      to="/candidate/dashboard?tab=applications"
                      onClick={() => { setMobileMenuOpen(false); setMobileJobSubmenuOpen(false); }}
                      className="px-2 py-1.5 rounded-lg text-xs font-medium text-slate-900 hover:bg-slate-100"
                    >
                      Đã ứng tuyển
                    </Link>
                    <Link
                      to="/candidate/skill-gap"
                      onClick={() => { setMobileMenuOpen(false); setMobileJobSubmenuOpen(false); }}
                      className="px-2 py-1.5 rounded-lg text-xs font-medium text-slate-900 hover:bg-slate-100"
                    >
                      Phân tích kỹ năng
                    </Link>
                  </div>
                </div>
                )}

                <JobBrowseMenu mobile onSelect={() => { setMobileMenuOpen(false); setMobileJobSubmenuOpen(false); }} />
              </div>
            )}
          </div>
          {user ? (
            <>
              {isCandidate && (
                <>
                  <Link
                    to="/candidate/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-900 hover:bg-slate-100"
                  >
                    Hồ sơ & CV
                  </Link>
                  <Link
                    to="/candidate/cv-builder"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-900 hover:bg-slate-100"
                  >
                    Thiết kế CV
                  </Link>
                  <Link
                    to="/candidate/skill-gap"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-900 hover:bg-slate-100"
                  >
                    Phân tích kỹ năng
                  </Link>
                  <Link
                    to="/candidate/dashboard?tab=interview"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-900 hover:bg-slate-100"
                  >
                    Luyện phỏng vấn
                  </Link>
                </>
              )}
              {isEmployer && (
                <>
                  <Link
                    to="/employer/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-900 hover:bg-slate-100"
                  >
                    Quản lý tuyển dụng
                  </Link>
                  <Link
                    to="/employer/post-job"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-900 hover:bg-slate-100"
                  >
                    Đăng tin tuyển dụng
                  </Link>
                  <Link
                    to="/employer/talents"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-900 hover:bg-slate-100"
                  >
                    Tìm kiếm ứng viên
                  </Link>
                  <Link
                    to="/employer/pricing"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-900 hover:bg-slate-100"
                  >
                    Bảng giá dịch vụ
                  </Link>
                </>
              )}
              {isAdmin && (
                <>
                  <Link
                    to="/admin/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-900 hover:bg-slate-100"
                  >
                    Báo cáo & Thống kê
                  </Link>
                  <Link
                    to="/admin/users"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-900 hover:bg-slate-100"
                  >
                    Quản lý & Duyệt tin
                  </Link>
                </>
              )}
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  logout();
                }}
                className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-slate-900 hover:bg-slate-100"
              >
                Đăng xuất
              </button>
            </>
          ) : (
            <div className="pt-3 flex flex-col gap-2">
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2.5 rounded-lg border border-gray-300 text-sm font-medium text-slate-700"
              >
                Đăng nhập
              </Link>
              <Link
                to="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium"
              >
                Đăng ký
              </Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
