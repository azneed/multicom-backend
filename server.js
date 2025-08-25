require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');
const userRoutes = require('./routes/userRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const reminderRoutes = require('./routes/reminderRoutes');
const schemeRoutes = require('./routes/schemeRoutes');
const pendingPaymentRoutes = require('./routes/pendingPaymentRoutes');
const activityRoutes = require('./routes/activityLogRoutes');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/adminRoutes');
const reportRoutes = require('./routes/reportRoutes');

const { protect } = require('./middleware/authMiddleware');
const app = express();

app.use(cors({
    origin: 'http://localhost:3000', // Adjust this to your frontend URL
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json()); // Body parser for JSON data
// ✅ REMOVED: app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // This line is removed for S3 migration

// --- Database Connection and Server Start (Unified with Mongoose) ---
connectDB();

const mongoose = require('mongoose');
mongoose.connection.once('open', () => {
    console.log('Mongoose connection established. Server starting...');

    // --- Define Routes ---
    app.use('/api/auth', authRoutes);
    app.use('/api/admin', adminRoutes);

    app.use('/api/users', userRoutes);
    app.use('/api/payments', protect, paymentRoutes);
    app.use('/api/reminders', protect, reminderRoutes);
    app.use('/api/scheme', protect, schemeRoutes);
    app.use('/api/pending', protect, pendingPaymentRoutes);
    app.use('/api/activity', protect, activityRoutes);
    app.use('/api/reports', protect, reportRoutes);

    app.get('/', (req, res) => {
        res.send('🎉 MULTICOM backend running successfully');
    });

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
    });
});

mongoose.connection.on('error', (err) => {
    console.error('Mongoose connection error:', err);
    process.exit(1);
});