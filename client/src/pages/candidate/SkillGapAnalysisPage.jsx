import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { Sparkles, CheckCircle2, BookOpen, ExternalLink, ArrowRight, TrendingUp, Compass } from 'lucide-react';

export default function SkillGapAnalysisPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get('/candidate/skill-gap');
        if (res.data.success) {
          setData(res.data.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/3 mx-auto"></div>
        <div className="h-64 bg-gray-200 rounded-2xl max-w-3xl mx-auto"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      
      {/* Header */}
      <div className="text-center space-y-3 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-purpleLight text-brand-purple text-xs font-bold border border-brand-purple/20">
          <Sparkles className="w-4 h-4 animate-spin" style={{ animationDuration: '4s' }} />
          <span>Hệ Thống Trí Tuệ Nhân Tạo AI Jobtimize</span>
        </div>
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">
          Phân Tích Lỗ Hổng Kỹ Năng & Lộ Trình Học Cá Nhân
        </h1>
        <p className="text-sm text-gray-600">
          AI quét toàn bộ CV và đối chiếu với xu hướng tuyển dụng thực tế trên thị trường để xây dựng kế hoạch bứt phá sự nghiệp cho bạn.
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-card space-y-2">
          <p className="text-xs font-bold text-gray-400 uppercase">Kỹ năng hiện có</p>
          <p className="text-3xl font-black text-emerald-600">{data?.acquiredSkills?.length || 0}</p>
          <p className="text-xs text-gray-500">Đã được ghi nhận trong CV của bạn</p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-card space-y-2">
          <p className="text-xs font-bold text-gray-400 uppercase">Kỹ năng thị trường đang săn đón</p>
          <p className="text-3xl font-black text-brand-blue">{data?.marketSkillTrends?.length || 0}</p>
          <p className="text-xs text-gray-500">Dựa trên các JD đang mở tuyển</p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-card space-y-2">
          <p className="text-xs font-bold text-gray-400 uppercase">Khóa học được gợi ý</p>
          <p className="text-3xl font-black text-brand-purple">{data?.recommendedCourses?.length || 0}</p>
          <p className="text-xs text-gray-500">Từ các nền tảng hàng đầu Coursera / Udemy</p>
        </div>
      </div>

      {/* Courses Grid */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/80 shadow-card space-y-6">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <Compass className="w-5 h-5 text-brand-purple" />
          Lộ trình Khóa học Đề xuất (Personalized Learning Path)
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {data?.recommendedCourses?.map((course) => (
            <div
              key={course.CourseID}
              className="group p-5 rounded-2xl border border-gray-200/80 hover:border-brand-purple/50 bg-white hover:bg-brand-purpleLight/10 shadow-xs transition-all space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-brand-purple">
                  <span>Nền tảng: {course.Provider}</span>
                  <span className="px-2 py-0.5 rounded-full bg-purple-50 text-brand-purple border border-purple-200">
                    Bù đắp: {course.SkillName}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-gray-900 group-hover:text-brand-purple transition-colors">
                  {course.Title}
                </h3>
              </div>

              <a
                href={course.Url}
                target="_blank"
                rel="noreferrer"
                className="w-full py-2.5 px-4 rounded-xl bg-gray-50 group-hover:bg-brand-purple text-gray-700 group-hover:text-white font-bold text-xs flex items-center justify-center gap-2 transition-all"
              >
                <span>Xem khóa học</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
