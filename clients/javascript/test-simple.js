#!/usr/bin/env node

// Simple test script for JavaScript client
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

// Configuration
const API_ENDPOINT = process.env.API_ENDPOINT || 'https://your-worker-name.your-subdomain.workers.dev';
const HMAC_SECRET = process.env.HMAC_SECRET;

if (!HMAC_SECRET) {
    console.error('❌ HMAC_SECRET not found in environment variables');
    process.exit(1);
}

const crypto = require('crypto');
const https = require('https');

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
async function sendCrashReport() {
    const crashData = {
        app_name: 'test-js-app',
        app_version: 'v1.0.0',
        platform: 'linux',
        crash_timestamp: new Date().toISOString(),
        error_message: 'Test crash: JavaScript client test',
        stack_trace: 'Error: Test error\n    at test (/test.js:10:5)\n    at main (/test.js:15:1)',
        hardware_specs: getHardwareSpecs(),
        user_id: 'test-user-js',
        session_id: `session_${Date.now()}`
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
        
        const options = {
            hostname: url.hostname,
            port: url.port || 443,
            path: url.pathname,
            method: 'POST',
            headers: headers
        };

        const req = https.request(options, (res) => {
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

// Run test
async function runTest() {
    console.log('🧪 Testing JavaScript Client');
    console.log(`📡 Endpoint: ${API_ENDPOINT}`);
    console.log('='.repeat(50));
    
    try {
        const result = await sendCrashReport();
        console.log('✅ SUCCESS! Crash report sent successfully');
        console.log('📊 Response:', result);
    } catch (error) {
        console.error('❌ FAILED:', error.message);
        process.exit(1);
    }
}

runTest();
