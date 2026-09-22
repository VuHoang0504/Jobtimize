const nodemailer = require('nodemailer');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const createTransporter = () => {
  const user = (process.env.EMAIL_USER || process.env.SMTP_USER || '').trim();
  const pass = (process.env.EMAIL_PASS || process.env.SMTP_PASS || '').replace(/\s+/g, '');

  if (!user || !pass) {
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

module.exports = {
  sendOtpEmail
};
