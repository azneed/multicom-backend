const express = require('express');
const router = express.Router();
const { adminLogin, registerAdmin } = require('../controllers/adminController');

// Admin Login
router.post('/login', adminLogin);

// Admin Registration (ONLY FOR INITIAL SETUP - REMOVE OR PROTECT LATER)
router.post('/register', registerAdmin);

module.exports = router;