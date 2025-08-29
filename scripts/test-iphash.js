#!/usr/bin/env node
/**
 * Test script to verify iphash generation works correctly
 */

// Load environment variables from .env file
require('dotenv').config();

const crypto = require('crypto');

/**
 * Hash IP address for privacy and rate limiting
 */
async function hashIP(ip) {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(ip + 'crash-analytics-salt'); // Add salt
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (error) {
    console.error('Hash IP error:', error);
    // Fallback to simple hash if crypto.subtle fails
    let hash = 0;
    const str = ip + 'crash-analytics-salt';
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    const positiveHash = Math.abs(hash).toString(16);
    return positiveHash.padEnd(64, '0').substring(0, 64);
  }
}

async function testHashIP() {
  console.log('🧪 Testing IP hash generation...');
  
  const testIPs = [
    '192.168.1.1',
    '10.0.0.1',
    '172.16.0.1',
    '8.8.8.8',
    '1.1.1.1'
  ];
  
  for (const ip of testIPs) {
    try {
      const hash = await hashIP(ip);
      console.log(`✅ ${ip} → ${hash}`);
      console.log(`   Length: ${hash.length} characters`);
      console.log(`   Valid hex: ${/^[0-9a-f]{64}$/.test(hash) ? 'Yes' : 'No'}`);
      console.log('');
    } catch (error) {
      console.error(`❌ Failed to hash ${ip}:`, error.message);
    }
  }
}

// Run the test
testHashIP().catch(console.error);
