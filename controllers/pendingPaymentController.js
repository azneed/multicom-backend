const PendingPayment = require('../models/PendingPayment');
const Payment = require('../models/Payment');
const User = require('../models/User'); // Not directly used in this controller's logic, but fine to keep.
const ActivityLog = require('../models/ActivityLog');
const PaymentController = require('./paymentController');

// ✅ UPDATED: Import S3Client from AWS SDK v3
const { S3Client, DeleteObjectCommand } = require('@aws-sdk/client-s3'); // Added DeleteObjectCommand
// ✅ REMOVED: const aws = require('aws-sdk'); // No longer needed for S3 operations
// ✅ REMOVED: aws.config.update... // Config will be passed directly to S3Client

// ✅ UPDATED: Configure S3Client with explicit credentials and region for v3
const s3 = new S3Client({
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  region: process.env.AWS_REGION
});

// 🔹 User uploads payment proof (this is called by pendingPaymentRoutes via Multer)
const uploadProof = async (req, res) => {
  try {
    const { userId, amount, mode, week } = req.body;
    const screenshotUrl = req.file?.location;

    if (!userId || !amount || !screenshotUrl || !week) {
      return res.status(400).json({ message: 'Missing fields: userId, amount, week, and screenshot.' });
    }

    const pending = new PendingPayment({
      userId,
      amount: parseInt(amount),
      mode,
      screenshotUrl,
      week: parseInt(week)
    });

    await pending.save();

    try {
      await ActivityLog.create({
        actionType: 'user_uploaded_for_review',
        userId,
        amount: parseInt(amount),
        mode,
        note: `User uploaded payment for review. Amount: ${amount}, Mode: ${mode}`,
        screenshotUrl
      });
    } catch (logErr) {
      console.warn('⚠️ Activity logging failed for pending payment:', logErr.message);
    }

    res.status(201).json({ message: 'Pending payment saved for review.' });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ message: 'Server error during upload.' });
  }
};

// 🔹 Get all pending payments for admin review
const getAllPendingPayments = async (req, res) => {
  try {
    // ✅ FIX: Remove .select('screenshotUrl') to include all fields,
    // or specify all fields you need: 'amount mode week userId screenshotUrl'
    const pending = await PendingPayment.find().populate('userId', 'name cardNumber phone'); // Removed .select('screenshotUrl')
    res.json(pending);
  } catch (err) {
    res.status(500).json({ message: 'Error loading pending payments' });
  }
};

// 🟢 Admin approves a pending payment
const approvePendingPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const pending = await PendingPayment.findById(id);

    if (!pending) return res.status(404).json({ message: 'Pending payment not found' });

    const paidWeeks = await Payment.find({ userId: pending.userId }).select('week').lean();
    const paidNumbers = paidWeeks.map(p => p.week);
    let nextWeek = null;
    for (let i = 1; i <= 60; i++) {
        if (!paidNumbers.includes(i)) {
            nextWeek = i;
            break;
        }
    }
    if (!nextWeek) {
        return res.status(400).json({ message: 'All 60 weeks already paid for this user, cannot approve new payment.' });
    }

    // Call addManualOrApprovedPayment and get its returned value.
    // Ensure `addManualOrApprovedPayment` returns a promise if it's async
    // and its 'res' parameter (which is null here) is handled gracefully by that function.
    const result = await PaymentController.addManualOrApprovedPayment(
        { body: { // Simulate req.body
            userId: pending.userId,
            amount: parseInt(pending.amount),
            mode: pending.mode,
            week: nextWeek,
            screenshotUrl: pending.screenshotUrl,
            pendingPaymentId: pending._id
        }},
        // Passing null for `res` here means addManualOrApprovedPayment must
        // NOT attempt to send an HTTP response if it's called from here.
        // It should just return the data. Your current addManualOrApprovedPayment
        // already handles this with an `if (pendingPaymentId) return { ... }` block.
        null
    );

    await PendingPayment.findByIdAndDelete(id);
    console.log(`Pending payment ${id} deleted after approval.`);

    res.status(200).json({ message: result.message, payments: result.payments });

  } catch (err) {
    console.error('Approval error in pendingPaymentController:', err);
    res.status(500).json({ message: 'Approval failed: ' + (err.message || 'Server error.') });
  }
};

// 🔴 Admin rejects a pending payment
const rejectPendingPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const pending = await PendingPayment.findById(id);
    if (!pending) return res.status(404).json({ message: 'Pending payment not found' });

    try {
      await ActivityLog.create({
        actionType: 'reject',
        userId: pending.userId,
        amount: pending.amount,
        mode: pending.mode,
        note: `Rejected pending payment.`,
        screenshotUrl: pending.screenshotUrl
      });
    } catch (logErr) {
      console.warn('⚠️ Activity logging failed for rejection:', logErr.message);
    }

    // ✅ UPDATED: Use S3Client (v3) and DeleteObjectCommand
    if (pending.screenshotUrl && pending.screenshotUrl.startsWith(`https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/`)) {
      const key = pending.screenshotUrl.split(`https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/`)[1];
      const params = {
          Bucket: process.env.AWS_BUCKET_NAME, // Changed to AWS_BUCKET_NAME for consistency
          Key: key
      };
      // ✅ Use s3.send with DeleteObjectCommand for AWS SDK v3
      await s3.send(new DeleteObjectCommand(params));
      console.log('Successfully deleted object from S3.');
    }

    await PendingPayment.findByIdAndDelete(id);
    res.status(200).json({ message: 'Rejected and deleted' });

  } catch (err) {
    console.error('Rejection error:', err);
    res.status(500).json({ message: 'Rejection failed: ' + (err.message || 'Server error.') });
  }
};

module.exports = {
  uploadProof,
  getAllPendingPayments,
  approvePendingPayment,
  rejectPendingPayment
};