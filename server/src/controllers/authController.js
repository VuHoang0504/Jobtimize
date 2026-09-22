const { executeQuery } = require('../config/db');
const { hashPassword, comparePassword, generateToken } = require('../utils/authHelper');
const { OAuth2Client } = require('google-auth-library');
const { sendOtpEmail } = require('../services/emailService');
const { saveOtp, getOtpRecord, verifyOtp, deleteOtp } = require('../utils/otpStore');

// Step 1: Register - Validate data, generate OTP and send email
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

    // Check if email already exists and is verified
    const existing = await executeQuery('SELECT UserID, IsEmailVerified FROM Users WHERE Email = @Email', { Email: email });
    if (existing.recordset && existing.recordset.length > 0) {
      const user = existing.recordset[0];
      if (user.IsEmailVerified) {
        return res.status(400).json({
          success: false,
          message: 'Email này đã được sử dụng. Vui lòng chọn email khác hoặc đăng nhập.'
        });
      }
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store pending registration data with OTP in store (10 mins TTL)
    saveOtp(
      email,
      otp,
      {
        email,
        passwordHash: hashedPassword,
        fullName,
        phone: phone || null,
        roleName,
        companyName: companyName || null
      },
      10
    );

    // Send OTP via Gmail/SMTP
    const emailResult = await sendOtpEmail(email, otp, fullName);

    return res.status(200).json({
      success: true,
      requireOtp: true,
      message: `Mã OTP xác thực 6 chữ số đã được gửi đến email ${email}.`,
      data: {
        email,
        fullName,
        roleName
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi server khi đăng ký: ' + error.message });
  }
};

// Step 2: Verify Email OTP & Create User in DB
const verifyEmailOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp email và mã OTP' });
    }

    const verifyResult = verifyOtp(email, otp);
    if (!verifyResult.valid) {
      return res.status(400).json({ success: false, message: verifyResult.message });
    }

    const { registrationData } = verifyResult;
    const { email: regEmail, passwordHash, fullName, phone, roleName, companyName } = registrationData;

    // Check if user record already exists (e.g. unverified previous attempt)
    const existing = await executeQuery('SELECT UserID FROM Users WHERE Email = @Email', { Email: regEmail });
    let userId;
    let newUser;

    if (existing.recordset && existing.recordset.length > 0) {
      userId = existing.recordset[0].UserID;
      const updateRes = await executeQuery(
        `UPDATE Users 
         SET PasswordHash = @PasswordHash, FullName = @FullName, Phone = @Phone, Status = 'Active', IsEmailVerified = 1, UpdatedAt = GETDATE()
         OUTPUT INSERTED.UserID, INSERTED.Email, INSERTED.FullName, INSERTED.Phone, INSERTED.AvatarUrl
         WHERE UserID = @UserID`,
        {
          PasswordHash: passwordHash,
          FullName: fullName,
          Phone: phone || null,
          UserID: userId
        }
      );
      newUser = updateRes.recordset[0];
    } else {
      // Insert new User
      const userInsert = await executeQuery(
        `INSERT INTO Users (Email, PasswordHash, FullName, Phone, Status, IsEmailVerified)
         OUTPUT INSERTED.UserID, INSERTED.Email, INSERTED.FullName, INSERTED.Phone, INSERTED.AvatarUrl
         VALUES (@Email, @PasswordHash, @FullName, @Phone, 'Active', 1)`,
        {
          Email: regEmail,
          PasswordHash: passwordHash,
          FullName: fullName,
          Phone: phone || null
        }
      );
      newUser = userInsert.recordset[0];
      userId = newUser.UserID;
    }

    // Role assignment
    const roleRes = await executeQuery('SELECT RoleID FROM Roles WHERE RoleName = @RoleName', { RoleName: roleName });
    if (roleRes.recordset && roleRes.recordset.length > 0) {
      const roleId = roleRes.recordset[0].RoleID;
      // Delete old roles if any and re-assign
      await executeQuery('DELETE FROM UserRoles WHERE UserID = @UserID', { UserID: userId });
      await executeQuery('INSERT INTO UserRoles (UserID, RoleID) VALUES (@UserID, @RoleID)', {
        UserID: userId,
        RoleID: roleId
      });
    }

    // Role-specific records
    let profileData = null;
    if (roleName === 'Candidate') {
      const existingProfile = await executeQuery('SELECT ProfileID FROM CandidateProfiles WHERE UserID = @UserID', { UserID: userId });
      if (existingProfile.recordset && existingProfile.recordset.length > 0) {
        profileData = existingProfile.recordset[0];
      } else {
        const candInsert = await executeQuery(
          `INSERT INTO CandidateProfiles (UserID, Headline, Bio, IsLookingForJob)
           OUTPUT INSERTED.ProfileID, INSERTED.Headline, INSERTED.IsLookingForJob
           VALUES (@UserID, N'Ứng viên mới', N'Chào mừng bạn đến với Jobtimize!', 1)`,
          { UserID: userId }
        );
        profileData = candInsert.recordset[0];
      }
    } else if (roleName === 'Employer') {
      const existingEmp = await executeQuery('SELECT EmployerID FROM Employers WHERE UserID = @UserID', { UserID: userId });
      if (existingEmp.recordset && existingEmp.recordset.length > 0) {
        profileData = existingEmp.recordset[0];
      } else {
        const empInsert = await executeQuery(
          `INSERT INTO Employers (UserID, CompanyName, KYCStatus)
           OUTPUT INSERTED.EmployerID, INSERTED.CompanyName, INSERTED.KYCStatus
           VALUES (@UserID, @CompanyName, 'Approved')`,
          { UserID: userId, CompanyName: companyName || 'Công ty tuyển dụng' }
        );
        profileData = empInsert.recordset[0];
      }
    }

    // Delete OTP once verified successfully
    deleteOtp(regEmail);

    // Generate Token
    const token = generateToken({
      userId: newUser.UserID,
      email: newUser.Email,
      role: roleName
    });

    return res.status(201).json({
      success: true,
      message: 'Xác thực tài khoản thành công! Chào mừng bạn đến với Jobtimize.',
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
    console.error('Verify OTP error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi server khi xác thực OTP: ' + error.message });
  }
};

