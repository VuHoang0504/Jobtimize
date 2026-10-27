const multer = require('multer');
const service = require('../services/cvDocumentService');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => cb(null, ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) }).single('avatar');

function uploadAvatar(req, res, next) {
  upload(req, res, async error => {
    if (error) return res.status(400).json({ success: false, message: error.code === 'LIMIT_FILE_SIZE' ? 'Ảnh tối đa 5 MB.' : 'Không thể nhận ảnh. Chỉ chọn một ảnh JPG, PNG hoặc WebP.' });
    if (!req.file) return res.status(400).json({ success: false, message: 'Chọn ảnh JPG, PNG hoặc WebP.' });
    try { res.status(201).json({ success: true, data: { url: await service.saveAvatar(req.file.buffer, req.user.userId) } }); } catch (err) { next(err); }
  });
}
async function getAvatar(req, res, next) {
  try {
    const url = `/api/candidate/cv/avatar/${req.params.userId}/${req.params.filename}`;
    const file = await service.avatarPath(url, req.user.userId);
    res.set('Cache-Control', 'private, max-age=3600');
    res.type('webp').sendFile(file);
  } catch (error) { next(error); }
}
async function validateOnlineCV(req, res, next) {
  try { req.body = await service.normalizePayload(req.body, req.user.userId); next(); } catch (error) { next(error); }
}
async function exportPDF(req, res, next) {
  try {
    const payload = await service.normalizePayload(req.body, req.user.userId);
    const buffer = await service.createPDF(payload, req.user.userId);
    const filename = encodeURIComponent(payload.title.replace(/[\\/:*?"<>|\r\n]/g, '-'));
    res.set('Content-Disposition', `attachment; filename="CV.pdf"; filename*=UTF-8''${filename}.pdf`);
    res.set('Cache-Control', 'no-store');
    res.type('pdf').send(buffer);
  } catch (error) {
    if (!error.status) { console.error('CV PDF export:', error.message); error = Object.assign(new Error('Chưa thể tạo PDF. Vui lòng thử lại hoặc kiểm tra Chromium trên máy chủ.'), { status: 503 }); }
    next(error);
  }
}
module.exports = { uploadAvatar, getAvatar, validateOnlineCV, exportPDF };
