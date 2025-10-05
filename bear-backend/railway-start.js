#!/usr/bin/env node

/**
 * Simple Railway startup script
 * Direct startup for Railway deployment
 */

console.log('🚂 Railway: Starting BEAR System Backend...');
console.log('📅 Timestamp:', new Date().toISOString());

// Set production environment
process.env.NODE_ENV = 'production';

// Start the main application
require('./index');
