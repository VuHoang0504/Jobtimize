const { executeQuery } = require('../config/db');
const { withTransaction, enqueue } = require('../services/notificationStore');
const email = require('../services/emailService');

const error = (status, message) => Object.assign(new Error(message), { status });
const positiveId = value => Number.isSafeInteger(Number(value)) && Number(value) > 0;
const handle = work => async (req, res) => {
  try { await work(req, res); }
  catch (err) {
    if (!err.status) console.error('Recruitment:', err.message);
    res.status(err.status || 500).json({ success: false, message: err.status ? err.message : 'Không thể xử lý yêu cầu. Vui lòng thử lại.' });
  }
};

// Ownership comes from the authenticated user, never from submitted profile/employer IDs.
const invitationSelect = `SELECT i.*, j.Title AS JobTitle, j.Status AS JobStatus, j.ExpiresAt,
  e.CompanyName, eu.Email AS EmployerEmail, eu.Phone AS EmployerPhone, e.UserID AS EmployerUserID,
  u.FullName AS CandidateName, u.Email AS CandidateEmail, p.UserID AS CandidateUserID
  FROM CandidateInvitations i JOIN JobPostings j ON j.JobID=i.JobID
  JOIN Employers e ON e.EmployerID=i.EmployerID JOIN Users eu ON eu.UserID=e.UserID
  JOIN CandidateProfiles p ON p.ProfileID=i.ProfileID JOIN Users u ON u.UserID=p.UserID`;
const applicationSelect = `SELECT a.*, j.Title AS JobTitle, j.Status AS JobStatus, j.ExpiresAt, e.CompanyName,
  e.UserID AS EmployerUserID, eu.Email AS EmployerEmail, eu.Phone AS EmployerPhone,
  u.FullName AS CandidateName, u.Email AS CandidateEmail, p.UserID AS CandidateUserID
  FROM JobApplications a JOIN JobPostings j ON j.JobID=a.JobID
  JOIN Employers e ON e.EmployerID=j.EmployerID JOIN Users eu ON eu.UserID=e.UserID
  JOIN CandidateProfiles p ON p.ProfileID=a.ProfileID JOIN Users u ON u.UserID=p.UserID`;

const respondInvitation = handle(async (req, res) => {
  const { status, version } = req.body;
  if (!positiveId(req.params.id) || !positiveId(version) || !['Accepted', 'Declined'].includes(status)) throw error(400, 'Phản hồi lời mời không hợp lệ.');
  await withTransaction(async query => {
    const row = (await query(`${invitationSelect} WHERE i.InvitationID=@ID AND p.UserID=@UserID`, { ID: Number(req.params.id), UserID: req.user.userId })).recordset[0];
    if (!row) throw error(404, 'Không tìm thấy lời mời.');
    if (row.JobStatus !== 'Published' || (row.ExpiresAt && new Date(row.ExpiresAt) <= new Date())) throw error(409, 'Tin tuyển dụng đã đóng hoặc hết hạn.');
    const result = await query(`UPDATE CandidateInvitations SET Status=@Status,RespondedAt=SYSUTCDATETIME()
      OUTPUT INSERTED.InvitationID WHERE InvitationID=@ID AND Status='Sent' AND Version=@Version`, { ID: row.InvitationID, Status: status, Version: Number(version) });
    if (!result.recordset.length) throw error(409, 'Lời mời đã được phản hồi hoặc thay đổi. Vui lòng tải lại.');
    await enqueue(query, 'invitation_response', { invitationId: row.InvitationID, status }, `invite-response:${row.InvitationID}:${version}`);
  });
  res.json({ success: true, message: status === 'Accepted' ? 'Đã ghi nhận quan tâm. Nhà tuyển dụng có thể gửi lịch phỏng vấn cho bạn.' : 'Đã từ chối lời mời.' });
});

