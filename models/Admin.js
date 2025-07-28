const mongoose = require('mongoose');
const bcrypt = require('bcryptjs'); // Import bcryptjs

const AdminSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  // You can add roles or other admin-specific fields here if needed
  role: {
    type: String,
    enum: ['superadmin', 'admin', 'viewer'], // Example roles
    default: 'admin',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Hash password before saving
AdminSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Method to compare password
AdminSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('Admin', AdminSchema);