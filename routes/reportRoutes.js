const express = require('express');
const router = express.Router();
const {
  getPaymentsReceivedReport,
  getPendingPaymentsReport,
} = require('../controllers/reportController');
const { protect, admin } = require('../middleware/authMiddleware');

// @route   GET /api/reports/payments-received
// @desc    Get aggregated report of payments received
// @access  Admin
router.get('/payments-received', protect, admin, getPaymentsReceivedReport);

// @route   GET /api/reports/pending-payments
// @desc    Get aggregated report of pending payments awaiting approval
// @access  Admin
router.get('/pending-payments', protect, admin, getPendingPaymentsReport);

module.exports = router;