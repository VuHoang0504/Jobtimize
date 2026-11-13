const fs = require('fs/promises');
const path = require('path');
const { executeQuery } = require('../config/db');
const { withTransaction, enqueue } = require('./notificationStore');

const uploadRoot = path.resolve(__dirname, '../../uploads/kyc');
const error = (status, message) => Object.assign(new Error(message), { status });
const positiveId = value => (typeof value === 'number' || (typeof value === 'string' && /^\d+$/.test(value)))
  && Number.isSafeInteger(Number(value)) && Number(value) > 0;

function kycFilePath(url) {
  if (typeof url !== 'string' || !url.startsWith('/uploads/kyc/')) return null;
  const filename = url.slice('/uploads/kyc/'.length);
  if (!/^[a-zA-Z0-9_-][a-zA-Z0-9_.-]*$/.test(filename)) return null;
  const target = path.resolve(uploadRoot, filename);
  return path.dirname(target) === uploadRoot ? target : null;
}

async function deleteEmployerKYC({ employerId, expectedDocumentId, actorId, ipAddress }) {
  if (!positiveId(employerId) || (expectedDocumentId !== null && !positiveId(expectedDocumentId))) {
    throw error(400, 'Hồ sơ KYC không hợp lệ. Vui lòng tải lại danh sách.');
  }
  const result = await withTransaction(async query => {
    // Submission and review acquire the employer lock first as well.
    const employer = (await query(`SELECT EmployerID,UserID,KYCStatus FROM Employers WITH(UPDLOCK,HOLDLOCK)
      WHERE EmployerID=@ID`, { ID: Number(employerId) })).recordset[0];
    if (!employer) throw error(404, 'Không tìm thấy doanh nghiệp.');
    const documents = (await query(`SELECT DocumentID,BusinessLicenseUrl,TaxCertificateUrl FROM KYCDocuments WITH(UPDLOCK,HOLDLOCK)
      WHERE EmployerID=@ID ORDER BY SubmittedAt DESC,DocumentID DESC`, { ID: employer.EmployerID })).recordset;
    if (!documents.length && !['Approved', 'Rejected'].includes(employer.KYCStatus)) throw error(404, 'Doanh nghiệp không còn hồ sơ KYC để xóa.');
    const latestDocumentId = documents[0]?.DocumentID || null;
    if (latestDocumentId !== (expectedDocumentId === null ? null : Number(expectedDocumentId))) {
      throw error(409, 'Doanh nghiệp vừa nộp hồ sơ KYC mới. Vui lòng tải lại và kiểm tra trước khi xóa.');
    }
    await query('DELETE FROM KYCDocuments WHERE EmployerID=@ID', { ID: employer.EmployerID });
    await query("UPDATE Employers SET KYCStatus='Pending' WHERE EmployerID=@ID", { ID: employer.EmployerID });
    await query(`UPDATE Notifications SET IsActive=0 WHERE
      (Type='kyc_submitted' AND Href=@AdminHref) OR
      (Type IN ('kyc_reviewed','kyc_deleted') AND UserID=@UserID AND RecipientRole='Employer')`,
    { AdminHref: `/admin/users?tab=employers&employerId=${employer.EmployerID}`, UserID: employer.UserID });
    await query('INSERT SystemLogs(UserID,Action,IpAddress) VALUES(@UserID,@Action,@IP)', {
      UserID: actorId,
      Action: `KYC_DELETE employer=${employer.EmployerID} documents=${documents.length} latest=${latestDocumentId || 'none'} previousStatus=${employer.KYCStatus}`,
      IP: typeof ipAddress === 'string' ? ipAddress.slice(0, 50) : null
    });
    await enqueue(query, 'kyc_deleted', { employerId: employer.EmployerID, documentId: latestDocumentId });
    return { employerId: employer.EmployerID, deletedDocuments: documents.length,
      fileUrls: [...new Set(documents.flatMap(doc => [doc.BusinessLicenseUrl, doc.TaxCertificateUrl]).filter(Boolean))] };
  });

  // Files are removed only after commit; other submissions may share a file.
  // The download route also requires a surviving database reference.
  for (const url of result.fileUrls) {
    const target = kycFilePath(url);
    if (!target) continue;
    try {
      const used = (await executeQuery(`SELECT TOP 1 DocumentID FROM KYCDocuments
        WHERE BusinessLicenseUrl=@URL OR TaxCertificateUrl=@URL`, { URL: url })).recordset.length;
      if (!used) await fs.unlink(target);
    } catch (err) {
      if (err.code !== 'ENOENT') console.error('KYC file cleanup failed:', err.code || 'database unavailable');
    }
  }
  return { employerId: result.employerId, deletedDocuments: result.deletedDocuments, kycStatus: 'Pending', hasKycDocument: false };
}

module.exports = { deleteEmployerKYC, kycFilePath };
