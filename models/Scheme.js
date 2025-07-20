// models/Scheme.js
const mongoose = require('mongoose');

const schemeSchema = new mongoose.Schema({
  title: { type: String, required: true },
  prize: { type: String, required: true },
  totalWeeks: { type: Number, default: 60 },
  costPerWeek: { // <<< NEW FIELD
    type: Number,
    required: true, // Make true if every scheme must have this
    min: 0 // Cannot be negative
  },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Scheme', schemeSchema);