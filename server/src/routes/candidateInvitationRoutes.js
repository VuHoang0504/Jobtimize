const express = require('express');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { executeQuery } = require('../config/db');
const recruitment = require('../controllers/recruitmentController');
const router = express.Router();
router.use(authenticate, authorize(['Candidate']));
router.get('/', async (req, res) => {
  try {
    const page = Number(req.query.page || 1), id = req.query.id ? Number(req.query.id) : null;
    if (!Number.isSafeInteger(page) || page < 1 || page > 100000 || (id !== null && (!Number.isSafeInteger(id) || id < 1))) return res.status(400).json({ success: false, message: 'Bộ lọc lời mời không hợp lệ.' });
    const data = await executeQuery(`SELECT i.InvitationID,i.JobID,i.Message,i.Status,i.SentAt,i.RespondedAt,i.Version,j.ExpiresAt,j.Title,j.Status JobStatus,e.CompanyName,eu.Email AS EmployerEmail,eu.Phone AS EmployerPhone FROM CandidateInvitations i JOIN CandidateProfiles p ON p.ProfileID=i.ProfileID JOIN JobPostings j ON j.JobID=i.JobID JOIN Employers e ON e.EmployerID=i.EmployerID JOIN Users eu ON eu.UserID=e.UserID WHERE p.UserID=@UserID AND (@ID IS NULL OR i.InvitationID=@ID) ORDER BY i.SentAt DESC,i.InvitationID DESC OFFSET @Offset ROWS FETCH NEXT 20 ROWS ONLY`, { UserID: req.user.userId, ID: id, Offset: (page - 1) * 20 });
    res.json({ success: true, data: data.recordset, page, hasMore: data.recordset.length === 20 });
  } catch { res.status(500).json({ success: false, message: 'Không thể tải lời mời.' }); }
});
router.patch('/:id/respond', recruitment.respondInvitation);
module.exports = router;
