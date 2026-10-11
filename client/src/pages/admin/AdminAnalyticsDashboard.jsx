import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import {
  TrendingUp,
  DollarSign,
  Users,
  Briefcase,
  FileCheck,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  RefreshCw,
  Calendar,
  Building2,
  Sparkles,
  PieChart as PieChartIcon,
  BarChart3,
  Layers,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  ChevronRight,
  Zap,
  Globe2,
  Award
} from 'lucide-react';

export default function AdminAnalyticsDashboard() {
  const [timeRange, setTimeRange] = useState('6m'); // '7d' | '30d' | '6m' | '1y'
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [chartMetric, setChartMetric] = useState('revenue'); // 'revenue' | 'orders'

  // Transactions table state
  const [txSearch, setTxSearch] = useState('');
  const [txPaymentFilter, setTxPaymentFilter] = useState('all');

  // Load analytics report
  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get(`/admin/analytics?timeRange=${timeRange}`);
      if (res.data?.success) {
        setData(res.data.data);
      } else {
        setError(res.data?.message || 'Không thể tải dữ liệu báo cáo');
      }
    } catch (err) {
      console.error('Fetch analytics failed:', err);
      setError(err.response?.data?.message || 'Lỗi kết nối máy chủ khi lấy dữ liệu thống kê');
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Format currency VNĐ
  const formatVND = (amount) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);
  };

  // Format compact number (1.2K, 3.5M)
  const formatCompact = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + ' tr';
    if (num >= 1000) return (num / 1000).toFixed(1) + ' k';
    return num;
  };

  // Filter recent transactions
  const filteredTransactions = useMemo(() => {
    if (!data?.recentTransactions) return [];
    return data.recentTransactions.filter(tx => {
      const matchSearch = txSearch === '' || 
        tx.companyName?.toLowerCase().includes(txSearch.toLowerCase()) ||
        tx.transactionCode?.toLowerCase().includes(txSearch.toLowerCase()) ||
        tx.packageName?.toLowerCase().includes(txSearch.toLowerCase());
      const matchPayment = txPaymentFilter === 'all' || tx.paymentMethod === txPaymentFilter;
      return matchSearch && matchPayment;
    });
  }, [data?.recentTransactions, txSearch, txPaymentFilter]);

  // Export report to CSV
  const handleExportCSV = () => {
    if (!data) return;
    const headers = ['Mã Giao Dịch', 'Doanh Nghiệp', 'Gói Dịch Vụ', 'Số Tiền (VNĐ)', 'Phương Thức', 'Trạng Thái', 'Ngày Giao Dịch'];
    const rows = (data.recentTransactions || []).map(tx => [
      `"${tx.transactionCode || ''}"`,
      `"${tx.companyName || ''}"`,
      `"${tx.packageName || ''}"`,
      tx.amount || 0,
      `"${tx.paymentMethod || ''}"`,
      `"${tx.paymentStatus === 'Completed' ? 'Thành công' : tx.paymentStatus}"`,
      `"${new Date(tx.startDate).toLocaleDateString('vi-VN')}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `jobtimize-revenue-report-${timeRange}-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // SVG Area Chart calculations for Revenue
  const revenueChartConfig = useMemo(() => {
    if (!data?.timeline || data.timeline.length === 0) return null;
    const timeline = data.timeline;
    const values = timeline.map(d => chartMetric === 'revenue' ? d.revenue : d.orders);
    const maxVal = Math.max(...values, chartMetric === 'revenue' ? 5000000 : 5);
    const minVal = 0;

    const width = 760;
    const height = 240;
    const padX = 40;
    const padTop = 20;
    const padBottom = 35;
    const chartW = width - padX * 2;
    const chartH = height - padTop - padBottom;

    const points = timeline.map((d, i) => {
      const x = padX + (chartW / Math.max(1, timeline.length - 1)) * i;
      const val = chartMetric === 'revenue' ? d.revenue : d.orders;
      const y = padTop + chartH - ((val - minVal) / (maxVal - minVal || 1)) * chartH;
      return { x, y, data: d, val };
    });

    // Generate smooth SVG path
    let linePath = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const cur = points[i];
      const cx1 = prev.x + (cur.x - prev.x) / 2;
      const cy1 = prev.y;
      const cx2 = prev.x + (cur.x - prev.x) / 2;
      const cy2 = cur.y;
      linePath += ` C ${cx1} ${cy1}, ${cx2} ${cy2}, ${cur.x} ${cur.y}`;
    }

    const areaPath = `${linePath} L ${points[points.length - 1].x} ${padTop + chartH} L ${points[0].x} ${padTop + chartH} Z`;

    // Horizontal grid lines (4 ticks)
    const yTicks = [0, 0.33, 0.66, 1].map(ratio => {
      const val = minVal + ratio * (maxVal - minVal);
      const y = padTop + chartH - ratio * chartH;
      return {
        y,
        label: chartMetric === 'revenue' ? formatCompact(val) : Math.round(val)
      };
    });

    return { points, linePath, areaPath, yTicks, width, height, padX, padTop, padBottom, chartH, maxVal };
  }, [data?.timeline, chartMetric]);

  // SVG User Growth Grouped Bar Chart calculations
  const userGrowthConfig = useMemo(() => {
    if (!data?.timeline || data.timeline.length === 0) return null;
    const timeline = data.timeline;
    const maxVal = Math.max(...timeline.map(d => Math.max(d.newCandidates, d.newEmployers)), 10);

    const width = 500;
    const height = 240;
    const padX = 35;
    const padTop = 20;
    const padBottom = 35;
    const chartW = width - padX * 2;
    const chartH = height - padTop - padBottom;
    const groupW = chartW / timeline.length;
    const barW = Math.max(8, Math.min(18, groupW * 0.32));

    const groups = timeline.map((d, i) => {
      const groupCenter = padX + groupW * i + groupW / 2;
      const candH = (d.newCandidates / maxVal) * chartH;
      const empH = (d.newEmployers / maxVal) * chartH;

      return {
        label: d.label,
        data: d,
        cand: {
          x: groupCenter - barW - 2,
          y: padTop + chartH - candH,
          w: barW,
          h: Math.max(2, candH),
          val: d.newCandidates
        },
        emp: {
          x: groupCenter + 2,
          y: padTop + chartH - empH,
          w: barW,
          h: Math.max(2, empH),
          val: d.newEmployers
        }
      };
    });

    return { groups, width, height, padX, padTop, padBottom, chartH, maxVal };
  }, [data?.timeline]);

  // SVG Jobs vs Applications Trend calculations
  const jobsAppsConfig = useMemo(() => {
    if (!data?.timeline || data.timeline.length === 0) return null;
    const timeline = data.timeline;
    const maxVal = Math.max(...timeline.map(d => Math.max(d.jobs, d.applications)), 10);

    const width = 500;
    const height = 240;
    const padX = 35;
    const padTop = 20;
    const padBottom = 35;
    const chartW = width - padX * 2;
    const chartH = height - padTop - padBottom;

    const pointsJobs = timeline.map((d, i) => {
      const x = padX + (chartW / Math.max(1, timeline.length - 1)) * i;
      const y = padTop + chartH - (d.jobs / maxVal) * chartH;
      return { x, y, val: d.jobs, data: d };
    });

    const pointsApps = timeline.map((d, i) => {
      const x = padX + (chartW / Math.max(1, timeline.length - 1)) * i;
      const y = padTop + chartH - (d.applications / maxVal) * chartH;
      return { x, y, val: d.applications, data: d };
    });

    return { pointsJobs, pointsApps, timeline, width, height, padX, padTop, padBottom, chartH, maxVal };
  }, [data?.timeline]);

  const kpi = data?.kpi || {};

  return (
    <div className="min-h-screen bg-slate-50/70 pb-16 pt-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">

        {/* Top Header & Breadcrumbs */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-brand-blue uppercase tracking-wider mb-1">
              <ShieldCheck className="w-4 h-4" />
              <span>Jobtimize Executive Center</span>
              <span className="text-gray-300">•</span>
              <span className="text-gray-500 font-normal">Quản trị tài chính & Thống kê hệ thống</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight flex items-center gap-2.5">
              <span>Báo Cáo Doanh Thu & Thống Kê Hệ Thống</span>
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Theo dõi biểu đồ tăng trưởng người dùng, việc làm và doanh số bán gói dịch vụ trong thời gian thực.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {/* Time filter selector */}
            <div className="inline-flex p-1 bg-gray-100 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600">
              {[
                { id: '7d', label: '7 ngày' },
                { id: '30d', label: '30 ngày' },
                { id: '6m', label: '6 tháng' },
                { id: '1y', label: '1 năm' }
              ].map(item => (
                <button
                  key={item.id}
                  onClick={() => setTimeRange(item.id)}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    timeRange === item.id 
                      ? 'bg-white text-brand-blue font-bold shadow-sm' 
                      : 'hover:text-gray-900'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Refresh Button */}
            <button
              onClick={fetchAnalytics}
              disabled={loading}
              className="p-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 transition-colors shadow-sm disabled:opacity-50"
              title="Làm mới dữ liệu"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-brand-blue' : ''}`} />
            </button>

            {/* Export CSV Button */}
            <button
              onClick={handleExportCSV}
              disabled={loading || !data}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all shadow-emerald-600/20 disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>Xuất Báo Cáo</span>
            </button>

            {/* Link to Admin Users Management */}
            <Link
              to="/admin/users"
              className="flex items-center gap-1 px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-all border border-indigo-200"
            >
              <Users className="w-4 h-4" />
              <span>Quản lý Tài khoản & Duyệt tin</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center justify-between">
            <span>{error}</span>
            <button onClick={fetchAnalytics} className="underline font-bold text-rose-900 ml-4">
              Thử lại
            </button>
          </div>
        )}

        {/* Top KPI Cards (5 Cards) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          
          {/* Card 1: Doanh thu */}
          <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-sm relative overflow-hidden group hover:border-emerald-300 transition-all">
            <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-emerald-50 rounded-full group-hover:scale-125 transition-transform -z-0 opacity-80" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Tổng Doanh Thu</span>
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <DollarSign className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl font-black text-gray-900 tracking-tight">
                {formatVND(kpi.periodRevenue ?? kpi.totalRevenue)}
              </div>
              <div className="flex items-center gap-1.5 mt-2 text-xs">
                {kpi.revenueGrowthRate >= 0 ? (
                  <span className="flex items-center font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                    <ArrowUpRight className="w-3 h-3 mr-0.5" />
                    +{kpi.revenueGrowthRate}%
                  </span>
                ) : (
                  <span className="flex items-center font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">
                    <ArrowDownRight className="w-3 h-3 mr-0.5" />
                    {kpi.revenueGrowthRate}%
                  </span>
                )}
                <span className="text-gray-400">so với kỳ trước</span>
              </div>
              <div className="mt-2 text-[11px] text-gray-500">
                Toàn hệ thống: <strong className="text-gray-800">{formatVND(kpi.totalRevenue)}</strong> ({kpi.periodOrders || 0} đơn)
              </div>
            </div>
          </div>

          {/* Card 2: Tăng trưởng người dùng */}
          <div className="bg-white p-5 rounded-2xl border border-brand-blue/20 shadow-sm relative overflow-hidden group hover:border-brand-blue/40 transition-all">
            <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-blue-50 rounded-full group-hover:scale-125 transition-transform -z-0 opacity-80" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Người Dùng Mới</span>
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-brand-blue flex items-center justify-center font-bold">
                  <Users className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl font-black text-gray-900 tracking-tight">
                +{kpi.periodNewUsers || kpi.totalUsers || 0}
              </div>
              <div className="flex items-center gap-1.5 mt-2 text-xs">
                <span className="flex items-center font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                  <ArrowUpRight className="w-3 h-3 mr-0.5" />
                  +{kpi.userGrowthRate || 0}%
                </span>
                <span className="text-gray-400">tăng trưởng</span>
              </div>
              <div className="mt-2 text-[11px] text-gray-500 flex items-center gap-2">
                <span>Ứng viên: <strong className="text-gray-800">{kpi.totalCandidates || 0}</strong></span>
                <span>•</span>
                <span>NTD: <strong className="text-gray-800">{kpi.totalEmployers || 0}</strong></span>
              </div>
            </div>
          </div>

          {/* Card 3: Tin tuyển dụng mới */}
          <div className="bg-white p-5 rounded-2xl border border-amber-100 shadow-sm relative overflow-hidden group hover:border-amber-300 transition-all">
            <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-amber-50 rounded-full group-hover:scale-125 transition-transform -z-0 opacity-80" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Việc Làm Đăng</span>
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                  <Briefcase className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl font-black text-gray-900 tracking-tight">
                {kpi.periodNewJobs ?? kpi.totalJobs ?? 0} <span className="text-sm font-medium text-gray-400">tin</span>
              </div>
              <div className="flex items-center gap-1.5 mt-2 text-xs">
                <span className="flex items-center font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                  <ArrowUpRight className="w-3 h-3 mr-0.5" />
                  +{kpi.jobGrowthRate || 0}%
                </span>
                <span className="text-gray-400">kỳ này</span>
              </div>
              <div className="mt-2 text-[11px] text-gray-500">
                Tổng tin hệ thống: <strong className="text-gray-800">{kpi.totalJobs || 0} JD</strong>
              </div>
            </div>
          </div>

          {/* Card 4: Lượt ứng tuyển & AI Match Score */}
          <div className="bg-white p-5 rounded-2xl border border-purple-100 shadow-sm relative overflow-hidden group hover:border-purple-300 transition-all">
            <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-purple-50 rounded-full group-hover:scale-125 transition-transform -z-0 opacity-80" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Lượt Ứng Tuyển</span>
                <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                  <FileCheck className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl font-black text-gray-900 tracking-tight">
                {kpi.totalApplications || 0} <span className="text-sm font-medium text-gray-400">CV</span>
              </div>
              <div className="flex items-center gap-1.5 mt-2 text-xs">
                <span className="flex items-center font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded">
                  <Sparkles className="w-3 h-3 mr-0.5" />
                  {kpi.avgMatchScore || 85}%
                </span>
                <span className="text-gray-500 font-medium">AI Match TB</span>
              </div>
              <div className="mt-2 text-[11px] text-gray-500">
                Trong kỳ: <strong className="text-gray-800">{kpi.periodApplications || kpi.totalApplications || 0} lượt nộp</strong>
              </div>
            </div>
          </div>

          {/* Card 5: ARPU (Doanh thu TB / NTD trả phí) */}
          <div className="bg-white p-5 rounded-2xl border border-indigo-100 shadow-sm relative overflow-hidden group hover:border-indigo-300 transition-all">
            <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-indigo-50 rounded-full group-hover:scale-125 transition-transform -z-0 opacity-80" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">ARPU Doanh Nghiệp</span>
                <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                  <Award className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl font-black text-gray-900 tracking-tight">
                {formatVND(kpi.arpu || 0)}
              </div>
              <div className="flex items-center gap-1.5 mt-2 text-xs text-indigo-700 font-semibold">
                <Zap className="w-3.5 h-3.5 text-indigo-500" />
                <span>{kpi.payingEmployers || 0} DN có trả phí</span>
              </div>
              <div className="mt-2 text-[11px] text-gray-500">
                Hiệu suất khai thác khách hàng B2B
              </div>
            </div>
          </div>

        </div>

        {/* Charts Row 1: Revenue Timeline (Full width or main chart) */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700">
                  <TrendingUp className="w-4 h-4" />
                </span>
                <h2 className="text-lg font-bold text-gray-900 tracking-tight">
                  Biểu Đồ Tăng Trưởng Doanh Thu
                </h2>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Theo dõi biến động dòng tiền và số lượng giao dịch đăng ký gói tuyển dụng theo mốc thời gian
              </p>
            </div>

            {/* Toggle Metric */}
            <div className="flex items-center gap-2">
              <div className="inline-flex p-1 bg-gray-100 rounded-xl text-xs font-semibold text-gray-600">
                <button
                  onClick={() => setChartMetric('revenue')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    chartMetric === 'revenue' 
                      ? 'bg-white text-emerald-700 font-bold shadow-sm' 
                      : 'hover:text-gray-900'
                  }`}
                >
                  Doanh thu (VNĐ)
                </button>
                <button
                  onClick={() => setChartMetric('orders')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    chartMetric === 'orders' 
                      ? 'bg-white text-emerald-700 font-bold shadow-sm' 
                      : 'hover:text-gray-900'
                  }`}
                >
                  Số đơn hàng
                </button>
              </div>
            </div>
          </div>

          {/* SVG Area Chart */}
          {revenueChartConfig ? (
            <div className="relative w-full overflow-hidden">
              <svg 
                viewBox={`0 0 ${revenueChartConfig.width} ${revenueChartConfig.height}`} 
                className="w-full h-64 sm:h-72 overflow-visible select-none"
              >
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Horizontal Grid Lines */}
                {revenueChartConfig.yTicks.map((tick, idx) => (
                  <g key={idx}>
                    <line
                      x1={revenueChartConfig.padX}
                      y1={tick.y}
                      x2={revenueChartConfig.width - revenueChartConfig.padX}
                      y2={tick.y}
                      stroke="#f1f5f9"
                      strokeWidth="1"
                      strokeDasharray="4 4"
                    />
                    <text
                      x={revenueChartConfig.padX - 8}
                      y={tick.y + 4}
                      textAnchor="end"
                      fontSize="10"
                      fill="#94a3b8"
                      fontWeight="500"
                    >
                      {tick.label}
                    </text>
                  </g>
                ))}

                {/* Area and Line */}
                <path d={revenueChartConfig.areaPath} fill="url(#revenueGradient)" />
                <path 
                  d={revenueChartConfig.linePath} 
                  fill="none" 
                  stroke="#059669" 
                  strokeWidth="3" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                />

                {/* Data Points */}
                {revenueChartConfig.points.map((pt, idx) => {
                  const isHovered = hoveredPoint?.index === idx && hoveredPoint?.chart === 'revenue';
                  return (
                    <g key={idx}>
                      {/* X-axis label */}
                      <text
                        x={pt.x}
                        y={revenueChartConfig.height - 8}
                        textAnchor="middle"
                        fontSize="11"
                        fill={isHovered ? '#047857' : '#64748b'}
                        fontWeight={isHovered ? 'bold' : '500'}
                      >
                        {pt.data.label}
                      </text>

                      {/* Interactive Point Circle */}
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r={isHovered ? 6 : 4}
                        fill={isHovered ? '#047857' : '#ffffff'}
                        stroke="#059669"
                        strokeWidth="2.5"
                        className="cursor-pointer transition-all duration-150"
                        onMouseEnter={() => setHoveredPoint({ chart: 'revenue', index: idx, pt })}
                        onMouseLeave={() => setHoveredPoint(null)}
                      />
                    </g>
                  );
                })}
              </svg>

              {/* Hover Tooltip Popup */}
              {hoveredPoint?.chart === 'revenue' && (
                <div 
                  className="absolute pointer-events-none bg-gray-900 text-white text-xs px-3 py-2 rounded-xl shadow-xl border border-gray-800 -translate-x-1/2 -translate-y-full mb-3 z-30 transition-all"
                  style={{
                    left: `${(hoveredPoint.pt.x / revenueChartConfig.width) * 100}%`,
                    top: `${(hoveredPoint.pt.y / revenueChartConfig.height) * 100}%`
                  }}
                >
                  <div className="font-bold text-gray-200 border-b border-gray-700 pb-1 mb-1">
                    {hoveredPoint.pt.data.fullLabel}
                  </div>
                  <div className="flex items-center justify-between gap-3 text-emerald-400 font-bold">
                    <span>Doanh thu:</span>
                    <span>{formatVND(hoveredPoint.pt.data.revenue)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-gray-300">
                    <span>Số đơn hàng:</span>
                    <span>{hoveredPoint.pt.data.orders} đơn</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400 text-sm">
              Đang tải dữ liệu biểu đồ...
            </div>
          )}
        </div>

        {/* Charts Row 2: User Growth Chart & Job Postings / Applications */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Chart 2: User Growth (Grouped Bar Chart) */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-blue-100 text-brand-blue">
                      <Users className="w-4 h-4" />
                    </span>
                    <h3 className="text-base font-bold text-gray-900">
                      Tăng Trưởng Người Dùng Mới
                    </h3>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    So sánh số lượng Ứng viên và Doanh nghiệp đăng ký qua các mốc thời gian
                  </p>
                </div>
                {/* Legend */}
                <div className="flex items-center gap-3 text-xs font-semibold">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-brand-blue" />
                    <span className="text-gray-600">Ứng viên</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-indigo-600" />
                    <span className="text-gray-600">Doanh nghiệp</span>
                  </div>
                </div>
              </div>

              {/* Grouped Bar Chart */}
              {userGrowthConfig ? (
                <div className="relative w-full overflow-hidden">
                  <svg 
                    viewBox={`0 0 ${userGrowthConfig.width} ${userGrowthConfig.height}`} 
                    className="w-full h-56 select-none overflow-visible"
                  >
                    {/* Horizontal reference line */}
                    <line
                      x1={userGrowthConfig.padX}
                      y1={userGrowthConfig.padTop + userGrowthConfig.chartH}
                      x2={userGrowthConfig.width - userGrowthConfig.padX}
                      y2={userGrowthConfig.padTop + userGrowthConfig.chartH}
                      stroke="#cbd5e1"
                      strokeWidth="1"
                    />

                    {userGrowthConfig.groups.map((grp, idx) => {
                      const isHovered = hoveredPoint?.index === idx && hoveredPoint?.chart === 'user';
                      return (
                        <g key={idx}>
                          {/* Candidate Bar */}
                          <rect
                            x={grp.cand.x}
                            y={grp.cand.y}
                            width={grp.cand.w}
                            height={grp.cand.h}
                            rx="3"
                            fill="#0A66C2"
                            className="transition-all hover:opacity-80 cursor-pointer"
                            onMouseEnter={() => setHoveredPoint({ chart: 'user', index: idx, grp })}
                            onMouseLeave={() => setHoveredPoint(null)}
                          />

                          {/* Employer Bar */}
                          <rect
                            x={grp.emp.x}
                            y={grp.emp.y}
                            width={grp.emp.w}
                            height={grp.emp.h}
                            rx="3"
                            fill="#4f46e5"
                            className="transition-all hover:opacity-80 cursor-pointer"
                            onMouseEnter={() => setHoveredPoint({ chart: 'user', index: idx, grp })}
                            onMouseLeave={() => setHoveredPoint(null)}
                          />

                          {/* X-axis Label */}
                          <text
                            x={(grp.cand.x + grp.emp.x + grp.emp.w) / 2}
                            y={userGrowthConfig.height - 8}
                            textAnchor="middle"
                            fontSize="11"
                            fill={isHovered ? '#0A66C2' : '#64748b'}
                            fontWeight={isHovered ? 'bold' : '500'}
                          >
                            {grp.label}
                          </text>
                        </g>
                      );
                    })}
                  </svg>

                  {/* Tooltip for User Chart */}
                  {hoveredPoint?.chart === 'user' && (
                    <div 
                      className="absolute pointer-events-none bg-gray-900 text-white text-xs px-3 py-2 rounded-xl shadow-xl border border-gray-800 -translate-x-1/2 -translate-y-full mb-3 z-30 transition-all"
                      style={{
                        left: `${((hoveredPoint.grp.cand.x + hoveredPoint.grp.emp.x) / 2 / userGrowthConfig.width) * 100}%`,
                        top: `${(Math.min(hoveredPoint.grp.cand.y, hoveredPoint.grp.emp.y) / userGrowthConfig.height) * 100}%`
                      }}
                    >
                      <div className="font-bold text-gray-200 border-b border-gray-700 pb-1 mb-1">
                        {hoveredPoint.grp.data.fullLabel}
                      </div>
                      <div className="flex items-center justify-between gap-3 text-blue-400">
                        <span>Ứng viên mới:</span>
                        <span className="font-bold">+{hoveredPoint.grp.data.newCandidates}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3 text-indigo-400">
                        <span>Doanh nghiệp mới:</span>
                        <span className="font-bold">+{hoveredPoint.grp.data.newEmployers}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3 text-gray-300 border-t border-gray-800 pt-1 mt-1 font-semibold">
                        <span>Tổng người dùng mới:</span>
                        <span>+{hoveredPoint.grp.data.newUsers}</span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-56 flex items-center justify-center text-gray-400 text-xs">
                  Đang tải biểu đồ người dùng...
                </div>
              )}
            </div>

            <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
              <span>Tổng ứng viên lũy kế: <strong className="text-gray-900">{kpi.totalCandidates || 0}</strong></span>
              <span>Tổng doanh nghiệp lũy kế: <strong className="text-gray-900">{kpi.totalEmployers || 0}</strong></span>
            </div>
          </div>

          {/* Chart 3: Jobs vs Applications Trend */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-amber-100 text-amber-700">
                      <Briefcase className="w-4 h-4" />
                    </span>
                    <h3 className="text-base font-bold text-gray-900">
                      Tin Tuyển Dụng & Lượt Ứng Tuyển
                    </h3>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Tương quan giữa số lượng việc làm mở mới và số hồ sơ ứng viên nộp vào
                  </p>
                </div>
                {/* Legend */}
                <div className="flex items-center gap-3 text-xs font-semibold">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-amber-500" />
                    <span className="text-gray-600">Việc làm mới</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-purple-600" />
                    <span className="text-gray-600">Lượt nộp CV</span>
                  </div>
                </div>
              </div>

              {/* Dual Line Chart */}
              {jobsAppsConfig ? (
                <div className="relative w-full overflow-hidden">
                  <svg 
                    viewBox={`0 0 ${jobsAppsConfig.width} ${jobsAppsConfig.height}`} 
                    className="w-full h-56 select-none overflow-visible"
                  >
                    {/* Horizontal reference line */}
                    <line
                      x1={jobsAppsConfig.padX}
                      y1={jobsAppsConfig.padTop + jobsAppsConfig.chartH}
                      x2={jobsAppsConfig.width - jobsAppsConfig.padX}
                      y2={jobsAppsConfig.padTop + jobsAppsConfig.chartH}
                      stroke="#cbd5e1"
                      strokeWidth="1"
                    />

                    {/* Jobs line */}
                    {jobsAppsConfig.pointsJobs.length > 1 && (
                      <path
                        d={`M ${jobsAppsConfig.pointsJobs.map(p => `${p.x} ${p.y}`).join(' L ')}`}
                        fill="none"
                        stroke="#f59e0b"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      />
                    )}

                    {/* Apps line */}
                    {jobsAppsConfig.pointsApps.length > 1 && (
                      <path
                        d={`M ${jobsAppsConfig.pointsApps.map(p => `${p.x} ${p.y}`).join(' L ')}`}
                        fill="none"
                        stroke="#9333ea"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeDasharray="4 2"
                      />
                    )}

                    {/* Points */}
                    {jobsAppsConfig.timeline.map((item, idx) => {
                      const pj = jobsAppsConfig.pointsJobs[idx];
                      const pa = jobsAppsConfig.pointsApps[idx];
                      const isHovered = hoveredPoint?.index === idx && hoveredPoint?.chart === 'jobapp';
                      return (
                        <g key={idx}>
                          <text
                            x={pj.x}
                            y={jobsAppsConfig.height - 8}
                            textAnchor="middle"
                            fontSize="11"
                            fill={isHovered ? '#9333ea' : '#64748b'}
                            fontWeight={isHovered ? 'bold' : '500'}
                          >
                            {item.label}
                          </text>

                          {/* Job Circle */}
                          <circle
                            cx={pj.x}
                            cy={pj.y}
                            r={isHovered ? 5.5 : 3.5}
                            fill="#ffffff"
                            stroke="#f59e0b"
                            strokeWidth="2.5"
                            className="cursor-pointer"
                            onMouseEnter={() => setHoveredPoint({ chart: 'jobapp', index: idx, data: item, pj, pa })}
                            onMouseLeave={() => setHoveredPoint(null)}
                          />

                          {/* App Circle */}
                          <circle
                            cx={pa.x}
                            cy={pa.y}
                            r={isHovered ? 5.5 : 3.5}
                            fill="#ffffff"
                            stroke="#9333ea"
                            strokeWidth="2.5"
                            className="cursor-pointer"
                            onMouseEnter={() => setHoveredPoint({ chart: 'jobapp', index: idx, data: item, pj, pa })}
                            onMouseLeave={() => setHoveredPoint(null)}
                          />
                        </g>
                      );
                    })}
                  </svg>

                  {/* Tooltip for JobApp Chart */}
                  {hoveredPoint?.chart === 'jobapp' && (
                    <div 
                      className="absolute pointer-events-none bg-gray-900 text-white text-xs px-3 py-2 rounded-xl shadow-xl border border-gray-800 -translate-x-1/2 -translate-y-full mb-3 z-30 transition-all"
                      style={{
                        left: `${(hoveredPoint.pj.x / jobsAppsConfig.width) * 100}%`,
                        top: `${(Math.min(hoveredPoint.pj.y, hoveredPoint.pa.y) / jobsAppsConfig.height) * 100}%`
                      }}
                    >
                      <div className="font-bold text-gray-200 border-b border-gray-700 pb-1 mb-1">
                        {hoveredPoint.data.fullLabel}
                      </div>
                      <div className="flex items-center justify-between gap-3 text-amber-400">
                        <span>Việc làm đăng:</span>
                        <span className="font-bold">{hoveredPoint.data.jobs} JD</span>
                      </div>
                      <div className="flex items-center justify-between gap-3 text-purple-400">
                        <span>Lượt ứng tuyển:</span>
                        <span className="font-bold">{hoveredPoint.data.applications} CV</span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-56 flex items-center justify-center text-gray-400 text-xs">
                  Đang tải dữ liệu việc làm...
                </div>
              )}
            </div>

            <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
              <span>Tỷ lệ phản hồi CV/Job: <strong className="text-gray-900">{kpi.totalJobs > 0 ? (kpi.totalApplications / kpi.totalJobs).toFixed(1) : 0} CV/tin</strong></span>
              <span>Độ tương thích AI TB: <strong className="text-purple-600 font-bold">{kpi.avgMatchScore || 85}%</strong></span>
            </div>
          </div>

        </div>

        {/* Charts Row 3: Package Revenue Breakdown & Category Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Breakdown 1: Packages Distribution */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="p-1.5 rounded-lg bg-indigo-100 text-indigo-700">
                  <CreditCard className="w-4 h-4" />
                </span>
                <h3 className="text-base font-bold text-gray-900">
                  Cơ Cấu Doanh Thu Gói Dịch Vụ
                </h3>
              </div>

              <div className="space-y-3.5">
                {(data?.packagesBreakdown || []).map((pkg, idx) => {
                  const colors = [
                    { bar: 'bg-indigo-600', text: 'text-indigo-600', bg: 'bg-indigo-50' },
                    { bar: 'bg-emerald-600', text: 'text-emerald-600', bg: 'bg-emerald-50' },
                    { bar: 'bg-brand-blue', text: 'text-brand-blue', bg: 'bg-blue-50' }
                  ];
                  const col = colors[idx % colors.length];

                  return (
                    <div key={pkg.packageId} className="p-3 rounded-xl bg-gray-50/80 border border-gray-100">
                      <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                        <span className="text-gray-900 truncate max-w-[180px]">{pkg.packageName}</span>
                        <span className={col.text}>{formatVND(pkg.totalRevenue)}</span>
                      </div>
                      {/* Progress bar */}
                      <div className="w-full h-2 rounded-full bg-gray-200 overflow-hidden">
                        <div 
                          className={`h-full ${col.bar} rounded-full transition-all duration-500`}
                          style={{ width: `${Math.max(5, pkg.percentage || 0)}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-gray-500 mt-1.5">
                        <span>Đã bán: <strong>{pkg.subscriptionCount} lượt</strong></span>
                        <span className="font-semibold text-gray-700">{pkg.percentage}% tổng doanh thu</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Payment Methods */}
            <div className="mt-4 pt-4 border-t border-gray-100">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-2">Cổng thanh toán phổ biến</span>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                {(data?.paymentMethodsBreakdown || []).map(m => (
                  <div key={m.method} className="p-2 rounded-xl bg-gray-50 border border-gray-100">
                    <div className="font-extrabold text-gray-800">{m.method}</div>
                    <div className="text-[10px] text-gray-500 mt-0.5">{m.count} đơn ({m.percentage}%)</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Breakdown 2: Jobs by Category */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="p-1.5 rounded-lg bg-brand-light text-brand-blue">
                  <BarChart3 className="w-4 h-4" />
                </span>
                <h3 className="text-base font-bold text-gray-900">
                  Nhu Cầu Tuyển Dụng Theo Ngành
                </h3>
              </div>

              <div className="space-y-3">
                {(data?.jobsByCategory || []).map((cat, idx) => {
                  const totalJobs = kpi.totalJobs || 1;
                  const pct = Math.round((cat.jobCount / totalJobs) * 100);
                  return (
                    <div key={cat.categoryId} className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-medium">
                        <span className="text-gray-800 truncate max-w-[200px]" title={cat.categoryName}>
                          {cat.categoryName}
                        </span>
                        <span className="text-gray-500 font-bold shrink-0">{cat.jobCount} tin ({pct}%)</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
                        <div 
                          className="h-full bg-brand-blue rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(4, pct)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-gray-100 text-xs text-gray-500 flex items-center justify-between">
              <span>Đang theo dõi: <strong>{data?.jobsByCategory?.length || 0} chuyên ngành</strong></span>
              <Link to="/admin/users" className="text-brand-blue font-bold hover:underline">
                Quản lý ngành nghề &rarr;
              </Link>
            </div>
          </div>

          {/* Breakdown 3: Jobs by Location & Platform Stats */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700">
                  <Globe2 className="w-4 h-4" />
                </span>
                <h3 className="text-base font-bold text-gray-900">
                  Phân Bố Địa Lý & Thị Trường
                </h3>
              </div>

              <div className="space-y-3.5">
                {(data?.jobsByLocation || []).map(loc => {
                  const totalJobs = kpi.totalJobs || 1;
                  const pct = Math.round((loc.jobCount / totalJobs) * 100);
                  const colors = {
                    'Hà Nội': 'bg-blue-600',
                    'TP. Hồ Chí Minh': 'bg-emerald-600',
                    'Đà Nẵng': 'bg-purple-600',
                    'Khác': 'bg-gray-400'
                  };
                  return (
                    <div key={loc.location} className="p-3 rounded-xl bg-gray-50/70 border border-gray-100">
                      <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                        <span className="text-gray-900">{loc.location}</span>
                        <span className="text-gray-700">{loc.jobCount} JD ({pct}%)</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-gray-200 overflow-hidden">
                        <div 
                          className={`h-full ${colors[loc.location] || 'bg-brand-blue'} rounded-full`}
                          style={{ width: `${Math.max(4, pct)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick Summary Pill */}
            <div className="mt-4 p-3 rounded-xl bg-emerald-50/80 border border-emerald-100 text-xs text-emerald-900">
              <div className="font-bold flex items-center gap-1 mb-0.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Thị trường công nghệ trọng điểm</span>
              </div>
              <p className="text-[11px] text-emerald-800 leading-relaxed">
                Hà Nội và TP. Hồ Chí Minh chiếm tỷ trọng việc làm kỹ sư phần mềm cao nhất hệ thống với mức lương cạnh tranh.
              </p>
            </div>
          </div>

        </div>

        {/* Recent Transactions Table */}
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700">
                  <CreditCard className="w-4 h-4" />
                </span>
                <h3 className="text-base font-bold text-gray-900">
                  Lịch Sử Giao Dịch Doanh Thu Gần Đây
                </h3>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Danh sách các giao dịch mua gói dịch vụ từ các Doanh nghiệp trên nền tảng
              </p>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Tìm mã GD, công ty..."
                  value={txSearch}
                  onChange={(e) => setTxSearch(e.target.value)}
                  className="pl-9 pr-3 py-1.5 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-brand-blue/30 w-48"
                />
              </div>

              <select
                value={txPaymentFilter}
                onChange={(e) => setTxPaymentFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-gray-200 text-xs bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
              >
                <option value="all">Mọi cổng thanh toán</option>
                <option value="VNPay">VNPay</option>
                <option value="MoMo">MoMo</option>
                <option value="BankTransfer">Chuyển khoản NH</option>
              </select>

              <button
                onClick={handleExportCSV}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
              >
                <Download className="w-3.5 h-3.5 text-gray-500" />
                <span>Xuất file</span>
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100 text-gray-500 font-bold uppercase tracking-wider">
                  <th className="py-3.5 px-4">Mã Giao Dịch</th>
                  <th className="py-3.5 px-4">Doanh Nghiệp</th>
                  <th className="py-3.5 px-4">Gói Dịch Vụ</th>
                  <th className="py-3.5 px-4">Số Tiền (VNĐ)</th>
                  <th className="py-3.5 px-4">Phương Thức</th>
                  <th className="py-3.5 px-4">Trạng Thái</th>
                  <th className="py-3.5 px-4">Ngày Thanh Toán</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredTransactions.length > 0 ? (
                  filteredTransactions.map(tx => (
                    <tr key={tx.subId} className="hover:bg-gray-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-gray-800">
                        {tx.transactionCode || `TXN-${tx.subId}`}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          {tx.companyLogoUrl ? (
                            <img
                              src={tx.companyLogoUrl}
                              alt={tx.companyName}
                              className="w-7 h-7 rounded-lg object-cover border border-gray-200"
                            />
                          ) : (
                            <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 font-bold">
                              <Building2 className="w-4 h-4" />
                            </div>
                          )}
                          <span className="font-semibold text-gray-900 truncate max-w-[200px]">
                            {tx.companyName}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-gray-800">
                          {tx.packageName}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-emerald-700">
                        {formatVND(tx.amount)}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-700">
                          {tx.paymentMethod}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Thành công</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-gray-500">
                        {new Date(tx.startDate).toLocaleDateString('vi-VN', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit'
                        })}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="py-8 text-center text-gray-400">
                      Không tìm thấy giao dịch nào phù hợp.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="p-4 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span>Hiển thị <strong>{filteredTransactions.length}</strong> giao dịch gần nhất</span>
            <div className="flex items-center gap-2">
              <span className="text-gray-400">Dữ liệu được cập nhật tự động</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

