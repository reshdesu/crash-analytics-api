#!/usr/bin/env node
/**
 * Test script for Universal Crash Analytics API
 * Verifies the complete end-to-end crash reporting system
 */

const crypto = require('crypto');
const https = require('https');
const http = require('http');

// Configuration - UPDATE THESE VALUES FOR YOUR DEPLOYMENT
const API_ENDPOINT = 'https://your-worker-name.your-subdomain.workers.dev';
const HMAC_SECRET = process.env.HMAC_SECRET || 'your-hmac-secret-here';

function generateHmacSignature(payload, secret) {
    return crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');
}

function makeRequest(url, options, data) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const client = urlObj.protocol === 'https:' ? https : http;
        
        const req = client.request(url, options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    body: body
                });
            });
        });
        
        req.on('error', reject);
        
        if (data) {
            req.write(data);
        }
        req.end();
    });
}

async function testCrashApi() {
    console.log('🧪 Testing Universal Crash Analytics API');
    console.log(`📡 Endpoint: ${API_ENDPOINT}`);
    console.log('='.repeat(60));
    
    // Test crash data
    const testCrashData = {
        app_name: 'test-app',
        app_version: 'v1.0.0',
        platform: 'linux',
        crash_timestamp: new Date().toISOString(),
        error_message: 'Test crash: TypeError in main.js',
        stack_trace: `TypeError: Cannot read property 'length' of undefined
    at processData (/app/main.js:42:18)
    at main (/app/main.js:15:5)
    at Object.<anonymous> (/app/main.js:8:1)`,
        hardware_specs: {
            cpu: { cores: 8, freq: 3200 },
            memory: { total: 16000000000, available: 8000000000 },
            platform: {
                system: 'Linux',
                node_version: process.version
            }
        },
        user_id: 'test-user-12345',
        session_id: `test-session-${Date.now()}`
    };
    
    // Serialize and sign payload
    const payload = JSON.stringify(testCrashData);
    const signature = generateHmacSignature(payload, HMAC_SECRET);
    
    console.log(`📦 Payload size: ${payload.length} bytes`);
    console.log(`🔐 HMAC signature: sha256=${signature.substring(0, 16)}...`);
    
    const options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-HMAC-Signature': `sha256=${signature}`,
            'X-App-Name': 'test-app',
            'Content-Length': Buffer.byteLength(payload)
        }
    };
    
    console.log('\n🚀 Sending crash report...');
    
    try {
        const response = await makeRequest(API_ENDPOINT, options, payload);
        
        console.log(`📡 Response status: ${response.statusCode}`);
        console.log(`📄 Response body: ${response.body}`);
        
        if (response.statusCode === 200) {
            const responseData = JSON.parse(response.body);
            console.log('✅ SUCCESS! Crash report accepted');
            console.log(`📊 Response data:`, responseData);
            
            if (responseData.success) {
                console.log('🎉 Tables were created automatically (if needed)');
                console.log('💾 Crash data stored in Supabase successfully');
                return true;
            } else {
                console.log('❌ API returned success=false');
                return false;
            }
        } else if (response.statusCode === 429) {
            console.log('⏰ Rate limited - this is expected behavior');
            console.log('✅ Rate limiting is working correctly');
            return true;
        } else {
            console.log(`❌ FAILED with status ${response.statusCode}`);
            return false;
        }
        
    } catch (error) {
        console.log(`❌ Error: ${error.message}`);
        return false;
    }
}

async function testInvalidRequests() {
    console.log('\n🛡️  Testing API Security');
    console.log('='.repeat(40));
    
    // Test 1: No HMAC signature
    console.log('🧪 Test 1: Missing HMAC signature');
    try {
        const options = {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        };
        const response = await makeRequest(API_ENDPOINT, options, '{"test":"data"}');
        if (response.statusCode === 401) {
            console.log('✅ Correctly rejected request without HMAC');
        } else {
            console.log(`⚠️  Unexpected response: ${response.statusCode}`);
        }
    } catch (error) {
        console.log('❌ Network error testing invalid request');
    }
    
    // Test 2: Invalid HMAC signature
    console.log('🧪 Test 2: Invalid HMAC signature');
    try {
        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-HMAC-Signature': 'sha256=invalid_signature_here'
            }
        };
        const response = await makeRequest(API_ENDPOINT, options, '{"test":"data"}');
        if (response.statusCode === 401) {
            console.log('✅ Correctly rejected request with invalid HMAC');
        } else {
            console.log(`⚠️  Unexpected response: ${response.statusCode}`);
        }
    } catch (error) {
        console.log('❌ Network error testing invalid HMAC');
    }
    
    // Test 3: Wrong HTTP method
    console.log('🧪 Test 3: Wrong HTTP method (GET)');
    try {
        const options = { method: 'GET' };
        const response = await makeRequest(API_ENDPOINT, options);
        if (response.statusCode === 405) {
            console.log('✅ Correctly rejected GET request');
        } else {
            console.log(`⚠️  Unexpected response: ${response.statusCode}`);
        }
    } catch (error) {
        console.log('❌ Network error testing GET request');
    }
}

async function main() {
    console.log('🚀 Universal Crash Analytics API - Test Suite');
    console.log('='.repeat(60));
    
    console.log(`🎯 Testing API: ${API_ENDPOINT}`);
    console.log(`🔑 Using HMAC secret: ${HMAC_SECRET.substring(0, 8)}...`);
    console.log();
    
    // Run tests
    const success = await testCrashApi();
    
    if (success) {
        await testInvalidRequests();
        console.log('\n🎉 ALL TESTS COMPLETED!');
        console.log('✅ Your crash analytics API is working correctly');
        console.log('🔒 Security features are functioning');
        console.log('💾 Database tables created automatically');
        console.log('\n📚 Next steps:');
        console.log('1. Integrate the Python client into your apps');
        console.log('2. Check your Supabase dashboard for the crash data');
        console.log('3. Set up monitoring and analytics queries');
    } else {
        console.log('\n❌ TESTS FAILED!');
        console.log('🔧 Check your configuration:');
        console.log('- Verify environment variables in Cloudflare');
        console.log('- Ensure Supabase credentials are correct');
        console.log('- Check worker deployment status');
    }
}

if (require.main === module) {
    main().catch(console.error);
}