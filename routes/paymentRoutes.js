const express = require('express');
const router = express.Router();
const {
  addManualOrApprovedPayment, // Use this for admin manual adds/approval
  getWeekPayments,
  getWeekDefaulters,
  getUserPayments,
  deletePayment,
  getRecentPayments
} = require('../controllers/paymentController');
const { protect, admin } = require('../middleware/authMiddleware');

// 🟢 Admin Payment Actions
// These routes should remain protected by 'admin' middleware
router.post('/', protect, admin, addManualOrApprovedPayment);
router.delete('/:id', protect, admin, deletePayment);

// ✅ Admin-only week-based queries (remain protected by 'admin')
router.get('/recent/:limit', protect, admin, getRecentPayments);
router.get('/week/:weekNumber', protect, admin, getWeekPayments);
router.get('/week/:weekNumber/defaulters', protect, admin, getWeekDefaulters);

// 👤 Get a user's full payment history
// ✅ CRITICAL FIX: Removed 'admin' middleware here.
// The controller will now handle authorization for regular users.
router.get('/user/:userId', protect, getUserPayments);

module.exports = router;