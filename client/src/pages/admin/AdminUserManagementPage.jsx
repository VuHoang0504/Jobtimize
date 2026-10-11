import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { 
  Users, 
  Building2, 
  Search, 
  ShieldCheck, 
  ShieldAlert, 
  Lock, 
  Unlock, 
  KeyRound, 
  Eye, 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  ExternalLink, 
  FileText, 
  Briefcase,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Phone,
  Mail,
  MapPin,
  Calendar,
  DollarSign,
  CheckCircle,
  XCircle,
  Edit3,
  Clock,
  Layers,
  FileCheck,
  Flag,
  Tag,
  Folders,
  Plus,
  Trash2,
  FolderPlus,
  SlidersHorizontal,
  BookmarkCheck,
  AlertOctagon,
  BarChart3
} from 'lucide-react';

export default function AdminUserManagementPage() {
  const [activeTab, setActiveTab] = useState('employers'); // 'employers' | 'jobs' | 'reports' | 'taxonomy' | 'candidates'
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);

  // 1. Employers state (Kiểm duyệt giấy phép KD & Tài khoản DN)
  const [employers, setEmployers] = useState([]);
  const [empLoading, setEmpLoading] = useState(false);
  const [empSearch, setEmpSearch] = useState('');
  const [empStatus, setEmpStatus] = useState('all');
  const [empKyc, setEmpKyc] = useState('all');
  const [empPage, setEmpPage] = useState(1);
  const [empPagination, setEmpPagination] = useState({ totalCount: 0, totalPages: 1 });

  // 2. Jobs state (Kiểm duyệt tin tuyển dụng)
  const [jobs, setJobs] = useState([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [jobsSearch, setJobsSearch] = useState('');
  const [jobsStatus, setJobsStatus] = useState('all');
  const [jobsPage, setJobsPage] = useState(1);
  const [jobsPagination, setJobsPagination] = useState({ totalCount: 0, totalPages: 1 });

  // 3. Reports state (Quản lý báo cáo vi phạm)
  const [reports, setReports] = useState([]);
  const [repLoading, setRepLoading] = useState(false);
  const [repStatus, setRepStatus] = useState('all');
  const [repType, setRepType] = useState('all');
  const [repPage, setRepPage] = useState(1);
  const [repPagination, setRepPagination] = useState({ totalCount: 0, totalPages: 1 });

  // 4. Taxonomy state (CRUD Ngành nghề & Kỹ năng)
  const [taxonomyTab, setTaxonomyTab] = useState('categories'); // 'categories' | 'skills'
  const [categoriesList, setCategoriesList] = useState([]);
  const [catLoading, setCatLoading] = useState(false);
  const [skillsList, setSkillsList] = useState([]);
  const [skillLoading, setSkillLoading] = useState(false);
  const [skillSearch, setSkillSearch] = useState('');
  const [skillCatFilter, setSkillCatFilter] = useState('all');
  const [skillPage, setSkillPage] = useState(1);
  const [skillPagination, setSkillPagination] = useState({ totalCount: 0, totalPages: 1 });

  // 5. Candidates state (Tài khoản Người tìm việc)
  const [candidates, setCandidates] = useState([]);
  const [candLoading, setCandLoading] = useState(false);
  const [candSearch, setCandSearch] = useState('');
  const [candStatus, setCandStatus] = useState('all');
  const [candPage, setCandPage] = useState(1);
  const [candPagination, setCandPagination] = useState({ totalCount: 0, totalPages: 1 });

  // Modals state
  const [statusModal, setStatusModal] = useState({ open: false, user: null, targetStatus: '' });
  const [resetPwdModal, setResetPwdModal] = useState({ open: false, user: null, newPassword: '', showPwd: false, error: '' });
  const [empDetailModal, setEmpDetailModal] = useState({ open: false, employer: null, loading: false });
  const [candDetailModal, setCandDetailModal] = useState({ open: false, candidate: null, loading: false });
  const [kycRejectModal, setKycRejectModal] = useState({ open: false, employerId: null, companyName: '', reason: '' });
  
  // Job Moderation Modals
  const [jobDetailModal, setJobDetailModal] = useState({ open: false, job: null, loading: false });
  const [jobActionModal, setJobActionModal] = useState({ open: false, job: null, actionType: '', adminNote: '', loading: false, error: '' });

  // Report Resolution Modal
  const [reportModal, setReportModal] = useState({ open: false, report: null, status: 'Resolved', adminNote: '', actionTaken: 'none', loading: false, error: '' });

  // Taxonomy Modals
  const [catModal, setCatModal] = useState({ open: false, isEdit: false, categoryId: null, categoryName: '', description: '', loading: false, error: '' });
  const [catDeleteModal, setCatDeleteModal] = useState({ open: false, category: null, loading: false, error: '' });
  const [skillModal, setSkillModal] = useState({ open: false, isEdit: false, skillId: null, skillName: '', normalizedName: '', categoryId: '', loading: false, error: '' });
  const [skillDeleteModal, setSkillDeleteModal] = useState({ open: false, skill: null, loading: false, error: '' });

  // Notifications
  const [notification, setNotification] = useState(null);

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  // 1. Fetch Stats
  const fetchStats = async () => {
    try {
      setLoadingStats(true);
      const res = await api.get('/admin/stats');
      if (res.data.success) {
        setStats(res.data.data);
      }
    } catch (err) {
      console.error('Fetch stats failed:', err);
    } finally {
      setLoadingStats(false);
    }
  };

  // 2. Fetch Employers
  const fetchEmployers = useCallback(async () => {
    try {
      setEmpLoading(true);
      const params = {
        page: empPage,
        limit: 10,
        search: empSearch || undefined,
        status: empStatus !== 'all' ? empStatus : undefined,
        kycStatus: empKyc !== 'all' ? empKyc : undefined
      };
      const res = await api.get('/admin/employers', { params });
      if (res.data.success) {
        setEmployers(res.data.data);
        setEmpPagination(res.data.pagination);
      }
    } catch (err) {
      console.error('Fetch employers failed:', err);
      showNotification('error', 'Không thể tải danh sách doanh nghiệp');
    } finally {
      setEmpLoading(false);
    }
  }, [empPage, empSearch, empStatus, empKyc]);

  // 3. Fetch Jobs (Moderation)
  const fetchJobs = useCallback(async () => {
    try {
      setJobsLoading(true);
      const params = {
        page: jobsPage,
        limit: 10,
        search: jobsSearch || undefined,
        status: jobsStatus !== 'all' ? jobsStatus : undefined
      };
      const res = await api.get('/admin/jobs', { params });
      if (res.data.success) {
        setJobs(res.data.data);
        setJobsPagination(res.data.pagination);
      }
    } catch (err) {
      console.error('Fetch jobs failed:', err);
      showNotification('error', 'Không thể tải danh sách tin tuyển dụng');
    } finally {
      setJobsLoading(false);
    }
  }, [jobsPage, jobsSearch, jobsStatus]);

  // 4. Fetch Reports
  const fetchReports = useCallback(async () => {
    try {
      setRepLoading(true);
      const params = {
        page: repPage,
        limit: 10,
        status: repStatus !== 'all' ? repStatus : undefined,
        targetType: repType !== 'all' ? repType : undefined
      };
      const res = await api.get('/admin/reports', { params });
      if (res.data.success) {
        setReports(res.data.data);
        setRepPagination(res.data.pagination);
      }
    } catch (err) {
      console.error('Fetch reports failed:', err);
      showNotification('error', 'Không thể tải danh sách báo cáo');
    } finally {
      setRepLoading(false);
    }
  }, [repPage, repStatus, repType]);

  // 5. Fetch Categories
  const fetchCategoriesAdmin = useCallback(async () => {
    try {
      setCatLoading(true);
      const res = await api.get('/admin/categories');
      if (res.data.success) {
        setCategoriesList(res.data.data);
      }
    } catch (err) {
      console.error('Fetch categories failed:', err);
      showNotification('error', 'Không thể tải danh sách ngành nghề');
    } finally {
      setCatLoading(false);
    }
  }, []);

  // 6. Fetch Skills
  const fetchSkillsAdmin = useCallback(async () => {
    try {
      setSkillLoading(true);
      const params = {
        page: skillPage,
        limit: 12,
        search: skillSearch || undefined,
        categoryId: skillCatFilter !== 'all' ? skillCatFilter : undefined
      };
      const res = await api.get('/admin/skills', { params });
      if (res.data.success) {
        setSkillsList(res.data.data);
        setSkillPagination(res.data.pagination);
      }
    } catch (err) {
      console.error('Fetch skills failed:', err);
      showNotification('error', 'Không thể tải từ điển kỹ năng');
    } finally {
      setSkillLoading(false);
    }
  }, [skillPage, skillSearch, skillCatFilter]);

  // 7. Fetch Candidates
  const fetchCandidates = useCallback(async () => {
    try {
      setCandLoading(true);
      const params = {
        page: candPage,
        limit: 10,
        search: candSearch || undefined,
        status: candStatus !== 'all' ? candStatus : undefined
      };
      const res = await api.get('/admin/candidates', { params });
      if (res.data.success) {
        setCandidates(res.data.data);
        setCandPagination(res.data.pagination);
      }
    } catch (err) {
      console.error('Fetch candidates failed:', err);
      showNotification('error', 'Không thể tải danh sách ứng viên');
    } finally {
      setCandLoading(false);
    }
  }, [candPage, candSearch, candStatus]);

  useEffect(() => {
    fetchStats();
    fetchCategoriesAdmin(); // prefetch categories for dropdowns
  }, [fetchCategoriesAdmin]);

  useEffect(() => {
    if (activeTab === 'employers') {
      fetchEmployers();
    } else if (activeTab === 'jobs') {
      fetchJobs();
    } else if (activeTab === 'reports') {
      fetchReports();
    } else if (activeTab === 'taxonomy') {
      if (taxonomyTab === 'categories') fetchCategoriesAdmin();
      else fetchSkillsAdmin();
    } else {
      fetchCandidates();
    }
  }, [activeTab, taxonomyTab, fetchEmployers, fetchJobs, fetchReports, fetchCategoriesAdmin, fetchSkillsAdmin, fetchCandidates]);

  // Form Submits
  const handleEmpSearchSubmit = (e) => {
    e.preventDefault();
    setEmpPage(1);
    fetchEmployers();
  };

  const handleJobsSearchSubmit = (e) => {
    e.preventDefault();
    setJobsPage(1);
    fetchJobs();
  };

  const handleCandSearchSubmit = (e) => {
    e.preventDefault();
    setCandPage(1);
    fetchCandidates();
  };

  const handleSkillSearchSubmit = (e) => {
    e.preventDefault();
    setSkillPage(1);
    fetchSkillsAdmin();
  };

  // Status Toggle
  const handleToggleStatus = async () => {
    if (!statusModal.user) return;
    try {
      const res = await api.patch(`/admin/users/${statusModal.user.UserID}/status`, {
        status: statusModal.targetStatus
      });
      if (res.data.success) {
        showNotification('success', res.data.message);
        setStatusModal({ open: false, user: null, targetStatus: '' });
        fetchStats();
        if (activeTab === 'employers') fetchEmployers();
        else fetchCandidates();
      }
    } catch (err) {
      showNotification('error', err.response?.data?.message || 'Không thể đổi trạng thái tài khoản');
    }
  };

  // Password Reset
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!resetPwdModal.newPassword) {
      setResetPwdModal(prev => ({ ...prev, error: 'Vui lòng nhập mật khẩu mới' }));
      return;
    }
    try {
      const res = await api.patch(`/admin/users/${resetPwdModal.user.UserID}/reset-password`, {
        newPassword: resetPwdModal.newPassword
      });
      if (res.data.success) {
        showNotification('success', res.data.message);
        setResetPwdModal({ open: false, user: null, newPassword: '', showPwd: false, error: '' });
      }
    } catch (err) {
      setResetPwdModal(prev => ({ ...prev, error: err.response?.data?.message || 'Lỗi đặt lại mật khẩu' }));
    }
  };

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789@#$';
    let pwd = 'Job@';
    for (let i = 0; i < 6; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    pwd += Math.floor(Math.random() * 90 + 10);
    setResetPwdModal(prev => ({ ...prev, newPassword: pwd, error: '' }));
  };

  // KYC Moderation
  const handleUpdateKyc = async (employerId, newStatus, reason = '') => {
    try {
      const res = await api.patch(`/admin/employers/${employerId}/kyc`, {
        kycStatus: newStatus,
        rejectionReason: reason || undefined
      });
      if (res.data.success) {
        showNotification('success', res.data.message);
        setKycRejectModal({ open: false, employerId: null, companyName: '', reason: '' });
        if (empDetailModal.open) {
          openEmployerDetail(employerId);
        }
        fetchStats();
        fetchEmployers();
      }
    } catch (err) {
      showNotification('error', err.response?.data?.message || 'Lỗi cập nhật KYC');
    }
  };

  // Job Moderation
  const handleModerateJobSubmit = async (e) => {
    e.preventDefault();
    const { job, actionType, adminNote } = jobActionModal;
    if (!job) return;

    if (['reject', 'revision'].includes(actionType) && !adminNote.trim()) {
      setJobActionModal(prev => ({ ...prev, error: 'Vui lòng nhập phản hồi/lý do cho nhà tuyển dụng!' }));
      return;
    }

    const statusMap = {
      approve: 'Published',
      reject: 'Rejected',
      revision: 'RequiresRevision'
    };

    try {
      setJobActionModal(prev => ({ ...prev, loading: true, error: '' }));
      const res = await api.patch(`/admin/jobs/${job.JobID}/moderate`, {
        status: statusMap[actionType],
        adminNote: adminNote.trim() || undefined
      });

      if (res.data.success) {
        showNotification('success', res.data.message);
        setJobActionModal({ open: false, job: null, actionType: '', adminNote: '', loading: false, error: '' });
        if (jobDetailModal.open) {
          setJobDetailModal({ open: false, job: null, loading: false });
        }
        fetchStats();
        fetchJobs();
      }
    } catch (err) {
      setJobActionModal(prev => ({ ...prev, loading: false, error: err.response?.data?.message || 'Lỗi kiểm duyệt tin' }));
    }
  };

  // Report Resolution
  const handleResolveReportSubmit = async (e) => {
    e.preventDefault();
    const { report, status, adminNote, actionTaken } = reportModal;
    if (!report) return;

    try {
      setReportModal(prev => ({ ...prev, loading: true, error: '' }));
      const res = await api.patch(`/admin/reports/${report.ReportID}`, {
        status,
        adminNote,
        actionTaken
      });

      if (res.data.success) {
        showNotification('success', res.data.message);
        setReportModal({ open: false, report: null, status: 'Resolved', adminNote: '', actionTaken: 'none', loading: false, error: '' });
        fetchStats();
        fetchReports();
      }
    } catch (err) {
      setReportModal(prev => ({ ...prev, loading: false, error: err.response?.data?.message || 'Lỗi xử lý báo cáo' }));
    }
  };

  // Category Save / Delete
  const handleSaveCategory = async (e) => {
    e.preventDefault();
    if (!catModal.categoryName.trim()) {
      setCatModal(prev => ({ ...prev, error: 'Vui lòng nhập tên ngành nghề' }));
      return;
    }

    try {
      setCatModal(prev => ({ ...prev, loading: true, error: '' }));
      let res;
      if (catModal.isEdit) {
        res = await api.put(`/admin/categories/${catModal.categoryId}`, {
          categoryName: catModal.categoryName,
          description: catModal.description
        });
      } else {
        res = await api.post('/admin/categories', {
          categoryName: catModal.categoryName,
          description: catModal.description
        });
      }

      if (res.data.success) {
        showNotification('success', res.data.message);
        setCatModal({ open: false, isEdit: false, categoryId: null, categoryName: '', description: '', loading: false, error: '' });
        fetchCategoriesAdmin();
        fetchStats();
      }
    } catch (err) {
      setCatModal(prev => ({ ...prev, loading: false, error: err.response?.data?.message || 'Lỗi lưu ngành nghề' }));
    }
  };

  const handleDeleteCategory = async () => {
    if (!catDeleteModal.category) return;
    try {
      setCatDeleteModal(prev => ({ ...prev, loading: true, error: '' }));
      const res = await api.delete(`/admin/categories/${catDeleteModal.category.CategoryID}`);
      if (res.data.success) {
        showNotification('success', res.data.message);
        setCatDeleteModal({ open: false, category: null, loading: false, error: '' });
        fetchCategoriesAdmin();
        fetchStats();
      }
    } catch (err) {
      setCatDeleteModal(prev => ({ ...prev, loading: false, error: err.response?.data?.message || 'Không thể xóa ngành nghề' }));
    }
  };

  // Skill Save / Delete
  const handleSaveSkill = async (e) => {
    e.preventDefault();
    if (!skillModal.skillName.trim()) {
      setSkillModal(prev => ({ ...prev, error: 'Vui lòng nhập tên kỹ năng' }));
      return;
    }

    try {
      setSkillModal(prev => ({ ...prev, loading: true, error: '' }));
      let res;
      if (skillModal.isEdit) {
        res = await api.put(`/admin/skills/${skillModal.skillId}`, {
          skillName: skillModal.skillName,
          normalizedName: skillModal.normalizedName,
          categoryId: skillModal.categoryId || null
        });
      } else {
        res = await api.post('/admin/skills', {
          skillName: skillModal.skillName,
          normalizedName: skillModal.normalizedName,
          categoryId: skillModal.categoryId || null
        });
      }

      if (res.data.success) {
        showNotification('success', res.data.message);
        setSkillModal({ open: false, isEdit: false, skillId: null, skillName: '', normalizedName: '', categoryId: '', loading: false, error: '' });
        fetchSkillsAdmin();
        fetchStats();
      }
    } catch (err) {
      setSkillModal(prev => ({ ...prev, loading: false, error: err.response?.data?.message || 'Lỗi lưu kỹ năng' }));
    }
  };

  const handleDeleteSkill = async () => {
    if (!skillDeleteModal.skill) return;
    try {
      setSkillDeleteModal(prev => ({ ...prev, loading: true, error: '' }));
      const res = await api.delete(`/admin/skills/${skillDeleteModal.skill.SkillID}`);
      if (res.data.success) {
        showNotification('success', res.data.message);
        setSkillDeleteModal({ open: false, skill: null, loading: false, error: '' });
        fetchSkillsAdmin();
        fetchStats();
      }
    } catch (err) {
      setSkillDeleteModal(prev => ({ ...prev, loading: false, error: err.response?.data?.message || 'Không thể xóa kỹ năng' }));
    }
  };

  // Detail Modal Openers
  const openEmployerDetail = async (employerId) => {
    try {
      setEmpDetailModal({ open: true, employer: null, loading: true });
      const res = await api.get(`/admin/employers/${employerId}`);
      if (res.data.success) {
        setEmpDetailModal({ open: true, employer: res.data.data, loading: false });
      }
    } catch (err) {
      showNotification('error', 'Không thể tải chi tiết doanh nghiệp');
      setEmpDetailModal({ open: false, employer: null, loading: false });
    }
  };

  const openCandidateDetail = async (userId) => {
    try {
      setCandDetailModal({ open: true, candidate: null, loading: true });
      const res = await api.get(`/admin/candidates/${userId}`);
      if (res.data.success) {
        setCandDetailModal({ open: true, candidate: res.data.data, loading: false });
      }
    } catch (err) {
      showNotification('error', 'Không thể tải chi tiết ứng viên');
      setCandDetailModal({ open: false, candidate: null, loading: false });
    }
  };

  const openJobDetail = async (jobId) => {
    try {
      setJobDetailModal({ open: true, job: null, loading: true });
      const res = await api.get(`/admin/jobs/${jobId}`);
      if (res.data.success) {
        setJobDetailModal({ open: true, job: res.data.data, loading: false });
      }
    } catch (err) {
      showNotification('error', 'Không thể tải chi tiết tin tuyển dụng');
      setJobDetailModal({ open: false, job: null, loading: false });
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Toast Notification */}
      {notification && (
        <div className={`fixed top-20 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl text-sm font-semibold transition-all duration-300 animate-slideIn ${
          notification.type === 'success' 
            ? 'bg-emerald-600 text-white' 
            : 'bg-rose-600 text-white'
        }`}>
          {notification.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertTriangle className="w-5 h-5 shrink-0" />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-bold text-indigo-200 border border-white/10">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Hệ Thống Quản Trị Trung Tâm Jobtimize
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Quản Trị Hệ Thống & Kiểm Duyệt Nền Tảng
          </h1>
          <p className="text-slate-300 text-sm max-w-3xl">
            Quản lý tài khoản Doanh nghiệp & Người tìm việc, kiểm duyệt Giấy phép KD, phê duyệt Tin tuyển dụng, xử lý Báo cáo vi phạm (Reports) và chuẩn hóa Từ điển Kỹ năng & Ngành nghề.
          </p>
        </div>

        <div className="relative z-10 self-start md:self-center flex flex-wrap items-center gap-2.5">
          <Link
            to="/admin/dashboard"
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 transition-all text-xs font-bold text-white border border-emerald-400/40 shadow-sm"
          >
            <BarChart3 className="w-4 h-4" />
            <span>Báo cáo & Thống kê</span>
          </Link>

          <button
            onClick={() => {
              fetchStats();
              if (activeTab === 'employers') fetchEmployers();
              else if (activeTab === 'jobs') fetchJobs();
              else if (activeTab === 'reports') fetchReports();
              else if (activeTab === 'taxonomy') {
                fetchCategoriesAdmin();
                fetchSkillsAdmin();
              } else fetchCandidates();
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 transition-all text-xs font-bold text-white border border-white/20 shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${loadingStats ? 'animate-spin' : ''}`} />
            <span>Làm mới dữ liệu</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Pending KYC Employers */}
        <div 
          onClick={() => { setActiveTab('employers'); setEmpKyc('Pending'); }}
          className={`cursor-pointer rounded-2xl p-4 sm:p-5 border transition-all ${
            Boolean(stats?.employers?.pendingKYC)
              ? 'bg-amber-50/50 border-amber-300 shadow-sm hover:shadow-md ring-2 ring-amber-400/20'
              : 'bg-white border-slate-200/80 shadow-sm hover:shadow-md'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">Giấy phép KD</span>
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-black text-amber-900">
              {stats?.employers?.pendingKYC ?? 0}
            </div>
            <div className="text-[11px] font-semibold text-amber-700 mt-0.5">
              Chờ duyệt KYC ({stats?.employers?.approvedKYC ?? 0} đã duyệt)
            </div>
          </div>
        </div>

        {/* Pending Moderation Jobs */}
        <div 
          onClick={() => { setActiveTab('jobs'); setJobsStatus('PendingApproval'); }}
          className={`cursor-pointer rounded-2xl p-4 sm:p-5 border transition-all ${
            Boolean(stats?.jobs?.pending)
              ? 'bg-rose-50/50 border-rose-300 shadow-sm hover:shadow-md ring-2 ring-rose-400/20'
              : 'bg-white border-slate-200/80 shadow-sm hover:shadow-md'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider">Tin chờ duyệt</span>
            <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-black text-rose-900">
              {stats?.jobs?.pending ?? 0}
            </div>
            <div className="text-[11px] font-semibold text-rose-700 mt-0.5">
              Cần duyệt ({stats?.jobs?.revision ?? 0} cần sửa)
            </div>
          </div>
        </div>

        {/* Violation Reports */}
        <div 
          onClick={() => { setActiveTab('reports'); setRepStatus('Pending'); }}
          className={`cursor-pointer rounded-2xl p-4 sm:p-5 border transition-all ${
            Boolean(stats?.reports?.pending)
              ? 'bg-orange-50/50 border-orange-300 shadow-sm hover:shadow-md ring-2 ring-orange-400/20'
              : 'bg-white border-slate-200/80 shadow-sm hover:shadow-md'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-orange-800 uppercase tracking-wider">Báo cáo vi phạm</span>
            <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center font-bold">
              <Flag className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-black text-orange-900">
              {stats?.reports?.pending ?? 0}
            </div>
            <div className="text-[11px] font-semibold text-orange-700 mt-0.5">
              Chờ xử lý ({stats?.reports?.resolved ?? 0} đã giải quyết)
            </div>
          </div>
        </div>

        {/* Skill Taxonomy & Categories */}
        <div 
          onClick={() => setActiveTab('taxonomy')}
          className="cursor-pointer bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Kỹ năng & Ngành</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Tag className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-black text-slate-900">
              {stats?.metadata?.skills ?? 0}
            </div>
            <div className="text-[11px] font-semibold text-slate-500 mt-0.5">
              Kỹ năng &bull; {stats?.metadata?.categories ?? 0} ngành nghề
            </div>
          </div>
        </div>

        {/* Users Summary */}
        <div 
          onClick={() => setActiveTab('candidates')}
          className="cursor-pointer bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Người tìm việc</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-black text-slate-900">
              {stats?.candidates?.total ?? '—'}
            </div>
            <div className="text-[11px] font-semibold text-emerald-600 mt-0.5">
              ● {stats?.candidates?.active ?? 0} đang hoạt động
            </div>
          </div>
        </div>
      </div>

      {/* Main Tabs Container */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-card space-y-6">
        {/* Tab Headers */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 pb-4">
          {/* Tab 1: Doanh nghiệp & KYC */}
          <button
            onClick={() => setActiveTab('employers')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all ${
              activeTab === 'employers'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Doanh Nghiệp & Giấy Phép KD</span>
            {Boolean(stats?.employers?.pendingKYC) && (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-amber-400 text-slate-950 animate-pulse">
                {stats?.employers?.pendingKYC}
              </span>
            )}
          </button>

          {/* Tab 2: Kiểm duyệt Tin tuyển dụng */}
          <button
            onClick={() => setActiveTab('jobs')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all ${
              activeTab === 'jobs'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Briefcase className="w-4 h-4" />
            <span>Kiểm Duyệt Tin Tuyển Dụng</span>
            {Boolean(stats?.jobs?.pending) && (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-rose-500 text-white animate-pulse">
                {stats?.jobs?.pending}
              </span>
            )}
          </button>

          {/* Tab 3: Báo cáo vi phạm */}
          <button
            onClick={() => setActiveTab('reports')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all ${
              activeTab === 'reports'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Flag className="w-4 h-4" />
            <span>Báo Cáo Vi Phạm (Reports)</span>
            {Boolean(stats?.reports?.pending) && (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-orange-500 text-white animate-pulse">
                {stats?.reports?.pending}
              </span>
            )}
          </button>

          {/* Tab 4: Từ điển Kỹ năng & Ngành nghề */}
          <button
            onClick={() => setActiveTab('taxonomy')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all ${
              activeTab === 'taxonomy'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Tag className="w-4 h-4" />
            <span>Từ Điển Kỹ Năng & Ngành Nghề</span>
          </button>

          {/* Tab 5: Người tìm việc */}
          <button
            onClick={() => setActiveTab('candidates')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all ${
              activeTab === 'candidates'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Người Tìm Việc</span>
          </button>
        </div>

        {/* ======================================================== */}
        {/* TAB 1: DOANH NGHIỆP & KIỂM DUYỆT GIẤY PHÉP KD (KYC)      */}
        {/* ======================================================== */}
        {activeTab === 'employers' && (
          <div className="space-y-6">
            {/* Filter Toolbar */}
            <form onSubmit={handleEmpSearchSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-6 relative">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm theo tên công ty, người đại diện, email, SĐT..."
                  value={empSearch}
                  onChange={(e) => setEmpSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                />
              </div>

              <div className="md:col-span-3">
                <select
                  value={empKyc}
                  onChange={(e) => {
                    setEmpKyc(e.target.value);
                    setEmpPage(1);
                  }}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 font-medium text-slate-700"
                >
                  <option value="all">Giấy phép KD (KYC): Tất cả</option>
                  <option value="Pending">⏳ Chờ duyệt (Pending)</option>
                  <option value="Approved">✓ Đã duyệt (Approved)</option>
                  <option value="Rejected">✕ Bị từ chối (Rejected)</option>
                </select>
              </div>

              <div className="md:col-span-3">
                <select
                  value={empStatus}
                  onChange={(e) => {
                    setEmpStatus(e.target.value);
                    setEmpPage(1);
                  }}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 font-medium text-slate-700"
                >
                  <option value="all">Tài khoản: Tất cả</option>
                  <option value="Active">Đang hoạt động</option>
                  <option value="Locked">Bị khóa</option>
                </select>
              </div>
            </form>

            {/* Employers Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200/80">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50/80 text-slate-600 font-bold border-b border-slate-200 text-xs uppercase tracking-wider">
                    <th className="py-3.5 px-4">Doanh Nghiệp</th>
                    <th className="py-3.5 px-4">Người Đại Diện</th>
                    <th className="py-3.5 px-4">Giấy Phép KD (KYC)</th>
                    <th className="py-3.5 px-4">Tin Tuyển Dụng</th>
                    <th className="py-3.5 px-4">Trạng Thái</th>
                    <th className="py-3.5 px-4 text-center">Hành Động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {empLoading ? (
                    <tr>
                      <td colSpan="6" className="py-12 text-center text-slate-400">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                        Đang tải danh sách doanh nghiệp...
                      </td>
                    </tr>
                  ) : employers.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="py-12 text-center text-slate-400">
                        Không tìm thấy doanh nghiệp nào phù hợp với bộ lọc
                      </td>
                    </tr>
                  ) : (
                    employers.map((emp) => (
                      <tr key={emp.EmployerID} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={emp.CompanyLogoUrl || 'https://images.unsplash.com/photo-1549923746-c502d488b3ea?w=120&q=80'}
                              alt={emp.CompanyName}
                              className="w-11 h-11 rounded-xl object-cover border border-slate-200 shrink-0 shadow-sm"
                            />
                            <div>
                              <div 
                                className="font-bold text-slate-900 hover:text-indigo-600 transition-colors cursor-pointer" 
                                onClick={() => openEmployerDetail(emp.EmployerID)}
                              >
                                {emp.CompanyName}
                              </div>
                              <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                                <span>{emp.CompanySize || 'Chưa cập nhật quy mô'}</span>
                                {emp.Website && (
                                  <>
                                    <span>&bull;</span>
                                    <a href={emp.Website} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline flex items-center gap-0.5">
                                      Website <ExternalLink className="w-2.5 h-2.5" />
                                    </a>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-4 px-4">
                          <div className="font-semibold text-slate-800">{emp.FullName}</div>
                          <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                            <Mail className="w-3 h-3 text-slate-400" /> {emp.Email}
                          </div>
                          {emp.Phone && (
                            <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                              <Phone className="w-3 h-3 text-slate-400" /> {emp.Phone}
                            </div>
                          )}
                        </td>

                        <td className="py-4 px-4">
                          {emp.KYCStatus === 'Approved' && (
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <ShieldCheck className="w-3.5 h-3.5" /> Đã duyệt KD
                              </span>
                              {emp.LatestLicenseUrl && (
                                <a
                                  href={emp.LatestLicenseUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-indigo-600 hover:text-indigo-800 text-xs font-semibold flex items-center gap-0.5"
                                  title="Xem giấy phép kinh doanh"
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                </a>
                              )}
                            </div>
                          )}
                          {emp.KYCStatus === 'Pending' && (
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-2">
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                  <ShieldAlert className="w-3.5 h-3.5" /> Chờ duyệt
                                </span>
                                {emp.LatestLicenseUrl && (
                                  <a
                                    href={emp.LatestLicenseUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="p-1 rounded bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-semibold flex items-center gap-1"
                                    title="Mở xem Giấy phép kinh doanh"
                                  >
                                    <Eye className="w-3.5 h-3.5" /> Giấy phép
                                  </a>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => handleUpdateKyc(emp.EmployerID, 'Approved')}
                                  className="px-2 py-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm"
                                  title="Phê duyệt Giấy phép KD"
                                >
                                  ✓ Duyệt
                                </button>
                                <button
                                  onClick={() => setKycRejectModal({ open: true, employerId: emp.EmployerID, companyName: emp.CompanyName, reason: '' })}
                                  className="px-2 py-1 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm"
                                  title="Từ chối Giấy phép KD"
                                >
                                  ✕ Từ chối
                                </button>
                              </div>
                            </div>
                          )}
                          {emp.KYCStatus === 'Rejected' && (
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                <AlertTriangle className="w-3.5 h-3.5" /> Đã từ chối
                              </span>
                              <button
                                onClick={() => openEmployerDetail(emp.EmployerID)}
                                className="text-xs text-slate-500 hover:underline"
                              >
                                Xem lý do
                              </button>
                            </div>
                          )}
                        </td>

                        <td className="py-4 px-4">
                          <div className="font-bold text-slate-800">{emp.TotalJobs || 0} tin đăng</div>
                          <div className="text-xs text-slate-500">{emp.TotalApplicants || 0} ứng viên nộp</div>
                        </td>

                        <td className="py-4 px-4">
                          {emp.Status === 'Active' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                              Hoạt động
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
                              Đã khóa
                            </span>
                          )}
                        </td>

                        <td className="py-4 px-4 text-center">
                          <div className="inline-flex items-center gap-1">
                            <button
                              onClick={() => openEmployerDetail(emp.EmployerID)}
                              className="p-2 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              title="Xem chi tiết doanh nghiệp & hồ sơ KD"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => setResetPwdModal({ open: true, user: { UserID: emp.UserID, FullName: emp.FullName, Email: emp.Email }, newPassword: '', showPwd: false, error: '' })}
                              className="p-2 text-slate-600 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                              title="Đặt lại mật khẩu"
                            >
                              <KeyRound className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => setStatusModal({
                                open: true,
                                user: { UserID: emp.UserID, FullName: emp.CompanyName, Email: emp.Email, Status: emp.Status },
                                targetStatus: emp.Status === 'Active' ? 'Locked' : 'Active'
                              })}
                              className={`p-2 rounded-lg transition-colors ${
                                emp.Status === 'Active'
                                  ? 'text-rose-600 hover:bg-rose-50'
                                  : 'text-emerald-600 hover:bg-emerald-50'
                              }`}
                              title={emp.Status === 'Active' ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}
                            >
                              {emp.Status === 'Active' ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {empPagination.totalPages > 1 && (
              <div className="flex items-center justify-between text-xs text-slate-500 font-semibold pt-2">
                <div>
                  Tổng cộng: <span className="font-bold text-slate-900">{empPagination.totalCount}</span> doanh nghiệp
                </div>
                <div className="flex items-center gap-2">
                  <button
                    disabled={empPage <= 1}
                    onClick={() => setEmpPage(p => p - 1)}
                    className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span>Trang {empPage} / {empPagination.totalPages}</span>
                  <button
                    disabled={empPage >= empPagination.totalPages}
                    onClick={() => setEmpPage(p => p + 1)}
                    className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: KIỂM DUYỆT TIN TUYỂN DỤNG                          */}
        {/* ======================================================== */}
        {activeTab === 'jobs' && (
          <div className="space-y-6">
            {/* Filter Toolbar */}
            <form onSubmit={handleJobsSearchSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-8 relative">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm theo tiêu đề công việc, công ty, địa điểm..."
                  value={jobsSearch}
                  onChange={(e) => setJobsSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                />
              </div>

              <div className="md:col-span-4">
                <select
                  value={jobsStatus}
                  onChange={(e) => {
                    setJobsStatus(e.target.value);
                    setJobsPage(1);
                  }}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 font-medium text-slate-700"
                >
                  <option value="all">Trạng thái: Tất cả</option>
                  <option value="PendingApproval">⏳ Chờ phê duyệt (PendingApproval)</option>
                  <option value="Published">✓ Đã xuất bản (Published)</option>
                  <option value="RequiresRevision">✏ Yêu cầu chỉnh sửa (RequiresRevision)</option>
                  <option value="Rejected">✕ Bị từ chối (Rejected)</option>
                  <option value="Closed">🔒 Đã đóng (Closed)</option>
                </select>
              </div>
            </form>

            {/* Jobs Moderation Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200/80">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50/80 text-slate-600 font-bold border-b border-slate-200 text-xs uppercase tracking-wider">
                    <th className="py-3.5 px-4">Tin Tuyển Dụng</th>
                    <th className="py-3.5 px-4">Doanh Nghiệp</th>
                    <th className="py-3.5 px-4">Mức Lương / Địa Điểm</th>
                    <th className="py-3.5 px-4">Trạng Thái Kiểm Duyệt</th>
                    <th className="py-3.5 px-4">Ngày Đăng</th>
                    <th className="py-3.5 px-4 text-center">Hành Động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {jobsLoading ? (
                    <tr>
                      <td colSpan="6" className="py-12 text-center text-slate-400">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                        Đang tải danh sách tin tuyển dụng...
                      </td>
                    </tr>
                  ) : jobs.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="py-12 text-center text-slate-400">
                        Không tìm thấy tin tuyển dụng nào phù hợp
                      </td>
                    </tr>
                  ) : (
                    jobs.map((job) => (
                      <tr key={job.JobID} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-4 px-4 max-w-xs">
                          <div 
                            className="font-bold text-slate-900 hover:text-indigo-600 transition-colors cursor-pointer truncate"
                            onClick={() => openJobDetail(job.JobID)}
                            title={job.Title}
                          >
                            {job.Title}
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            {job.CategoryName || 'Ngành nghề chung'} &bull; {job.TotalApplicants || 0} hồ sơ
                          </div>
                          {job.AdminNote && (
                            <div className="text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded mt-1 border border-amber-200 line-clamp-1" title={job.AdminNote}>
                              Ghi chú: {job.AdminNote}
                            </div>
                          )}
                        </td>

                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2.5">
                            <img
                              src={job.CompanyLogoUrl || 'https://images.unsplash.com/photo-1549923746-c502d488b3ea?w=120&q=80'}
                              alt={job.CompanyName}
                              className="w-8 h-8 rounded-lg object-cover border border-slate-200 shrink-0"
                            />
                            <div>
                              <div className="font-semibold text-slate-800 text-xs">{job.CompanyName}</div>
                              {job.KYCStatus === 'Approved' ? (
                                <span className="text-[10px] font-bold text-emerald-700 flex items-center gap-0.5">
                                  <ShieldCheck className="w-3 h-3" /> Đã duyệt KD
                                </span>
                              ) : (
                                <span className="text-[10px] font-semibold text-amber-700">
                                  Chưa duyệt KD
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="py-4 px-4">
                          <div className="font-semibold text-emerald-700 text-xs">{job.SalaryRange || 'Thỏa thuận'}</div>
                          <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3" /> {job.Location || 'Toàn quốc'}
                          </div>
                        </td>

                        <td className="py-4 px-4">
                          {job.Status === 'Published' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle className="w-3.5 h-3.5" /> Đã phê duyệt
                            </span>
                          )}
                          {job.Status === 'PendingApproval' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              <Clock className="w-3.5 h-3.5" /> Chờ phê duyệt
                            </span>
                          )}
                          {job.Status === 'RequiresRevision' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
                              <Edit3 className="w-3.5 h-3.5" /> Cần chỉnh sửa
                            </span>
                          )}
                          {job.Status === 'Rejected' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              <XCircle className="w-3.5 h-3.5" /> Đã từ chối
                            </span>
                          )}
                          {job.Status === 'Closed' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
                              Đã đóng
                            </span>
                          )}
                        </td>

                        <td className="py-4 px-4 text-xs text-slate-500">
                          {new Date(job.CreatedAt).toLocaleDateString('vi-VN')}
                        </td>

                        <td className="py-4 px-4 text-center">
                          <div className="inline-flex items-center gap-1">
                            <button
                              onClick={() => openJobDetail(job.JobID)}
                              className="p-2 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              title="Xem chi tiết nội dung tin"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {job.Status !== 'Published' && (
                              <button
                                onClick={() => setJobActionModal({
                                  open: true,
                                  job,
                                  actionType: 'approve',
                                  adminNote: '',
                                  loading: false,
                                  error: ''
                                })}
                                className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                title="Phê duyệt tin tuyển dụng"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </button>
                            )}

                            <button
                              onClick={() => setJobActionModal({
                                open: true,
                                job,
                                actionType: 'revision',
                                adminNote: job.AdminNote || '',
                                loading: false,
                                error: ''
                              })}
                              className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                              title="Yêu cầu NTD chỉnh sửa tin"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>

                            {job.Status !== 'Rejected' && (
                              <button
                                onClick={() => setJobActionModal({
                                  open: true,
                                  job,
                                  actionType: 'reject',
                                  adminNote: '',
                                  loading: false,
                                  error: ''
                                })}
                                className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                title="Từ chối tin tuyển dụng"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {jobsPagination.totalPages > 1 && (
              <div className="flex items-center justify-between text-xs text-slate-500 font-semibold pt-2">
                <div>
                  Tổng cộng: <span className="font-bold text-slate-900">{jobsPagination.totalCount}</span> tin tuyển dụng
                </div>
                <div className="flex items-center gap-2">
                  <button
                    disabled={jobsPage <= 1}
                    onClick={() => setJobsPage(p => p - 1)}
                    className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span>Trang {jobsPage} / {jobsPagination.totalPages}</span>
                  <button
                    disabled={jobsPage >= jobsPagination.totalPages}
                    onClick={() => setJobsPage(p => p + 1)}
                    className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: BÁO CÁO VI PHẠM (REPORTS)                          */}
        {/* ======================================================== */}
        {activeTab === 'reports' && (
          <div className="space-y-6">
            {/* Filter Toolbar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <select
                  value={repStatus}
                  onChange={(e) => {
                    setRepStatus(e.target.value);
                    setRepPage(1);
                  }}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 font-medium text-slate-700"
                >
                  <option value="all">Trạng thái xử lý: Tất cả</option>
                  <option value="Pending">⏳ Chờ xử lý (Pending)</option>
                  <option value="Resolved">✓ Đã giải quyết (Resolved)</option>
                  <option value="Dismissed">✕ Đã bác bỏ (Dismissed)</option>
                </select>
              </div>

              <div>
                <select
                  value={repType}
                  onChange={(e) => {
                    setRepType(e.target.value);
                    setRepPage(1);
                  }}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 font-medium text-slate-700"
                >
                  <option value="all">Loại đối tượng bị báo cáo: Tất cả</option>
                  <option value="JobPosting">Tin tuyển dụng (JobPosting)</option>
                  <option value="Employer">Doanh nghiệp (Employer)</option>
                  <option value="Candidate">Ứng viên (Candidate)</option>
                </select>
              </div>
            </div>

            {/* Reports Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200/80">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50/80 text-slate-600 font-bold border-b border-slate-200 text-xs uppercase tracking-wider">
                    <th className="py-3.5 px-4">Người Báo Cáo</th>
                    <th className="py-3.5 px-4">Đối Tượng Bị Tố Cáo</th>
                    <th className="py-3.5 px-4">Lý Do Vi Phạm</th>
                    <th className="py-3.5 px-4">Trạng Thái</th>
                    <th className="py-3.5 px-4">Thời Gian</th>
                    <th className="py-3.5 px-4 text-center">Xử Lý</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {repLoading ? (
                    <tr>
                      <td colSpan="6" className="py-12 text-center text-slate-400">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                        Đang tải danh sách báo cáo vi phạm...
                      </td>
                    </tr>
                  ) : reports.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="py-12 text-center text-slate-400">
                        Hiện không có báo cáo vi phạm nào phù hợp
                      </td>
                    </tr>
                  ) : (
                    reports.map((rep) => (
                      <tr key={rep.ReportID} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-4 px-4">
                          <div className="font-semibold text-slate-800">{rep.ReporterName || 'Người dùng ẩn danh'}</div>
                          <div className="text-xs text-slate-500">{rep.ReporterEmail}</div>
                        </td>

                        <td className="py-4 px-4 max-w-xs">
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                              rep.TargetType === 'JobPosting' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                              rep.TargetType === 'Employer' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' :
                              'bg-purple-50 text-purple-700 border border-purple-200'
                            }`}>
                              {rep.TargetType === 'JobPosting' ? 'Tin Tuyển Dụng' :
                               rep.TargetType === 'Employer' ? 'Doanh Nghiệp' : 'Ứng Viên'}
                            </span>
                            <span className="text-xs text-slate-400 font-mono">#{rep.TargetID}</span>
                          </div>
                          <div className="font-bold text-slate-900 truncate" title={rep.TargetName}>
                            {rep.TargetName || 'Đối tượng #' + rep.TargetID}
                          </div>
                          {rep.TargetSubInfo && (
                            <div className="text-xs text-slate-500 truncate">{rep.TargetSubInfo}</div>
                          )}
                        </td>

                        <td className="py-4 px-4 max-w-sm">
                          <div className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-100 line-clamp-2" title={rep.Reason}>
                            {rep.Reason}
                          </div>
                          {rep.AdminNote && (
                            <div className="text-[11px] text-emerald-700 font-medium mt-1">
                              Ghi chú xử lý: {rep.AdminNote}
                            </div>
                          )}
                        </td>

                        <td className="py-4 px-4">
                          {rep.Status === 'Pending' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              <Clock className="w-3.5 h-3.5" /> Chờ xử lý
                            </span>
                          )}
                          {rep.Status === 'Resolved' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Đã giải quyết
                            </span>
                          )}
                          {rep.Status === 'Dismissed' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
                              Đã bác bỏ
                            </span>
                          )}
                        </td>

                        <td className="py-4 px-4 text-xs text-slate-500">
                          {new Date(rep.CreatedAt).toLocaleDateString('vi-VN')}
                        </td>

                        <td className="py-4 px-4 text-center">
                          <button
                            onClick={() => setReportModal({
                              open: true,
                              report: rep,
                              status: rep.Status === 'Pending' ? 'Resolved' : rep.Status,
                              adminNote: rep.AdminNote || '',
                              actionTaken: 'none',
                              loading: false,
                              error: ''
                            })}
                            className="px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 font-bold text-xs hover:bg-indigo-100 transition-colors shadow-sm inline-flex items-center gap-1"
                          >
                            <SlidersHorizontal className="w-3.5 h-3.5" /> Xử lý
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {repPagination.totalPages > 1 && (
              <div className="flex items-center justify-between text-xs text-slate-500 font-semibold pt-2">
                <div>
                  Tổng cộng: <span className="font-bold text-slate-900">{repPagination.totalCount}</span> báo cáo
                </div>
                <div className="flex items-center gap-2">
                  <button
                    disabled={repPage <= 1}
                    onClick={() => setRepPage(p => p - 1)}
                    className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span>Trang {repPage} / {repPagination.totalPages}</span>
                  <button
                    disabled={repPage >= repPagination.totalPages}
                    onClick={() => setRepPage(p => p + 1)}
                    className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 4: TỪ ĐIỂN KỸ NĂNG & NGÀNH NGHỀ (TAXONOMY)             */}
        {/* ======================================================== */}
        {activeTab === 'taxonomy' && (
          <div className="space-y-6">
            {/* Sub-tabs header */}
            <div className="flex items-center justify-between flex-wrap gap-3 bg-slate-50 p-2 rounded-2xl border border-slate-200/80">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setTaxonomyTab('categories')}
                  className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 ${
                    taxonomyTab === 'categories'
                      ? 'bg-white text-indigo-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Folders className="w-4 h-4" />
                  <span>Danh Mục Ngành Nghề ({categoriesList.length})</span>
                </button>

                <button
                  onClick={() => setTaxonomyTab('skills')}
                  className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 ${
                    taxonomyTab === 'skills'
                      ? 'bg-white text-indigo-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Tag className="w-4 h-4" />
                  <span>Từ Điển Kỹ Năng ({stats?.metadata?.skills ?? skillsList.length})</span>
                </button>
              </div>

              <div>
                {taxonomyTab === 'categories' ? (
                  <button
                    onClick={() => setCatModal({ open: true, isEdit: false, categoryId: null, categoryName: '', description: '', loading: false, error: '' })}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-indigo-600/25"
                  >
                    <Plus className="w-4 h-4" /> Thêm Ngành Nghề Mới
                  </button>
                ) : (
                  <button
                    onClick={() => setSkillModal({ open: true, isEdit: false, skillId: null, skillName: '', normalizedName: '', categoryId: categoriesList[0]?.CategoryID || '', loading: false, error: '' })}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-indigo-600/25"
                  >
                    <Plus className="w-4 h-4" /> Thêm Kỹ Năng Mới
                  </button>
                )}
              </div>
            </div>

            {/* Sub-tab 1: Categories List */}
            {taxonomyTab === 'categories' && (
              <div className="overflow-x-auto rounded-2xl border border-slate-200/80">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50/80 text-slate-600 font-bold border-b border-slate-200 text-xs uppercase tracking-wider">
                      <th className="py-3.5 px-4">Tên Ngành Nghề</th>
                      <th className="py-3.5 px-4">Mô Tả Chi Tiết</th>
                      <th className="py-3.5 px-4">Tin Tuyển Dụng</th>
                      <th className="py-3.5 px-4">Kỹ Năng Trực Thuộc</th>
                      <th className="py-3.5 px-4 text-center">Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {catLoading ? (
                      <tr>
                        <td colSpan="5" className="py-12 text-center text-slate-400">
                          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                          Đang tải danh sách ngành nghề...
                        </td>
                      </tr>
                    ) : categoriesList.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="py-12 text-center text-slate-400">
                          Chưa có ngành nghề nào trong hệ thống
                        </td>
                      </tr>
                    ) : (
                      categoriesList.map((cat) => (
                        <tr key={cat.CategoryID} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-4 px-4 font-bold text-slate-900">
                            {cat.CategoryName}
                          </td>
                          <td className="py-4 px-4 text-xs text-slate-600 max-w-md">
                            {cat.Description || <span className="italic text-slate-400">Chưa có mô tả</span>}
                          </td>
                          <td className="py-4 px-4 font-semibold text-slate-800">
                            {cat.TotalJobs || 0} tin đăng
                          </td>
                          <td className="py-4 px-4 font-semibold text-indigo-600">
                            {cat.TotalSkills || 0} kỹ năng
                          </td>
                          <td className="py-4 px-4 text-center">
                            <div className="inline-flex items-center gap-1">
                              <button
                                onClick={() => setCatModal({
                                  open: true,
                                  isEdit: true,
                                  categoryId: cat.CategoryID,
                                  categoryName: cat.CategoryName,
                                  description: cat.Description || '',
                                  loading: false,
                                  error: ''
                                })}
                                className="p-2 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                title="Chỉnh sửa ngành nghề"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setCatDeleteModal({
                                  open: true,
                                  category: cat,
                                  loading: false,
                                  error: ''
                                })}
                                className="p-2 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                title="Xóa ngành nghề"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Sub-tab 2: Skills List */}
            {taxonomyTab === 'skills' && (
              <div className="space-y-4">
                {/* Filter skills */}
                <form onSubmit={handleSkillSearchSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-3">
                  <div className="md:col-span-7 relative">
                    <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Tìm theo tên kỹ năng (React, Python, AWS, Figma...)..."
                      value={skillSearch}
                      onChange={(e) => setSkillSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                    />
                  </div>

                  <div className="md:col-span-5">
                    <select
                      value={skillCatFilter}
                      onChange={(e) => {
                        setSkillCatFilter(e.target.value);
                        setSkillPage(1);
                      }}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 font-medium text-slate-700"
                    >
                      <option value="all">Ngành nghề: Tất cả</option>
                      {categoriesList.map(c => (
                        <option key={c.CategoryID} value={c.CategoryID}>{c.CategoryName}</option>
                      ))}
                    </select>
                  </div>
                </form>

                {/* Skills Table */}
                <div className="overflow-x-auto rounded-2xl border border-slate-200/80">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="bg-slate-50/80 text-slate-600 font-bold border-b border-slate-200 text-xs uppercase tracking-wider">
                        <th className="py-3.5 px-4">Tên Kỹ Năng Chuẩn</th>
                        <th className="py-3.5 px-4">Normalized Key (AI Map)</th>
                        <th className="py-3.5 px-4">Ngành Nghề Trực Thuộc</th>
                        <th className="py-3.5 px-4">Nhu Cầu Tuyển Dụng</th>
                        <th className="py-3.5 px-4 text-center">Thao Tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {skillLoading ? (
                        <tr>
                          <td colSpan="5" className="py-12 text-center text-slate-400">
                            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                            Đang tải từ điển kỹ năng...
                          </td>
                        </tr>
                      ) : skillsList.length === 0 ? (
                        <tr>
                          <td colSpan="5" className="py-12 text-center text-slate-400">
                            Không tìm thấy kỹ năng nào phù hợp
                          </td>
                        </tr>
                      ) : (
                        skillsList.map((sk) => (
                          <tr key={sk.SkillID} className="hover:bg-slate-50/60 transition-colors">
                            <td className="py-4 px-4 font-bold text-slate-900 flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-indigo-500" />
                              {sk.SkillName}
                            </td>
                            <td className="py-4 px-4 font-mono text-xs text-indigo-700 bg-indigo-50/40 rounded-lg">
                              {sk.NormalizedName}
                            </td>
                            <td className="py-4 px-4 text-xs font-semibold text-slate-700">
                              {sk.CategoryName || <span className="text-slate-400 italic">Chưa phân loại</span>}
                            </td>
                            <td className="py-4 px-4 text-xs">
                              <span className="font-bold text-emerald-700">{sk.RequiredJobCount || 0}</span> JD yêu cầu &bull; {sk.CourseCount || 0} khóa học
                            </td>
                            <td className="py-4 px-4 text-center">
                              <div className="inline-flex items-center gap-1">
                                <button
                                  onClick={() => setSkillModal({
                                    open: true,
                                    isEdit: true,
                                    skillId: sk.SkillID,
                                    skillName: sk.SkillName,
                                    normalizedName: sk.NormalizedName,
                                    categoryId: sk.CategoryID || '',
                                    loading: false,
                                    error: ''
                                  })}
                                  className="p-2 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                  title="Chỉnh sửa kỹ năng"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setSkillDeleteModal({
                                    open: true,
                                    skill: sk,
                                    loading: false,
                                    error: ''
                                  })}
                                  className="p-2 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                  title="Xóa kỹ năng"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {skillPagination.totalPages > 1 && (
                  <div className="flex items-center justify-between text-xs text-slate-500 font-semibold pt-2">
                    <div>
                      Tổng cộng: <span className="font-bold text-slate-900">{skillPagination.totalCount}</span> kỹ năng
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        disabled={skillPage <= 1}
                        onClick={() => setSkillPage(p => p - 1)}
                        className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <span>Trang {skillPage} / {skillPagination.totalPages}</span>
                      <button
                        disabled={skillPage >= skillPagination.totalPages}
                        onClick={() => setSkillPage(p => p + 1)}
                        className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 5: NGƯỜI TÌM VIỆC (CANDIDATES)                         */}
        {/* ======================================================== */}
        {activeTab === 'candidates' && (
          <div className="space-y-6">
            {/* Filter Toolbar */}
            <form onSubmit={handleCandSearchSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-8 relative">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm theo tên ứng viên, email, số điện thoại..."
                  value={candSearch}
                  onChange={(e) => setCandSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                />
              </div>

              <div className="md:col-span-4">
                <select
                  value={candStatus}
                  onChange={(e) => {
                    setCandStatus(e.target.value);
                    setCandPage(1);
                  }}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 font-medium text-slate-700"
                >
                  <option value="all">Trạng thái: Tất cả</option>
                  <option value="Active">Đang hoạt động</option>
                  <option value="Locked">Bị khóa</option>
                </select>
              </div>
            </form>

            {/* Candidates Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200/80">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50/80 text-slate-600 font-bold border-b border-slate-200 text-xs uppercase tracking-wider">
                    <th className="py-3.5 px-4">Ứng Viên</th>
                    <th className="py-3.5 px-4">Liên Hệ</th>
                    <th className="py-3.5 px-4">CV & Ứng Tuyển</th>
                    <th className="py-3.5 px-4">Bật Tìm Việc</th>
                    <th className="py-3.5 px-4">Trạng Thái</th>
                    <th className="py-3.5 px-4 text-center">Hành Động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {candLoading ? (
                    <tr>
                      <td colSpan="6" className="py-12 text-center text-slate-400">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                        Đang tải danh sách ứng viên...
                      </td>
                    </tr>
                  ) : candidates.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="py-12 text-center text-slate-400">
                        Không tìm thấy người tìm việc nào phù hợp với bộ lọc
                      </td>
                    </tr>
                  ) : (
                    candidates.map((cand) => (
                      <tr key={cand.UserID} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={cand.AvatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&q=80'}
                              alt={cand.FullName}
                              className="w-11 h-11 rounded-full object-cover border border-slate-200 shrink-0 shadow-sm"
                            />
                            <div>
                              <div className="font-bold text-slate-900 hover:text-indigo-600 transition-colors cursor-pointer" onClick={() => openCandidateDetail(cand.UserID)}>
                                {cand.FullName}
                              </div>
                              <div className="text-xs text-slate-500 font-medium">
                                {cand.Headline || 'Chưa cập nhật vị trí nghề nghiệp'}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-4 px-4">
                          <div className="text-xs text-slate-700 flex items-center gap-1 font-semibold">
                            <Mail className="w-3 h-3 text-slate-400" /> {cand.Email}
                          </div>
                          {cand.Phone ? (
                            <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                              <Phone className="w-3 h-3 text-slate-400" /> {cand.Phone}
                            </div>
                          ) : (
                            <div className="text-xs text-slate-400 mt-0.5">Chưa có SĐT</div>
                          )}
                        </td>

                        <td className="py-4 px-4">
                          <div className="font-bold text-slate-800">{cand.TotalCVs || 0} bản CV</div>
                          <div className="text-xs text-slate-500">{cand.TotalApplications || 0} lượt ứng tuyển</div>
                        </td>

                        <td className="py-4 px-4">
                          {cand.IsLookingForJob ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-50 text-teal-700 border border-teal-200">
                              Đang tìm việc
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-500">
                              Tạm tắt
                            </span>
                          )}
                        </td>

                        <td className="py-4 px-4">
                          {cand.Status === 'Active' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                              Hoạt động
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
                              Đã khóa
                            </span>
                          )}
                        </td>

                        <td className="py-4 px-4 text-center">
                          <div className="inline-flex items-center gap-1">
                            <button
                              onClick={() => openCandidateDetail(cand.UserID)}
                              className="p-2 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              title="Xem chi tiết hồ sơ ứng viên"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => setResetPwdModal({ open: true, user: { UserID: cand.UserID, FullName: cand.FullName, Email: cand.Email }, newPassword: '', showPwd: false, error: '' })}
                              className="p-2 text-slate-600 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                              title="Đặt lại mật khẩu"
                            >
                              <KeyRound className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => setStatusModal({
                                open: true,
                                user: { UserID: cand.UserID, FullName: cand.FullName, Email: cand.Email, Status: cand.Status },
                                targetStatus: cand.Status === 'Active' ? 'Locked' : 'Active'
                              })}
                              className={`p-2 rounded-lg transition-colors ${
                                cand.Status === 'Active'
                                  ? 'text-rose-600 hover:bg-rose-50'
                                  : 'text-emerald-600 hover:bg-emerald-50'
                              }`}
                              title={cand.Status === 'Active' ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}
                            >
                              {cand.Status === 'Active' ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {candPagination.totalPages > 1 && (
              <div className="flex items-center justify-between text-xs text-slate-500 font-semibold pt-2">
                <div>
                  Tổng cộng: <span className="font-bold text-slate-900">{candPagination.totalCount}</span> người tìm việc
                </div>
                <div className="flex items-center gap-2">
                  <button
                    disabled={candPage <= 1}
                    onClick={() => setCandPage(p => p - 1)}
                    className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span>Trang {candPage} / {candPagination.totalPages}</span>
                  <button
                    disabled={candPage >= candPagination.totalPages}
                    onClick={() => setCandPage(p => p + 1)}
                    className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* MODAL: XỬ LÝ BÁO CÁO VI PHẠM (REPORTS)                    */}
      {/* ======================================================== */}
      {reportModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
          <form onSubmit={handleResolveReportSubmit} className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold">
                  <Flag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Xử Lý Báo Cáo Vi Phạm</h3>
                  <p className="text-xs text-slate-500">Mã báo cáo: #{reportModal.report?.ReportID}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReportModal({ open: false, report: null, status: 'Resolved', adminNote: '', actionTaken: 'none', loading: false, error: '' })}
                className="p-1 rounded-xl text-slate-400 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {reportModal.error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{reportModal.error}</span>
              </div>
            )}

            {/* Report Summary */}
            <div className="bg-slate-50 p-4 rounded-2xl space-y-2 text-xs border border-slate-100">
              <div>
                <span className="text-slate-400 font-bold block">Người báo cáo:</span>
                <span className="font-semibold text-slate-800">{reportModal.report?.ReporterName} ({reportModal.report?.ReporterEmail})</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold block">Đối tượng bị tố cáo:</span>
                <span className="font-bold text-indigo-700">[{reportModal.report?.TargetType}] {reportModal.report?.TargetName}</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold block">Nội dung phản ánh:</span>
                <span className="text-slate-700 bg-white p-2.5 rounded-xl border border-slate-200 block mt-1 leading-relaxed">
                  {reportModal.report?.Reason}
                </span>
              </div>
            </div>

            {/* Resolution Form */}
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Kết luận kiểm tra:</label>
                <select
                  value={reportModal.status}
                  onChange={(e) => setReportModal(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white font-medium focus:ring-2 focus:ring-indigo-500/30"
                >
                  <option value="Resolved">✓ Chấp thuận vi phạm & Đã giải quyết (Resolved)</option>
                  <option value="Dismissed">✕ Bác bỏ báo cáo (Không đủ bằng chứng / Sai sự thật)</option>
                </select>
              </div>

              {reportModal.status === 'Resolved' && (
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Hành động chế tài tức thì đối với đối tượng:</label>
                  <select
                    value={reportModal.actionTaken}
                    onChange={(e) => setReportModal(prev => ({ ...prev, actionTaken: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white font-medium focus:ring-2 focus:ring-indigo-500/30"
                  >
                    <option value="none">Chỉ lưu biên bản xử lý (Không khóa tài khoản)</option>
                    {reportModal.report?.TargetType === 'JobPosting' && (
                      <option value="close_job">Đóng tin tuyển dụng vi phạm (Closed)</option>
                    )}
                    <option value="lock_target">Khóa đối tượng vi phạm (Từ chối tin hoặc Khóa tài khoản)</option>
                  </select>
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Ghi chú giải quyết của Admin:</label>
                <textarea
                  rows="3"
                  value={reportModal.adminNote}
                  onChange={(e) => setReportModal(prev => ({ ...prev, adminNote: e.target.value }))}
                  placeholder="Ghi chú kết quả thẩm định, xác minh hoặc lý do bác bỏ..."
                  className="w-full p-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setReportModal({ open: false, report: null, status: 'Resolved', adminNote: '', actionTaken: 'none', loading: false, error: '' })}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                disabled={reportModal.loading}
                className="px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/30 disabled:opacity-50"
              >
                {reportModal.loading ? 'Đang lưu...' : 'Lưu kết quả xử lý'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: THÊM / SỬA NGÀNH NGHỀ (CATEGORY)                  */}
      {/* ======================================================== */}
      {catModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
          <form onSubmit={handleSaveCategory} className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <Folders className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  {catModal.isEdit ? 'Chỉnh Sửa Ngành Nghề' : 'Thêm Ngành Nghề Mới'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setCatModal({ open: false, isEdit: false, categoryId: null, categoryName: '', description: '', loading: false, error: '' })}
                className="p-1 rounded-xl text-slate-400 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {catModal.error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{catModal.error}</span>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Tên ngành nghề <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={catModal.categoryName}
                  onChange={(e) => setCatModal(prev => ({ ...prev, categoryName: e.target.value, error: '' }))}
                  placeholder="Ví dụ: An ninh mạng & Bảo mật (Cybersecurity)"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Mô tả lĩnh vực</label>
                <textarea
                  rows="3"
                  value={catModal.description}
                  onChange={(e) => setCatModal(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Mô tả phạm vi các công việc thuộc ngành này..."
                  className="w-full p-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setCatModal({ open: false, isEdit: false, categoryId: null, categoryName: '', description: '', loading: false, error: '' })}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={catModal.loading}
                className="px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/30 disabled:opacity-50"
              >
                {catModal.loading ? 'Đang lưu...' : (catModal.isEdit ? 'Cập nhật' : 'Thêm mới')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: XÓA NGÀNH NGHỀ (CATEGORY)                         */}
      {/* ======================================================== */}
      {catDeleteModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Xóa Ngành Nghề</h3>
            </div>

            {catDeleteModal.error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                {catDeleteModal.error}
              </div>
            )}

            <p className="text-sm text-slate-600 leading-relaxed">
              Bạn có chắc chắn muốn xóa ngành nghề <strong className="text-slate-900">{catDeleteModal.category?.CategoryName}</strong>?
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setCatDeleteModal({ open: false, category: null, loading: false, error: '' })}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={catDeleteModal.loading}
                onClick={handleDeleteCategory}
                className="px-5 py-2 rounded-xl font-bold text-xs text-white bg-rose-600 hover:bg-rose-700 shadow-md disabled:opacity-50"
              >
                {catDeleteModal.loading ? 'Đang xóa...' : 'Xác nhận xóa'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: THÊM / SỬA KỸ NĂNG (SKILL)                        */}
      {/* ======================================================== */}
      {skillModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
          <form onSubmit={handleSaveSkill} className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                  <Tag className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  {skillModal.isEdit ? 'Chỉnh Sửa Kỹ Năng' : 'Thêm Kỹ Năng Chuẩn Mới'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSkillModal({ open: false, isEdit: false, skillId: null, skillName: '', normalizedName: '', categoryId: '', loading: false, error: '' })}
                className="p-1 rounded-xl text-slate-400 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {skillModal.error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{skillModal.error}</span>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Tên kỹ năng hiển thị <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={skillModal.skillName}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSkillModal(prev => ({
                      ...prev,
                      skillName: val,
                      normalizedName: prev.isEdit ? prev.normalizedName : val.toLowerCase().replace(/[^a-z0-9]/g, ''),
                      error: ''
                    }));
                  }}
                  placeholder="Ví dụ: React.js, Docker, FastAPI..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Normalized Key (dùng cho AI matching)
                </label>
                <input
                  type="text"
                  value={skillModal.normalizedName}
                  onChange={(e) => setSkillModal(prev => ({ ...prev, normalizedName: e.target.value.toLowerCase() }))}
                  placeholder="Ví dụ: reactjs, docker, fastapi"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                />
                <span className="text-[11px] text-slate-400 block mt-0.5">
                  AI sử dụng key này để đối sánh từ đồng nghĩa giữa CV và JD.
                </span>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Thuộc Ngành nghề:</label>
                <select
                  value={skillModal.categoryId}
                  onChange={(e) => setSkillModal(prev => ({ ...prev, categoryId: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white font-medium focus:ring-2 focus:ring-purple-500/30"
                >
                  <option value="">-- Không chọn --</option>
                  {categoriesList.map(c => (
                    <option key={c.CategoryID} value={c.CategoryID}>{c.CategoryName}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSkillModal({ open: false, isEdit: false, skillId: null, skillName: '', normalizedName: '', categoryId: '', loading: false, error: '' })}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={skillModal.loading}
                className="px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-purple-600 hover:bg-purple-700 shadow-md shadow-purple-600/30 disabled:opacity-50"
              >
                {skillModal.loading ? 'Đang lưu...' : (skillModal.isEdit ? 'Cập nhật' : 'Thêm mới')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: XÓA KỸ NĂNG (SKILL)                               */}
      {/* ======================================================== */}
      {skillDeleteModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Xóa Kỹ Năng Khỏi Từ Điển</h3>
            </div>

            {skillDeleteModal.error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                {skillDeleteModal.error}
              </div>
            )}

            <p className="text-sm text-slate-600 leading-relaxed">
              Bạn có chắc chắn muốn xóa kỹ năng <strong className="text-slate-900">{skillDeleteModal.skill?.SkillName}</strong> khỏi từ điển chuẩn hóa?
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSkillDeleteModal({ open: false, skill: null, loading: false, error: '' })}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={skillDeleteModal.loading}
                onClick={handleDeleteSkill}
                className="px-5 py-2 rounded-xl font-bold text-xs text-white bg-rose-600 hover:bg-rose-700 shadow-md disabled:opacity-50"
              >
                {skillDeleteModal.loading ? 'Đang xóa...' : 'Xác nhận xóa'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: XÁC NHẬN KIỂM DUYỆT TIN TUYỂN DỤNG                 */}
      {/* ======================================================== */}
      {jobActionModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
          <form onSubmit={handleModerateJobSubmit} className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {jobActionModal.actionType === 'approve' && (
                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                )}
                {jobActionModal.actionType === 'revision' && (
                  <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
                    <Edit3 className="w-5 h-5" />
                  </div>
                )}
                {jobActionModal.actionType === 'reject' && (
                  <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
                    <XCircle className="w-5 h-5" />
                  </div>
                )}
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {jobActionModal.actionType === 'approve' && 'Phê Duyệt Tin Tuyển Dụng'}
                    {jobActionModal.actionType === 'revision' && 'Yêu Cầu Chỉnh Sửa Tin Tuyển Dụng'}
                    {jobActionModal.actionType === 'reject' && 'Từ Chối Tin Tuyển Dụng'}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium truncate max-w-xs">{jobActionModal.job?.Title}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setJobActionModal({ open: false, job: null, actionType: '', adminNote: '', loading: false, error: '' })}
                className="p-1 rounded-xl text-slate-400 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {jobActionModal.error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{jobActionModal.error}</span>
              </div>
            )}

            <div className="bg-slate-50 p-3.5 rounded-2xl space-y-1 text-xs">
              <div className="text-slate-500">Doanh nghiệp: <strong className="text-slate-800">{jobActionModal.job?.CompanyName}</strong></div>
              <div className="text-slate-500">Mức lương: <strong className="text-emerald-700">{jobActionModal.job?.SalaryRange || 'Thỏa thuận'}</strong> &bull; {jobActionModal.job?.Location}</div>
            </div>

            {jobActionModal.actionType === 'approve' ? (
              <p className="text-sm text-slate-600 leading-relaxed">
                Khi phê duyệt, tin tuyển dụng này sẽ chuyển sang trạng thái <strong>Xuất bản (Published)</strong> và hiển thị công khai cho tất cả ứng viên trên nền tảng.
              </p>
            ) : (
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 block">
                  {jobActionModal.actionType === 'revision' ? 'Nội dung yêu cầu NTD chỉnh sửa:' : 'Lý do từ chối tin tuyển dụng:'}
                  <span className="text-rose-500 ml-1">*</span>
                </label>
                <textarea
                  rows="4"
                  value={jobActionModal.adminNote}
                  onChange={(e) => setJobActionModal(prev => ({ ...prev, adminNote: e.target.value, error: '' }))}
                  placeholder={
                    jobActionModal.actionType === 'revision'
                      ? 'Ví dụ: Yêu cầu mô tả cụ thể hơn trách nhiệm công việc, bổ sung địa điểm làm việc chi tiết tại chi nhánh...'
                      : 'Ví dụ: Tin tuyển dụng vi phạm chính sách nội dung, mức lương không phù hợp hoặc có dấu hiệu gian lận...'
                  }
                  className="w-full p-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setJobActionModal({ open: false, job: null, actionType: '', adminNote: '', loading: false, error: '' })}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                disabled={jobActionModal.loading}
                className={`px-5 py-2.5 rounded-xl font-bold text-xs text-white shadow-md disabled:opacity-50 ${
                  jobActionModal.actionType === 'approve'
                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30'
                    : jobActionModal.actionType === 'revision'
                    ? 'bg-purple-600 hover:bg-purple-700 shadow-purple-600/30'
                    : 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/30'
                }`}
              >
                {jobActionModal.loading ? 'Đang xử lý...' : (
                  jobActionModal.actionType === 'approve' ? 'Xác nhận Phê duyệt' :
                  jobActionModal.actionType === 'revision' ? 'Gửi yêu cầu chỉnh sửa' : 'Xác nhận Từ chối'
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: CHI TIẾT TIN TUYỂN DỤNG CẦN KIỂM DUYỆT            */}
      {/* ======================================================== */}
      {jobDetailModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <img
                  src={jobDetailModal.job?.CompanyLogoUrl || 'https://images.unsplash.com/photo-1549923746-c502d488b3ea?w=120&q=80'}
                  alt={jobDetailModal.job?.CompanyName}
                  className="w-14 h-14 rounded-2xl object-cover border-2 border-slate-200 shadow-sm"
                />
                <div>
                  <h2 className="text-xl font-black text-slate-900">{jobDetailModal.job?.Title}</h2>
                  <p className="text-xs text-slate-500 font-semibold mt-0.5">
                    {jobDetailModal.job?.CompanyName} &bull; {jobDetailModal.job?.CategoryName}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {jobDetailModal.job?.SalaryRange || 'Thỏa thuận'}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                      {jobDetailModal.job?.Location || 'Toàn quốc'}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setJobDetailModal({ open: false, job: null, loading: false })}
                className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {jobDetailModal.job?.AdminNote && (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                <strong className="block font-bold mb-1">Ghi chú kiểm duyệt hiện tại:</strong>
                {jobDetailModal.job?.AdminNote}
              </div>
            )}

            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Mô tả công việc</h4>
              <div className="text-sm text-slate-700 whitespace-pre-line leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100">
                {jobDetailModal.job?.Description}
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Yêu cầu ứng viên</h4>
              <div className="text-sm text-slate-700 whitespace-pre-line leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100">
                {jobDetailModal.job?.Requirements}
              </div>
            </div>

            {jobDetailModal.job?.requiredSkills?.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Kỹ năng yêu cầu (Tags)</h4>
                <div className="flex flex-wrap gap-2">
                  {jobDetailModal.job.requiredSkills.map((sk) => (
                    <span 
                      key={sk.SkillID}
                      className={`px-3 py-1 rounded-xl text-xs font-bold ${
                        sk.IsMandatory 
                          ? 'bg-indigo-100 text-indigo-800 border border-indigo-200' 
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {sk.SkillName} {sk.IsMandatory && '(Bắt buộc)'}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="border-t border-slate-100 pt-5 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-slate-500 font-semibold">
                Trạng thái hiện tại: <strong className="text-slate-800">{jobDetailModal.job?.Status}</strong>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setJobActionModal({
                    open: true,
                    job: jobDetailModal.job,
                    actionType: 'approve',
                    adminNote: '',
                    loading: false,
                    error: ''
                  })}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm"
                >
                  ✓ Phê duyệt tin
                </button>
                <button
                  type="button"
                  onClick={() => setJobActionModal({
                    open: true,
                    job: jobDetailModal.job,
                    actionType: 'revision',
                    adminNote: jobDetailModal.job?.AdminNote || '',
                    loading: false,
                    error: ''
                  })}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-purple-600 text-white hover:bg-purple-700 shadow-sm"
                >
                  ✏ Yêu cầu sửa
                </button>
                <button
                  type="button"
                  onClick={() => setJobActionModal({
                    open: true,
                    job: jobDetailModal.job,
                    actionType: 'reject',
                    adminNote: '',
                    loading: false,
                    error: ''
                  })}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 shadow-sm"
                >
                  ✕ Từ chối
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: XÁC NHẬN KHÓA / MỞ KHÓA TÀI KHOẢN                */}
      {/* ======================================================== */}
      {statusModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-slate-900 font-bold text-lg">
                {statusModal.targetStatus === 'Locked' ? (
                  <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
                    <Lock className="w-5 h-5" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Unlock className="w-5 h-5" />
                  </div>
                )}
                <span>
                  {statusModal.targetStatus === 'Locked' ? 'Khóa Tài Khoản' : 'Mở Khóa Tài Khoản'}
                </span>
              </div>
              <button
                onClick={() => setStatusModal({ open: false, user: null, targetStatus: '' })}
                className="p-1 rounded-xl text-slate-400 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-slate-600 text-sm leading-relaxed">
              Bạn có chắc chắn muốn {statusModal.targetStatus === 'Locked' ? 'khóa' : 'mở khóa'} tài khoản của{' '}
              <strong className="text-slate-900">{statusModal.user?.FullName}</strong> ({statusModal.user?.Email})?
              {statusModal.targetStatus === 'Locked' && (
                <span className="block mt-2 text-rose-600 font-medium text-xs">
                  * Khi bị khóa, người dùng sẽ không thể đăng nhập hoặc thao tác trên hệ thống.
                </span>
              )}
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStatusModal({ open: false, user: null, targetStatus: '' })}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleToggleStatus}
                className={`px-5 py-2.5 rounded-xl font-bold text-xs text-white shadow-md ${
                  statusModal.targetStatus === 'Locked'
                    ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/30'
                    : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30'
                }`}
              >
                Xác nhận {statusModal.targetStatus === 'Locked' ? 'Khóa' : 'Mở Khóa'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: ĐẶT LẠI MẬT KHẨU                                 */}
      {/* ======================================================== */}
      {resetPwdModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
          <form onSubmit={handleResetPassword} className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-slate-900 font-bold text-lg">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Đặt Lại Mật Khẩu</h3>
                  <p className="text-xs text-slate-500 font-medium">Tài khoản: {resetPwdModal.user?.FullName}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setResetPwdModal({ open: false, user: null, newPassword: '', showPwd: false, error: '' })}
                className="p-1 rounded-xl text-slate-400 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {resetPwdModal.error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{resetPwdModal.error}</span>
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700">Mật khẩu mới</label>
                <button
                  type="button"
                  onClick={generateRandomPassword}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
                >
                  ⚡ Tạo ngẫu nhiên
                </button>
              </div>
              <div className="relative">
                <input
                  type={resetPwdModal.showPwd ? 'text' : 'password'}
                  value={resetPwdModal.newPassword}
                  onChange={(e) => setResetPwdModal(prev => ({ ...prev, newPassword: e.target.value, error: '' }))}
                  placeholder="Nhập tối thiểu 6 ký tự (gồm chữ hoa & số)"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => setResetPwdModal(prev => ({ ...prev, showPwd: !prev.showPwd }))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                >
                  {resetPwdModal.showPwd ? 'Ẩn' : 'Hiện'}
                </button>
              </div>
              <p className="text-[11px] text-slate-400">
                Yêu cầu: Tối thiểu 6 ký tự, có ít nhất 1 chữ hoa (A-Z) và 1 chữ số (0-9).
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setResetPwdModal({ open: false, user: null, newPassword: '', showPwd: false, error: '' })}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/30"
              >
                Cập nhật mật khẩu
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: CHI TIẾT DOANH NGHIỆP & TÀI LIỆU GIẤY PHÉP KD     */}
      {/* ======================================================== */}
      {empDetailModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <img
                  src={empDetailModal.employer?.CompanyLogoUrl || 'https://images.unsplash.com/photo-1549923746-c502d488b3ea?w=120&q=80'}
                  alt={empDetailModal.employer?.CompanyName}
                  className="w-16 h-16 rounded-2xl object-cover border-2 border-slate-200 shadow-sm"
                />
                <div>
                  <h2 className="text-xl font-black text-slate-900">{empDetailModal.employer?.CompanyName}</h2>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">{empDetailModal.employer?.Address || 'Chưa cập nhật địa chỉ'}</p>
                  <div className="flex items-center gap-2 mt-2">
                    {empDetailModal.employer?.KYCStatus === 'Approved' ? (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        ✓ Đã xác thực Giấy phép KD
                      </span>
                    ) : empDetailModal.employer?.KYCStatus === 'Rejected' ? (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                        ✕ Bị từ chối Giấy phép KD
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        ⏳ Chờ duyệt Giấy phép KD
                      </span>
                    )}
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                      Quy mô: {empDetailModal.employer?.CompanySize || 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setEmpDetailModal({ open: false, employer: null, loading: false })}
                className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl text-xs">
              <div>
                <span className="text-slate-400 font-bold block">Người đại diện:</span>
                <span className="font-semibold text-slate-800 text-sm">{empDetailModal.employer?.FullName}</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold block">Email:</span>
                <span className="font-semibold text-slate-800 text-sm">{empDetailModal.employer?.Email}</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold block">Số điện thoại:</span>
                <span className="font-semibold text-slate-800">{empDetailModal.employer?.Phone || 'Chưa có'}</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold block">Website:</span>
                {empDetailModal.employer?.Website ? (
                  <a href={empDetailModal.employer?.Website} target="_blank" rel="noreferrer" className="font-semibold text-indigo-600 hover:underline flex items-center gap-1">
                    {empDetailModal.employer?.Website} <ExternalLink className="w-3 h-3" />
                  </a>
                ) : 'Chưa có'}
              </div>
            </div>

            <div className="border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-indigo-600" />
                  Tài Liệu Giấy Phép Kinh Doanh
                </h4>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleUpdateKyc(empDetailModal.employer?.EmployerID, 'Approved')}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm"
                  >
                    ✓ Phê duyệt Giấy phép KD
                  </button>
                  <button
                    onClick={() => setKycRejectModal({ open: true, employerId: empDetailModal.employer?.EmployerID, companyName: empDetailModal.employer?.CompanyName, reason: '' })}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 shadow-sm"
                  >
                    ✕ Từ chối Giấy phép KD
                  </button>
                </div>
              </div>

              {empDetailModal.employer?.kycDocuments?.length > 0 ? (
                <div className="space-y-3">
                  {empDetailModal.employer.kycDocuments.map((doc) => (
                    <div key={doc.DocumentID} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-indigo-500" />
                          <div>
                            <span className="font-bold text-slate-800">Giấy phép ĐKKD</span>
                            <span className="text-[11px] text-slate-400 ml-2">
                              Ngày nộp: {new Date(doc.SubmittedAt).toLocaleDateString('vi-VN')}
                            </span>
                          </div>
                        </div>
                        <a
                          href={doc.BusinessLicenseUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1 rounded-lg bg-indigo-50 text-indigo-600 font-bold hover:bg-indigo-100 flex items-center gap-1"
                        >
                          Mở xem tài liệu <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                      {doc.RejectionReason && (
                        <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 font-medium text-xs">
                          Lý do từ chối trước đó: {doc.RejectionReason}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-slate-500 italic p-3 bg-slate-50 rounded-xl">
                  Doanh nghiệp chưa tải lên bản scan/ảnh giấy phép kinh doanh.
                </div>
              )}
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-indigo-600" />
                Tin Tuyển Dụng Của Doanh Nghiệp ({empDetailModal.employer?.jobPostings?.length || 0})
              </h4>
              <div className="max-h-52 overflow-y-auto space-y-2 pr-1">
                {empDetailModal.employer?.jobPostings?.length > 0 ? (
                  empDetailModal.employer.jobPostings.map((job) => (
                    <div key={job.JobID} className="p-3 rounded-xl border border-slate-200 flex items-center justify-between text-xs hover:bg-slate-50">
                      <div>
                        <div className="font-bold text-slate-800">{job.Title}</div>
                        <div className="text-slate-500 text-[11px] mt-0.5">
                          {job.Location} &bull; {job.SalaryRange}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-indigo-600">{job.ApplicantCount || 0} ứng viên</span>
                        <div className="text-[10px] text-slate-400">
                          Trạng thái: {job.Status}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 italic">Doanh nghiệp chưa đăng tin nào.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: TỪ CHỐI GIẤY PHÉP KD (KYC) KÈM LÝ DO              */}
      {/* ======================================================== */}
      {kycRejectModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900">Từ Chối Giấy Phép Kinh Doanh</h3>
            <p className="text-xs text-slate-500">
              Nhập lý do từ chối để thông báo cho doanh nghiệp <strong className="text-slate-800">{kycRejectModal.companyName}</strong> tải lại:
            </p>
            <textarea
              rows="3"
              value={kycRejectModal.reason}
              onChange={(e) => setKycRejectModal(prev => ({ ...prev, reason: e.target.value }))}
              placeholder="Ví dụ: Giấy phép kinh doanh bị mờ, không rõ con dấu hoặc đã hết hạn..."
              className="w-full p-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500"
            />
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setKycRejectModal({ open: false, employerId: null, companyName: '', reason: '' })}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => handleUpdateKyc(kycRejectModal.employerId, 'Rejected', kycRejectModal.reason)}
                className="px-4 py-2 rounded-xl font-bold text-xs text-white bg-rose-600 hover:bg-rose-700"
              >
                Xác nhận từ chối
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: CHI TIẾT ỨNG VIÊN                                */}
      {/* ======================================================== */}
      {candDetailModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <img
                  src={candDetailModal.candidate?.AvatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&q=80'}
                  alt={candDetailModal.candidate?.FullName}
                  className="w-16 h-16 rounded-full object-cover border-2 border-slate-200 shadow-sm"
                />
                <div>
                  <h2 className="text-xl font-black text-slate-900">{candDetailModal.candidate?.FullName}</h2>
                  <p className="text-xs text-indigo-600 font-bold mt-0.5">{candDetailModal.candidate?.Headline || 'Chưa có tiêu đề'}</p>
                  <div className="flex items-center gap-2 mt-2">
                    {candDetailModal.candidate?.IsLookingForJob ? (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-50 text-teal-700 border border-teal-200">
                        Đang tìm việc
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-500">
                        Tạm tắt tìm việc
                      </span>
                    )}
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                      {candDetailModal.candidate?.CurrentLocation || 'Việt Nam'}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setCandDetailModal({ open: false, candidate: null, loading: false })}
                className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl text-xs">
              <div>
                <span className="text-slate-400 font-bold block">Email:</span>
                <span className="font-semibold text-slate-800 text-sm">{candDetailModal.candidate?.Email}</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold block">Số điện thoại:</span>
                <span className="font-semibold text-slate-800 text-sm">{candDetailModal.candidate?.Phone || 'Chưa có'}</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold block">Mức lương mong muốn:</span>
                <span className="font-semibold text-emerald-700">
                  {candDetailModal.candidate?.DesiredSalary ? `${Number(candDetailModal.candidate.DesiredSalary).toLocaleString('vi-VN')} VNĐ` : 'Thỏa thuận'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-bold block">Ngày tham gia:</span>
                <span className="font-semibold text-slate-800">
                  {new Date(candDetailModal.candidate?.CreatedAt).toLocaleDateString('vi-VN')}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-600" />
                Danh Sách CV ({candDetailModal.candidate?.cvs?.length || 0})
              </h4>
              <div className="space-y-2">
                {candDetailModal.candidate?.cvs?.length > 0 ? (
                  candDetailModal.candidate.cvs.map((cv) => (
                    <div key={cv.CVID} className="p-3 rounded-xl border border-slate-200 flex items-center justify-between text-xs hover:bg-slate-50">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-indigo-500" />
                        <div>
                          <a href={cv.FileUrl} target="_blank" rel="noreferrer" className="font-bold text-indigo-600 hover:underline flex items-center gap-1">
                            {cv.Title} <ExternalLink className="w-3 h-3" />
                          </a>
                          <span className="text-[11px] text-slate-400">
                            Tạo ngày: {new Date(cv.CreatedAt).toLocaleDateString('vi-VN')}
                          </span>
                        </div>
                      </div>
                      {cv.IsPrimary && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          CV Chính
                        </span>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 italic">Ứng viên chưa tải lên CV nào.</p>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-indigo-600" />
                Lịch Sử Ứng Tuyển ({candDetailModal.candidate?.applications?.length || 0})
              </h4>
              <div className="max-h-52 overflow-y-auto space-y-2 pr-1">
                {candDetailModal.candidate?.applications?.length > 0 ? (
                  candDetailModal.candidate.applications.map((app) => (
                    <div key={app.ApplicationID} className="p-3 rounded-xl border border-slate-200 flex items-center justify-between text-xs hover:bg-slate-50">
                      <div>
                        <div className="font-bold text-slate-800">{app.JobTitle}</div>
                        <div className="text-slate-500 text-[11px] mt-0.5">
                          {app.CompanyName} &bull; {app.Location}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-emerald-600">
                          Match: {app.MatchScore ? `${Math.round(app.MatchScore)}%` : 'N/A'}
                        </span>
                        <div className="text-[11px] font-semibold text-slate-600 mt-0.5">
                          Trạng thái: {app.Status}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 italic">Ứng viên chưa nộp đơn công việc nào.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
