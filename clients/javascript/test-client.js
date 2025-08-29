#!/usr/bin/env node

// Load environment variables from .env file
require('dotenv').config();

// Configuration - use environment variables for secrets
const API_ENDPOINT = process.env.API_ENDPOINT || 'http://localhost:8787';
const HMAC_SECRET = process.env.HMAC_SECRET || 'test-hmac-secret-for-local-development-only';

const crypto = require('crypto');
const https = require('https');
const http = require('http');

// Generate HMAC signature
function generateHmacSignature(payload, secret) {
    return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

// Get hardware specs
function getHardwareSpecs() {
    const os = require('os');
    return {
        cpu: {
            cores: os.cpus().length,
            model: os.cpus()[0]?.model || 'Unknown',
            arch: os.arch()
        },
        memory: {
            total: os.totalmem(),
            free: os.freemem()
        },
        platform: {
            platform: os.platform(),
            release: os.release(),
            nodeVersion: process.version
        }
    };
}

// Send crash report
async function sendCrashReport(error, context = {}) {
    const crashData = {
        app_name: 'test-js-app',
        app_version: 'v1.0.0',
        platform: 'linux', // Fixed: using valid platform value
        crash_timestamp: new Date().toISOString(),
        error_message: error.message || String(error),
        stack_trace: error.stack || String(error),
        hardware_specs: getHardwareSpecs(),
        user_id: 'test-user-123',
        session_id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ...context
    };

    const payload = JSON.stringify(crashData);
    const signature = generateHmacSignature(payload, HMAC_SECRET);

    const headers = {
        'Content-Type': 'application/json',
        'X-HMAC-Signature': `sha256=${signature}`,
        'X-App-Name': 'test-js-app'
    };

    return new Promise((resolve, reject) => {
        const url = new URL(API_ENDPOINT);
        const isHttps = url.protocol === 'https:';
        const client = isHttps ? https : http;

        const options = {
            hostname: url.hostname,
            port: url.port || (isHttps ? 443 : 80),
            path: url.pathname,
            method: 'POST',
            headers: headers
        };

        const req = client.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const response = JSON.parse(data);
                    if (res.statusCode === 200) {
                        resolve(response);
                    } else {
                        reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                    }
                } catch (e) {
                    reject(new Error(`Invalid response: ${data}`));
                }
            });
        });

        req.on('error', reject);
        req.write(payload);
        req.end();
    });
}

// Main test function
async function main() {
    console.log('🚀 Testing JavaScript Client against Live Cloudflare API...');
    console.log(`📡 API Endpoint: ${API_ENDPOINT}`);
    
    try {
        // Test 1: Send a test crash report
        console.log('\n📤 Sending test crash report...');
        const testError = new Error('Test JavaScript error: Something went wrong in test-js-app');
        const result = await sendCrashReport(testError, { test_context: 'manual_error_test' });
        console.log('✅ Crash report sent successfully:', result);

        // Test 2: Simulate a crash
        console.log('\n💥 Simulating a crash...');
        throw new Error('Simulated crash for testing purposes');
        
    } catch (error) {
        if (error.message.includes('Simulated crash')) {
            console.log('✅ Crash simulation completed successfully');
        } else {
            console.error('❌ Error during testing:', error.message);
        }
    }
}

// Run the test
main().catch(console.error);
