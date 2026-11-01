const fs = require('fs/promises');
const multer = require('multer');
const db = require('../config/db');
const { withTransaction } = require('../services/notificationStore');
const service = require('../services/cvAnalysisService');
const normal = require('../services/cvNormalization');
const documents = require('../services/cvDocumentService');
const receive = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024, files: 1 } }).single('cvFile');

async function profile(userId) {
  const row = (await db.executeQuery('SELECT ProfileID FROM CandidateProfiles WHERE UserID=@ID', { ID: userId })).recordset[0];
  if (!row) throw service.fail('Không tìm thấy hồ sơ ứng viên.', 404);
  return row.ProfileID;
}
const endpoint = action => async (req, res, next) => { try { await service.initialize(); await action(req, res); } catch (error) { next(error); } };

const list = endpoint(async (req, res) => {
  const profileId = await profile(req.user.userId);
  const cvs = (await db.executeQuery('SELECT * FROM CVs WHERE ProfileID=@ID AND IsArchived=0 ORDER BY IsPrimary DESC,UpdatedAt DESC,CVID DESC', { ID: profileId })).recordset;
  const data = [];
  for (const cv of cvs) {
    const version = await service.ensureVersion(cv);
    data.push({ CVID: cv.CVID, Title: cv.Title, CvType: cv.CvType || 'Upload', IsPrimary: cv.IsPrimary,
      CreatedAt: cv.CreatedAt, UpdatedAt: cv.UpdatedAt, document: service.publicVersion(version) });
  }
  res.json({ success: true, data });
});
const detail = endpoint(async (req, res) => {
  const cv = await service.ownedCV(req.params.cvId, req.user.userId);
  const version = await service.ensureVersion(cv);
  const history = (await db.executeQuery('SELECT VersionID,VersionNumber,Status,UpdatedAt,ConfirmedAt FROM CVDocumentVersions WHERE CVID=@ID AND ProfileID=@ProfileID ORDER BY VersionNumber DESC', { ID: cv.CVID, ProfileID: cv.ProfileID })).recordset;
  res.json({ success: true, data: { CVID: cv.CVID, Title: cv.Title, CvType: cv.CvType, IsPrimary: cv.IsPrimary,
    document: service.publicVersion(version, true), history: history.map(item => service.publicVersion(item)) } });
});
function upload(req, res, next) {
  receive(req, res, async error => {
    if (error) return res.status(400).json({ success: false, message: error.code === 'LIMIT_FILE_SIZE' ? 'CV tối đa 10 MB.' : 'Chỉ tải một tệp CV mỗi lần.' });
    let file;
    try {
      if (!req.file) throw service.fail('Chọn tệp CV để tải lên.');
      const title = normal.text(req.body.title || req.file.originalname, 200);
      if (!title) throw service.fail('Nhập tên CV.');
      const profileId = await profile(req.user.userId);
      const old = req.params.cvId ? await service.ownedCV(req.params.cvId, req.user.userId) : null;
      if (old?.CvType === 'OnlineBuilder') throw service.fail('CV trực tuyến cần chỉnh sửa trong trình thiết kế. Tải file thành một CV riêng.');
      if (old) await service.ensureVersion(old);
      file = await service.storeFile(req.file.buffer, req.file.originalname);
      const saved = await withTransaction(async query => {
        await query('SELECT ProfileID FROM CandidateProfiles WITH(UPDLOCK,HOLDLOCK) WHERE ProfileID=@ID', { ID: profileId });
        const row = old ? (await query(`UPDATE CVs SET Title=@Title,UpdatedAt=GETDATE() OUTPUT INSERTED.*
          WHERE CVID=@ID AND ProfileID=@ProfileID AND IsArchived=0`, { Title: title, ID: old.CVID, ProfileID: profileId })).recordset[0] : (await query(`INSERT CVs(ProfileID,Title,FileUrl,CvType,IsPrimary,CreatedAt,UpdatedAt)
          OUTPUT INSERTED.* SELECT @ProfileID,@Title,'','Upload',CASE WHEN EXISTS(SELECT 1 FROM CVs WHERE ProfileID=@ProfileID AND IsArchived=0) THEN 0 ELSE 1 END,GETDATE(),GETDATE()`, { ProfileID: profileId, Title: title })).recordset[0];
        if (!row) throw service.fail('CV không còn tồn tại.', 409);
        await query('UPDATE CVs SET FileUrl=@Url WHERE CVID=@ID', { Url: '/api/cv-documents/' + row.CVID + '/file', ID: row.CVID });
        return { cv: row, version: await service.capture(row, file, query) };
      });
      const { cv, version } = saved;
      if (version.FileName !== file.filename) await fs.unlink(service.filePath(file.filename)).catch(() => {});
      res.status(201).json({ success: true, data: { CVID: cv.CVID, document: service.publicVersion(version) } });
    } catch (err) {
      // Once captured, file versions are retained for submitted applications.
      if (file) {
        const stored = await db.executeQuery('SELECT VersionID FROM CVDocumentVersions WHERE FileName=@File', { File: file.filename }).catch(() => null);
        if (stored && !stored.recordset.length) await fs.unlink(service.filePath(file.filename)).catch(() => {});
      }
      next(err);
    }
  });
}
const rename = endpoint(async (req, res) => {
  const cv = await service.ownedCV(req.params.cvId, req.user.userId);
  const title = normal.text(req.body.title, 200);
  if (!title) throw service.fail('Tên CV không được để trống.');
  await db.executeQuery('UPDATE CVs SET Title=@Title,UpdatedAt=GETDATE() WHERE CVID=@ID', { ID: cv.CVID, Title: title });
  res.json({ success: true });
});
const retry = endpoint(async (req, res) => {
  const cv = await service.ownedCV(req.params.cvId, req.user.userId);
  const version = await service.ensureVersion(cv);
  if (!version || version.SourceType !== 'Upload') throw service.fail('Tệp gốc không còn khả dụng. Vui lòng tải lại CV.');
  if (!['Failed', 'NeedsReview'].includes(version.Status)) throw service.fail('Phiên bản này không cần đọc lại.', 409);
  await db.executeQuery(`UPDATE CVDocumentVersions SET Status='Queued',Attempts=0,ErrorMessage=NULL,LeaseUntil=NULL,UpdatedAt=SYSUTCDATETIME()
    WHERE VersionID=@ID AND Status IN ('Failed','NeedsReview')`, { ID: version.VersionID });
  res.json({ success: true });
});
const confirm = endpoint(async (req, res) => {
  const cv = await service.ownedCV(req.params.cvId, req.user.userId);
  const version = await service.ensureVersion(cv);
  if (!version) throw service.fail('Tải lại tệp CV trước khi bổ sung thông tin.');
  if (['Queued', 'Processing'].includes(version.Status)) throw service.fail('CV đang được đọc. Vui lòng chờ.', 409);
  if (!req.body.analysis || JSON.stringify(req.body.analysis).length > 150000) throw service.fail('Thông tin CV không hợp lệ hoặc quá dài.');
  const analysis = normal.normalizeAnalysis(req.body.analysis, await service.taxonomy(), version.RawText || '', { userConfirmed: true });
  if (!analysis.personal.fullName && !analysis.skills.length && !analysis.experiences.length) throw service.fail('Nhập ít nhất họ tên, kỹ năng hoặc kinh nghiệm có trong CV.');
  const result = await withTransaction(async query => {
    await query('SELECT CVID FROM CVs WITH(UPDLOCK,HOLDLOCK) WHERE CVID=@ID', { ID: cv.CVID });
    const current = (await query('SELECT TOP 1 VersionID FROM CVDocumentVersions WHERE CVID=@ID ORDER BY VersionNumber DESC', { ID: cv.CVID })).recordset[0];
    if (current?.VersionID !== Number(req.body.versionId) || current.VersionID !== version.VersionID) throw service.fail('CV đã thay đổi. Tải lại trang trước khi lưu.', 409);
    if (version.Status === 'Ready') {
      return (await query(`INSERT CVDocumentVersions(CVID,ProfileID,VersionNumber,ContentHash,SourceType,OriginalName,FileName,MimeType,BuilderJson,Template,Status,RawText,ParsedJson,ConfirmedJson,WarningsJson,ParseMethod,ConfirmedAt)
        OUTPUT INSERTED.VersionID SELECT CVID,ProfileID,VersionNumber+1,ContentHash,SourceType,OriginalName,FileName,MimeType,BuilderJson,Template,'Ready',RawText,ParsedJson,@Data,'[]',ParseMethod,SYSUTCDATETIME()
        FROM CVDocumentVersions WHERE VersionID=@ID`, { ID: version.VersionID, Data: JSON.stringify(analysis) })).recordset[0];
    }
    await query(`UPDATE CVDocumentVersions SET ConfirmedJson=@Data,Status='Ready',ConfirmedAt=SYSUTCDATETIME(),UpdatedAt=SYSUTCDATETIME(),ErrorMessage=NULL WHERE VersionID=@ID`, { ID: version.VersionID, Data: JSON.stringify(analysis) });
    return { VersionID: version.VersionID };
  });
  res.json({ success: true, data: { versionId: result.VersionID } });
});
const archive = endpoint(async (req, res) => {
  const cv = await service.ownedCV(req.params.cvId, req.user.userId);
  await service.ensureVersion(cv);
  await withTransaction(async query => {
    await query('SELECT ProfileID FROM CandidateProfiles WITH(UPDLOCK,HOLDLOCK) WHERE ProfileID=@ID', { ID: cv.ProfileID });
    await query('UPDATE CVs SET IsArchived=1,IsPrimary=0 WHERE CVID=@ID', { ID: cv.CVID });
    if (cv.IsPrimary) await query(`UPDATE CVs SET IsPrimary=1 WHERE CVID=(SELECT TOP 1 CVID FROM CVs WHERE ProfileID=@ID AND IsArchived=0 ORDER BY UpdatedAt DESC,CVID DESC)`, { ID: cv.ProfileID });
  });
  res.json({ success: true, message: 'Đã xóa khỏi danh sách CV. Bản đã gửi ứng tuyển được giữ nguyên.' });
});
async function deliver(version, userId, res) {
  res.set('Cache-Control', 'private, no-store');
  res.set('X-Content-Type-Options', 'nosniff');
  if (version.SourceType === 'OnlineBuilder') {
    const payload = await documents.normalizePayload({ title: 'CV', cvData: service.parse(version.BuilderJson), template: version.Template }, userId);
    return res.type('pdf').send(await documents.createPDF(payload, userId));
  }
  const buffer = await fs.readFile(service.filePath(version.FileName));
  const name = encodeURIComponent(version.OriginalName || 'CV');
  const inline = version.MimeType === 'application/pdf' || version.MimeType?.startsWith('image/');
  res.set('Content-Disposition', `${inline ? 'inline' : 'attachment'}; filename="CV"; filename*=UTF-8''${name}`);
  res.type(version.MimeType).send(buffer);
}
const file = endpoint(async (req, res) => {
  const cv = await service.ownedCV(req.params.cvId, req.user.userId);
  let version = await service.ensureVersion(cv);
  if (req.query.versionId) version = (await db.executeQuery('SELECT * FROM CVDocumentVersions WHERE CVID=@ID AND ProfileID=@ProfileID AND VersionID=@Version', { ID: cv.CVID, ProfileID: cv.ProfileID, Version: req.query.versionId })).recordset[0];
  if (!version) throw service.fail('Tệp gốc không còn khả dụng. Vui lòng tải lại CV.', 404);
  await deliver(version, req.user.userId, res);
});
const applicationFile = endpoint(async (req, res) => {
  const row = (await db.executeQuery(`SELECT a.CVID,a.CVVersionID,p.UserID AS CandidateUserID,p.ProfileID,e.UserID AS EmployerUserID
    FROM JobApplications a JOIN CandidateProfiles p ON p.ProfileID=a.ProfileID JOIN JobPostings j ON a.JobID=j.JobID JOIN Employers e ON j.EmployerID=e.EmployerID
    WHERE a.ApplicationID=@ID`, { ID: req.params.applicationId })).recordset[0];
  if (!row || (req.user.role !== 'Admin' && req.user.userId !== row.CandidateUserID && req.user.userId !== row.EmployerUserID)) throw service.fail('Không tìm thấy hồ sơ ứng tuyển.', 404);
  let version = row.CVVersionID ? (await db.executeQuery('SELECT * FROM CVDocumentVersions WHERE VersionID=@ID', { ID: row.CVVersionID })).recordset[0] : null;
  if (!version && row.CVID) {
    const cv = (await db.executeQuery('SELECT * FROM CVs WHERE CVID=@ID AND ProfileID=@ProfileID', { ID: row.CVID, ProfileID: row.ProfileID })).recordset[0];
    if (cv) version = await service.ensureVersion(cv);
  }
  if (!version) throw service.fail('Không còn tệp CV của lần ứng tuyển này.', 404);
  await deliver(version, row.CandidateUserID, res);
});
const talentFile = endpoint(async (req, res) => {
  const cv = (await db.executeQuery(`SELECT TOP 1 c.*,p.UserID FROM CVs c JOIN CandidateProfiles p ON c.ProfileID=p.ProfileID JOIN Users u ON p.UserID=u.UserID
    WHERE p.ProfileID=@ID AND p.IsLookingForJob=1 AND u.Status='Active' AND c.IsPrimary=1 AND c.IsArchived=0`, { ID: req.params.profileId })).recordset[0];
  if (!cv) throw service.fail('Ứng viên chưa chia sẻ CV hoặc đã tắt tìm việc.', 404);
  const version = await service.ensureVersion(cv);
  if (!version || version.Status !== 'Ready') throw service.fail('CV chưa sẵn sàng để chia sẻ.', 409);
  await deliver(version, cv.UserID, res);
});
module.exports = { list, detail, upload, rename, retry, confirm, archive, file, applicationFile, talentFile };
