const express = require('express');
const router = express.Router();
const ActivityLog = require('../models/ActivityLog');
const User = require('../models/User'); // Used for population, but not directly in the controller logic provided

// 📝 Get All Activity Logs with user details and screenshotUrl
router.get('/', async (req, res) => {
  try {
    const logs = await ActivityLog.find()
      .populate('userId', 'name cardNumber phone') // Populate user details
      .sort({ createdAt: -1 }) // Sort by most recent first
      .select('actionType userId amount mode week note screenshotUrl createdAt'); // ✅ ADDED: Explicitly select screenshotUrl
    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching activity logs' });
  }
});

module.exports = router;