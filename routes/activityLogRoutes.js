const express = require('express');
const router = express.Router();
const ActivityLog = require('../models/ActivityLog');
const User = require('../models/User');

// 📝 Get All Activity Logs with user details
router.get('/', async (req, res) => {
  try {
    const logs = await ActivityLog.find().populate('userId', 'name cardNumber phone').sort({ createdAt: -1 });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching activity logs' });
  }
});

module.exports = router;
