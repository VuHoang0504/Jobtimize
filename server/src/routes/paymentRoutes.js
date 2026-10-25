const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authenticate } = require('../middleware/authMiddleware');

// 1. Create PayOS Payment Order (Protected: Employer only)
router.post('/create', authenticate, paymentController.createPayOSOrder);

// 2. PayOS Webhook (Public endpoint for PayOS server notifications)
router.get('/payos-webhook', (req, res) => res.status(200).json({ success: true, message: 'Webhook endpoint is active' }));
router.head('/payos-webhook', (req, res) => res.status(200).end());
router.post('/payos-webhook', paymentController.handlePayOSWebhook);

// 3. Check Order Payment Status (Polling endpoint for frontend)
router.get('/:orderCode/status', paymentController.getPaymentStatus);

module.exports = router;

