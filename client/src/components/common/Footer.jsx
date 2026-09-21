import React from 'react';
import { Briefcase, Sparkles, Heart } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 mt-20 pt-12 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-10 border-b border-gray-100">
          
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-brand-blue flex items-center justify-center text-white">
                <Briefcase className="w-4 h-4" />
              </div>
              <span className="text-xl font-bold text-gray-900">
                Job<span className="text-brand-blue">timize</span>
              </span>
            </div>
            <p className="text-sm text-gray-500 leading-relaxed">
              Nền tảng tuyển dụng thông minh tích hợp AI, tối ưu hóa điểm tương thích CV và đề xuất lộ trình khóa học bù đắp kỹ năng thiếu hụt.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-bold text-gray-800 tracking-wide uppercase mb-3">Dành cho Ứng viên</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li><a href="/" className="hover:text-brand-blue">Tìm kiếm việc làm IT</a></li>
              <li><a href="/candidate/dashboard" className="hover:text-brand-blue">Tạo & Quản lý nhiều bản CV</a></li>
              <li><a href="/candidate/skill-gap" className="hover:text-brand-purple flex items-center gap-1">AI Skill Gap Analysis <Sparkles className="w-3 h-3 text-brand-purple" /></a></li>
              <li><a href="/" className="hover:text-brand-blue">Khóa học gợi ý từ AI</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-bold text-gray-800 tracking-wide uppercase mb-3">Dành cho Nhà tuyển dụng</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li><a href="/employer/post-job" className="hover:text-brand-green">Đăng tin tuyển dụng</a></li>
              <li><a href="/employer/dashboard" className="hover:text-brand-green">Hệ thống ATS phân loại AI</a></li>
              <li><a href="/" className="hover:text-brand-green">Gói dịch vụ tuyển dụng</a></li>
              <li><a href="/" className="hover:text-brand-green">Xác thực doanh nghiệp (KYC)</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-bold text-gray-800 tracking-wide uppercase mb-3">Công nghệ & Database</h4>
            <div className="flex flex-wrap gap-2">
              <span className="px-2.5 py-1 text-xs font-semibold rounded-md bg-blue-50 text-blue-700">React + Vite</span>
              <span className="px-2.5 py-1 text-xs font-semibold rounded-md bg-emerald-50 text-emerald-700">Node.js Express</span>
              <span className="px-2.5 py-1 text-xs font-semibold rounded-md bg-amber-50 text-amber-700">MS SQL Server</span>
              <span className="px-2.5 py-1 text-xs font-semibold rounded-md bg-purple-50 text-purple-700">AI Matching Engine</span>
            </div>
            <p className="text-xs text-gray-400 mt-4">Database: JobtimizeDB (MSSQL Localhost:1433)</p>
          </div>

        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-500">
          <p>© 2024 Jobtimize AI Recruitment Platform. Bản quyền thuộc về Jobtimize Team.</p>
          <p className="flex items-center gap-1 mt-2 sm:mt-0">
            Xây dựng với <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500" /> và AI thế hệ mới
          </p>
        </div>
      </div>
    </footer>
  );
}
