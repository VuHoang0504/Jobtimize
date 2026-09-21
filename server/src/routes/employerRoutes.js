const express = require('express');
const router = express.Router();
const employerController = require('../controllers/employerController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

// All employer routes require Employer role
router.use(authenticate, authorize(['Employer']));

router.get('/profile', employerController.getEmployerProfile);
router.put('/profile', employerController.updateEmployerProfile);
router.post('/jobs', employerController.postJob);
router.get('/jobs', employerController.getMyJobPostings);
router.get('/jobs/:jobId/ats', employerController.getJobApplicantsATS);
router.patch('/applications/:applicationId/status', employerController.updateApplicationStatus);
router.post('/interviews', employerController.scheduleInterview);

module.exports = router;
