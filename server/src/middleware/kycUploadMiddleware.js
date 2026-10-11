const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '../../uploads/kyc');
fs.mkdirSync(uploadDir, { recursive: true });

const allowedTypes = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']);

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, uploadDir),
  filename: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    callback(null, `${file.fieldname}-${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`);
  }
});

module.exports = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    if (!allowedTypes.has(file.mimetype)) {
      return callback(new Error('Tài liệu KYC chỉ nhận file PDF, PNG, JPG hoặc WEBP.'));
    }
    callback(null, true);
  }
}).fields([
  { name: 'businessLicense', maxCount: 1 },
  { name: 'taxCertificate', maxCount: 1 }
]);
