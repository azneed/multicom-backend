const Payment = require('../models/Payment');
const User = require('../models/User');

const sendReminders = async (req, res) => {
  try {
    const week = parseInt(req.query.week); // e.g. /api/reminders/send?week=6

    if (!week || week < 1 || week > 60) {
      return res.status(400).json({ message: '❌ Invalid week number' });
    }

    const allUsers = await User.find();
    const paid = await Payment.find({ week }).select('userId');
    const paidUserIds = paid.map(p => p.userId.toString());

    const defaulters = allUsers.filter(u => !paidUserIds.includes(u._id.toString()));

    // Placeholder: Simulate reminder sending
    defaulters.forEach(user => {
      console.log(`🔔 Reminder sent to ${user.name} (${user.phone}) for Week ${week}`);
    });

    res.status(200).json({
      message: `✅ Reminders processed for ${defaulters.length} unpaid users.`,
      week,
      defaulters,
    });
  } catch (err) {
    console.error('Error sending reminders:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { sendReminders };
