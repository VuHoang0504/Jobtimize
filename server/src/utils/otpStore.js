// In-memory OTP and Pending Registration Store with TTL
const otpMap = new Map();
const getKey = (email, purpose) => `${purpose}:${email.toLowerCase().trim()}`;

/**
 * Save OTP and pending registration data
 * @param {string} email 
 * @param {string} otp 
 * @param {object} registrationData 
 * @param {number} ttlMinutes 
 */
const saveOtp = (email, otp, registrationData = {}, ttlMinutes = 10) => {
  const normalizedEmail = getKey(email, registrationData.type || 'register');
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
const getOtpRecord = (email, purpose = 'register') => {
  const normalizedEmail = getKey(email, purpose);
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
const verifyOtp = (email, inputOtp, purpose = 'register') => {
  const record = getOtpRecord(email, purpose);
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
const deleteOtp = (email, purpose = 'register') => {
  const normalizedEmail = getKey(email, purpose);
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
}, 5 * 60 * 1000).unref();

module.exports = {
  saveOtp,
  getOtpRecord,
  verifyOtp,
  deleteOtp
};
