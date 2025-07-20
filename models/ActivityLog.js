// multicom-backend/models/ActivityLog.js (NEW FILE - Mongoose Model)
const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  actionType: { // e.g., 'register', 'manual', 'approve', 'reject', 'delete', 'user_uploaded_for_review'
    type: String,
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false, // Not all actions might have a userId
  },
  amount: { // Amount involved in the transaction
    type: Number,
    required: false,
  },
  mode: { // Payment mode if applicable
    type: String,
    required: false,
  },
  week: { // Week number if applicable
    type: Number,
    required: false,
  },
  note: { // Custom message for the log
    type: String,
    required: false,
  },
  screenshotUrl: { // Path to screenshot if relevant
    type: String,
    required: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('ActivityLog', activityLogSchema);