const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

// Tất cả API Quản trị đều yêu cầu đăng nhập và có Role 'Admin'
router.use(authenticate, authorize(['Admin']));

// 1. Thống kê tổng quan Dashboard & Báo cáo Doanh thu
router.get('/stats', adminController.getDashboardStats);
router.get('/analytics', adminController.getAnalyticsReport);
router.get('/transactions', adminController.getTransactions);

// 2. Quản lý Ứng viên (Candidates)
router.get('/candidates', adminController.getCandidates);
router.get('/candidates/:userId', adminController.getCandidateDetail);

// 3. Quản lý Doanh nghiệp (Employers)
router.get('/employers', adminController.getEmployers);
router.get('/employers/:employerId', adminController.getEmployerDetail);
router.patch('/employers/:employerId/kyc', adminController.updateEmployerKYC);

// 4. Kiểm duyệt Tin tuyển dụng (Job Postings Moderation)
router.get('/jobs', adminController.getModerationJobs);
router.get('/jobs/:jobId', adminController.getJobDetail);
router.patch('/jobs/:jobId/moderate', adminController.moderateJob);

// 5. Quản lý Báo cáo vi phạm (Reports)
router.get('/reports', adminController.getReports);
router.patch('/reports/:reportId', adminController.resolveReport);

// 6. Quản lý Ngành nghề (Job Categories CRUD)
router.get('/categories', adminController.getCategoriesAdmin);
router.post('/categories', adminController.createCategory);
router.put('/categories/:id', adminController.updateCategory);
router.delete('/categories/:id', adminController.deleteCategory);

// 7. Quản lý Từ điển Kỹ năng (Skill Taxonomy CRUD)
router.get('/skills', adminController.getSkillsAdmin);
router.post('/skills', adminController.createSkill);
router.put('/skills/:id', adminController.updateSkill);
router.delete('/skills/:id', adminController.deleteSkill);

// 8. Quản lý Tài khoản chung (Khóa/Mở khóa & Cấp lại mật khẩu)
router.patch('/users/:userId/status', adminController.updateUserStatus);
router.patch('/users/:userId/reset-password', adminController.resetUserPassword);

module.exports = router;

