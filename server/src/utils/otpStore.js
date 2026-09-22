// In-memory OTP and Pending Registration Store with TTL
const otpMap = new Map();

/**
 * Save OTP and pending registration data
 * @param {string} email 
 * @param {string} otp 
 * @param {object} registrationData 
 * @param {number} ttlMinutes 
 */
const saveOtp = (email, otp, registrationData = {}, ttlMinutes = 10) => {
  const normalizedEmail = email.toLowerCase().trim();
  const expiresAt = Date.now() + ttlMinutes * 60 * 1000;
  
  otpMap.set(normalizedEmail, {
    otp: otp.toString().trim(),
    expiresAt,
    registrationData
  });
};

/**
 * Get OTP record
 * @param {string} email 
 */
const getOtpRecord = (email) => {
  const normalizedEmail = email.toLowerCase().trim();
  const record = otpMap.get(normalizedEmail);
  if (!record) return null;

  if (Date.now() > record.expiresAt) {
    otpMap.delete(normalizedEmail);
    return null;
  }

  return record;
};

/**
 * Verify OTP
 * @param {string} email 
 * @param {string} inputOtp 
 */
const verifyOtp = (email, inputOtp) => {
  const record = getOtpRecord(email);
  if (!record) {
    return { valid: false, message: 'Mã OTP không tồn tại hoặc đã hết hạn (10 phút). Vui lòng yêu cầu mã mới.' };
  }

  if (record.otp !== inputOtp.toString().trim()) {
    return { valid: false, message: 'Mã OTP không chính xác. Vui lòng thử lại.' };
  }

  return { valid: true, registrationData: record.registrationData };
};

/**
 * Delete OTP after successful verification
 * @param {string} email 
 */
const deleteOtp = (email) => {
  const normalizedEmail = email.toLowerCase().trim();
  otpMap.delete(normalizedEmail);
};

// Cleanup expired OTPs every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [email, record] of otpMap.entries()) {
    if (now > record.expiresAt) {
      otpMap.delete(email);
    }
  }
}, 5 * 60 * 1000);

module.exports = {
  saveOtp,
  getOtpRecord,
  verifyOtp,
  deleteOtp
};
