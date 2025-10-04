const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const uri = process.env.MONGO_URI;
    if (!uri) throw new Error('MONGO_URI not set in .env');
    await mongoose.connect(uri);
    console.log('✅ MongoDB Connected...');
  } catch (err) {
    console.error('❌ Database connection error:', err.message);
    // do not exit in dev so we can debug; you may want process.exit(1) in production
  }
};

module.exports = connectDB;