const nodemailer = require('nodemailer');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(__dirname, '../../.env'), override: true });

const isEmailConfigured = (user, pass) => {
  if (!user || !pass) return false;
  const dummyKeywords = [
    'your_email',
    'your_16_char',
    'example.com',
    'your_password',
    'your_google',
    'placeholder'
  ];
  const userLower = user.toLowerCase();
  const passLower = pass.toLowerCase();
  for (const kw of dummyKeywords) {
    if (userLower.includes(kw) || passLower.includes(kw)) {
      return false;
    }
  }
  return true;
};

const createTransporter = () => {
  dotenv.config({ path: path.resolve(__dirname, '../../.env'), override: true });
  const user = (process.env.EMAIL_USER || process.env.SMTP_USER || '').trim();
  const pass = (process.env.EMAIL_PASS || process.env.SMTP_PASS || '').replace(/\s+/g, '');

  if (!isEmailConfigured(user, pass)) {
    return null;
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user,
      pass
    }
  });
};

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
          <p class="greeting">Xin chào <strong>${fullName}</strong>,</p>
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
          © ${new Date().getFullYear()} Jobtimize AI Platform. All rights reserved.
        </div>
      </div>
    </body>
    </html>
  `;

  if (!transporter) {
    console.log('\n==================================================');
    console.log(`[EMAIL SERVICE] Không tìm thấy EMAIL_USER / EMAIL_PASS trong .env.`);
    console.log(`[EMAIL SERVICE] Mã OTP gửi tới ${toEmail}: ${otpCode}`);
    console.log('==================================================\n');
    return { success: true, simulated: true, otp: otpCode };
  }

  try {
    const info = await transporter.sendMail({
      from: `"Jobtimize AI Recruitment" <${process.env.EMAIL_USER || process.env.SMTP_USER}>`,
      to: toEmail,
      subject: emailSubject,
      html: emailHtml
    });
    console.log(`[EMAIL SERVICE] Đã gửi OTP (${purpose}) thành công tới ${toEmail}, MessageID: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`[EMAIL SERVICE] Lỗi gửi email tới ${toEmail}:`, error.message);
    console.log('\n==================================================');
    console.log(`[EMAIL SERVICE FALLBACK] Mã OTP cho ${toEmail}: ${otpCode}`);
    console.log('==================================================\n');
    return { success: false, error: error.message, otp: otpCode };
  }
};

const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, (character) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}[character]));

const sendInterviewEmail = async ({ toEmail, candidateName, companyName, jobTitle, interviewDate, interviewType, locationOrLink, notes }) => {
  const transporter = createTransporter();
  if (!transporter) {
    return { success: false, error: 'Chưa cấu hình EMAIL_USER/EMAIL_PASS hoặc SMTP_USER/SMTP_PASS.' };
  }

  const dateText = new Date(interviewDate).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
  const isOnline = interviewType === 'Online';
  const subject = `[Jobtimize] Lịch phỏng vấn ${jobTitle}`;
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#1f2937">
      <h2>Xin chào ${escapeHtml(candidateName)},</h2>
      <p>${escapeHtml(companyName)} đã mời bạn tham gia phỏng vấn vị trí <strong>${escapeHtml(jobTitle)}</strong>.</p>
      <p><strong>Thời gian:</strong> ${escapeHtml(dateText)} (giờ Việt Nam)</p>
      <p><strong>Hình thức:</strong> ${isOnline ? 'Trực tuyến' : 'Trực tiếp'}</p>
      <p><strong>${isOnline ? 'Đường dẫn' : 'Địa điểm'}:</strong> ${escapeHtml(locationOrLink)}</p>
      ${notes ? `<p><strong>Ghi chú:</strong><br>${escapeHtml(notes).replace(/\n/g, '<br>')}</p>` : ''}
      <p>Trân trọng,<br>${escapeHtml(companyName)} qua Jobtimize</p>
    </div>`;

  try {
    const info = await transporter.sendMail({
      from: `"Jobtimize" <${process.env.EMAIL_USER || process.env.SMTP_USER}>`,
      to: toEmail,
      subject,
      html
    });
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`[EMAIL SERVICE] Lỗi gửi lịch phỏng vấn tới ${toEmail}:`, error.message);
    return { success: false, error: error.message };
  }
};

const sendInvitationEmail = async ({ toEmail, candidateName, companyName, jobTitle, message }) => {
  const transporter = createTransporter();
  if (!transporter) {
    return { success: false, error: 'Chưa cấu hình EMAIL_USER/EMAIL_PASS hoặc SMTP_USER/SMTP_PASS.' };
  }

  try {
    const info = await transporter.sendMail({
      from: `"Jobtimize" <${process.env.EMAIL_USER || process.env.SMTP_USER}>`,
      to: toEmail,
      subject: `[Jobtimize] ${companyName} mời bạn ứng tuyển vị trí ${jobTitle}`,
      html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#1f2937">
        <h2>Xin chào ${escapeHtml(candidateName)},</h2>
        <p>${escapeHtml(companyName)} quan tâm đến hồ sơ của bạn và mời bạn ứng tuyển vị trí <strong>${escapeHtml(jobTitle)}</strong>.</p>
        ${message ? `<p>${escapeHtml(message).replace(/\n/g, '<br>')}</p>` : ''}
        <p>Đăng nhập Jobtimize để xem lời mời và ứng tuyển.</p>
      </div>`
    });
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`[EMAIL SERVICE] Lỗi gửi lời mời ứng tuyển tới ${toEmail}:`, error.message);
    return { success: false, error: error.message };
  }
};

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
      from: `"Jobtimize Thanh Toán" <${process.env.EMAIL_USER || process.env.SMTP_USER}>`,
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
      from: `"Jobtimize Thanh Toán" <${process.env.EMAIL_USER || process.env.SMTP_USER}>`,
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
  sendOtpEmail,
  sendInterviewEmail,
  sendInvitationEmail,
  sendPaymentPendingEmail,
  sendPaymentSuccessEmail
};