// Resend OTP
const resendOtp = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp email' });
    }

    const record = getOtpRecord(email);
    if (!record) {
      return res.status(400).json({
        success: false,
        message: 'Phiên đăng ký đã hết hạn. Vui lòng thực hiện lại các bước đăng ký.'
      });
    }

    // Generate new OTP
    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
    saveOtp(email, newOtp, record.registrationData, 10);

    const emailResult = await sendOtpEmail(email, newOtp, record.registrationData.fullName || 'Bạn');

    return res.json({
      success: true,
      message: `Đã gửi lại mã OTP xác thực tới ${email}.`
    });
  } catch (error) {
    console.error('Resend OTP error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi server khi gửi lại OTP: ' + error.message });
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

// Google OAuth Real Login via ID Token
const googleLogin = async (req, res) => {
  try {
    const { credential, roleName = 'Candidate' } = req.body;

    if (!credential) {
      return res.status(400).json({ success: false, message: 'Thiếu Google credential token' });
    }

    // Verify Google ID Token
    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    let payload;
    try {
      const ticket = await client.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID
      });
      payload = ticket.getPayload();
    } catch (verifyError) {
      console.error('Google token verification error:', verifyError);
      return res.status(401).json({ success: false, message: 'Token Google không hợp lệ hoặc đã hết hạn' });
    }

    const { sub: googleId, email, name: fullName, picture: avatarUrl } = payload;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Không lấy được email từ tài khoản Google' });
    }

    // Check if user exists by Email or GoogleID
    let userRes = await executeQuery(
      `SELECT u.UserID, u.Email, u.FullName, u.Phone, u.AvatarUrl, u.Status, u.GoogleID, r.RoleName
       FROM Users u
       LEFT JOIN UserRoles ur ON u.UserID = ur.UserID
       LEFT JOIN Roles r ON ur.RoleID = r.RoleID
       WHERE u.Email = @Email OR u.GoogleID = @GoogleID`,
      { Email: email, GoogleID: googleId }
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
          GoogleID: googleId
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
      actualRole = user.RoleName || 'Candidate';

      // Update GoogleID or AvatarUrl if not linked yet
      await executeQuery(
        `UPDATE Users 
         SET GoogleID = COALESCE(GoogleID, @GoogleID),
             AvatarUrl = COALESCE(AvatarUrl, @AvatarUrl)
         WHERE UserID = @UserID`,
        {
          GoogleID: googleId,
          AvatarUrl: avatarUrl || null,
          UserID: user.UserID
        }
      );
    }

    if (user.Status && user.Status !== 'Active') {
      return res.status(403).json({ success: false, message: 'Tài khoản của bạn đã bị khóa' });
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
          avatarUrl: user.AvatarUrl || avatarUrl,
          role: actualRole,
          profile
        }
      }
    });
  } catch (error) {
    console.error('Google Login error:', error);
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

// Forgot Password - Step 1: Send OTP to registered email
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp địa chỉ email' });
    }

    const userRes = await executeQuery('SELECT UserID, Email, FullName, Status FROM Users WHERE Email = @Email', { Email: email });
    if (!userRes.recordset || userRes.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Email này chưa được đăng ký trong hệ thống' });
    }

    const user = userRes.recordset[0];
    if (user.Status !== 'Active') {
      return res.status(403).json({ success: false, message: 'Tài khoản của bạn đã bị khóa hoặc chưa kích hoạt' });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store pending reset in OTP store
    saveOtp(email, otp, { email, userId: user.UserID, fullName: user.FullName, type: 'reset_password' }, 10);

    // Send email via Gmail
    await sendOtpEmail(email, otp, user.FullName, 'reset_password');

    return res.status(200).json({
      success: true,
      message: `Mã OTP xác nhận đặt lại mật khẩu đã được gửi đến email ${email}.`
    });
  } catch (error) {
    console.error('forgotPassword error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi server khi gửi OTP quên mật khẩu: ' + error.message });
  }
};

