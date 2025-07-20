const jwt = require('jsonwebtoken');

const protect = (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // ✅ Crucial change: Attach the decoded user _id as userId to the request object
      // decoded will contain { userId: user._id, cardNumber: user.cardNumber } from verifyOtp
      req.user = { userId: decoded.userId, cardNumber: decoded.cardNumber }; 

      next(); 
    } catch (error) {
      console.error('Auth middleware: Token verification failed:', error.message);
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token provided' });
  }
};

module.exports = { protect };