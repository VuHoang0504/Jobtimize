const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const hashPassword = async (plainPassword) => {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(plainPassword, salt);
};

const comparePassword = async (plainPassword, hashedPassword) => {
  if (!hashedPassword) return false;
  return await bcrypt.compare(plainPassword, hashedPassword);
};

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret || !secret.trim()) {
    throw new Error('Lỗi cấu hình bảo mật: Biến môi trường JWT_SECRET chưa được thiết lập. Hệ thống từ chối sử dụng khóa mặc định.');
  }
  return secret.trim();
};

const validateJwtConfig = () => {
  getJwtSecret();
  return true;
};

const generateToken = (payload) => {
  const secret = getJwtSecret();
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  return jwt.sign(payload, secret, { expiresIn });
};

const verifyToken = (token) => {
  const secret = getJwtSecret();
  return jwt.verify(token, secret);
};

const validatePasswordStrength = (password) => {
  if (!password || typeof password !== 'string') {
    return { valid: false, message: 'Vui lòng nhập mật khẩu' };
  }
  if (password.length < 6) {
    return { valid: false, message: 'Mật khẩu phải có tối thiểu 6 ký tự' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Mật khẩu phải chứa ít nhất 1 chữ cái viết hoa' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'Mật khẩu phải chứa ít nhất 1 chữ số' };
  }
  return { valid: true };
};

module.exports = {
  hashPassword,
  comparePassword,
  generateToken,
  verifyToken,
  validatePasswordStrength,
  getJwtSecret,
  validateJwtConfig
};
