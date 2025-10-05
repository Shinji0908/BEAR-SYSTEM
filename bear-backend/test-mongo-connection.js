#!/usr/bin/env node

/**
 * Test MongoDB connection for Railway debugging
 */

const mongoose = require('mongoose');

console.log('🧪 Testing MongoDB Connection...');

// Test the connection string format
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.log('❌ MONGO_URI not set');
  process.exit(1);
}

console.log('🔍 MONGO_URI format check:');
console.log('- Contains mongodb+srv:', MONGO_URI.includes('mongodb+srv'));
console.log('- Contains @cluster', MONGO_URI.includes('@cluster'));
console.log('- Contains .mongodb.net', MONGO_URI.includes('.mongodb.net'));
console.log('- Contains ?retryWrites', MONGO_URI.includes('?retryWrites'));

// Check for common issues
if (MONGO_URI.includes('bear-system?retryWrites=true&w=majority bear-system?retryWrites=true&w=majority')) {
  console.log('❌ DUPLICATE DETECTED: Your MONGO_URI has duplicate parts!');
  console.log('💡 Fix: Remove the duplicate part at the end');
  console.log('📝 Correct format: mongodb+srv://admin:password@cluster0.h7cwemo.mongodb.net/bearDB?retryWrites=true&w=majority');
  process.exit(1);
}

console.log('✅ MONGO_URI format looks correct');

// Test connection
console.log('🔌 Attempting to connect to MongoDB...');

mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 10000, // 10 seconds timeout
})
.then(() => {
  console.log('✅ MongoDB Connected successfully!');
  console.log('📊 Database:', mongoose.connection.db.databaseName);
  console.log('🏷️ Host:', mongoose.connection.host);
  console.log('🔌 Port:', mongoose.connection.port);
  process.exit(0);
})
.catch(err => {
  console.error('❌ MongoDB Connection Error:', err.message);
  
  if (err.message.includes('authentication failed')) {
    console.log('💡 Check your username and password in MONGO_URI');
  } else if (err.message.includes('server selection timeout')) {
    console.log('💡 Check your network access settings in MongoDB Atlas');
    console.log('💡 Make sure 0.0.0.0/0 is allowed in Network Access');
  } else if (err.message.includes('bad auth')) {
    console.log('💡 Check your database user permissions in MongoDB Atlas');
  }
  
  process.exit(1);
});
