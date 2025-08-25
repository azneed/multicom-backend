const Payment = require('../models/Payment');
const PendingPayment = require('../models/PendingPayment');
const User = require('../models/User'); // Needed to get user names/card numbers if required for reports

// Helper to get start/end of day/week/month
const getDates = (filter) => {
  const now = new Date();
  let startDate, endDate;

  switch (filter) {
    case 'today':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1); // Up to start of next day
      break;
    case 'thisWeek': // Assuming week starts on Monday
      const dayOfWeek = now.getDay(); // 0 for Sunday, 1 for Monday
      const diffToMonday = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Adjust for Sunday
      startDate = new Date(now.getFullYear(), now.getMonth(), diffToMonday);
      startDate.setHours(0, 0, 0, 0); // Start of Monday
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 7); // End of next Sunday
      break;
    case 'thisMonth':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      break;
    default: // Custom range or no filter provided
      startDate = new Date(0); // Epoch start
      endDate = now; // Now
  }
  return { startDate, endDate };
};

// @desc    Get aggregated payments received report
// @route   GET /api/reports/payments-received
// @access  Admin
const getPaymentsReceivedReport = async (req, res) => {
  try {
    const { filter, startDate: customStartDate, endDate: customEndDate } = req.query;
    let startDate, endDate;

    if (filter) {
      ({ startDate, endDate } = getDates(filter));
    } else if (customStartDate && customEndDate) {
      startDate = new Date(customStartDate);
      endDate = new Date(customEndDate);
    } else {
      ({ startDate, endDate } = getDates('all')); // Default to all time or a reasonable range
    }

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return res.status(400).json({ message: "Invalid date format provided." });
    }

    // Payments received within the date range
    const payments = await Payment.find({
      createdAt: { $gte: startDate, $lt: endDate }
    });

    const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);
    const totalPayments = payments.length;

    // Group payments by day for "per day" view if the range is short enough (e.g., this week)
    const dailyBreakdown = {};
    payments.forEach(p => {
      const dateKey = new Date(p.createdAt).toISOString().split('T')[0]; // YYYY-MM-DD
      if (!dailyBreakdown[dateKey]) {
        dailyBreakdown[dateKey] = { totalAmount: 0, count: 0 };
      }
      dailyBreakdown[dateKey].totalAmount += p.amount;
      dailyBreakdown[dateKey].count++;
    });

    res.json({
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      totalAmount,
      totalPayments,
      dailyBreakdown: dailyBreakdown // Send daily breakdown for analysis on frontend
    });

  } catch (error) {
    console.error('Error fetching payments received report:', error.message);
    res.status(500).json({ message: 'Server error fetching payments received report' });
  }
};

// @desc    Get aggregated pending payments report
// @route   GET /api/reports/pending-payments
// @access  Admin
const getPendingPaymentsReport = async (req, res) => {
  try {
    // This report is usually for future or outstanding payments, so no date range filter needed for 'received'
    // but we can break it down by week/month for upcoming dues.

    // Find all pending payments (those that haven't been approved/processed)
    // Note: If you distinguish between "pending" (awaiting approval) and "outstanding" (due but not paid),
    // this will only fetch 'pending' ones. For 'outstanding', you'd query your Users/Payments for defaulters.
    const pendingPayments = await PendingPayment.find({});

    const totalPendingAmount = pendingPayments.reduce((sum, p) => sum + p.amount, 0);
    const totalPendingCount = pendingPayments.length;

    // You can also aggregate by userId to see how many pending payments per user
    const pendingByUser = {};
    for (const pp of pendingPayments) {
      if (!pendingByUser[pp.userId]) {
        const user = await User.findById(pp.userId).select('name cardNumber');
        pendingByUser[pp.userId] = {
          userName: user ? user.name : 'Unknown',
          userCardNumber: user ? user.cardNumber : 'N/A',
          totalAmount: 0,
          count: 0,
          details: []
        };
      }
      pendingByUser[pp.userId].totalAmount += pp.amount;
      pendingByUser[pp.userId].count++;
      pendingByUser[pp.userId].details.push({
        _id: pp._id,
        amount: pp.amount,
        mode: pp.mode,
        week: pp.week, // Assuming PendingPayment has a 'week' field
        screenshotUrl: pp.screenshotUrl,
        createdAt: pp.createdAt
      });
    }

    res.json({
      totalPendingAmount,
      totalPendingCount,
      pendingByUser: Object.values(pendingByUser) // Convert to array for easier frontend mapping
    });

  } catch (error) {
    console.error('Error fetching pending payments report:', error.message);
    res.status(500).json({ message: 'Server error fetching pending payments report' });
  }
};


module.exports = {
  getPaymentsReceivedReport,
  getPendingPaymentsReport,
};