const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController'); // Correct path to your authController

// Route to request OTP
// POST /auth/request-otp
router.post('/request-otp', authController.requestOtp);

// Route to verify OTP
// POST /auth/verify-otp
router.post('/verify-otp', authController.verifyOtp);

module.exports = router;