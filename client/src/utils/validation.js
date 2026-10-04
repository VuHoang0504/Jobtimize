export const validatePassword = (password) => {
  if (!password) {
    return 'Vui lòng nhập mật khẩu';
  }
  if (password.length < 6) {
    return 'Mật khẩu phải có tối thiểu 6 ký tự';
  }
  if (!/[A-Z]/.test(password)) {
    return 'Mật khẩu phải chứa ít nhất 1 chữ cái in hoa (A-Z)';
  }
  if (!/[0-9]/.test(password)) {
    return 'Mật khẩu phải chứa ít nhất 1 chữ số (0-9)';
  }
  return null;
};

export const checkPasswordCriteria = (password = '') => {
  return {
    minLength: password.length >= 6,
    hasUpper: /[A-Z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    isValid: password.length >= 6 && /[A-Z]/.test(password) && /[0-9]/.test(password)
  };
};
