#!/usr/bin/env node

/**
 * Railway-specific startup script for BEAR System Backend
 * Handles Railway deployment issues and provides better error handling
 */

const { spawn } = require('child_process');
const path = require('path');

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

if (!process.env.PORT) {
  process.env.PORT = '5000';
  console.log('✅ Set PORT to 5000');
}

// Check if MongoDB URI is set
if (!process.env.MONGO_URI) {
  console.log('❌ MONGO_URI not set! Please configure MongoDB connection in Railway dashboard.');
  console.log('💡 Go to Railway dashboard → Variables → Add MONGO_URI');
  process.exit(1);
}

// Check if JWT secret is set
if (!process.env.JWT_SECRET) {
  console.log('❌ JWT_SECRET not set! Please configure JWT secret in Railway dashboard.');
  console.log('💡 Go to Railway dashboard → Variables → Add JWT_SECRET');
  process.exit(1);
}

console.log('✅ Environment variables configured');
console.log('🚀 Starting backend server...');

// Start the main application
const child = spawn('node', ['index.js'], {
  stdio: 'inherit',
  cwd: __dirname
});

child.on('error', (error) => {
  console.error('❌ Failed to start backend:', error);
  process.exit(1);
});

child.on('exit', (code) => {
  console.log(`🔄 Backend process exited with code ${code}`);
  if (code !== 0) {
    console.log('❌ Backend failed to start properly');
    process.exit(code);
  }
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Received SIGTERM, shutting down gracefully...');
  child.kill('SIGTERM');
});

process.on('SIGINT', () => {
  console.log('🛑 Received SIGINT, shutting down gracefully...');
  child.kill('SIGINT');
});
