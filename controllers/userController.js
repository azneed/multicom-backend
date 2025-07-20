const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');
const jwt = require('jsonwebtoken'); // Import jsonwebtoken here
const https = require('https'); // Import the https module
const { parsePhoneNumberFromString } = require('libphonenumber-js');

// 🔹 Register a new participant
const registerUser = async (req, res) => {
    try {
        const { cardNumber: rawCardNumber, name, phone, place } = req.body;
        const cardNumber = parseInt(rawCardNumber, 10);

        if (isNaN(cardNumber)) {
            return res.status(400).json({ message: 'Card number must be a valid number.' });
        }
        if (!name || !phone || !place) {
            return res.status(400).json({ message: 'Name, phone, and place are required fields.' });
        }

        const existingUser = await User.findOne({ cardNumber });
        if (existingUser) {
            return res.status(400).json({ message: 'Card number already registered' });
        }

        const existingPhoneUser = await User.findOne({ phone });
        if (existingPhoneUser) {
            return res.status(400).json({ message: 'Phone number already registered' });
        }

        const user = new User({ cardNumber, name, phone, place });
        await user.save();

        await ActivityLog.create({
            actionType: 'register',
            userId: user._id,
            amount: 0,
            mode: 'manual',
            note: `User ${name} (${cardNumber}) registered`
        });

        res.status(201).json({ message: 'User registered successfully', user });

    } catch (error) {
        console.error('Error registering user:', error.message);
        res.status(500).json({ message: 'Server error' });
    }
};

// 🔹 Generate OTP for user (using cardNumber and phone)
const generateOtp = async (req, res) => {
    try {
        const { cardNumber, phone } = req.body;

        const user = await User.findOne({ cardNumber, phone });

        if (!user) {
            return res.status(404).json({ message: 'User not found with provided card number and phone.' });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // OTP valid for 10 minutes

        user.otp = otp;
        user.otpExpires = otpExpires;
        await user.save();

        console.log(`Generated OTP for ${phone} (Card: ${cardNumber}): ${otp}`); // Log OTP for now

        // ✅ --- 2FACTOR.IN INTEGRATION ---
        const twoFactorApiKey = process.env.TWO_FACTOR_API_KEY; // Store this in .env!

        if (!twoFactorApiKey) {
            console.error('2factor.in API key not found in environment variables.');
            return res.status(500).json({ message: 'Failed to send OTP: API key missing.' });
        }

        //✅---PHONE NUMBER VALIDATION AND FORMATTING---
        const phoneNumber = parsePhoneNumberFromString(phone, 'IN');

        if (!phoneNumber || !phoneNumber.isValid()) {
            console.error('Invalid phone number:', phone);
            return res.status(400).json({ message: 'Invalid phone number format.' });
        }

        const formattedPhoneNumber = phoneNumber.number.toString()
        const twoFactorApiUrl = `https://2factor.in/API/V1/${twoFactorApiKey}/SMS/${formattedPhoneNumber}/${otp}`;

        https.get(twoFactorApiUrl, (apiRes) => {
            let data = '';

            apiRes.on('data', (chunk) => {
                data += chunk;
            });

            apiRes.on('end', () => {
                console.log('2factor.in API Response:', data); // Log the raw API response
                try {
                    const parsedData = JSON.parse(data);

                    if (parsedData.Status === 'Success') {
                        console.log('OTP sent successfully via 2factor.in');
                        res.status(200).json({ message: 'OTP generated and sent to your phone.' }); // Success message
                    } else {
                        console.error('2factor.in API Error:', parsedData);
                        res.status(500).json({ message: 'Failed to send OTP via SMS. Please check the logs.' }); // More specific error
                    }
                } catch (parseError) {
                    console.error('Error parsing 2factor.in API response:', parseError);
                    res.status(500).json({ message: 'Failed to send OTP due to a problem parsing the SMS response.' });
                }
            });
        }).on('error', (apiErr) => {
            console.error('2factor.in API Request Error:', apiErr.message);
            res.status(500).json({ message: 'Failed to send OTP due to a network error.' }); // Network error
        });
        // ✅ --- END 2FACTOR.IN INTEGRATION ---

    } catch (error) {
        console.error('Error generating OTP:', error.message);
        res.status(500).json({ message: 'Server error' });
    }
};

// 🔹 Verify OTP for user and return JWT
const verifyOtp = async (req, res) => {
    try {
        const { cardNumber, phone, otp } = req.body;

        const user = await User.findOne({ cardNumber, phone });

        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        if (user.otp !== otp || user.otpExpires < new Date()) {
            return res.status(400).json({ message: 'Invalid or expired OTP.' });
        }

        user.otp = null; // Clear OTP after successful verification
        user.otpExpires = null;
        await user.save();

        // Generate JWT (since no separate generateToken.js)
        const token = jwt.sign({ userId: user._id, cardNumber: user.cardNumber }, process.env.JWT_SECRET, {
            expiresIn: '1h', // Token expires in 1 hour
        });

        res.status(200).json({
            message: 'OTP verified successfully',
            token,
            _id: user._id,
            cardNumber: user.cardNumber,
            name: user.name,
            phone: user.phone,
        });

    } catch (error) {
        console.error('Error verifying OTP:', error.message);
        res.status(500).json({ message: 'Server error' });
    }
};

// 🔹 Get user by ID (for profile - existing function)
const getUserById = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json(user);
    } catch (error) {
        console.error('Error fetching user:', error.message);
        res.status(500).json({ message: 'Server error' });
    }
};

// 🔹 Get logged-in user's profile (NEW FUNCTION for /api/users/profile)
const getUserProfile = async (req, res) => {
    try {
        // req.user.userId is set by the protect middleware from the JWT payload (_id)
        const user = await User.findById(req.user.userId).select('-otp -otpExpires'); // Exclude sensitive fields

        if (!user) {
            return res.status(404).json({ message: 'User profile not found.' });
        }

        res.json({
            _id: user._id,
            cardNumber: user.cardNumber,
            name: user.name,
            phone: user.phone,
            place: user.place,
            schemeId: user.schemeId,
            registeredAt: user.registeredAt,
            // Include any other fields from your User model that you want in the profile
        });

    } catch (error) {
        console.error('Error fetching user profile:', error.message);
        res.status(500).json({ message: 'Server error' });
    }
};


module.exports = {
    registerUser,
    generateOtp, // ✅ Add this
    verifyOtp,   // ✅ Add this
    getUserById,
    getUserProfile // ✅ Add this
};