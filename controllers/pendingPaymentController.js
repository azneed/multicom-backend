const PendingPayment = require('../models/PendingPayment');
const Payment = require('../models/Payment'); // Needed for nextWeek calculation
const User = require('../models/User'); // Not directly used in this controller now
const ActivityLog = require('../models/ActivityLog'); // Mongoose MODEL
const fs = require('fs');
const path = require('path');

const PaymentController = require('./paymentController'); // Import paymentController

// 🔹 User uploads payment proof
const uploadProof = async (req, res) => {
  try {
    const { userId, amount, mode, week } = req.body;
    const screenshotUrl = req.file?.filename || req.file?.path;

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
    const pending = await PendingPayment.find().populate('userId', 'name cardNumber phone');
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

    // Calculate the next available week based on existing payments for this user
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
    const result = await PaymentController.addManualOrApprovedPayment( 
        { body: { // Simulate req.body
            userId: pending.userId,
            amount: parseInt(pending.amount), // Pass the original total amount
            mode: pending.mode,
            week: nextWeek, // Pass the calculated starting week
            screenshotPath: pending.screenshotUrl, 
            pendingPaymentId: pending._id 
        }},
        null // Pass null for res, as we don't want addManualOrApprovedPayment to send response
    );

    // Delete the pending payment after successful creation of actual Payment.
    await PendingPayment.findByIdAndDelete(id);
    console.log(`Pending payment ${id} deleted after approval.`);

    // Send the final success response from this controller.
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

    if (pending.screenshotUrl) {
      const filename = path.basename(pending.screenshotUrl);
      const filePath = path.join(__dirname, '..', 'uploads', filename);
      fs.unlink(filePath, err => {
        if (err) {
          console.error('Error deleting image file:', err.message);
        }
      });
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