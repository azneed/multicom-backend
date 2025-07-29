const express = require('express');
const router = express.Router();
const User = require('../models/User'); // ADD THIS LINE TO IMPORT USER MODEL
const {
  registerUser,
  getUserById,
  generateOtp,
  verifyOtp,
  getUserProfile,
  updateUserProfile,
  updateUserByAdmin
} = require('../controllers/userController');
const { protect, admin } = require('../middleware/authMiddleware');

// 🔹 POST /api/users — Add new user (This is typically for public registration)
router.post('/', registerUser);

// ✅ NEW ROUTE: Generate OTP
router.post('/generate-otp', generateOtp);

// ✅ NEW ROUTE: Verify OTP and Login
router.post('/verify-otp', verifyOtp);

// 🔹 GET /api/users/profile — Get logged-in user's profile (protected for the user themselves)
router.get('/profile', protect, getUserProfile);

// ✅ NEW ROUTE: PUT /api/users/profile — Update logged-in user's own profile
router.put('/profile', protect, updateUserProfile);

// 🔹 GET /api/users — Get all users (This route should be protected and admin-only)
// This is the route that AdminDashboard's UsersList component calls
router.get('/', protect, admin, async (req, res) => {
  try {
    // ✅ MODIFIED: Add .sort({ cardNumber: 1 }) to sort by cardNumber ascending
    const users = await User.find({}).sort({ cardNumber: 1 });
    res.status(200).json(users);
  } catch (err) {
    console.error('Error fetching users:', err.message);
    res.status(500).json({ message: 'Error fetching users' });
  }
});

// 🔹 GET /api/users/:id — Get user by ID (This must come AFTER /profile, also protected and admin-only)
router.get('/:id', protect, admin, getUserById);

// ✅ NEW ROUTE: PUT /api/users/:id — Update any user's profile by Admin
router.put('/:id', protect, admin, updateUserByAdmin);

module.exports = router;