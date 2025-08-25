// multicom-backend/controllers/authController.js
const https = require('https');
const jwt = require('jsonwebtoken');
const User = require('../models/User'); // Mongoose User model

const TWO_FACTOR_API_KEY = process.env.TWO_FACTOR_API_KEY;

// TEMPORARY: Verify API Key is loaded
console.log('Backend AuthController Loaded. TWO_FACTOR_API_KEY (first 5 chars):', TWO_FACTOR_API_KEY ? TWO_FACTOR_API_KEY.substring(0, 5) + '...' : 'NOT SET');

async function sendOtpVia2Factor(phoneNumber, otp) {
  console.log(`[2F-INIT] Starting sendOtpVia2Factor function.`);
  try {
    const cleanPhoneNumber = phoneNumber.startsWith('+91') ? phoneNumber.substring(3) : phoneNumber;
    console.log(`[2F-DEBUG] Cleaned phone number: ${cleanPhoneNumber}, OTP: ${otp}`);

    const url = `https://2factor.in/API/V1/${TWO_FACTOR_API_KEY}/SMS/${cleanPhoneNumber}/${otp}`;
    console.log(`[2F-DEBUG] 2factor.in API URL (DEBUG): ${url}`); // TEMPORARY: SHOW FULL URL FOR DEBUGGING

    return new Promise((resolve, reject) => {
      console.log(`[2F-DEBUG] Initiating HTTPS GET request.`);
      const req = https.get(url, (res) => {
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
              reject(new Error(`2factor.in API returned error: ${response.Details || 'Unknown error. Raw response: ' + data}`));
            }
          } catch (jsonError) {
            console.error(`[2F-ERROR] Failed to parse 2factor.in API response:`, jsonError, `Raw data: ${data}`);
            reject(new Error('Invalid or unparseable response from 2factor.in API. Check backend logs for raw data.'));
          }
        });
      }).on('error', (err) => {
        console.error(`[2F-ERROR] Error making HTTPS request to 2factor.in: ${err.message}`);
        reject(new Error(`Network or HTTPS error contacting 2factor.in: ${err.message}. Check firewall/connectivity.`));
      });

      req.setTimeout(10000, () => {
        req.destroy(new Error('Request to 2factor.in timed out.'));
        console.error('[2F-ERROR] Request to 2factor.in timed out.');
      });
    });
  } catch (error) {
    console.error(`[2F-ERROR] Error in sendOtpVia2Factor function's outer catch block: ${error}`);
    throw error;
  }
}

exports.requestOtp = async (req, res) => {
  // ✅ FIX: Changed from rawCardNumber, rawPhoneNumber to cardNumber, phone
  const { cardNumber, phone } = req.body;
  if (!cardNumber || !phone) {
    console.warn(`OTP Request: Missing card number or phone number.`);
    return res.status(400).json({ message: 'Card number and phone number are required.' });
  }
  // No need to parseInt here, as frontend is already sending it as a number
  // const parsedCardNumber = parseInt(cardNumber, 10); // Not needed if frontend sends number

  try {
    const user = await User.findOne({
      cardNumber: cardNumber, // Use directly
      phone: phone // Use directly
    });
    if (!user) {
      console.warn(`OTP Request: User not found for Card: ${cardNumber}, Phone: ${phone}`);
      return res.status(404).json({ message: 'User not found. Please check your card number and phone number.' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    console.log(`OTP Request: Generated OTP ${otp} for user ${user._id}`);

    await sendOtpVia2Factor(user.phone, otp);

    const otpExpiryTime = new Date(Date.now() + 5 * 60 * 1000); // OTP valid for 5 minutes
    await User.updateOne(
      { _id: user._id },
      { $set: { otp: otp, otpExpires: otpExpiryTime } }
    );
    console.log(`OTP Request: OTP ${otp} stored in DB for user ${user._id}. Expires at ${otpExpiryTime.toISOString()}`);

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
  // ✅ FIX: Changed from rawCardNumber, rawPhoneNumber to cardNumber, phone
  const { cardNumber, phone, submittedOtp } = req.body;
  if (!cardNumber || !phone || !submittedOtp) {
    console.warn(`OTP Verification: Missing card number, phone number, or submitted OTP.`);
    return res.status(400).json({ message: 'Card number, phone number, and OTP are required.' });
  }
  try {
    const user = await User.findOne({
      cardNumber: cardNumber, // Use directly
      phone: phone // Use directly
    });
    if (!user) {
      console.warn(`OTP Verification: User not found for Card: ${cardNumber}, Phone: ${phone}`);
      return res.status(404).json({ message: 'User not found.' });
    }

    if (!user.otp || user.otp !== submittedOtp) {
      console.warn(`OTP Verification: Invalid OTP for user ${user._id}. Submitted: "${submittedOtp}", Stored: "${user.otp}"`);
      return res.status(401).json({ message: 'Invalid OTP.' });
    }

    const otpExpiryDate = user.otpExpires ? new Date(user.otpExpires) : null;
    if (!otpExpiryDate) {
      console.warn(`OTP Verification: OTP expiry timestamp missing for user ${user._id}.`);
      return res.status(401).json({ message: 'OTP data missing or invalid. Please request a new OTP.' });
    }

    const now = new Date();
    if (now.getTime() > otpExpiryDate.getTime()) {
      await User.updateOne(
        { _id: user._id },
        { $unset: { otp: "", otpExpires: "" } }
      );
      console.warn(`OTP Verification: Expired OTP for user ${user._id}. Generated at ${otpExpiryDate.toISOString()}. Current time ${now.toISOString()}.`);
      return res.status(401).json({ message: 'OTP has expired. Please request a new one.' });
    }

    const payload = {
        userId: user._id.toString(),
        cardNumber: user.cardNumber,
    };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
    console.log(`OTP Verification: Generated JWT for user ${user._id}.`);

    await User.updateOne(
      { _id: user._id },
      { $unset: { otp: "", otpExpires: "" } }
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