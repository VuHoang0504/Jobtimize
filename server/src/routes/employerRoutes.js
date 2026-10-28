const express = require('express');
const router = express.Router();
const employerController = require('../controllers/employerController');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const kycUpload = require('../middleware/kycUploadMiddleware');

// All employer routes require Employer role
router.use(authenticate, authorize(['Employer']));

// 1. Profile Management
router.get('/profile', employerController.getEmployerProfile);
router.put('/profile', employerController.updateEmployerProfile);

// 2. KYC (UC-E04)
router.post('/kyc', kycUpload, employerController.submitKYC);
router.get('/kyc-status', employerController.getKYCStatus);

// 3. Job Management (UC-E05, UC-E06)
router.post('/jobs', employerController.postJob);
router.get('/jobs', employerController.getMyJobPostings);
router.get('/jobs/:jobId/detail', employerController.getJobDetailsForEdit);
router.put('/jobs/:jobId', employerController.updateJob);
router.patch('/jobs/:jobId/status', employerController.updateJobStatus);
router.delete('/jobs/:jobId', employerController.deleteJob);

// 4. ATS & Interview Scheduling (UC-E08, UC-E10)
router.get('/jobs/:jobId/ats', employerController.getJobApplicantsATS);
router.patch('/applications/:applicationId/status', employerController.updateApplicationStatus);
router.get('/interviews', employerController.getScheduledInterviews);
router.post('/interviews', employerController.scheduleInterview);

// 5. Subscription Packages & Payment (UC-E07)
router.get('/packages', employerController.getSubscriptionPackages);
router.get('/subscription', employerController.getEmployerSubscription);
router.post('/subscription/switch', employerController.switchSubscriptionPackage);
router.post('/checkout', employerController.createCheckout);
router.post('/payment/confirm', employerController.confirmPayment);
router.get('/payment/history', employerController.getPaymentHistory);

// 6. Passive Talent Hunting & Invitations (UC-E11, UC-E12)
router.get('/candidates', employerController.searchCandidates);
router.post('/invite-candidate', employerController.inviteCandidate);
router.get('/invitations', employerController.getCandidateInvitations);

module.exports = router;
