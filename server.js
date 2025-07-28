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
const adminRoutes = require('./routes/adminRoutes'); // <--- ADD THIS LINE
const { protect } = require('./middleware/authMiddleware');
const app = express();

app.use(cors({
    origin: 'http://localhost:3000', // Adjust this to your frontend URL
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json()); // Body parser for JSON data
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // Serve static files

// --- Database Connection and Server Start (Unified with Mongoose) ---
// Call connectDB to initiate the Mongoose connection
connectDB();

// Wait for Mongoose to successfully connect before starting the server
const mongoose = require('mongoose'); // Need to require mongoose here to access its connection events
mongoose.connection.once('open', () => {
    console.log('Mongoose connection established. Server starting...');

    // --- Define Routes ---
    // Unprotected Auth Routes
    app.use('/api/auth', authRoutes); // Authentication routes (login, register, OTP) are generally public
    app.use('/api/admin', adminRoutes); // <--- ADD THIS LINE FOR ADMIN ROUTES

    // Protected Routes - apply 'protect' middleware to secure these endpoints
    // These routes will now use Mongoose models directly
    app.use('/api/users', userRoutes);

    app.use('/api/payments', protect, paymentRoutes);
    app.use('/api/reminders', protect, reminderRoutes);
    app.use('/api/scheme', protect, schemeRoutes);
    app.use('/api/pending', protect, pendingPaymentRoutes);
    app.use('/api/activity', protect, activityRoutes);

    // Simple root route
    app.get('/', (req, res) => {
        res.send('🎉 MULTICOM backend running successfully');
    });

    // Start the Express server
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
    });
});

// Handle Mongoose connection errors
mongoose.connection.on('error', (err) => {
    console.error('Mongoose connection error:', err);
    process.exit(1); // Exit if DB connection fails
});