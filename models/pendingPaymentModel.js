// models/pendingPaymentModel.js

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
    default: 'online'
  },
  screenshot: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  approved: {
    type: Boolean,
    default: false
  },
  rejected: {
    type: Boolean,
    default: false
  }
});

module.exports = mongoose.model('PendingPayment', pendingPaymentSchema);
