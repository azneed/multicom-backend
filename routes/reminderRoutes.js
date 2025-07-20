const express = require('express');
const router = express.Router();
const { sendReminders } = require('../controllers/reminderController');

router.get('/send', sendReminders);

module.exports = router;