const scheduleInterview = handle(async (req, res) => {
  const { applicationId, invitationId, interviewDate, interviewType, locationOrLink, notes = '', version } = req.body;
  if (Boolean(applicationId) === Boolean(invitationId) || !positiveId(applicationId || invitationId)) throw error(400, 'Chọn một hồ sơ ứng tuyển hoặc lời mời.');
  const date = new Date(interviewDate);
  if (typeof interviewDate !== 'string' || !/(Z|[+-]\d{2}:\d{2})$/.test(interviewDate) || !Number.isFinite(date.getTime()) || date <= new Date()) throw error(400, 'Chọn thời gian phỏng vấn trong tương lai, có múi giờ.');
  if (!['Online', 'Offline'].includes(interviewType) || typeof locationOrLink !== 'string' || !locationOrLink.trim() || locationOrLink.length > 500 || typeof notes !== 'string' || notes.length > 2000) throw error(400, 'Kiểm tra hình thức, địa điểm và ghi chú (tối đa 2.000 ký tự).');
  if (interviewType === 'Online') {
    try { if (!['http:', 'https:'].includes(new URL(locationOrLink).protocol)) throw new Error(); }
    catch { throw error(400, 'Đường dẫn cuộc họp phải bắt đầu bằng http:// hoặc https://.'); }
  }
  const result = await withTransaction(async query => {
    const source = invitationId ? invitationSelect : applicationSelect;
    const alias = invitationId ? 'i' : 'a';
    const field = invitationId ? 'InvitationID' : 'ApplicationID';
    const owner = (await query(`${source.replace(`FROM ${invitationId ? 'CandidateInvitations i' : 'JobApplications a'}`, `FROM ${invitationId ? 'CandidateInvitations i' : 'JobApplications a'} WITH(UPDLOCK,HOLDLOCK)`)}
      WHERE ${alias}.${field}=@ID AND e.UserID=@UserID`, { ID: Number(invitationId || applicationId), UserID: req.user.userId })).recordset[0];
    if (!owner) throw error(404, 'Không tìm thấy hồ sơ tuyển dụng.');
    if (invitationId && owner.Status !== 'Accepted') throw error(409, 'Chỉ hẹn phỏng vấn khi ứng viên đã quan tâm.');
    if (!invitationId && ['Rejected', 'Offered'].includes(owner.Status)) throw error(409, 'Hồ sơ này đã kết thúc xét duyệt.');
    if (owner.JobStatus !== 'Published' || (owner.ExpiresAt && new Date(owner.ExpiresAt) <= new Date())) throw error(409, 'Tin tuyển dụng hiện không mở tuyển.');
    const existing = (await query(`SELECT TOP 1 * FROM Interviews WITH(UPDLOCK,HOLDLOCK) WHERE ${field}=@ID ORDER BY InterviewID DESC`, { ID: Number(invitationId || applicationId) })).recordset[0];
    if ((existing && Number(version) !== existing.Version) || (!existing && version != null)) throw error(409, 'Lịch đã thay đổi. Vui lòng tải lại trước khi hẹn.');
    const params = { ID: Number(invitationId || applicationId), Date: date, Type: interviewType, Location: locationOrLink.trim(), Notes: notes.trim(), InterviewID: existing?.InterviewID || null };
    const saved = existing
      ? await query(`UPDATE Interviews SET InterviewDate=@Date,InterviewType=@Type,LocationOrLink=@Location,Notes=@Notes,
          Status='Pending',RespondedAt=NULL,Version=Version+1 OUTPUT INSERTED.* WHERE InterviewID=@InterviewID`, params)
      : await query(`INSERT Interviews(${field},InterviewDate,InterviewType,LocationOrLink,Notes)
          OUTPUT INSERTED.* VALUES(@ID,@Date,@Type,@Location,@Notes)`, params);
    const interview = saved.recordset[0];
    if (applicationId) await query("UPDATE JobApplications SET Status='Interviewing' WHERE ApplicationID=@ID", { ID: Number(applicationId) });
    await enqueue(query, 'interview_scheduled', { interviewId: interview.InterviewID, version: interview.Version }, `interview:${interview.InterviewID}:${interview.Version}`);
    return { owner, interview };
  });
  const mail = await email.sendInterviewEmail({ toEmail: result.owner.CandidateEmail, candidateName: result.owner.CandidateName,
    companyName: result.owner.CompanyName, jobTitle: result.owner.JobTitle, interviewDate: date, interviewType,
    locationOrLink: locationOrLink.trim(), notes: notes.trim(), invitationId, interviewId: result.interview.InterviewID });
  res.status(201).json({ success: true, data: result.interview, emailSent: mail.success,
    message: `Đã lưu lịch, chờ ứng viên xác nhận. ${mail.success ? 'Đã gửi email thông báo.' : 'Chưa gửi được email; ứng viên vẫn xem được lịch và thông báo trên website.'}` });
});

const listInterviews = handle(async (req, res) => {
  const employer = req.user.role === 'Employer';
  const result = await executeQuery(`SELECT iv.*, j.JobID,j.Title AS JobTitle, e.CompanyName,
    u.FullName AS CandidateName,u.Email AS CandidateEmail,eu.Email AS EmployerEmail,eu.Phone AS EmployerPhone
    FROM Interviews iv
    LEFT JOIN JobApplications a ON a.ApplicationID=iv.ApplicationID
    LEFT JOIN CandidateInvitations i ON i.InvitationID=iv.InvitationID
    JOIN JobPostings j ON j.JobID=COALESCE(a.JobID,i.JobID)
    JOIN Employers e ON e.EmployerID=j.EmployerID JOIN Users eu ON eu.UserID=e.UserID
    JOIN CandidateProfiles p ON p.ProfileID=COALESCE(a.ProfileID,i.ProfileID) JOIN Users u ON u.UserID=p.UserID
    WHERE ${employer ? 'e' : 'p'}.UserID=@UserID ORDER BY iv.InterviewDate DESC,iv.InterviewID DESC`, { UserID: req.user.userId });
  res.json({ success: true, data: result.recordset });
});

