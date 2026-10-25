const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '../../uploads/receipts');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/jpg']);

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, uploadDir),
  filename: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    callback(null, `bill-${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, callback) => {
    if (!allowedTypes.has(file.mimetype.toLowerCase())) {
      return callback(new Error('Hình ảnh bill chỉ chấp nhận định dạng JPG, JPEG, PNG hoặc WEBP.'));
    }
    callback(null, true);
  }
}).single('receiptImage');

module.exports = (req, res, next) => {
  upload(req, res, (err) => {
    if (err) {
      return res.status(400).json({ success: false, message: err.message || 'Lỗi tải tệp hóa đơn/bill' });
    }
    next();
  });
};

