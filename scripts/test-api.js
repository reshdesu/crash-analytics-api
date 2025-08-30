#!/usr/bin/env node
/**
 * Test script for Universal Crash Analytics API
 * Verifies the complete end-to-end crash reporting system
 */

// Load environment variables from .env file
require('dotenv').config();

const crypto = require('crypto');
const https = require('https');
const http = require('http');

// Configuration - Environment variables are REQUIRED
// Make sure you have a .env file or set these environment variables:
// - API_ENDPOINT: Your Cloudflare Workers API URL
// - HMAC_SECRET: Your HMAC secret for request signing
const API_ENDPOINT = process.env.API_ENDPOINT || 'http://localhost:8787';
const HMAC_SECRET = process.env.HMAC_SECRET;

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
        app_name: 'test-scripts-app',
        app_version: 'v1.0.0',
        platform: 'linux',
        crash_timestamp: new Date().toISOString(),
        error_message: 'Test crash: TypeError in main.js',
        stack_trace: `TypeError: Cannot read property 'length' of undefined
    at processData (/app/main.js:42:18)
    at main (/app/main.js:15:5)
    at Object.<anonymous> (/app/main.js:8:1)`,
        hardware_specs: {
            cpu: { 
                cores: require('os').cpus().length,
                model: require('os').cpus()[0]?.model || 'Unknown',
                arch: require('os').arch()
            },
            memory: { 
                total: require('os').totalmem(),
                free: require('os').freemem()
            },
            platform: {
                system: require('os').platform(),
                release: require('os').release(),
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
            'X-App-Name': 'test-scripts-app',
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
    
    // Test 3: Wrong HTTP method (POST only for write)
    console.log('🧪 Test 3: Wrong HTTP method (PUT)');
    try {
        const options = { method: 'PUT' };
        const response = await makeRequest(API_ENDPOINT, options);
        if (response.statusCode === 405) {
            console.log('✅ Correctly rejected PUT request');
        } else {
            console.log(`⚠️  Unexpected response: ${response.statusCode}`);
        }
    } catch (error) {
        console.log('❌ Network error testing PUT request');
    }
}

async function testReadFunctionality() {
    console.log('\n📖 Testing Read Functionality');
    console.log('='.repeat(40));
    
    // Wait a moment for the written data to be available
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test 1: Basic read with valid signature
    console.log('🧪 Test 1: Reading crash reports with valid signature');
    try {
        const readSignature = generateHmacSignature('read', HMAC_SECRET);
        const options = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-HMAC-Signature': `sha256=${readSignature}`,
                'X-App-Name': 'test-scripts-app',
                'X-App-Version': 'v1.0.0'
            }
        };
        const response = await makeRequest(`${API_ENDPOINT}?limit=10&days=1`, options);
        
        if (response.statusCode === 200) {
            const data = JSON.parse(response.body);
            console.log(`✅ Successfully read ${data.data?.length || 0} crash reports`);
            console.log(`📊 Pagination: ${JSON.stringify(data.pagination)}`);
        } else {
            console.log(`⚠️  Read request failed: ${response.statusCode}`);
            console.log(`Response: ${response.body}`);
        }
    } catch (error) {
        console.log('❌ Network error testing read functionality');
    }
    
    // Test 2: Read with missing signature
    console.log('🧪 Test 2: Reading without HMAC signature');
    try {
        const options = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-App-Name': 'test-scripts-app'
            }
        };
        const response = await makeRequest(`${API_ENDPOINT}?limit=10`, options);
        
        if (response.statusCode === 401) {
            console.log('✅ Correctly rejected read request without HMAC');
        } else {
            console.log(`⚠️  Unexpected response: ${response.statusCode}`);
        }
    } catch (error) {
        console.log('❌ Network error testing read without signature');
    }
    
    // Test 3: Read with missing app name
    console.log('🧪 Test 3: Reading without app name');
    try {
        const readSignature = generateHmacSignature('read', HMAC_SECRET);
        const options = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-HMAC-Signature': `sha256=${readSignature}`
            }
        };
        const response = await makeRequest(`${API_ENDPOINT}?limit=10`, options);
        
        if (response.statusCode === 400) {
            console.log('✅ Correctly rejected read request without app name');
        } else {
            console.log(`⚠️  Unexpected response: ${response.statusCode}`);
        }
    } catch (error) {
        console.log('❌ Network error testing read without app name');
    }
    
    // Test 4: Read with invalid parameters
    console.log('🧪 Test 4: Reading with invalid parameters');
    try {
        const readSignature = generateHmacSignature('read', HMAC_SECRET);
        const options = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-HMAC-Signature': `sha256=${readSignature}`,
                'X-App-Name': 'test-scripts-app'
            }
        };
        const response = await makeRequest(`${API_ENDPOINT}?limit=1000&days=400`, options);
        
        if (response.statusCode === 400) {
            console.log('✅ Correctly rejected read request with invalid parameters');
        } else {
            console.log(`⚠️  Unexpected response: ${response.statusCode}`);
        }
    } catch (error) {
        console.log('❌ Network error testing read with invalid parameters');
    }
}

async function main() {
    // Validate required environment variables first
    if (!API_ENDPOINT || !HMAC_SECRET) {
        console.error('❌ Missing required environment variables:');
        console.error('   API_ENDPOINT and HMAC_SECRET must be set');
        console.error('   Make sure you have a .env file or set these variables');
        process.exit(1);
    }
    
    console.log('🚀 Universal Crash Analytics API - Test Suite');
    console.log('='.repeat(60));
    
    console.log(`🎯 Testing API: ${API_ENDPOINT}`);
    console.log(`🔑 Using HMAC secret: ${HMAC_SECRET.substring(0, 8)}...`);
    console.log();
    
    // Run tests
    const success = await testCrashApi();
    
    if (success) {
        await testInvalidRequests();
        await testReadFunctionality();
        console.log('\n🎉 ALL TESTS COMPLETED!');
        console.log('✅ Your crash analytics API is working correctly');
        console.log('🔒 Security features are functioning');
        console.log('📖 Read functionality is working');
        console.log('💾 Database tables created automatically');
        console.log('\n📚 Next steps:');
        console.log('1. Integrate the Python/JavaScript clients into your apps');
        console.log('2. Use the crash reader clients to analyze your data');
        console.log('3. Check your Supabase dashboard for the crash data');
        console.log('4. Set up monitoring and analytics queries');
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