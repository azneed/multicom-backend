const express = require('express');
const router = express.Router();
const {
  addManualOrApprovedPayment, // Use this for admin manual adds/approval
  getWeekPayments,
  getWeekDefaulters,
  getUserPayments,
  deletePayment
} = require('../controllers/paymentController');
// No Multer 'upload' middleware directly on this route.
// User uploads are handled by pendingPaymentRoutes now.

// 🟢 Admin Payment Actions
// This route now directly adds payments (manual admin adds or multi-week manager adds)
router.post('/', addManualOrApprovedPayment);
router.delete('/:id', deletePayment);

// 📅 Week-based Queries
router.get('/week/:weekNumber', getWeekPayments);
router.get('/week/:weekNumber/defaulters', getWeekDefaulters);

// 👤 Get a user's full payment history
router.get('/user/:userId', getUserPayments);

module.exports = router;