const express = require('express');
const router = express.Router();
const candidateController = require('../controllers/candidateController');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');
const cvDocument = require('../controllers/cvDocumentController');

// All candidate routes require Candidate role
router.use(authenticate, authorize(['Candidate']));

// Profile & CVs
router.get('/profile', candidateController.getCandidateProfile);
router.put('/profile', candidateController.updateCandidateProfile);
router.patch('/toggle-looking', candidateController.toggleLookingForJob);
router.post('/cv', upload.single('cvFile'), candidateController.uploadCV);
router.post('/cv/avatar', cvDocument.uploadAvatar);
router.get('/cv/avatar/:userId/:filename', cvDocument.getAvatar);
router.post('/cv/export', cvDocument.exportPDF);
router.post('/cv/online', cvDocument.validateOnlineCV, candidateController.saveOnlineCV);
router.put('/cv/online/:cvId', cvDocument.validateOnlineCV, candidateController.updateOnlineCV);
router.get('/cv/:cvId', candidateController.getCVDetail);
router.put('/cv/:cvId/primary', candidateController.setPrimaryCV);
router.delete('/cv/:cvId', candidateController.deleteCV);

// Applications & Saved Jobs
router.get('/applications', candidateController.getMyApplications);
router.get('/saved-jobs', candidateController.getMySavedJobs);

// Job Alerts (UC-C09)
router.get('/job-alerts', candidateController.getJobAlerts);
router.post('/job-alerts', candidateController.createJobAlert);
router.put('/job-alerts/:alertId', candidateController.updateJobAlert);
router.patch('/job-alerts/:alertId/toggle', candidateController.toggleJobAlert);
router.delete('/job-alerts/:alertId', candidateController.deleteJobAlert);
router.get('/job-alerts/:alertId/matching-jobs', candidateController.getMatchingJobsForAlert);

// Skill Gap & Course Database Integration (UC-C12)
router.get('/skill-gap', candidateController.getSkillGapAnalytics);
router.post('/skill-gap', candidateController.getSkillGapAnalytics);
router.get('/courses', candidateController.getAllCourses);

module.exports = router;
