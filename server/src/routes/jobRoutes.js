const express = require('express');
const router = express.Router();
const jobController = require('../controllers/jobController');
const { authenticate, optionalAuth, authorize } = require('../middleware/authMiddleware');

router.get('/', optionalAuth, jobController.getJobs);
router.get('/:id', optionalAuth, jobController.getJobById);
router.post('/save-toggle', authenticate, authorize(['Candidate']), jobController.toggleSaveJob);
router.post('/apply', authenticate, authorize(['Candidate']), jobController.applyJob);

module.exports = router;
