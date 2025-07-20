const express = require('express');
const multer = require('multer'); // Import multer here if not in middleware
const {
  uploadProof,
  getAllPendingPayments,
  approvePendingPayment,
  rejectPendingPayment
} = require('../controllers/pendingPaymentController');
const router = express.Router();
const upload = require('../middleware/uploadMiddleware'); // uses multer with fileFilter

// User uploads proof
router.post('/upload', upload.single('screenshot'), uploadProof); // This is where the file upload happens

// Get all pending payments for admin review
router.get('/pending', getAllPendingPayments);

// Admin approves a pending payment
router.post('/approve/:id', approvePendingPayment);

// Admin rejects a pending payment
router.delete('/reject/:id', rejectPendingPayment);

module.exports = router;