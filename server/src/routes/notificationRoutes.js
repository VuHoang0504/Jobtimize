const express = require('express');
const { createHash } = require('crypto');
const { authenticate } = require('../middleware/authMiddleware');
const { executeQuery } = require('../config/db');
const { withTransaction, enqueue } = require('../services/notificationStore');
const router = express.Router();
router.use(authenticate);

const visible = `n.UserID=@UserID AND n.RecipientRole=@Role AND n.IsActive=1
  AND (n.Type<>'job_match' OR EXISTS(SELECT 1 FROM JobPostings j JOIN Employers e ON e.EmployerID=j.EmployerID
    JOIN Users eu ON eu.UserID=e.UserID JOIN CVs c ON c.CVID=n.CVID JOIN CandidateProfiles p ON p.ProfileID=c.ProfileID
    WHERE j.JobID=n.JobID AND j.Status='Published' AND eu.Status='Active' AND (j.ExpiresAt IS NULL OR j.ExpiresAt>GETDATE())
    AND p.UserID=@UserID AND p.IsLookingForJob=1 AND c.IsPrimary=1
    AND NOT EXISTS(SELECT 1 FROM JobApplications a WHERE a.JobID=j.JobID AND a.ProfileID=p.ProfileID)))`;
const params = req => ({ UserID: req.user.userId, Role: req.user.role });
const fail = res => res.status(503).json({ success: false, message: 'Thông báo tạm thời chưa sẵn sàng. Vui lòng thử lại.' });

router.get('/', async (req, res) => {
  try {
    const page = Number(req.query.page || 1), limit = 20;
    if (!Number.isSafeInteger(page) || page < 1 || page > 100000 || !['all', 'unread'].includes(req.query.filter || 'all')) return res.status(400).json({ success: false, message: 'Bộ lọc thông báo không hợp lệ.' });
    const p = { ...params(req), Offset: (page - 1) * limit };
    const filter = req.query.filter === 'unread' ? 'AND n.ReadAt IS NULL' : '';
    const result = await executeQuery(`SELECT COUNT(*) total,SUM(CASE WHEN n.ReadAt IS NULL THEN 1 ELSE 0 END) unread FROM Notifications n WHERE ${visible};
      SELECT n.NotificationID id,n.Type type,n.Title title,n.Body body,n.Href href,n.CreatedAt createdAt,n.ReadAt readAt
      FROM Notifications n WHERE ${visible} ${filter} ORDER BY n.NotificationID DESC OFFSET @Offset ROWS FETCH NEXT 20 ROWS ONLY;`, p);
    const counts = result.recordsets[0][0];
    res.json({ success: true, data: result.recordsets[1], total: counts.total, unread: counts.unread || 0, page, limit });
  } catch (error) { console.error('List notifications:', error.message); fail(res); }
});
router.patch('/read-all', async (req, res) => {
  try {
    await executeQuery(`UPDATE n SET ReadAt=COALESCE(ReadAt,SYSUTCDATETIME()) FROM Notifications n WHERE ${visible}`, params(req));
    res.json({ success: true });
  } catch { fail(res); }
});
router.patch('/:id/read', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ success: false, message: 'Mã thông báo không hợp lệ.' });
  try {
    const result = await executeQuery(`UPDATE n SET ReadAt=COALESCE(ReadAt,SYSUTCDATETIME()) FROM Notifications n WHERE n.NotificationID=@ID AND ${visible}`, { ...params(req), ID: id });
    if (!result.rowsAffected[0]) return res.status(404).json({ success: false, message: 'Không tìm thấy thông báo.' });
    res.json({ success: true });
  } catch { fail(res); }
});
router.post('/session', async (req, res) => {
  try {
    if (req.user.role === 'Candidate') {
      const session = createHash('sha256').update(req.headers.authorization).digest('hex');
      await withTransaction(query => enqueue(query, 'login', { userId: req.user.userId }, `login:${req.user.userId}:${session}`));
    }
    res.json({ success: true });
  } catch { fail(res); }
});
module.exports = router;
