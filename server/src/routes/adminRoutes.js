const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

// All Admin routes require authentication and Admin role
router.use(authenticate, authorize(['Admin']));

// KYC Management (UC-E04 / UC-A05)
router.get('/kyc/pending', adminController.getPendingKYCList);
router.post('/kyc/:employerId/review', adminController.reviewEmployerKYC);

// Payment Verification (UC-E07)
router.post('/payments/:transactionRef/verify', adminController.verifyPaymentTransaction);

module.exports = router;

