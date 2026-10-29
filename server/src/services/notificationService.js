const fs = require('fs/promises');
const path = require('path');
const { executeQuery } = require('../config/db');
const { withTransaction, enqueue, putNotification } = require('./notificationStore');
const { refreshRecommendations } = require('./notificationRecommendations');

async function eventNotifications(query, event) {
  const p = JSON.parse(event.Payload);
  const key = `event:${event.OutboxID}`;
  const notices = [];
  const add = (userId, role, title, body, href, jobId) => notices.push({ userId, role, key, type: event.EventType, title, body, href, jobId });
  const admins = async () => (await query(`SELECT DISTINCT u.UserID FROM Users u JOIN UserRoles ur ON ur.UserID=u.UserID
    JOIN Roles r ON r.RoleID=ur.RoleID WHERE r.RoleName='Admin' AND u.Status='Active'`)).recordset;
  if (event.EventType === 'login') {
    const user = await query('SELECT UserID FROM Users WHERE UserID=@ID', { ID: p.userId });
    if (user.recordset.length) add(p.userId, 'Candidate', 'Đăng nhập thành công', 'Bạn vừa đăng nhập vào Jobtimize.', '/candidate/dashboard?tab=security');
  } else if (event.EventType === 'application') {
    const row = (await query(`SELECT j.JobID,j.Title,e.UserID,u.FullName FROM JobApplications a JOIN JobPostings j ON j.JobID=a.JobID
      JOIN Employers e ON e.EmployerID=j.EmployerID JOIN CandidateProfiles cp ON cp.ProfileID=a.ProfileID JOIN Users u ON u.UserID=cp.UserID
      WHERE a.ApplicationID=@ID`, { ID: p.applicationId })).recordset[0];
    if (row) add(row.UserID, 'Employer', 'Có ứng viên mới', `${row.FullName} vừa ứng tuyển vị trí ${row.Title}.`, `/employer/ats/${row.JobID}?applicationId=${p.applicationId}`, row.JobID);
  } else if (event.EventType === 'job_status') {
    const job = (await query('SELECT j.Title,e.UserID FROM JobPostings j JOIN Employers e ON e.EmployerID=j.EmployerID WHERE j.JobID=@ID', { ID: p.jobId })).recordset[0];
    if (job) {
      const status = { PendingApproval: 'Tin đang chờ duyệt', Published: 'Tin đã được duyệt và đăng thành công', Rejected: 'Tin tuyển dụng bị từ chối', RequiresRevision: 'Tin cần chỉnh sửa', Closed: 'Tin tuyển dụng đã đóng' }[p.status];
      if (status) add(job.UserID, 'Employer', status, `${job.Title}${p.note ? ': ' + p.note : '.'}`, `/employer/dashboard?jobId=${p.jobId}`, p.jobId);
      if (p.status === 'PendingApproval') for (const admin of await admins()) add(admin.UserID, 'Admin', 'Có tin tuyển dụng chờ duyệt', job.Title, `/admin/users?tab=jobs&jobId=${p.jobId}`, p.jobId);
    }
  } else if (event.EventType === 'invitation') {
    const row = (await query(`SELECT cp.UserID,e.CompanyName,j.Title FROM CandidateInvitations i JOIN CandidateProfiles cp ON cp.ProfileID=i.ProfileID
      JOIN Employers e ON e.EmployerID=i.EmployerID JOIN JobPostings j ON j.JobID=i.JobID WHERE i.InvitationID=@ID`, { ID: p.invitationId })).recordset[0];
    if (row) add(row.UserID, 'Candidate', 'Bạn có lời mời ứng tuyển', `${row.CompanyName} mời bạn ứng tuyển ${row.Title}. ${p.message || ''}`, `/candidate/dashboard?tab=invitations&invitationId=${p.invitationId}`);
  } else if (event.EventType === 'kyc_submitted' || event.EventType === 'kyc_reviewed') {
    const emp = (await query('SELECT UserID,CompanyName FROM Employers WHERE EmployerID=@ID', { ID: p.employerId })).recordset[0];
    if (emp && event.EventType === 'kyc_submitted') for (const admin of await admins()) add(admin.UserID, 'Admin', 'Có hồ sơ KYC cần duyệt', `${emp.CompanyName} vừa nộp hồ sơ pháp lý.`, `/admin/users?tab=employers&employerId=${p.employerId}`);
    if (emp && event.EventType === 'kyc_reviewed') add(emp.UserID, 'Employer', p.status === 'Approved' ? 'Hồ sơ KYC đã được duyệt' : p.status === 'Rejected' ? 'Hồ sơ KYC bị từ chối' : 'Hồ sơ KYC đang chờ xử lý',
      `${emp.CompanyName}${p.note ? ': ' + p.note : '.'}`, '/employer/dashboard?section=kyc');
  } else if (event.EventType === 'report_created' || event.EventType === 'report_resolved') {
    for (const admin of await admins()) {
      if (event.EventType === 'report_resolved' && admin.UserID === p.actorId) continue;
      add(admin.UserID, 'Admin', event.EventType === 'report_created' ? 'Có báo cáo vi phạm mới' : 'Báo cáo vi phạm đã được xử lý',
        `Báo cáo #${p.reportId}${p.status ? (p.status === 'Resolved' ? ' đã giải quyết.' : ' đã bác bỏ.') : ' đang chờ xử lý.'}`, `/admin/users?tab=reports&reportId=${p.reportId}`);
    }
  } else throw new Error('Unknown notification event type');
  return notices;
}

