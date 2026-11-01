const { test } = require('node:test');
const assert = require('node:assert/strict');
const nodemailer = require('nodemailer');
const email = require('../src/services/emailService');

test('recruitment email delivery, website links and HTML safety', async t => {
  const keys = ['EMAIL_USER', 'EMAIL_PASS', 'SMTP_HOST', 'SMTP_USER', 'SMTP_PASS', 'FRONTEND_URL'];
  const previous = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  const transport = nodemailer.createTransport;
  let sent, fail = false, accepted = true, closed = 0;
  nodemailer.createTransport = () => ({
    async sendMail(mail) { sent = mail; if (fail) throw Object.assign(new Error('timeout'), { code: 'ETIMEDOUT' }); return { accepted: accepted ? ['test@example.org'] : [], messageId: 'mock-mail' }; },
    close() { closed++; }
  });
  const info = { toEmail: 'test@example.org', candidateName: '<script>alert(1)</script>', companyName: 'An & Việt', jobTitle: 'Product Developer', message: '<img src=x onerror=alert(1)>', invitationId: 30 };
  try {
    keys.forEach(key => delete process.env[key]);
    await t.test('missing SMTP never reports simulated success', async () => {
      assert.equal((await email.sendInvitationEmail(info)).success, false);
      assert.equal((await email.sendApplicationStatusEmail({ ...info, status: 'Rejected' })).success, false);
    });
    process.env.EMAIL_USER = 'sender@gmail.com'; process.env.EMAIL_PASS = 'synthetic-app-password'; process.env.FRONTEND_URL = 'https://jobs.example.org/';
    await t.test('invitation includes exact website link and escapes candidate content', async () => {
      assert.equal((await email.sendInvitationEmail(info)).success, true);
      assert.ok(sent.html.includes('https://jobs.example.org/candidate/dashboard?tab=invitations&amp;invitationId=30'));
      assert.ok(!sent.html.includes('localhost'));
      assert.ok(!sent.html.includes('<script>')); assert.ok(!sent.html.includes('<img'));
      assert.ok(sent.html.includes('&lt;script&gt;')); assert.equal(closed, 1);
    });
    await t.test('interview contains Vietnam time, real location and confirmation link', async () => {
      assert.equal((await email.sendInterviewEmail({ ...info, interviewDate: '2028-11-01T03:30:00Z', interviewType: 'Offline', locationOrLink: 'Phòng 201', notes: 'Liên hệ hr@example.org', interviewId: 50 })).success, true);
      assert.ok(sent.html.includes('10:30')); assert.ok(sent.html.includes('Phòng 201')); assert.ok(sent.html.includes('interviewId=50'));
    });
    await t.test('all review outcomes send useful status copy', async () => {
      for (const status of ['Screening', 'Offered', 'Rejected']) {
        assert.equal((await email.sendApplicationStatusEmail({ ...info, status })).success, true);
        assert.ok(sent.html.includes('tab=applications')); assert.ok(!sent.html.includes('<script>'));
        if (status === 'Offered') {
          assert.ok(sent.html.includes('Ứng tuyển thành công'));
          assert.ok(sent.html.includes('Nhà tuyển dụng đã xác nhận hồ sơ ứng tuyển'));
        }
      }
    });
    await t.test('follow-up uses the recruiter reply address and escapes email content', async () => {
      assert.equal((await email.sendApplicationNoticeEmail({ ...info, employerEmail: 'hr@example.org', subject: 'Các bước tiếp theo', message: '<script>alert(1)</script>\nVui lòng liên hệ công ty.' })).success, true);
      assert.equal(sent.replyTo, 'hr@example.org');
      assert.equal(sent.subject, '[Jobtimize] Các bước tiếp theo');
      assert.ok(!sent.html.includes('<script>'));
      assert.ok(sent.html.includes('&lt;script&gt;'));
      assert.ok(sent.html.includes('<br>Vui lòng liên hệ công ty.'));
      assert.ok(sent.html.includes('trả lời email này'));
    });
    await t.test('SMTP rejection and transport failure return failure and close transports', async () => {
      const closedBefore = closed;
      accepted = false; assert.equal((await email.sendInvitationEmail(info)).success, false);
      fail = true; assert.equal((await email.sendApplicationStatusEmail({ ...info, status: 'Screening' })).success, false);
      assert.equal(closed, closedBefore + 2);
    });
  } finally {
    nodemailer.createTransport = transport;
    for (const key of keys) if (previous[key] === undefined) delete process.env[key]; else process.env[key] = previous[key];
  }
});
