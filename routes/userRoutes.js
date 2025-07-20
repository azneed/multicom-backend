// userRoutes.js

const express = require('express');
const router = express.Router();
const {
  registerUser,
  getUserById,
  generateOtp,
  verifyOtp,
  getUserProfile // Make sure getUserProfile is imported
} = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware'); // Make sure protect is imported

// 🔹 POST /api/users — Add new user
router.post('/', registerUser);

// ✅ NEW ROUTE: Generate OTP
router.post('/generate-otp', generateOtp);

// ✅ NEW ROUTE: Verify OTP and Login
router.post('/verify-otp', verifyOtp);

// ✅ CRITICAL FIX: Place the /profile route BEFORE the /:id route
// This ensures that when '/api/users/profile' is requested, it matches this specific route
// and calls getUserProfile, instead of the general /:id route.
// 🔹 GET /api/users/profile — Get logged-in user's profile
router.get('/profile', protect, getUserProfile);

// 🔹 GET /api/users — Get all users (This route is fine where it is)
router.get('/', async (req, res) => {
  try {
    const users = await User.find();
    res.status(200).json(users);
  } catch (err) {
    console.error('Error fetching users:', err.message);
    res.status(500).json({ message: 'Error fetching users' });
  }
});

// 🔹 GET /api/users/:id — Get user by ID (This must come AFTER /profile)
router.get('/:id', getUserById);


module.exports = router;