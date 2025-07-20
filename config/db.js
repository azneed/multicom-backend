// C:\multicom-backend\config\db.js
const mongoose = require('mongoose');

const uri = process.env.MONGO_URI;

const connectDB = async () => {
  if (!uri) {
    console.error("MongoDB URI not found in environment variables. Please set MONGO_URI in your .env file.");
    process.exit(1);
  }
  try {
    // Mongoose handles connection pooling and exposes a connection object
    await mongoose.connect(uri, {
      // These Mongoose-specific options are now largely default in newer Mongoose versions,
      // but explicitly setting them can prevent warnings or ensure specific behavior.
      useNewUrlParser: true, // Deprecated in Mongoose 6+, but harmless
      useUnifiedTopology: true // Deprecated in Mongoose 6+, but harmless
    });
    console.log('MongoDB connected successfully using Mongoose');
    // We don't return anything directly here, Mongoose manages the connection.
    // The connection instance can be accessed via mongoose.connection
  } catch (error) {
    console.error(`MongoDB Connection Error (Mongoose): ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;