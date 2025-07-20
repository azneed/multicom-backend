// scripts/migrateCardNumbers.js
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User'); // Adjust path as needed

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected for migration.');
  } catch (err) {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  }
};

const migrateCardNumbers = async () => {
  await connectDB();
  console.log('Starting card number migration...');

  try {
    // Find users where cardNumber is stored as a string
    const usersToMigrate = await User.find({
      cardNumber: { $type: "string" } // Query for documents where cardNumber is of BSON type 'string'
    });

    if (usersToMigrate.length === 0) {
      console.log('No user card numbers found to migrate (all are numbers or do not exist as string).');
      mongoose.connection.close();
      return;
    }

    let migratedCount = 0;
    for (const user of usersToMigrate) {
      const oldCardNumber = user.cardNumber;
      const newCardNumber = parseInt(oldCardNumber, 10);

      if (!isNaN(newCardNumber)) {
        // Update the document to set cardNumber as a Number type
        await User.updateOne(
          { _id: user._id },
          { $set: { cardNumber: newCardNumber } }
        );
        console.log(`Migrated user ${user.name} (ID: ${user._id}): ${oldCardNumber} -> ${newCardNumber}`);
        migratedCount++;
      } else {
        console.warn(`Skipping user ${user.name} (ID: ${user._id}) due to invalid card number format: ${oldCardNumber}`);
      }
    }
    console.log(`Migration complete. Successfully migrated ${migratedCount} out of ${usersToMigrate.length} potential users.`);

  } catch (error) {
    console.error('Error during migration:', error);
  } finally {
    mongoose.connection.close();
  }
};

// Make sure you have your User model correctly imported relative to this script.
// Example: if script is in `scripts` and models are in `models`, use `../models/User`
migrateCardNumbers();