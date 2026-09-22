const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.post('/register', authController.register);
router.post('/verify-otp', authController.verifyEmailOtp);
router.post('/resend-otp', authController.resendOtp);
router.post('/login', authController.login);
router.post('/google', authController.googleLogin);
router.post('/google-mock', authController.googleMockLogin);
router.get('/me', authenticate, authController.getMe);

// Forgot & Reset Password
router.post('/forgot-password', authController.forgotPassword);
router.post('/verify-reset-otp', authController.verifyResetOtp);
router.post('/reset-password', authController.resetPassword);

// Profile Security & Avatar
router.post('/change-password', authenticate, authController.changePassword);
router.post('/avatar', authenticate, upload.single('avatar'), authController.updateAvatar);

module.exports = router;
