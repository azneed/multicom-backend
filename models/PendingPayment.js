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
    enum: ['online', 'offline', 'UPI'],
    required: true
  },
  screenshotUrl: {
    type: String,
    required: true
  },
  week: {
    type: Number,
    required: true, // This is fine for new data, consider old data if issues arise
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
}, {
  timestamps: true // Adds createdAt and updatedAt
});

module.exports = mongoose.model('PendingPayment', pendingPaymentSchema);