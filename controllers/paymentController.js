const Payment = require('../models/Payment');
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog'); // Mongoose MODEL
const PendingPayment = require('../models/PendingPayment');

// 🔹 User uploads payment proof (creates PendingPayment)
const addPaymentProof = async (req, res) => {
  try {
    const { userId, amount, mode, week } = req.body;
    if (!userId || !amount || !mode) {
      return res.status(400).json({ message: 'Missing required fields: userId, amount, and mode.' });
    }
    if (!req.file || !req.file.path) {
      return res.status(400).json({ message: 'Payment screenshot is required for this transaction.' });
    }
    const pendingPayment = new PendingPayment({
      userId,
      amount: parseInt(amount), // Ensure amount is parsed
      mode,
      screenshotUrl: req.file.path,
      week: parseInt(week) // Ensure week is parsed and saved for pending
    });
    await pendingPayment.save();
    try {
      await ActivityLog.create({
        actionType: 'user_uploaded_for_review',
        userId,
        amount: parseInt(amount),
        mode,
        note: `User uploaded payment for review. Amount: ${amount}, Mode: ${mode}`,
        screenshotUrl: req.file.path
      });
    } catch (logErr) {
      console.warn('⚠️ Activity logging failed for pending payment:', logErr.message);
    }
    res.status(201).json({
      message: 'Payment uploaded successfully for admin review. It will reflect soon.',
      pendingPayment
    });
  } catch (err) {
    console.error('❌ Error in addPaymentProof (user upload to pending):', err.message);
    res.status(500).json({ message: 'Server error during payment upload for review.' });
  }
};

// 🟢 Admin adds a payment manually or approves a pending one
const addManualOrApprovedPayment = async (req, res) => {
  try {
    // 'week' is now the 'startWeek' for multi-week payments
    const { userId, amount, mode, week: startWeek, screenshotPath, pendingPaymentId } = req.body; 

    if (!userId || !amount || !mode || !startWeek) {
      return res.status(400).json({ message: 'Missing required fields: userId, amount, mode, and startWeek.' });
    }

    const parsedAmount = parseInt(amount);
    // Calculate number of weeks based on the amount
    const numWeeks = parsedAmount / 100; 

    // Basic validation for amount
    if (parsedAmount % 100 !== 0 || numWeeks < 1) {
        return res.status(400).json({ message: 'Amount must be a multiple of 100 and at least 100.' });
    }

    const createdPayments = [];
    let currentWeek = parseInt(startWeek);

    // ⭐ KEY FIX: Create multiple payment records if amount > 100
    for (let i = 0; i < numWeeks; i++) {
        const payment = new Payment({
            userId,
            amount: 100, // Each individual record is for 100
            mode,
            week: currentWeek, // Assign the current week in the sequence
            screenshotPath: screenshotPath // Same screenshot for all weeks in this bulk payment
        });
        await payment.save();
        createdPayments.push(payment);
        currentWeek++; // Move to the next week for the next payment
    }

    try {
      await ActivityLog.create({
        actionType: pendingPaymentId ? 'approve' : 'manual', // 'approve' if called from pending, 'manual' otherwise
        userId,
        amount: parsedAmount, // Log the total original amount paid
        mode,
        week: parseInt(startWeek), // Log the starting week of the payment
        note: pendingPaymentId ? `Approved payment for ${numWeeks} week(s) starting from week ${startWeek}.` : `Admin manually added payment for ${numWeeks} week(s) starting from week ${startWeek}.`,
        screenshotUrl: screenshotPath
      });
    } catch (logErr) {
      console.warn('⚠️ Activity logging failed for payment approval/manual add:', logErr.message);
    }

    // If it's an approval originating from pending, return the result
    if (pendingPaymentId) {
      return { message: `Payment successfully added/approved for ${numWeeks} week(s).`, payments: createdPayments };
    }

    // If it's a direct manual add, send the response here.
    res.status(201).json({
      message: `Payment successfully added for ${numWeeks} week(s).`,
      payments: createdPayments
    });

  } catch (err) {
    console.error('❌ Error in addManualOrApprovedPayment (admin action):', err.message);
    res.status(500).json({ message: 'Server error during payment add/approval.' });
  }
};


// 🔹 Get all users who paid in a specific week
const getWeekPayments = async (req, res) => {
  try {
    const week = parseInt(req.params.weekNumber);
    const payments = await Payment.find({ week }).populate('userId', 'cardNumber name phone place').select('+screenshotPath');
    res.json(payments);
  } catch (err) {
    console.error('Error fetching week payments:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// 🔹 Get users who didn’t pay in a specific week
const getWeekDefaulters = async (req, res) => {
  try {
    const week = parseInt(req.params.weekNumber);
    const allUsers = await User.find();
    const paidUsers = await Payment.find({ week }).select('userId');
    const paidUserIds = paidUsers.map(p => p.userId.toString());
    const defaulters = allUsers.filter(u => !paidUserIds.includes(u._id.toString()));
    res.json(defaulters);
  } catch (err) {
    console.error('Error fetching defaulters:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// 🔹 Get full payment history of a user
const getUserPayments = async (req, res) => {
  try {
    // Explicitly select screenshotPath and populate user details
    const payments = await Payment.find({ userId: req.params.userId })
                                 .sort({ week: 1 })
                                 .populate('userId', 'name cardNumber phone place') 
                                 .select('+screenshotPath'); 

    res.json(payments);
  } catch (err) {
    console.error('Error fetching user payments:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// 🔴 Delete a payment by ID (admin only)
const deletePayment = async (req, res) => {
  try {
    const payment = await Payment.findByIdAndDelete(req.params.id);
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }
    try {
      await ActivityLog.create({
        actionType: 'delete',
        userId: payment.userId,
        amount: payment.amount,
        week: payment.week,
        mode: payment.mode,
        note: `Deleted week ${payment.week} payment`,
        screenshotUrl: payment.screenshotPath
      });
    } catch (logErr) {
      console.warn('⚠️ Logging delete failed:', logErr.message);
    }
    res.json({ message: '🗑️ Payment deleted successfully', payment });
  } catch (err) {
    console.error('Error deleting payment:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  addPaymentProof,
  addManualOrApprovedPayment,
  getWeekPayments,
  getWeekDefaulters,
  getUserPayments,
  deletePayment
};