// Forgot Password - Step 2: Verify OTP
const verifyResetOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập đầy đủ email và mã OTP' });
    }

    const verifyResult = verifyOtp(email, otp);
    if (!verifyResult.valid) {
      return res.status(400).json({ success: false, message: verifyResult.message });
    }

    return res.status(200).json({
      success: true,
      message: 'Mã OTP chính xác. Vui lòng thiết lập mật khẩu mới.'
    });
  } catch (error) {
    console.error('verifyResetOtp error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Forgot Password - Step 3: Set New Password
const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp đầy đủ email, mã OTP và mật khẩu mới' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Mật khẩu mới phải có tối thiểu 6 ký tự' });
    }

    const verifyResult = verifyOtp(email, otp);
    if (!verifyResult.valid) {
      return res.status(400).json({ success: false, message: verifyResult.message });
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update DB
    await executeQuery(
      `UPDATE Users 
       SET PasswordHash = @PasswordHash, UpdatedAt = GETDATE() 
       WHERE Email = @Email`,
      {
        PasswordHash: hashedPassword,
        Email: email
      }
    );

    // Clean up OTP record
    deleteOtp(email);

    return res.status(200).json({
      success: true,
      message: 'Đặt lại mật khẩu thành công! Bạn có thể đăng nhập ngay bằng mật khẩu mới.'
    });
  } catch (error) {
    console.error('resetPassword error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi server khi đặt lại mật khẩu: ' + error.message });
  }
};

// Change Password for logged-in user
const changePassword = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp mật khẩu hiện tại và mật khẩu mới' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Mật khẩu mới phải có tối thiểu 6 ký tự' });
    }

    const userRes = await executeQuery('SELECT PasswordHash, GoogleID FROM Users WHERE UserID = @UserID', { UserID: userId });
    if (!userRes.recordset || userRes.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
    }

    const user = userRes.recordset[0];
    if (!user.PasswordHash) {
      return res.status(400).json({ success: false, message: 'Tài khoản của bạn được đăng nhập qua Google, không có mật khẩu trực tiếp' });
    }

    const isMatch = await comparePassword(currentPassword, user.PasswordHash);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Mật khẩu hiện tại không chính xác' });
    }

    const newHashedPassword = await hashPassword(newPassword);
    await executeQuery('UPDATE Users SET PasswordHash = @PasswordHash, UpdatedAt = GETDATE() WHERE UserID = @UserID', {
      PasswordHash: newHashedPassword,
      UserID: userId
    });

    return res.status(200).json({
      success: true,
      message: 'Đổi mật khẩu thành công!'
    });
  } catch (error) {
    console.error('changePassword error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi server khi đổi mật khẩu: ' + error.message });
  }
};

// Update Avatar for logged-in user
const updateAvatar = async (req, res) => {
  try {
    const userId = req.user.userId;
    let avatarUrl = req.body.avatarUrl;

    if (req.file) {
      avatarUrl = `/uploads/${req.file.filename}`;
    }

    if (!avatarUrl) {
      return res.status(400).json({ success: false, message: 'Vui lòng chọn file ảnh hoặc cung cấp URL hình ảnh' });
    }

    await executeQuery('UPDATE Users SET AvatarUrl = @AvatarUrl, UpdatedAt = GETDATE() WHERE UserID = @UserID', {
      AvatarUrl: avatarUrl,
      UserID: userId
    });

    return res.status(200).json({
      success: true,
      message: 'Cập nhật ảnh đại diện thành công!',
      data: { avatarUrl }
    });
  } catch (error) {
    console.error('updateAvatar error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi server khi cập nhật ảnh đại diện: ' + error.message });
  }
};

module.exports = {
  register,
  verifyEmailOtp,
  resendOtp,
  login,
  googleLogin,
  googleMockLogin: googleLogin,
  getMe,
  forgotPassword,
  verifyResetOtp,
  resetPassword,
  changePassword,
  updateAvatar
};
