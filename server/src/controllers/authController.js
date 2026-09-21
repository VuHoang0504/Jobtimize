const { executeQuery } = require('../config/db');
const { hashPassword, comparePassword, generateToken } = require('../utils/authHelper');

// Register Candidate or Employer
const register = async (req, res) => {
  try {
    const { email, password, fullName, phone, roleName, companyName } = req.body;

    if (!email || !password || !fullName || !roleName) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập đầy đủ các trường: email, password, fullName, roleName'
      });
    }

    if (!['Candidate', 'Employer'].includes(roleName)) {
      return res.status(400).json({
        success: false,
        message: 'Vai trò không hợp lệ (Phải là Candidate hoặc Employer)'
      });
    }

    if (roleName === 'Employer' && !companyName) {
      return res.status(400).json({
        success: false,
        message: 'Nhà tuyển dụng bắt buộc phải nhập Tên công ty'
      });
    }

    // Check if email already exists
    const existing = await executeQuery('SELECT UserID FROM Users WHERE Email = @Email', { Email: email });
    if (existing.recordset && existing.recordset.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Email này đã được sử dụng. Vui lòng chọn email khác hoặc đăng nhập.'
      });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Insert User
    const userInsert = await executeQuery(
      `INSERT INTO Users (Email, PasswordHash, FullName, Phone, Status, IsEmailVerified)
       OUTPUT INSERTED.UserID, INSERTED.Email, INSERTED.FullName, INSERTED.Phone, INSERTED.AvatarUrl
       VALUES (@Email, @PasswordHash, @FullName, @Phone, 'Active', 1)`,
      {
        Email: email,
        PasswordHash: hashedPassword,
        FullName: fullName,
        Phone: phone || null
      }
    );

    const newUser = userInsert.recordset[0];
    const userId = newUser.UserID;

    // Fetch RoleID
    const roleRes = await executeQuery('SELECT RoleID FROM Roles WHERE RoleName = @RoleName', { RoleName: roleName });
    if (roleRes.recordset && roleRes.recordset.length > 0) {
      const roleId = roleRes.recordset[0].RoleID;
      await executeQuery('INSERT INTO UserRoles (UserID, RoleID) VALUES (@UserID, @RoleID)', {
        UserID: userId,
        RoleID: roleId
      });
    }

    // Role-specific records
    let profileData = null;
    if (roleName === 'Candidate') {
      const candInsert = await executeQuery(
        `INSERT INTO CandidateProfiles (UserID, Headline, Bio, IsLookingForJob)
         OUTPUT INSERTED.ProfileID, INSERTED.Headline, INSERTED.IsLookingForJob
         VALUES (@UserID, N'Ứng viên mới', N'Chào mừng bạn đến với Jobtimize!', 1)`,
        { UserID: userId }
      );
      profileData = candInsert.recordset[0];
    } else if (roleName === 'Employer') {
      const empInsert = await executeQuery(
        `INSERT INTO Employers (UserID, CompanyName, KYCStatus)
         OUTPUT INSERTED.EmployerID, INSERTED.CompanyName, INSERTED.KYCStatus
         VALUES (@UserID, @CompanyName, 'Approved')`,
        { UserID: userId, CompanyName: companyName }
      );
      profileData = empInsert.recordset[0];
    }

    // Generate Token
    const token = generateToken({
      userId: newUser.UserID,
      email: newUser.Email,
      role: roleName
    });

    return res.status(201).json({
      success: true,
      message: 'Đăng ký tài khoản thành công!',
      data: {
        token,
        user: {
          ...newUser,
          role: roleName,
          profile: profileData
        }
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi server khi đăng ký: ' + error.message });
  }
};

// Standard Login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập email và mật khẩu' });
    }

    const userRes = await executeQuery(
      `SELECT u.UserID, u.Email, u.PasswordHash, u.FullName, u.Phone, u.AvatarUrl, u.Status,
              r.RoleName
       FROM Users u
       LEFT JOIN UserRoles ur ON u.UserID = ur.UserID
       LEFT JOIN Roles r ON ur.RoleID = r.RoleID
       WHERE u.Email = @Email`,
      { Email: email }
    );

    if (!userRes.recordset || userRes.recordset.length === 0) {
      return res.status(401).json({ success: false, message: 'Email hoặc mật khẩu không chính xác' });
    }

    const user = userRes.recordset[0];
    if (user.Status !== 'Active') {
      return res.status(403).json({ success: false, message: 'Tài khoản của bạn đã bị khóa hoặc chưa kích hoạt' });
    }

    const isMatch = await comparePassword(password, user.PasswordHash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Email hoặc mật khẩu không chính xác' });
    }

    // Fetch candidate or employer profile
    let profile = null;
    if (user.RoleName === 'Candidate') {
      const cpRes = await executeQuery('SELECT * FROM CandidateProfiles WHERE UserID = @UserID', { UserID: user.UserID });
      profile = cpRes.recordset[0] || null;
    } else if (user.RoleName === 'Employer') {
      const empRes = await executeQuery('SELECT * FROM Employers WHERE UserID = @UserID', { UserID: user.UserID });
      profile = empRes.recordset[0] || null;
    }

    const token = generateToken({
      userId: user.UserID,
      email: user.Email,
      role: user.RoleName
    });

    return res.json({
      success: true,
      message: 'Đăng nhập thành công!',
      data: {
        token,
        user: {
          userId: user.UserID,
          email: user.Email,
          fullName: user.FullName,
          phone: user.Phone,
          avatarUrl: user.AvatarUrl,
          role: user.RoleName,
          profile
        }
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi server khi đăng nhập: ' + error.message });
  }
};

// Google OAuth Mock Login
const googleMockLogin = async (req, res) => {
  try {
    const { email, fullName, googleId, avatarUrl, roleName = 'Candidate' } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Thiếu thông tin Google Account' });
    }

    // Check if user exists
    let userRes = await executeQuery(
      `SELECT u.UserID, u.Email, u.FullName, u.Phone, u.AvatarUrl, u.Status, r.RoleName
       FROM Users u
       LEFT JOIN UserRoles ur ON u.UserID = ur.UserID
       LEFT JOIN Roles r ON ur.RoleID = r.RoleID
       WHERE u.Email = @Email`,
      { Email: email }
    );

    let user;
    let actualRole = roleName;

    if (!userRes.recordset || userRes.recordset.length === 0) {
      // Create new Google User
      const userInsert = await executeQuery(
        `INSERT INTO Users (Email, FullName, AvatarUrl, GoogleID, Status, IsEmailVerified)
         OUTPUT INSERTED.UserID, INSERTED.Email, INSERTED.FullName, INSERTED.AvatarUrl
         VALUES (@Email, @FullName, @AvatarUrl, @GoogleID, 'Active', 1)`,
        {
          Email: email,
          FullName: fullName || 'Google User',
          AvatarUrl: avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&q=80',
          GoogleID: googleId || 'mock_google_id_' + Date.now()
        }
      );
      const newUser = userInsert.recordset[0];
      
      const roleRes = await executeQuery('SELECT RoleID FROM Roles WHERE RoleName = @RoleName', { RoleName: roleName });
      if (roleRes.recordset && roleRes.recordset.length > 0) {
        await executeQuery('INSERT INTO UserRoles (UserID, RoleID) VALUES (@UserID, @RoleID)', {
          UserID: newUser.UserID,
          RoleID: roleRes.recordset[0].RoleID
        });
      }

      if (roleName === 'Candidate') {
        await executeQuery(
          `INSERT INTO CandidateProfiles (UserID, Headline, Bio, IsLookingForJob)
           VALUES (@UserID, N'Ứng viên Jobtimize (Google)', N'Tìm kiếm cơ hội việc làm mới', 1)`,
          { UserID: newUser.UserID }
        );
      } else {
        await executeQuery(
          `INSERT INTO Employers (UserID, CompanyName, KYCStatus)
           VALUES (@UserID, N'Doanh nghiệp (Google Login)', 'Approved')`,
          { UserID: newUser.UserID }
        );
      }

      user = { ...newUser, RoleName: roleName };
    } else {
      user = userRes.recordset[0];
      actualRole = user.RoleName;
    }

    // Fetch Profile
    let profile = null;
    if (actualRole === 'Candidate') {
      const cpRes = await executeQuery('SELECT * FROM CandidateProfiles WHERE UserID = @UserID', { UserID: user.UserID });
      profile = cpRes.recordset[0] || null;
    } else if (actualRole === 'Employer') {
      const empRes = await executeQuery('SELECT * FROM Employers WHERE UserID = @UserID', { UserID: user.UserID });
      profile = empRes.recordset[0] || null;
    }

    const token = generateToken({
      userId: user.UserID,
      email: user.Email,
      role: actualRole
    });

    return res.json({
      success: true,
      message: 'Đăng nhập Google thành công!',
      data: {
        token,
        user: {
          userId: user.UserID,
          email: user.Email,
          fullName: user.FullName,
          avatarUrl: user.AvatarUrl,
          role: actualRole,
          profile
        }
      }
    });
  } catch (error) {
    console.error('Google Mock Login error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi server Google login: ' + error.message });
  }
};

