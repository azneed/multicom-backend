const express = require('express');
const router = express.Router();
const {
  addManualOrApprovedPayment, // Use this for admin manual adds/approval
  getWeekPayments,
  getWeekDefaulters,
  getUserPayments,
  deletePayment,
  getRecentPayments // ✅ NEW IMPORT
} = require('../controllers/paymentController');
const { protect, admin } = require('../middleware/authMiddleware'); // ✅ Ensure protect and admin are imported


// 🟢 Admin Payment Actions
// This route now directly adds payments (manual admin adds or multi-week manager adds)
router.post('/', protect, admin, addManualOrApprovedPayment); // ✅ Added protect, admin
router.delete('/:id', protect, admin, deletePayment); // ✅ Added protect, admin

// ✅ NEW ROUTE: Get the N most recent payments (admin only)
router.get('/recent/:limit', protect, admin, getRecentPayments);

// 📅 Week-based Queries
router.get('/week/:weekNumber', protect, admin, getWeekPayments); // ✅ Added protect, admin
router.get('/week/:weekNumber/defaulters', protect, admin, getWeekDefaulters); // ✅ Added protect, admin

// 👤 Get a user's full payment history
router.get('/user/:userId', protect, admin, getUserPayments); // ✅ Added protect, admin


module.exports = router;