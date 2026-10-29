const express = require('express');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { withTransaction, enqueue } = require('../services/notificationStore');
const router = express.Router();
router.use(authenticate, authorize(['Candidate', 'Employer']));
router.post('/', async (req, res) => {
  const { targetType, reason } = req.body;
  const targetId = Number(req.body.targetId);
  const targets = { JobPosting: ['JobPostings', 'JobID'], Employer: ['Employers', 'EmployerID'], Candidate: ['Users', 'UserID'] };
  if (!targets[targetType] || !Number.isSafeInteger(targetId) || targetId < 1 || typeof reason !== 'string' || reason.trim().length < 10 || reason.length > 2000) return res.status(400).json({ success: false, message: 'Đối tượng không hợp lệ hoặc nội dung báo cáo phải từ 10 đến 2000 ký tự.' });
  try {
    const result = await withTransaction(async query => {
      const [table, key] = targets[targetType];
      const target = await query(`SELECT ${key} FROM ${table} WHERE ${key}=@ID ${targetType === 'Candidate' ? "AND EXISTS(SELECT 1 FROM UserRoles ur JOIN Roles r ON r.RoleID=ur.RoleID WHERE ur.UserID=Users.UserID AND r.RoleName='Candidate')" : ''}`, { ID: targetId });
      if (!target.recordset.length) throw Object.assign(new Error('Đối tượng không tồn tại.'), { status: 404 });
      const duplicate = await query(`SELECT ReportID FROM UserReports WITH(UPDLOCK,HOLDLOCK) WHERE ReporterUserID=@UserID AND TargetType=@Type AND TargetID=@ID AND Status='Pending'`, { UserID: req.user.userId, Type: targetType, ID: targetId });
      if (duplicate.recordset.length) return duplicate.recordset[0];
      const report = (await query(`INSERT UserReports(ReporterUserID,TargetType,TargetID,Reason,Status) OUTPUT INSERTED.ReportID VALUES(@UserID,@Type,@ID,@Reason,'Pending')`, { UserID: req.user.userId, Type: targetType, ID: targetId, Reason: reason.trim() })).recordset[0];
      await enqueue(query, 'report_created', { reportId: report.ReportID }, `report:created:${report.ReportID}`);
      return report;
    });
    res.status(201).json({ success: true, data: result, message: 'Báo cáo đã được chuyển tới quản trị viên.' });
  } catch (error) { console.error('Submit report:', error.message); res.status(error.status || 500).json({ success: false, message: error.status ? error.message : 'Không thể gửi báo cáo.' }); }
});
module.exports = router;
