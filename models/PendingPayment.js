const mongoose = require('mongoose');

const pendingPaymentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  mode: {
    type: String,
    enum: ['online', 'offline', 'UPI'], // Ensure UPI is supported if you have QR code
    required: true
  },
  screenshotUrl: {
    type: String,
    required: true
  },
  // --- NEW: Add the week field ---
  week: { // Add this field so it's available when approving
    type: Number,
    required: false, // Make it optional at pending stage if not always provided by user
  },
  // --- END NEW ---
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('PendingPayment', pendingPaymentSchema);