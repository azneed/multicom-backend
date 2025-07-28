const jwt = require('jsonwebtoken');
const User = require('../models/User'); // Import User model
const Admin = require('../models/Admin'); // Import Admin model

// Main protection middleware: Authenticates token and identifies user/admin
const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Try to find as a regular User
      if (decoded.userId) { // Assuming user token payload contains 'userId'
        const user = await User.findById(decoded.userId).select('-password -otp -otpExpires');
        if (user) {
          req.user = user; // Attach full user object to req
          return next(); // User authenticated
        }
      }

      // If not a User, try to find as an Admin
      if (decoded.id) { // Assuming admin token payload contains 'id' (as set in adminController)
        const admin = await Admin.findById(decoded.id).select('-password'); // Attach full admin object
        if (admin) {
          req.admin = admin; // Attach full admin object to req
          return next(); // Admin authenticated
        }
      }

      // If token was present but neither a user nor admin could be found/verified
      res.status(401).json({ message: 'Not authorized, token invalid or type not recognized' });

    } catch (error) {
      console.error('Auth middleware error:', error.message);
      // Specific error messages for debugging
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Not authorized, token expired' });
      }
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({ message: 'Not authorized, invalid token' });
      }
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token provided' });
  }
};

// Middleware to specifically check for admin role
const admin = (req, res, next) => {
  if (req.admin && (req.admin.role === 'admin' || req.admin.role === 'superadmin')) {
    next(); // Authorized as admin
  } else {
    res.status(403).json({ message: 'Not authorized as an admin' }); // Forbidden
  }
};

module.exports = { protect, admin };