const express = require('express');
const router = express.Router();
const candidateController = require('../controllers/candidateController');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// All candidate routes require Candidate role
router.use(authenticate, authorize(['Candidate']));

router.get('/profile', candidateController.getCandidateProfile);
router.put('/profile', candidateController.updateCandidateProfile);
router.patch('/toggle-looking', candidateController.toggleLookingForJob);
router.post('/cv', upload.single('cvFile'), candidateController.uploadCV);
router.put('/cv/:cvId/primary', candidateController.setPrimaryCV);
router.delete('/cv/:cvId', candidateController.deleteCV);
router.get('/applications', candidateController.getMyApplications);
router.get('/saved-jobs', candidateController.getMySavedJobs);
router.get('/skill-gap', candidateController.getSkillGapAnalytics);

module.exports = router;
