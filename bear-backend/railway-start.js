#!/usr/bin/env node

/**
 * Railway startup script with health check priority
 * Ensures health endpoint is available even if MongoDB fails
 */

console.log('🚂 Railway: Starting BEAR System Backend...');
console.log('📅 Timestamp:', new Date().toISOString());

// Set production environment
process.env.NODE_ENV = 'production';

// Check environment variables
console.log('🔍 Environment Check:');
console.log('- NODE_ENV:', process.env.NODE_ENV);
console.log('- PORT:', process.env.PORT || '5000');
console.log('- MONGO_URI:', process.env.MONGO_URI ? 'set' : 'not set');
console.log('- JWT_SECRET:', process.env.JWT_SECRET ? 'set' : 'not set');

// Start the main application
console.log('🚀 Loading main application...');
require('./index');
