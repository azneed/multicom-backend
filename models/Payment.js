const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  week: {
    type: Number,
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  mode: {
    type: String,
    enum: ['manual', 'online', 'UPI'], // Ensure UPI is supported if you have QR code
    required: true,
  },
  screenshotPath: { // <<< NEW: Add this field for storing screenshot paths
    type: String,
    required: false, // Make it optional for manual admin entries
  },
}, { timestamps: true }); // adds createdAt & updatedAt

module.exports = mongoose.model('Payment', paymentSchema);