async function drainOutbox(limit = 50) {
  for (let i = 0; i < limit; i++) {
    let id;
    try {
      const processed = await withTransaction(async query => {
        const event = (await query(`SELECT TOP 1 * FROM NotificationOutbox WITH(UPDLOCK,READPAST,ROWLOCK)
          WHERE ProcessedAt IS NULL AND AvailableAt<=SYSUTCDATETIME() ORDER BY OutboxID`)).recordset[0];
        if (!event) return false;
        id = event.OutboxID;
        for (const n of await eventNotifications(query, event)) await putNotification(query, n);
        await query('UPDATE NotificationOutbox SET ProcessedAt=SYSUTCDATETIME(),LastError=NULL WHERE OutboxID=@ID', { ID: id });
        return true;
      });
      if (!processed) break;
    } catch (error) {
      if (!id) throw error;
      await executeQuery(`UPDATE NotificationOutbox SET Attempts=Attempts+1,LastError=@Error,
        AvailableAt=DATEADD(SECOND,CASE WHEN Attempts<6 THEN POWER(2,Attempts+1) ELSE 120 END,SYSUTCDATETIME())
        WHERE OutboxID=@ID AND ProcessedAt IS NULL`, { ID: id, Error: error.message.slice(0, 500) });
      console.error('Notification outbox retry:', id, error.message);
    }
  }
}

async function initialize() {
  for (const filename of ['notifications.sql', 'admin-enhancements.sql']) {
    const migration = await fs.readFile(path.resolve(__dirname, '../../../database', filename), 'utf8');
    for (const batch of migration.split(/^\s*GO\s*$/im).filter(s => s.trim())) await executeQuery(batch);
  }
  // Pick up existing pending work without notifying for unsubmitted KYC profiles.
  await withTransaction(async query => {
    for (const job of (await query("SELECT JobID FROM JobPostings WHERE Status='PendingApproval'")).recordset) {
      await enqueue(query, 'job_status', { jobId: job.JobID, status: 'PendingApproval' }, `job:pending:${job.JobID}`);
    }
    for (const doc of (await query(`SELECT d.DocumentID,d.EmployerID FROM KYCDocuments d JOIN Employers e ON e.EmployerID=d.EmployerID WHERE e.KYCStatus='Pending'
      AND d.DocumentID=(SELECT TOP 1 DocumentID FROM KYCDocuments WHERE EmployerID=e.EmployerID ORDER BY SubmittedAt DESC,DocumentID DESC)`)).recordset) {
      await enqueue(query, 'kyc_submitted', { employerId: doc.EmployerID }, `kyc:submitted:${doc.DocumentID}`);
    }
    for (const report of (await query("SELECT ReportID FROM UserReports WHERE Status='Pending'")).recordset) {
      await enqueue(query, 'report_created', { reportId: report.ReportID }, `report:created:${report.ReportID}`);
    }
  });
}

function startWorker() {
  let stopped = false, timer, lastRecommendations = 0;
  async function tick() {
    try {
      await drainOutbox();
      if (Date.now() - lastRecommendations >= 30000) {
        await refreshRecommendations();
        lastRecommendations = Date.now();
      }
    } catch (error) { console.error('Notification worker failed:', error.message); }
    if (!stopped) { timer = setTimeout(tick, 5000); timer.unref(); }
  }
  void tick();
  return () => { stopped = true; clearTimeout(timer); };
}

module.exports = { initialize, startWorker, drainOutbox, eventNotifications };
