const https = require('https');
const jwt = require('jsonwebtoken');
const User = require('../models/User'); // Mongoose User model

const TWO_FACTOR_API_KEY = process.env.TWO_FACTOR_API_KEY;

async function sendOtpVia2Factor(phoneNumber, otp) {
  console.log(`[2F-INIT] Starting sendOtpVia2Factor function.`);
  try {
    const cleanPhoneNumber = phoneNumber.startsWith('+91') ? phoneNumber.substring(3) : phoneNumber;
    console.log(`[2F-DEBUG] Cleaned phone number: ${cleanPhoneNumber}`);

    const url = `https://2factor.in/API/V1/${TWO_FACTOR_API_KEY}/SMS/${cleanPhoneNumber}/${otp}`;

    console.log(`[2F-DEBUG] Attempting to send OTP via 2factor.in to: ${cleanPhoneNumber}`);
    // console.log(`[2F-DEBUG] 2factor.in API URL: ${url}`); // Still commented for API key security

    return new Promise((resolve, reject) => {
      console.log(`[2F-DEBUG] Inside Promise constructor for HTTPS GET.`);
      https.get(url, (res) => {
        console.log(`[2F-DEBUG] HTTPS GET response received. Status Code: ${res.statusCode}`);
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          console.log(`[2F-DEBUG] Raw 2factor.in API Response Data: ${data}`);
          try {
            const response = JSON.parse(data);
            console.log(`[2F-DEBUG] Parsed 2factor.in API Response:`, response);

            if (response && response.Status === 'Success') {
              console.log(`[2F-DEBUG] OTP send successful. Details: ${response.Details}`);
              resolve({ success: true, message: response.Details });
            } else {
              console.error(`[2F-ERROR] 2factor.in API returned non-success status. Status: ${response.Status}, Details: ${response.Details || data}`);
              reject(new Error(`2factor.in API Error: ${response.Details || 'Unknown error during OTP send.'}`));
            }
          } catch (jsonError) {
            console.error(`[2F-ERROR] Failed to parse 2factor.in API response:`, jsonError, `Raw data: ${data}`);
            reject(new Error('Invalid or unparseable response from 2factor.in API.'));
          }
        });
      }).on('error', (err) => {
        console.error(`[2F-ERROR] Error making HTTPS request to 2factor.in: ${err.message}`);
        reject(err);
      });
    });
  } catch (error) {
    console.error(`[2F-ERROR] Error in sendOtpVia2Factor function's outer catch block: ${error}`);
    throw error;
  }
}

exports.requestOtp = async (req, res) => {
  const { rawCardNumber, rawPhoneNumber } = req.body;
  if (!rawCardNumber || !rawPhoneNumber) {
    console.warn(`OTP Request: Missing card number or phone number.`);
    return res.status(400).json({ message: 'Card number and phone number are required.' });
  }
  const cardNumber = parseInt(rawCardNumber, 10);

  try {
    const user = await User.findOne({
      cardNumber: cardNumber,
      phone: rawPhoneNumber
    });
    if (!user) {
      console.warn(`OTP Request: User not found for Card: ${cardNumber}, Phone: ${rawPhoneNumber}`);
      return res.status(404).json({ message: 'User not found. Please check your card number and phone number.' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    console.log(`OTP Request: Generated OTP ${otp} for user ${user._id}`);

    await sendOtpVia2Factor(user.phone, otp);

    // --- CHANGE STARTS HERE ---
    // Update user's OTP fields in DB using the schema's 'otp' and 'otpExpires'
    const otpExpiryTime = new Date(Date.now() + 5 * 60 * 1000); // OTP valid for 5 minutes
    await User.updateOne(
      { _id: user._id },
      { $set: { otp: otp, otpExpires: otpExpiryTime } } // Use 'otp' and 'otpExpires'
    );
    console.log(`OTP Request: OTP ${otp} stored in DB for user ${user._id}. Expires at ${otpExpiryTime.toISOString()}`);
    // --- CHANGE ENDS HERE ---

    res.status(200).json({ message: 'OTP sent successfully to your registered phone number.' });

  } catch (error) {
    console.error('Error in requestOtp:', error);
    res.status(500).json({
      message: 'Failed to send OTP. An internal server error occurred.',
      details: error.message
    });
  }
};

exports.verifyOtp = async (req, res) => {
  const { rawCardNumber, rawPhoneNumber, submittedOtp } = req.body;
  if (!rawCardNumber || !rawPhoneNumber || !submittedOtp) {
    console.warn(`OTP Verification: Missing card number, phone number, or submitted OTP.`);
    return res.status(400).json({ message: 'Card number, phone number, and OTP are required.' });
  }
  try {
    const user = await User.findOne({
      cardNumber: parseInt(rawCardNumber, 10),
      phone: rawPhoneNumber
    });
    if (!user) {
      console.warn(`OTP Verification: User not found for Card: ${rawCardNumber}, Phone: ${rawPhoneNumber}`);
      return res.status(404).json({ message: 'User not found.' });
    }

    // --- CHANGE STARTS HERE ---
    // Check against the 'otp' field from the schema
    if (!user.otp || user.otp !== submittedOtp) {
      console.warn(`OTP Verification: Invalid OTP for user ${user._id}. Submitted: "${submittedOtp}", Stored: "${user.otp}"`);
      return res.status(401).json({ message: 'Invalid OTP.' });
    }

    // Check against the 'otpExpires' field from the schema
    const otpExpiryDate = user.otpExpires ? new Date(user.otpExpires) : null;
    if (!otpExpiryDate) {
      console.warn(`OTP Verification: OTP expiry timestamp missing for user ${user._id}.`);
      return res.status(401).json({ message: 'OTP data missing or invalid. Please request a new OTP.' });
    }

    const now = new Date();
    // Compare current time with otpExpires
    if (now.getTime() > otpExpiryDate.getTime()) {
      await User.updateOne(
        { _id: user._id },
        { $unset: { otp: "", otpExpires: "" } } // Clear expired OTP
      );
      console.warn(`OTP Verification: Expired OTP for user ${user._id}. Generated at ${otpExpiryDate.toISOString()}. Current time ${now.toISOString()}.`);
      return res.status(401).json({ message: 'OTP has expired. Please request a new one.' });
    }
    // --- CHANGE ENDS HERE ---

    const payload = {
        userId: user._id.toString(),
        cardNumber: user.cardNumber,
    };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
    console.log(`OTP Verification: Generated JWT for user ${user._id}.`);

    // Clear the OTP from the database after successful verification
    await User.updateOne(
      { _id: user._id },
      { $unset: { otp: "", otpExpires: "" } } // Clear OTP
    );
    console.log(`OTP Verification: OTP successfully verified and cleared for user ${user._id}.`);

    res.status(200).json({
      message: 'OTP verified successfully. User logged in.',
      token: token,
      user: {
          id: user._id.toString(),
          name: user.name,
          cardNumber: user.cardNumber
      }
    });
  } catch (error) {
    console.error('Error in verifyOtp:', error);
    res.status(500).json({
      message: 'Failed to verify OTP. An internal server error occurred.',
      details: error.message
    });
  }
};