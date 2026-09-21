const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/authMiddleware');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/google-mock', authController.googleMockLogin);
router.get('/me', authenticate, authController.getMe);

module.exports = router;
