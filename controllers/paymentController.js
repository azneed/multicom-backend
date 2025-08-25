const Payment = require('../models/Payment');
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');
const PendingPayment = require('../models/PendingPayment');

const { S3Client, DeleteObjectCommand } = require('@aws-sdk/client-s3');

const s3 = new S3Client({
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  region: process.env.AWS_REGION
});

const addPaymentProof = async (req, res) => {
  try {
    const { userId, amount, mode, week } = req.body;
    if (!userId || !amount || !mode) {
      return res.status(400).json({ message: 'Missing required fields: userId, amount, and mode.' });
    }
    if (!req.file || !req.file.location) {
      return res.status(400).json({ message: 'Payment screenshot is required for this transaction.' });
    }
    const pendingPayment = new PendingPayment({
      userId,
      amount: parseInt(amount),
      mode,
      screenshotUrl: req.file.location,
      week: parseInt(week)
    });
    await pendingPayment.save();
    try {
      await ActivityLog.create({
        actionType: 'user_uploaded_for_review',
        userId,
        amount: parseInt(amount),
        mode,
        note: `User uploaded payment for review. Amount: ${amount}, Mode: ${mode}`,
        screenshotUrl: req.file.location
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

const addManualOrApprovedPayment = async (req, res) => {
  try {
    const { userId, amount, mode, week: startWeek, screenshotUrl, pendingPaymentId } = req.body;

    if (!userId || !amount || !mode || !startWeek) {
      return res.status(400).json({ message: 'Missing required fields: userId, amount, mode, and startWeek.' });
    }

    const parsedAmount = parseInt(amount);
    const numWeeks = parsedAmount / 100;

    if (parsedAmount % 100 !== 0 || numWeeks < 1) {
        return res.status(400).json({ message: 'Amount must be a multiple of 100 and at least 100.' });
    }

    const createdPayments = [];
    let currentWeek = parseInt(startWeek);

    for (let i = 0; i < numWeeks; i++) {
        const payment = new Payment({
            userId,
            amount: 100,
            mode,
            week: currentWeek,
            screenshotUrl: screenshotUrl
        });
        await payment.save();
        createdPayments.push(payment);
        currentWeek++;
    }

    try {
      await ActivityLog.create({
        actionType: pendingPaymentId ? 'approve' : 'manual',
        userId,
        amount: parsedAmount,
        mode,
        week: parseInt(startWeek),
        note: pendingPaymentId ? `Approved payment for ${numWeeks} week(s) starting from week ${startWeek}.` : `Admin manually added payment for ${numWeeks} week(s) starting from week ${startWeek}.`,
        screenshotUrl: screenshotUrl
      });
    } catch (logErr) {
      console.warn('⚠️ Activity logging failed for payment approval/manual add:', logErr.message);
    }

    if (pendingPaymentId) {
      return { message: `Payment successfully added/approved for ${numWeeks} week(s).`, payments: createdPayments };
    }

    res.status(201).json({
      message: `Payment successfully added for ${numWeeks} week(s).`,
      payments: createdPayments
    });

  } catch (err) {
    console.error('❌ Error in addManualOrApprovedPayment (admin action):', err.message);
    res.status(500).json({ message: 'Server error during payment add/approval.' });
  }
};


const getWeekPayments = async (req, res) => {
  try {
    const week = parseInt(req.params.weekNumber);
    const payments = await Payment.find({ week }).populate('userId', 'cardNumber name phone place').select('screenshotUrl');
    res.json(payments);
  } catch (err) {
    console.error('Error fetching week payments:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

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

// ... (rest of the file)

// 🔹 Get full payment history of a user
const getUserPayments = async (req, res) => {
  try {
    const requestedUserId = req.params.userId;

    if (req.user && req.user._id.toString() !== requestedUserId) {
        return res.status(403).json({ message: 'Not authorized to view other users\' payments.' });
    }

    // ✅ FIX: Explicitly select 'createdAt' field here.
    const payments = await Payment.find({ userId: requestedUserId })
                                 .sort({ week: 1 })
                                 .populate('userId', 'name cardNumber phone place')
                                 .select('week amount mode screenshotUrl createdAt'); // Ensure 'createdAt' is selected

    res.json(payments);
  } catch (err) {
    console.error('Error fetching user payments:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// ... (rest of the file)
const deletePayment = async (req, res) => {
  try {
    const payment = await Payment.findByIdAndDelete(req.params.id);
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    if (payment.screenshotUrl && payment.screenshotUrl.startsWith(`https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/`)) {
        const key = payment.screenshotUrl.split(`https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/`)[1];
        const params = {
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: key
        };
        await s3.send(new DeleteObjectCommand(params));
        console.log('Successfully deleted object from S3.');
    }

    try {
      await ActivityLog.create({
        actionType: 'delete',
        userId: payment.userId,
        amount: payment.amount,
        week: payment.week,
        mode: payment.mode,
        note: `Deleted week ${payment.week} payment`,
        screenshotUrl: payment.screenshotUrl
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

const getRecentPayments = async (req, res) => {
  try {
    const limit = parseInt(req.params.limit, 10);
    if (isNaN(limit) || limit <= 0) {
      return res.status(400).json({ message: 'Limit must be a positive number.' });
    }
    // ✅ FIX: Populate userId directly here to get user details in the result.
    // Remove .lean() initially so populate works, then use .map() to make it lean if needed.
    const recentPayments = await Payment.find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('userId', 'name cardNumber') // Populate name and cardNumber
      .select('amount mode week createdAt screenshotUrl'); // Explicitly select required payment fields

    // Now, map to ensure we get a plain object and proper user details
    const paymentsWithUserDetails = recentPayments.map(payment => {
      // payment.userId will now be the populated user object, or null if user not found
      const userName = payment.userId ? payment.userId.name : 'Unknown User';
      const userCardNumber = payment.userId ? payment.userId.cardNumber : 'N/A';

      // Convert Mongoose document to plain object, then add custom fields
      return {
        ...payment.toObject(), // Convert to plain object
        userName,
        userCardNumber
      };
    });

    res.json(paymentsWithUserDetails);
  } catch (error) {
    console.error('Error fetching recent payments:', error.message);
    res.status(500).json({ message: 'Server error fetching recent payments' });
  }
};

module.exports = {
  addPaymentProof,
  addManualOrApprovedPayment,
  getWeekPayments,
  getWeekDefaulters,
  getUserPayments,
  deletePayment,
  getRecentPayments,
};