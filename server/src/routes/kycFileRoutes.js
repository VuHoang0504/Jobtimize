const express = require('express');
const { executeQuery } = require('../config/db');
const { authenticate } = require('../middleware/authMiddleware');
const { kycFilePath } = require('../services/kycService');
const router = express.Router();

router.use(authenticate);
router.get('/:filename', async (req, res, next) => {
  if (!['Admin', 'Employer'].includes(req.user.role)) return res.status(403).json({ success: false, message: 'Bạn không có quyền xem tài liệu KYC.' });
  const url = `/uploads/kyc/${req.params.filename}`;
  const target = kycFilePath(url);
  if (!target) return res.status(404).json({ success: false, message: 'Không tìm thấy tài liệu KYC.' });
  try {
    const references = (await executeQuery(`SELECT e.UserID FROM KYCDocuments d JOIN Employers e ON e.EmployerID=d.EmployerID
      WHERE d.BusinessLicenseUrl=@URL OR d.TaxCertificateUrl=@URL`, { URL: url })).recordset;
    if (!references.length) return res.status(404).json({ success: false, message: 'Tài liệu KYC không còn tồn tại.' });
    if (req.user.role !== 'Admin' && !references.some(row => row.UserID === req.user.userId)) {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền xem tài liệu KYC này.' });
    }
    res.sendFile(target, err => {
      if (!err) return;
      if (err.code === 'ENOENT') return res.status(404).json({ success: false, message: 'Không tìm thấy tệp KYC.' });
      next(err);
    });
  } catch (err) { next(err); }
});
router.use((_req, res) => res.status(404).end());

module.exports = router;
