const { withTransaction, enqueue } = require('./notificationStore');
const fail = (status, message) => Object.assign(new Error(message), { status });

async function changeAccount(query, targetId, actorId, status, reason, reportId = null) {
  const user = (await query(`SELECT u.UserID,u.Status,
    CASE WHEN EXISTS(SELECT 1 FROM UserRoles ur JOIN Roles r ON r.RoleID=ur.RoleID WHERE ur.UserID=u.UserID AND r.RoleName='Admin') THEN 1 ELSE 0 END IsAdmin
    FROM Users u WITH(UPDLOCK,ROWLOCK) WHERE u.UserID=@ID`, { ID: targetId })).recordset[0];
  if (!user) throw fail(404, 'Không tìm thấy tài khoản bị báo cáo.');
  if (user.IsAdmin || Number(targetId) === Number(actorId)) throw fail(403, 'Không thể xử lý tài khoản Admin hoặc tài khoản đang đăng nhập qua chức năng này.');
  await query('UPDATE Users SET Status=@Status,UpdatedAt=GETDATE() WHERE UserID=@ID', { Status: status, ID: targetId });
  let closedJobs = 0;
  if (status === 'Locked') {
    closedJobs = (await query(`UPDATE JobPostings SET Status='Closed',AdminNote=@Reason WHERE EmployerID IN(SELECT EmployerID FROM Employers WHERE UserID=@ID) AND Status<>'Closed'`, { Reason: reason, ID: targetId })).rowsAffected[0];
    await query('UPDATE CandidateProfiles SET IsLookingForJob=0 WHERE UserID=@ID', { ID: targetId });
  }
  if (user.Status !== status || reportId) await query(`INSERT AccountModerationActions(ReportID,ActorUserID,TargetUserID,Action,Reason,PreviousStatus,NewStatus) VALUES(@ReportID,@Actor,@Target,@Action,@Reason,@Previous,@Status)`, {
    ReportID: reportId, Actor: actorId, Target: targetId, Action: status === 'Locked' ? 'Ban' : 'Unban', Reason: reason, Previous: user.Status, Status: status
  });
  return { targetUserId: targetId, status, closedJobs };
}

async function resolveReport(reportId, actorId, status, note) {
  if (!Number.isSafeInteger(reportId) || reportId < 1 || !['Resolved', 'Dismissed'].includes(status)) throw fail(400, 'Báo cáo hoặc trạng thái không hợp lệ.');
  if (typeof note !== 'string' || note.trim().length < 10 || note.trim().length > 2000) throw fail(400, 'Vui lòng ghi kết luận xác minh từ 10 đến 2000 ký tự.');
  return withTransaction(async query => {
    const report = (await query('SELECT * FROM UserReports WITH(UPDLOCK,ROWLOCK) WHERE ReportID=@ID', { ID: reportId })).recordset[0];
    if (!report) throw fail(404, 'Không tìm thấy báo cáo vi phạm.');
    if (report.Status !== 'Pending') {
      if (report.Status === status && report.AdminNote === note.trim()) return { alreadyProcessed: true };
      throw fail(409, 'Báo cáo đã có kết luận. Không thể thay đổi hoặc thực hiện lại hình phạt.');
    }
    let account = null;
    if (status === 'Resolved') {
      let target;
      if (report.TargetType === 'JobPosting') target = (await query('SELECT e.UserID FROM JobPostings j JOIN Employers e ON e.EmployerID=j.EmployerID WHERE j.JobID=@ID', { ID: report.TargetID })).recordset[0];
      else if (report.TargetType === 'Employer') target = (await query('SELECT UserID FROM Employers WHERE EmployerID=@ID', { ID: report.TargetID })).recordset[0];
      else if (report.TargetType === 'Candidate') target = (await query("SELECT u.UserID FROM Users u WHERE u.UserID=@ID AND EXISTS(SELECT 1 FROM UserRoles ur JOIN Roles r ON r.RoleID=ur.RoleID WHERE ur.UserID=u.UserID AND r.RoleName='Candidate')", { ID: report.TargetID })).recordset[0];
      if (!target) throw fail(409, 'Đối tượng báo cáo không còn tồn tại hoặc không đúng loại tài khoản.');
      account = await changeAccount(query, target.UserID, actorId, 'Locked', note.trim(), reportId);
    }
    await query('UPDATE UserReports SET Status=@Status,AdminNote=@Note,ResolvedAt=GETDATE(),ResolvedByUserID=@Actor WHERE ReportID=@ID', { Status: status, Note: note.trim(), ID: reportId, Actor: actorId });
    await enqueue(query, 'report_resolved', { reportId, status, actorId });
    return { account };
  });
}

async function updateStatus(targetId, actorId, status, reason) {
  if (!Number.isSafeInteger(targetId) || targetId < 1 || !['Active', 'Locked'].includes(status)) throw fail(400, 'Tài khoản hoặc trạng thái không hợp lệ.');
  const note = typeof reason === 'string' && reason.trim() ? reason.trim() : (status === 'Locked' ? 'Admin khóa tài khoản từ quản lý tài khoản.' : 'Admin xem xét và mở khóa tài khoản.');
  if (note.length > 2000) throw fail(400, 'Lý do quá dài.');
  return withTransaction(query => changeAccount(query, targetId, actorId, status, note));
}
module.exports = { resolveReport, updateStatus };
