const { createTransporter, getMailFrom } = require('../config/mail');

const sendOtpEmail = async (toEmail, otpCode, fullName = 'Bạn', purpose = 'register') => {
  const transporter = createTransporter();

  const isReset = purpose === 'reset_password';
  const emailSubject = isReset
    ? `[Jobtimize] Mã OTP đặt lại mật khẩu tài khoản: ${otpCode}`
    : `[Jobtimize] Mã xác thực OTP đăng ký tài khoản: ${otpCode}`;
  
  const headingTitle = isReset ? 'Đặt lại Mật khẩu' : 'Xác thực Tài khoản';
  const introMessage = isReset
    ? `Bạn vừa gửi yêu cầu đặt lại mật khẩu cho tài khoản tại <strong>Jobtimize</strong>. Để thiết lập mật khẩu mới, vui lòng sử dụng mã OTP dưới đây:`
    : `Cảm ơn bạn đã đăng ký tài khoản tại <strong>Jobtimize</strong>. Để kích hoạt tài khoản và bảo mật thông tin, vui lòng sử dụng mã OTP dưới đây:`;
  const noteMessage = isReset
    ? `Nếu bạn không gửi yêu cầu này, vui lòng bỏ qua email và mật khẩu hiện tại của bạn vẫn được giữ an toàn.`
    : `Tuyệt đối không chia sẻ mã này cho bất kỳ ai. Nếu bạn không thực hiện đăng ký tài khoản này, vui lòng bỏ qua email.`;

  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${emailSubject}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 0; color: #1e293b; }
        .container { max-width: 540px; margin: 30px auto; background: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
        .header { background: linear-gradient(135deg, #1e40af 0%, #3b82f6 50%, #10b981 100%); padding: 36px 30px; text-align: center; color: white; }
        .header h1 { margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.5px; }
        .content { padding: 36px 30px; }
        .greeting { font-size: 16px; margin-bottom: 16px; color: #334155; }
        .otp-box { background: #f0fdf4; border: 2px dashed #10b981; border-radius: 16px; padding: 24px; text-align: center; margin: 28px 0; }
        .otp-code { font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #047857; margin: 0; font-family: monospace; }
        .note { font-size: 13px; color: #64748b; line-height: 1.6; margin-top: 20px; }
        .footer { background: #f1f5f9; padding: 20px 30px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Jobtimize</h1>
          <p style="margin: 6px 0 0 0; opacity: 0.9; font-size: 14px;">${headingTitle}</p>
        </div>
        <div class="content">
          <p class="greeting">Xin chào <strong>${escapeHtml(fullName)}</strong>,</p>
          <p style="color: #475569; font-size: 14px; line-height: 1.6;">
            ${introMessage}
          </p>
          
          <div class="otp-box">
            <div style="font-size: 12px; font-weight: 700; color: #059669; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 8px;">Mã xác thực của bạn</div>
            <div class="otp-code">${otpCode}</div>
            <div style="font-size: 12px; color: #059669; margin-top: 8px;">Mã có hiệu lực trong vòng <strong>10 phút</strong></div>
          </div>

          <p class="note">
            ⚠️ <strong>Lưu ý:</strong> ${noteMessage}
          </p>
        </div>
        <div class="footer">
          © ${new Date().getFullYear()} Jobtimize. All rights reserved.
        </div>
      </div>
    </body>
    </html>
  `;

  if (!transporter) {
    return { success: false, code: 'EMAIL_NOT_CONFIGURED' };
  }

  try {
    const info = await transporter.sendMail({
      from: getMailFrom('Jobtimize Recruitment'),
      to: toEmail,
      subject: emailSubject,
      text: `Xin chào ${fullName}, mã OTP ${isReset ? 'đặt lại mật khẩu' : 'đăng ký tài khoản'} của bạn là ${otpCode}. Mã có hiệu lực trong 10 phút. Không chia sẻ mã này với bất kỳ ai.`,
      html: emailHtml
    });
    if (!info.accepted || info.accepted.length === 0) {
      return { success: false, code: 'EMAIL_RECIPIENT_REJECTED' };
    }
    return { success: true, messageId: info.messageId };
  } catch (error) {
    // Do not log OTPs, credentials, or the SMTP response body.
    console.error('[EMAIL SERVICE] OTP delivery failed:', error.code || 'UNKNOWN', error.responseCode || '');
    return { success: false, code: error.code || 'EMAIL_SEND_FAILED' };
  } finally {
    transporter.close();
  }
};

const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, (character) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}[character]));

const websiteLink = route => (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '') + route;

const sendRecruitmentEmail = async ({ toEmail, subject, heading, body, href, replyTo }) => {
  const transporter = createTransporter();
  if (!transporter) return { success: false, code: 'EMAIL_NOT_CONFIGURED' };
  try {
    const info = await transporter.sendMail({ from: getMailFrom('Jobtimize'), to: toEmail, subject, ...(replyTo ? { replyTo } : {}),
      html: '<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:28px;color:#172033;line-height:1.7">'
        + '<h2>' + escapeHtml(heading) + '</h2>' + body
        + '<p><a style="display:inline-block;padding:10px 18px;background:#1d4ed8;color:white;text-decoration:none;border-radius:6px" href="' + escapeHtml(websiteLink(href)) + '">' + (replyTo ? 'Xem hồ sơ trên Jobtimize' : 'Xem và phản hồi trên Jobtimize') + '</a></p>'
        + '<p>' + (replyTo ? 'Bạn có thể trả lời email này để liên hệ trực tiếp với nhà tuyển dụng.' : 'Vui lòng phản hồi trên website để cập nhật trạng thái chính thức.') + '</p></div>' });
    return { success: Boolean(info.accepted?.length), messageId: info.messageId };
  } catch (err) {
    console.error('Recruitment email failed:', err.code || 'EMAIL_SEND_FAILED');
    return { success: false, code: err.code || 'EMAIL_SEND_FAILED' };
  } finally { transporter.close(); }
};

const sendInvitationEmail = ({ toEmail, candidateName, companyName, jobTitle, message, invitationId }) => sendRecruitmentEmail({
  toEmail, subject: '[Jobtimize] Lời mời ứng tuyển: ' + jobTitle, heading: 'Lời mời từ ' + companyName,
  body: '<p>Xin chào ' + escapeHtml(candidateName) + ',</p><p>Bạn được mời tìm hiểu vị trí <strong>' + escapeHtml(jobTitle) + '</strong>.</p><p>' + escapeHtml(message || '').replace(/\n/g, '<br>') + '</p>',
  href: '/candidate/dashboard?tab=invitations' + (invitationId ? '&invitationId=' + invitationId : '')
});

const sendInterviewEmail = ({ toEmail, candidateName, companyName, jobTitle, interviewDate, interviewType, locationOrLink, notes, interviewId }) => sendRecruitmentEmail({
  toEmail, subject: '[Jobtimize] Xác nhận lịch phỏng vấn: ' + jobTitle, heading: 'Lịch phỏng vấn từ ' + companyName,
  body: '<p>Xin chào ' + escapeHtml(candidateName) + ',</p><p>Vị trí: <strong>' + escapeHtml(jobTitle) + '</strong></p>'
    + '<p>Thời gian: ' + escapeHtml(new Date(interviewDate).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })) + ' (giờ Việt Nam)</p>'
    + '<p>Hình thức: ' + (interviewType === 'Online' ? 'Trực tuyến' : 'Trực tiếp') + '</p><p>Đường dẫn / địa điểm: ' + escapeHtml(locationOrLink) + '</p>'
    + '<p>' + escapeHtml(notes || '').replace(/\n/g, '<br>') + '</p>',
  href: '/candidate/dashboard?tab=invitations' + (interviewId ? '&interviewId=' + interviewId : '')
});

const sendApplicationStatusEmail = ({ toEmail, candidateName, companyName, jobTitle, status }) => sendRecruitmentEmail({
  toEmail, subject: '[Jobtimize] Kết quả hồ sơ: ' + jobTitle, heading: 'Cập nhật hồ sơ từ ' + companyName,
  body: '<p>Xin chào ' + escapeHtml(candidateName) + ',</p><p>Hồ sơ ứng tuyển vị trí <strong>' + escapeHtml(jobTitle) + '</strong>: '
    + ({ Screening: 'Đang xét duyệt', Offered: 'Ứng tuyển thành công. Nhà tuyển dụng đã xác nhận hồ sơ ứng tuyển của bạn. Vui lòng kiểm tra thông tin trong email và liên hệ nhà tuyển dụng để trao đổi các bước tiếp theo.', Rejected: 'Chưa phù hợp với vị trí ở thời điểm này.' }[status] || status) + '</p>',
  href: '/candidate/dashboard?tab=applications'
});

const sendApplicationNoticeEmail = ({ toEmail, candidateName, companyName, jobTitle, subject, message, employerEmail }) => sendRecruitmentEmail({
  toEmail, replyTo: employerEmail, subject: '[Jobtimize] ' + subject, heading: 'Thông báo từ ' + companyName,
  body: '<p>Xin chào ' + escapeHtml(candidateName) + ',</p><p>Về hồ sơ ứng tuyển vị trí <strong>' + escapeHtml(jobTitle) + '</strong>:</p>'
    + '<p>' + escapeHtml(message).replace(/\n/g, '<br>') + '</p><p>Trân trọng,<br>' + escapeHtml(companyName) + '</p>',
  href: '/candidate/dashboard?tab=applications'
});

const sendPaymentPendingEmail = async ({ toEmail, companyName, packageName, amount, transactionRef }) => {
  const transporter = createTransporter();
  const subject = `[Jobtimize] Đã ghi nhận yêu cầu thanh toán đơn hàng #${transactionRef}`;
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#1f2937;padding:20px;border:1px solid #e5e7eb;border-radius:12px">
      <h2 style="color:#0284c7">Xin chào ${escapeHtml(companyName)},</h2>
      <p>Jobtimize đã ghi nhận yêu cầu thanh toán của bạn cho đơn hàng <strong>#${escapeHtml(transactionRef)}</strong>.</p>
      <div style="background-color:#f0f9ff;padding:15px;border-radius:8px;margin:16px 0">
        <p style="margin:4px 0"><strong>Gói dịch vụ:</strong> ${escapeHtml(packageName)}</p>
        <p style="margin:4px 0"><strong>Số tiền thanh toán:</strong> ${Number(amount).toLocaleString('vi-VN')} đ</p>
        <p style="margin:4px 0"><strong>Mã giao dịch:</strong> <code style="color:#7c3aed">${escapeHtml(transactionRef)}</code></p>
        <p style="margin:4px 0"><strong>Trạng thái:</strong> <span style="color:#d97706;font-weight:bold">Đang chờ đối soát (Pending)</span></p>
      </div>
      <p>Hệ thống đang đối soát biến động số dư và sẽ kích hoạt gói nâng cấp quyền lợi đăng tin tuyển dụng cho bạn trong ít phút.</p>
      <p style="color:#6b7280;font-size:12px;margin-top:24px">Trân trọng,<br>Đội ngũ Hỗ trợ Jobtimize Việt Nam</p>
    </div>`;

  if (!transporter) {
    console.log(`[EMAIL SERVICE] Ghi nhận tiếp nhận thanh toán #${transactionRef} cho ${toEmail} (Chế độ mô phỏng)`);
    return { success: true, simulated: true };
  }

  try {
    const info = await transporter.sendMail({
      from: getMailFrom('Jobtimize Thanh Toán'),
      to: toEmail,
      subject,
      html
    });
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`[EMAIL SERVICE] Lỗi gửi email tiếp nhận đơn tới ${toEmail}:`, error.message);
    return { success: false, error: error.message };
  }
};

const sendPaymentSuccessEmail = async ({ toEmail, companyName, packageName, durationDays, postLimit, searchLimit, transactionRef }) => {
  const transporter = createTransporter();
  const subject = `[Jobtimize] Tài khoản của bạn đã được kích hoạt thành công #${transactionRef}!`;
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#1f2937;padding:20px;border:1px solid #e5e7eb;border-radius:12px">
      <h2 style="color:#16a34a">Chúc mừng ${escapeHtml(companyName)}!</h2>
      <p>Đơn hàng <strong>#${escapeHtml(transactionRef)}</strong> đã được Ban quản trị đối soát và kích hoạt thành công.</p>
      <div style="background-color:#f0fdf4;padding:15px;border-radius:8px;margin:16px 0;border:1px solid #bbf7d0">
        <p style="margin:4px 0"><strong>Gói dịch vụ đã nâng cấp:</strong> ${escapeHtml(packageName)}</p>
        <p style="margin:4px 0"><strong>Thời hạn gói:</strong> ${durationDays} ngày</p>
        <p style="margin:4px 0"><strong>Số tin tuyển dụng cộng thêm:</strong> +${postLimit} tin</p>
        <p style="margin:4px 0"><strong>Lượt tìm kiếm CV ứng viên:</strong> +${searchLimit} lượt</p>
        <p style="margin:4px 0"><strong>Trạng thái:</strong> <span style="color:#16a34a;font-weight:bold">Đã kích hoạt (Active)</span></p>
      </div>
      <p>Bạn có thể truy cập ngay vào Bảng điều khiển Nhà tuyển dụng để đăng thêm tin và tìm kiếm các ứng viên tài năng.</p>
      <p style="color:#6b7280;font-size:12px;margin-top:24px">Trân trọng,<br>Đội ngũ Jobtimize Việt Nam</p>
    </div>`;

  if (!transporter) {
    console.log(`[EMAIL SERVICE] Thông báo kích hoạt thành công #${transactionRef} cho ${toEmail} (Chế độ mô phỏng)`);
    return { success: true, simulated: true };
  }

  try {
    const info = await transporter.sendMail({
      from: getMailFrom('Jobtimize Thanh Toán'),
      to: toEmail,
      subject,
      html
    });
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`[EMAIL SERVICE] Lỗi gửi email kích hoạt thành công tới ${toEmail}:`, error.message);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendApplicationNoticeEmail,
  sendOtpEmail,
  sendApplicationStatusEmail,
  sendInterviewEmail,
  sendInvitationEmail,
  sendPaymentPendingEmail,
  sendPaymentSuccessEmail
};
