const express = require('express');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { executeQuery } = require('../config/db');
const router = express.Router();
router.use(authenticate);
router.get('/stream', require('../services/notificationRealtime').stream);

const visible = `n.UserID=@UserID AND n.RecipientRole=@Role AND n.IsActive=1 AND n.Type<>'login'
  AND (n.Type NOT IN ('job_match','job_match_alert') OR EXISTS(SELECT 1 FROM JobPostings j JOIN Employers e ON e.EmployerID=j.EmployerID
    JOIN Users eu ON eu.UserID=e.UserID JOIN CVs c ON c.CVID=n.CVID JOIN CandidateProfiles p ON p.ProfileID=c.ProfileID
    CROSS APPLY(SELECT TOP 1 VersionID,Status FROM CVDocumentVersions WHERE CVID=c.CVID ORDER BY VersionNumber DESC)v
    LEFT JOIN JobNotificationPreferences prefs ON prefs.UserID=p.UserID
    WHERE j.JobID=n.JobID AND j.Status='Published' AND eu.Status='Active' AND (j.ExpiresAt IS NULL OR j.ExpiresAt>GETDATE())
    AND p.UserID=@UserID AND p.IsLookingForJob=1 AND c.IsPrimary=1 AND c.IsArchived=0 AND v.Status='Ready'
    AND (n.Type<>'job_match_alert' OR n.EventKey LIKE CONCAT('job-alert:',n.JobID,':',v.VersionID,':%'))
    AND (n.Type<>'job_match' OR NOT EXISTS(SELECT 1 FROM Notifications alert WHERE alert.UserID=n.UserID AND alert.JobID=n.JobID
      AND alert.CVID=n.CVID AND alert.Type='job_match_alert' AND alert.IsActive=1
      AND alert.EventKey LIKE CONCAT('job-alert:',n.JobID,':',v.VersionID,':%')))
    AND COALESCE(prefs.Enabled,1)=1
    AND (COALESCE(prefs.CategoryIds,N'[]')=N'[]' OR EXISTS(
      SELECT 1 FROM OPENJSON(prefs.CategoryIds) selected WHERE TRY_CONVERT(INT,selected.value)=j.CategoryID))
    AND NOT EXISTS(SELECT 1 FROM JobApplications a WHERE a.JobID=j.JobID AND a.ProfileID=p.ProfileID)))`;
const params = req => ({ UserID: req.user.userId, Role: req.user.role });
const fail = res => res.status(503).json({ success: false, message: 'Thông báo tạm thời chưa sẵn sàng. Vui lòng thử lại.' });
const inboxOrder = `CASE WHEN n.ReadAt IS NULL THEN 0 ELSE 1 END,
  CASE WHEN @Role='Candidate' AND n.Type='job_match_alert' THEN -1
    WHEN @Role='Candidate' AND n.Type IN ('invitation','job_match') THEN 0
    WHEN @Role='Employer' AND n.Type IN ('application','job_status') THEN 0 ELSE 1 END,
  n.NotificationID DESC`;

const candidateOnly = authorize(['Candidate']);
router.get('/job-preferences', candidateOnly, async (req, res) => {
  try {
    const { recordset: [saved] } = await executeQuery(
      'SELECT Enabled,CategoryIds FROM JobNotificationPreferences WHERE UserID=@UserID', params(req));
    res.json({ success: true, data: {
      enabled: saved ? saved.Enabled : true,
      categoryIds: saved ? JSON.parse(saved.CategoryIds) : []
    } });
  } catch (error) { console.error('Load job notification preferences:', error.message); fail(res); }
});

router.put('/job-preferences', candidateOnly, async (req, res) => {
  const { enabled, categoryIds } = req.body || {};
  const invalid = () => res.status(400).json({ success: false, message: 'Lựa chọn ngành nghề không hợp lệ.' });
  if (typeof enabled !== 'boolean' || !Array.isArray(categoryIds) ||
    categoryIds.length > 500 || categoryIds.some(id => !Number.isInteger(id) || id < 1 || id > 2147483647)) return invalid();
  const ids = [...new Set(categoryIds)].sort((a, b) => a - b);
  try {
    const values = { UserID: req.user.userId, Enabled: enabled, CategoryIds: JSON.stringify(ids) };
    const { recordset: [result] } = await executeQuery(`
      IF (SELECT COUNT(*) FROM JobCategories c JOIN OPENJSON(@CategoryIds) ids
        ON c.CategoryID=CONVERT(INT,ids.value)) <> @CategoryCount
        SELECT CAST(0 AS BIT) AS Saved;
      ELSE BEGIN
        MERGE JobNotificationPreferences WITH (HOLDLOCK) AS target
        USING (SELECT @UserID AS UserID) AS source ON target.UserID=source.UserID
        WHEN MATCHED THEN UPDATE SET Enabled=@Enabled,CategoryIds=@CategoryIds
        WHEN NOT MATCHED THEN INSERT (UserID,Enabled,CategoryIds) VALUES (@UserID,@Enabled,@CategoryIds);
        SELECT CAST(1 AS BIT) AS Saved;
      END;`, { ...values, CategoryCount: ids.length });
    if (!result.Saved) return invalid();
    res.json({ success: true, data: { enabled, categoryIds: ids } });
  } catch (error) { console.error('Save job notification preferences:', error.message); fail(res); }
});

router.get('/', async (req, res) => {
  try {
    const page = Number(req.query.page || 1), limit = 20;
    if (!Number.isSafeInteger(page) || page < 1 || page > 100000 || !['all', 'unread'].includes(req.query.filter || 'all')) return res.status(400).json({ success: false, message: 'Bộ lọc thông báo không hợp lệ.' });
    const p = { ...params(req), Offset: (page - 1) * limit };
    const filter = req.query.filter === 'unread' ? 'AND n.ReadAt IS NULL' : '';
    const result = await executeQuery(`SELECT COUNT(*) total,SUM(CASE WHEN n.ReadAt IS NULL THEN 1 ELSE 0 END) unread FROM Notifications n WHERE ${visible};
      SELECT n.NotificationID id,n.Type type,n.Title title,n.Body body,n.Href href,n.CreatedAt createdAt,n.ReadAt readAt
      FROM Notifications n WHERE ${visible} ${filter} ORDER BY ${inboxOrder} OFFSET @Offset ROWS FETCH NEXT 20 ROWS ONLY;
      SELECT TOP 1 n.NotificationID id,n.Type type,n.Title title,n.Body body,n.Href href,n.CreatedAt createdAt,n.ReadAt readAt
      FROM Notifications n WHERE ${visible} AND n.Type='job_match_alert' AND n.ReadAt IS NULL ORDER BY n.NotificationID DESC;`, p);
    const counts = result.recordsets[0][0];
    res.json({ success: true, data: result.recordsets[1], total: counts.total, unread: counts.unread || 0, page, limit,
      latestOpportunity: result.recordsets[2]?.[0] || null });
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
router.post('/session', (req, res) => {
  // Compatibility for older clients: login success is now a transient client notice.
  res.json({ success: true });
});
module.exports = router;
