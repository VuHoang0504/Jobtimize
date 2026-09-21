import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { 
  Building2, 
  PlusCircle, 
  Briefcase, 
  Users, 
  Calendar, 
  ArrowRight, 
  Clock, 
  ExternalLink,
  Sparkles,
  Layers
} from 'lucide-react';

export default function EmployerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [profRes, jobsRes] = await Promise.all([
          api.get('/employer/profile'),
          api.get('/employer/jobs')
        ]);
        if (profRes.data.success) setProfile(profRes.data.data);
        if (jobsRes.data.success) setJobs(jobsRes.data.data);
      } catch (err) {
        console.error('Employer dashboard error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const totalApplicants = jobs.reduce((sum, j) => sum + (j.TotalApplicants || 0), 0);
  const totalInterviewing = jobs.reduce((sum, j) => sum + (j.TotalInterviewing || 0), 0);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center animate-pulse space-y-4">
        <div className="h-6 bg-gray-200 rounded w-1/4 mx-auto"></div>
        <div className="h-64 bg-gray-200 rounded-2xl max-w-4xl mx-auto"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Employer Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/80 shadow-card flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <img
            src={profile?.CompanyLogoUrl || 'https://images.unsplash.com/photo-1549923746-c502d488b3ea?w=150&q=80'}
            alt={profile?.CompanyName}
            className="w-18 h-18 rounded-2xl object-cover border-2 border-brand-green/30 shadow-md"
          />
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
              {profile?.CompanyName || 'Công ty Tuyển dụng'}
            </h1>
            <p className="text-xs text-gray-500 font-semibold">
              Người đại diện: <span className="text-gray-800">{profile?.FullName || user?.fullName}</span> • {profile?.Email}
            </p>
            <span className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-extrabold border border-emerald-200">
              ✓ Doanh nghiệp đã xác thực KYC
            </span>
          </div>
        </div>

        <div>
          <Link
            to="/employer/post-job"
            className="px-6 py-3 rounded-2xl bg-brand-green hover:bg-brand-greenDark text-white font-bold text-sm shadow-md shadow-brand-green/20 flex items-center gap-2 transition-all hover:gap-3"
          >
            <PlusCircle className="w-4 h-4" />
            Đăng tin tuyển dụng mới
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-card space-y-2">
          <p className="text-xs font-bold text-gray-400 uppercase">Tin đang đăng tuyển</p>
          <p className="text-3xl font-black text-brand-blue">{jobs.length}</p>
          <p className="text-xs text-gray-500">Chiến dịch tuyển dụng đang mở</p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-card space-y-2">
          <p className="text-xs font-bold text-gray-400 uppercase">Tổng lượt ứng viên nộp hồ sơ</p>
          <p className="text-3xl font-black text-brand-green">{totalApplicants}</p>
          <p className="text-xs text-gray-500">Được AI tự động chấm điểm Match Score</p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-card space-y-2">
          <p className="text-xs font-bold text-gray-400 uppercase">Ứng viên đang phỏng vấn</p>
          <p className="text-3xl font-black text-brand-purple">{totalInterviewing}</p>
          <p className="text-xs text-gray-500">Đã lên lịch hoặc đang phỏng vấn</p>
        </div>
      </div>

      {/* Job Postings & ATS Shortcuts List */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/80 shadow-card space-y-6">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-brand-blue" />
            <h2 className="text-base font-bold text-gray-900">Quản lý Tin tuyển dụng & Hệ thống ATS (UC-E08)</h2>
          </div>
          <span className="text-xs font-bold text-gray-500">{jobs.length} tin</span>
        </div>

        {jobs.length === 0 ? (
          <div className="text-center py-12 space-y-4">
            <p className="text-sm text-gray-500">Doanh nghiệp chưa có tin đăng tuyển nào.</p>
            <Link
              to="/employer/post-job"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-green text-white rounded-xl text-xs font-bold shadow-md shadow-brand-green/20"
            >
              <PlusCircle className="w-4 h-4" />
              Tạo tin tuyển dụng đầu tiên
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {jobs.map((job) => (
              <div
                key={job.JobID}
                className="p-5 rounded-2xl border border-gray-200 hover:border-brand-blue/40 bg-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-gray-900">{job.Title}</h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800">
                      {job.Status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 font-semibold">
                    Lương: <span className="text-emerald-600">{job.SalaryRange || 'Thỏa thuận'}</span> • Khu vực: {job.Location} • Ngành nghề: {job.CategoryName || 'IT'}
                  </p>
                  <p className="text-[11px] text-gray-400">
                    Đăng ngày: {new Date(job.CreatedAt).toLocaleDateString('vi-VN')}
                  </p>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
                  <div className="text-right px-4 py-2 bg-gray-50 rounded-xl border border-gray-100">
                    <p className="text-[10px] uppercase font-bold text-gray-400">Ứng viên</p>
                    <p className="text-base font-black text-brand-blue">{job.TotalApplicants || 0}</p>
                  </div>

                  <Link
                    to={`/employer/ats/${job.JobID}`}
                    className="px-5 py-2.5 bg-brand-blue hover:bg-brand-dark text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 transition-colors"
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Mở ATS Xếp hạng AI</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
