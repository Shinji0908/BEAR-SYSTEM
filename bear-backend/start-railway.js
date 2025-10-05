#!/usr/bin/env node

/**
 * Railway-specific startup script for BEAR System Backend
 * Direct startup without child processes for better Railway compatibility
 */

const mongoose = require('mongoose');

console.log('🚂 Starting BEAR System Backend on Railway...');
console.log('📅 Timestamp:', new Date().toISOString());

// Check if we're on Railway
const isRailway = process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_PROJECT_ID;
console.log('🚂 Railway Environment:', isRailway ? 'Yes' : 'No');

// Check environment variables
console.log('🔍 Environment Check:');
console.log('- NODE_ENV:', process.env.NODE_ENV || 'not set');
console.log('- PORT:', process.env.PORT || 'not set');
console.log('- MONGO_URI:', process.env.MONGO_URI ? 'set' : 'not set');
console.log('- JWT_SECRET:', process.env.JWT_SECRET ? 'set' : 'not set');

// Set default environment variables for Railway
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'production';
  console.log('✅ Set NODE_ENV to production');
}

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;
const JWT_SECRET = process.env.JWT_SECRET;

// Check if MongoDB URI is set
if (!MONGO_URI) {
  console.log('❌ MONGO_URI not set! Please configure MongoDB connection in Railway dashboard.');
  console.log('💡 Go to Railway dashboard → Variables → Add MONGO_URI');
  process.exit(1);
}

// Check if JWT secret is set
if (!JWT_SECRET) {
  console.log('❌ JWT_SECRET not set! Please configure JWT secret in Railway dashboard.');
  console.log('💡 Go to Railway dashboard → Variables → Add JWT_SECRET');
  process.exit(1);
}

console.log('✅ Environment variables configured');
console.log('🚀 Starting backend server...');

// Load the main application
require('./index');
