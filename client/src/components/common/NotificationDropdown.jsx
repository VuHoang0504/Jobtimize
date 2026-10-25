import React, { useState, useRef, useEffect } from 'react';
import { Bell, Building2, Zap, Eye } from 'lucide-react';

const INITIAL_NOTIFICATIONS = [
  {
    id: 1,
    type: 'invite',
    href: '/invitations/123',
    unread: true,
    timestamp: '5 phút trước'
  },
  {
    id: 2,
    type: 'match',
    href: '/jobs/456',
    unread: false,
    timestamp: '2 giờ trước'
  },
  {
    id: 3,
    type: 'status',
    href: '/applications/789',
    unread: false,
    timestamp: '1 ngày trước'
  }
];

export default function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'unread'
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);
  const dropdownRef = useRef(null);

  const unreadCount = notifications.filter((item) => item.unread).length;
  const filteredNotifications =
    activeTab === 'unread'
      ? notifications.filter((item) => item.unread)
      : notifications;

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAllAsRead = () => {
    setNotifications((prev) => prev.map((item) => ({ ...item, unread: false })));
  };

  const handleNotificationClick = (id) => {
    setNotifications((prev) =>
      prev.map((item) => (item.id === id ? { ...item, unread: false } : item))
    );
    setIsOpen(false);
  };

  const renderIcon = (type) => {
    if (type === 'invite') {
      return (
        <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
          <Building2 className="w-4 h-4" />
        </div>
      );
    }
    if (type === 'match') {
      return (
        <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-500 flex items-center justify-center shrink-0">
          <Zap className="w-4 h-4" />
        </div>
      );
    }
    return (
      <div className="w-9 h-9 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center shrink-0">
        <Eye className="w-4 h-4" />
      </div>
    );
  };

  const renderContent = (type) => {
    if (type === 'invite') {
      return (
        <p className="text-xs sm:text-sm text-slate-700 leading-snug">
          Công ty <strong className="font-semibold text-slate-900">TechCorp Inc.</strong> vừa gửi cho bạn một lời mời phỏng vấn cho vị trí{' '}
          <strong className="font-semibold text-slate-900">Senior React Developer</strong>.
        </p>
      );
    }
    if (type === 'match') {
      return (
        <p className="text-xs sm:text-sm text-slate-700 leading-snug">
          🔥 AI Match: Công việc <strong className="font-semibold text-slate-900">Backend Node.js</strong> tại{' '}
          <strong className="font-semibold text-slate-900">FinTech Co.</strong> phù hợp với bạn{' '}
          <strong className="font-bold text-emerald-600">85%</strong>. Ứng tuyển ngay!
        </p>
      );
    }
    return (
      <p className="text-xs sm:text-sm text-slate-700 leading-snug">
        Nhà tuyển dụng <strong className="font-semibold text-slate-900">DesignStudio</strong> đã xem hồ sơ ứng tuyển của bạn cho vị trí{' '}
        <strong className="font-semibold text-slate-900">UI/UX Designer</strong>.
      </p>
    );
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Nút Chuông Thông Báo (Trigger) */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Thông báo"
        className="relative p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors focus:outline-none cursor-pointer"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span
            aria-label={`${unreadCount} thông báo chưa đọc`}
            className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-white"
          />
        )}
      </button>

      {/* Bảng Thông Báo Thả Xuống (Dropdown Panel) */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white shadow-lg rounded-xl border border-gray-200 z-50 overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-gray-100 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800">Thông báo</h3>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllAsRead}
                  className="text-xs font-medium text-slate-500 hover:text-blue-600 transition-colors cursor-pointer"
                >
                  Đánh dấu đã đọc
                </button>
              )}
            </div>

            {/* Tabs: Tất cả & Chưa đọc */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  activeTab === 'all'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                }`}
              >
                Tất cả ({notifications.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('unread')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  activeTab === 'unread'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                }`}
              >
                Chưa đọc ({unreadCount})
              </button>
            </div>
          </div>

          {/* Danh sách thông báo có thanh cuộn */}
          <div className="max-h-[400px] overflow-y-auto divide-y divide-gray-100">
            {filteredNotifications.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                Bạn không có thông báo nào chưa đọc.
              </div>
            ) : (
              filteredNotifications.map((item) => (
                <a
                  key={item.id}
                  href={item.href}
                  onClick={() => handleNotificationClick(item.id)}
                  className={`flex items-start gap-3.5 p-4 transition-colors hover:bg-gray-50 ${
                    item.unread ? 'bg-blue-50/50' : 'bg-white'
                  }`}
                >
                  {/* Icon bên trái */}
                  {renderIcon(item.type)}

                  {/* Nội dung chính & Thời gian */}
                  <div className="flex-1 min-w-0 space-y-1">
                    {renderContent(item.type)}
                    <p className="text-xs text-gray-500">{item.timestamp}</p>
                  </div>

                  {/* Chấm xanh nhỏ bên phải nếu chưa đọc */}
                  {item.unread && (
                    <span
                      aria-label="Chưa đọc"
                      className="w-2 h-2 rounded-full bg-blue-600 shrink-0 mt-1.5"
                    />
                  )}
                </a>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