const respondInterview = handle(async (req, res) => {
  const { status, version } = req.body;
  if (!positiveId(req.params.id) || !positiveId(version) || !['Confirmed', 'Declined'].includes(status)) throw error(400, 'Phản hồi lịch phỏng vấn không hợp lệ.');
  await withTransaction(async query => {
    const result = await query(`UPDATE iv SET Status=@Status,RespondedAt=SYSUTCDATETIME() OUTPUT INSERTED.InterviewID
      FROM Interviews iv LEFT JOIN JobApplications a ON a.ApplicationID=iv.ApplicationID
      LEFT JOIN CandidateInvitations i ON i.InvitationID=iv.InvitationID
      JOIN CandidateProfiles p ON p.ProfileID=COALESCE(a.ProfileID,i.ProfileID)
      WHERE iv.InterviewID=@ID AND p.UserID=@UserID AND iv.Status='Pending' AND iv.Version=@Version AND iv.InterviewDate>SYSUTCDATETIME()`,
    { ID: Number(req.params.id), UserID: req.user.userId, Status: status, Version: Number(version) });
    if (!result.recordset.length) throw error(409, 'Lịch không còn chờ xác nhận, đã qua hoặc đã thay đổi. Vui lòng tải lại.');
    await enqueue(query, 'interview_response', { interviewId: Number(req.params.id), status }, `interview-response:${req.params.id}:${version}`);
  });
  res.json({ success: true, message: status === 'Confirmed' ? 'Đã xác nhận tham gia phỏng vấn.' : 'Đã báo không thể tham gia. Bạn có thể liên hệ nhà tuyển dụng để hẹn lại.' });
});

const updateApplicationStatus = handle(async (req, res) => {
  const { status } = req.body;
  if (!positiveId(req.params.applicationId) || !['Screening', 'Offered', 'Rejected'].includes(status)) throw error(400, 'Chọn xét duyệt, xác nhận ứng tuyển hoặc từ chối. Dùng Hẹn phỏng vấn để gửi lịch.');
  const row = await withTransaction(async query => {
    const owner = (await query(`${applicationSelect.replace('FROM JobApplications a', 'FROM JobApplications a WITH(UPDLOCK,HOLDLOCK)')}
      WHERE a.ApplicationID=@ID AND e.UserID=@UserID`, { ID: Number(req.params.applicationId), UserID: req.user.userId })).recordset[0];
    if (!owner) throw error(404, 'Không tìm thấy hồ sơ ứng tuyển.');
    if (owner.Status === status) return null;
    const transitions = { Applied: ['Screening', 'Rejected'], Screening: ['Offered', 'Rejected'], Interviewing: ['Offered', 'Rejected'] };
    if (!transitions[owner.Status]?.includes(status)) throw error(409, 'Hồ sơ đã thay đổi hoặc đã kết thúc xét duyệt. Vui lòng tải lại.');
    await query('UPDATE JobApplications SET Status=@Status WHERE ApplicationID=@ID', { ID: owner.ApplicationID, Status: status });
    if (status === 'Rejected') await query("UPDATE Interviews SET Status='Cancelled',Version=Version+1 WHERE ApplicationID=@ID AND Status IN ('Pending','Confirmed')", { ID: owner.ApplicationID });
    await enqueue(query, 'application_status', { applicationId: owner.ApplicationID, status });
    return owner;
  });
  const mail = row ? await email.sendApplicationStatusEmail({ toEmail: row.CandidateEmail, candidateName: row.CandidateName, companyName: row.CompanyName, jobTitle: row.JobTitle, status }) : null;
  res.json({ success: true, emailSent: mail?.success || false, message: row ? `Đã cập nhật hồ sơ. ${mail.success ? 'Đã gửi email cho ứng viên.' : 'Chưa gửi được email; kết quả đã lưu và có thông báo trên website.'}` : 'Trạng thái không thay đổi.' });
});

const sendApplicationNotice = handle(async (req, res) => {
  const { subject, message } = req.body;
  if (!positiveId(req.params.applicationId) || typeof subject !== 'string' || !subject.trim() || subject.trim().length > 160 || /[\r\n]/.test(subject)
    || typeof message !== 'string' || !message.trim() || message.trim().length > 5000) throw error(400, 'Nhập tiêu đề (tối đa 160 ký tự) và nội dung email (tối đa 5.000 ký tự).');
  const owner = (await executeQuery(`${applicationSelect} WHERE a.ApplicationID=@ID AND e.UserID=@UserID`,
    { ID: Number(req.params.applicationId), UserID: req.user.userId })).recordset[0];
  if (!owner) throw error(404, 'Không tìm thấy hồ sơ ứng tuyển.');
  if (owner.Status !== 'Offered') throw error(409, 'Chỉ gửi thông báo mới sau khi đã xác nhận ứng tuyển.');
  const result = await email.sendApplicationNoticeEmail({ toEmail: owner.CandidateEmail, candidateName: owner.CandidateName,
    companyName: owner.CompanyName, jobTitle: owner.JobTitle, employerEmail: owner.EmployerEmail, subject: subject.trim(), message: message.trim() });
  if (!result.success) throw error(502, 'Chưa gửi được email. Vui lòng kiểm tra cấu hình email hoặc thử lại.');
  res.json({ success: true, message: 'Đã gửi thông báo qua email cho ứng viên.' });
});

module.exports = { respondInvitation, scheduleInterview, listInterviews, respondInterview, updateApplicationStatus, sendApplicationNotice };
