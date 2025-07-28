const Admin = require('../models/Admin');
const jwt = require('jsonwebtoken'); // Assuming you use JWT for admin sessions

// Helper to generate JWT token
const generateAdminToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { // Use your JWT_SECRET from .env
    expiresIn: '1h', // Token valid for 1 hour
  });
};

// @desc    Authenticate admin & get token
// @route   POST /api/admin/login
// @access  Public
const adminLogin = async (req, res) => {
  const { username, password } = req.body;

  // Check if admin exists
  const admin = await Admin.findOne({ username });

  if (admin && (await admin.matchPassword(password))) {
    res.json({
      _id: admin._id,
      username: admin.username,
      role: admin.role,
      token: generateAdminToken(admin._id),
    });
  } else {
    res.status(401).json({ message: 'Invalid credentials' }); // Unauthorized
  }
};

// @desc    Register a new admin (FOR INITIAL SETUP ONLY - REMOVE/PROTECT AFTER FIRST ADMIN CREATED)
// @route   POST /api/admin/register
// @access  Public (for initial setup)
const registerAdmin = async (req, res) => {
  const { username, password, role } = req.body;

  const adminExists = await Admin.findOne({ username });

  if (adminExists) {
    return res.status(400).json({ message: 'Admin already exists' });
  }

  const admin = await Admin.create({
    username,
    password,
    role, // Optionally allow setting role during registration
  });

  if (admin) {
    res.status(201).json({
      _id: admin._id,
      username: admin.username,
      role: admin.role,
      token: generateAdminToken(admin._id),
    });
  } else {
    res.status(400).json({ message: 'Invalid admin data' });
  }
};


module.exports = {
  adminLogin,
  registerAdmin, // Remember to remove or protect this route after initial admin creation
};