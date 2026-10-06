const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// 1. AI JD Generator (Employer & Admin)
router.post('/generate-jd', authenticate, authorize(['Employer', 'Admin']), aiController.generateJD);

// 2. AI CV Parser & Extraction (Candidate & Employer)
router.post('/parse-cv', authenticate, upload.single('cvFile'), aiController.parseCV);

// 3. AI Mock Interview (Candidate)
router.post('/interview/start', authenticate, authorize(['Candidate']), aiController.startMockInterview);
router.post('/interview/evaluate', authenticate, authorize(['Candidate']), aiController.evaluateMockInterview);
router.get('/interview/history', authenticate, authorize(['Candidate']), aiController.getInterviewHistory);

module.exports = router;
