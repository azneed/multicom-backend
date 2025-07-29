const express = require('express');
const router = express.Router();
const User = require('../models/User');
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
    const users = await User.find({}).sort({ cardNumber: 1 });
    res.status(200).json(users);
  } catch (err) {
    console.error('Error fetching users:', err.message);
    res.status(500).json({ message: 'Error fetching users' });
  }
});

// ✅ NEW ROUTE: Get user by card number (protected and admin-only)
router.get('/by-card/:cardNumber', protect, admin, async (req, res) => {
  try {
    const user = await User.findOne({ cardNumber: parseInt(req.params.cardNumber, 10) }); // Ensure base 10 parsing
    if (!user) {
      return res.status(404).json({ message: 'User not found for this card number.' });
    }
    res.json(user);
  } catch (err) {
    console.error('Error fetching user by card number:', err.message);
    res.status(500).json({ message: 'Server error fetching user by card number' });
  }
});

// 🔹 GET /api/users/:id — Get user by ID (This must come AFTER /profile, also protected and admin-only)
router.get('/:id', protect, admin, getUserById);

// ✅ NEW ROUTE: PUT /api/users/:id — Update any user's profile by Admin
router.put('/:id', protect, admin, updateUserByAdmin);

module.exports = router;