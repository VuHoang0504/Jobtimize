const { verifyToken } = require('../utils/authHelper');
const { executeQuery } = require('../config/db');

// Verify JWT Token
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Vui lòng đăng nhập để tiếp tục' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);

    // Fetch user details from DB
    const userResult = await executeQuery(
      `SELECT u.UserID, u.Email, u.FullName, u.Phone, u.AvatarUrl, u.Status,
              r.RoleName
       FROM Users u
       LEFT JOIN UserRoles ur ON u.UserID = ur.UserID
       LEFT JOIN Roles r ON ur.RoleID = r.RoleID
       WHERE u.UserID = @UserID AND u.Status = 'Active'`,
      { UserID: decoded.userId }
    );

    if (!userResult.recordset || userResult.recordset.length === 0) {
      return res.status(401).json({ success: false, message: 'Tài khoản không tồn tại hoặc đã bị khóa' });
    }

    const user = userResult.recordset[0];
    req.user = {
      userId: user.UserID,
      email: user.Email,
      fullName: user.FullName,
      phone: user.Phone,
      avatarUrl: user.AvatarUrl,
      role: user.RoleName
    };

    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn' });
  }
};

// Optional Authentication (for job view where visitor can be logged in or guest)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = verifyToken(token);
      const userResult = await executeQuery(
        `SELECT u.UserID, u.Email, u.FullName, r.RoleName
         FROM Users u
         LEFT JOIN UserRoles ur ON u.UserID = ur.UserID
         LEFT JOIN Roles r ON ur.RoleID = r.RoleID
         WHERE u.UserID = @UserID AND u.Status = 'Active'`,
        { UserID: decoded.userId }
      );
      if (userResult.recordset && userResult.recordset.length > 0) {
        const user = userResult.recordset[0];
        req.user = {
          userId: user.UserID,
          email: user.Email,
          fullName: user.FullName,
          role: user.RoleName
        };
      }
    }
  } catch (err) {
    // Ignore error in optional auth
  }
  next();
};

// Authorize specific roles
const authorize = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền thực hiện hành động này'
      });
    }
    next();
  };
};

module.exports = {
  authenticate,
  optionalAuth,
  authorize
};
