 // models/User.js

const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  cardNumber: {
    type: Number, // Your existing type
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  phone: {
    type: String, // Your existing type
    required: true
  },
  place: {
    type: String,
    required: true
  },
  schemeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Scheme',
    default: null
  },
  registeredAt: {
    type: Date,
    default: Date.now
  },
  // --- NEW FIELDS for OTP Authentication ---
  otp: {
    type: String,
    default: null, // Will store the generated OTP
  },
  otpExpires: {
    type: Date,
    default: null, // Will store the expiry timestamp for the OTP
  },
  // --- END NEW FIELDS ---
});

module.exports = mongoose.model('User', userSchema);