// Get Current Logged-in User Profile
const getMe = async (req, res) => {
  try {
    const userId = req.user.userId;

    const userRes = await executeQuery(
      `SELECT u.UserID, u.Email, u.FullName, u.Phone, u.AvatarUrl, u.Status, u.CreatedAt,
              r.RoleName
       FROM Users u
       LEFT JOIN UserRoles ur ON u.UserID = ur.UserID
       LEFT JOIN Roles r ON ur.RoleID = r.RoleID
       WHERE u.UserID = @UserID`,
      { UserID: userId }
    );

    if (!userRes.recordset || userRes.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
    }

    const user = userRes.recordset[0];
    let profile = null;

    if (user.RoleName === 'Candidate') {
      const cpRes = await executeQuery('SELECT * FROM CandidateProfiles WHERE UserID = @UserID', { UserID: userId });
      profile = cpRes.recordset[0] || null;
    } else if (user.RoleName === 'Employer') {
      const empRes = await executeQuery('SELECT * FROM Employers WHERE UserID = @UserID', { UserID: userId });
      profile = empRes.recordset[0] || null;
    }

    return res.json({
      success: true,
      data: {
        userId: user.UserID,
        email: user.Email,
        fullName: user.FullName,
        phone: user.Phone,
        avatarUrl: user.AvatarUrl,
        role: user.RoleName,
        createdAt: user.CreatedAt,
        profile
      }
    });
  } catch (error) {
    console.error('getMe error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  register,
  login,
  googleMockLogin,
  getMe
};
