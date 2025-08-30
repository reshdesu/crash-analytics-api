#!/usr/bin/env node
/**
 * Debug Supabase connectivity issues
 * Tests each step of the connection process
 */

require('dotenv').config();
const https = require('https');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

function makeRequest(url, options, data) {
    return new Promise((resolve, reject) => {
        const req = https.request(url, options, (res) => {
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

async function testBasicConnection() {
    console.log('🔌 Test 1: Basic Supabase Connection');
    console.log('='.repeat(40));
    
    try {
        const response = await makeRequest(`${SUPABASE_URL}/rest/v1/`, {
            method: 'GET',
            headers: {
                'apikey': SUPABASE_SERVICE_KEY,
                'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log(`Status: ${response.statusCode}`);
        if (response.statusCode === 200) {
            console.log('✅ Basic connection successful');
            return true;
        } else {
            console.log(`❌ Unexpected status: ${response.statusCode}`);
            console.log(`Response: ${response.body}`);
            return false;
        }
    } catch (error) {
        console.log(`❌ Connection failed: ${error.message}`);
        return false;
    }
}

async function testTableExistence() {
    console.log('\n📊 Test 2: Check if crash_reports table exists');
    console.log('='.repeat(50));
    
    try {
        const response = await makeRequest(`${SUPABASE_URL}/rest/v1/crash_reports?select=id&limit=1`, {
            method: 'GET',
            headers: {
                'apikey': SUPABASE_SERVICE_KEY,
                'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log(`Status: ${response.statusCode}`);
        
        if (response.statusCode === 200) {
            console.log('✅ crash_reports table exists');
            const data = JSON.parse(response.body);
            console.log(`📈 Table has ${data.length} rows`);
            return true;
        } else if (response.statusCode === 404) {
            console.log('❌ crash_reports table does not exist');
            return false;
        } else {
            console.log(`⚠️  Unexpected status: ${response.statusCode}`);
            console.log(`Response: ${response.body}`);
            return false;
        }
    } catch (error) {
        console.log(`❌ Test failed: ${error.message}`);
        return false;
    }
}

async function testTableCreation() {
    console.log('\n🏗️  Test 3: Try to create crash_reports table');
    console.log('='.repeat(50));
    
    const createTableSQL = `
        CREATE TABLE IF NOT EXISTS crash_reports_debug (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            test_field TEXT DEFAULT 'test'
        );
    `;
    
    try {
        // Method 1: Try exec_sql function
        console.log('📝 Method 1: Using exec_sql function...');
        const response1 = await makeRequest(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_SERVICE_KEY,
                'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ sql: createTableSQL })
        });
        
        console.log(`Status: ${response1.statusCode}`);
        
        if (response1.statusCode === 200) {
            console.log('✅ Table creation via exec_sql successful');
            return true;
        } else if (response1.statusCode === 404) {
            console.log('❌ exec_sql function not found');
        } else {
            console.log(`⚠️  exec_sql failed: ${response1.statusCode}`);
            console.log(`Response: ${response1.body}`);
        }
        
        // Method 2: Try direct SQL endpoint
        console.log('\n📝 Method 2: Using direct SQL endpoint...');
        const response2 = await makeRequest(`${SUPABASE_URL}/rest/v1/`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_SERVICE_KEY,
                'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
                'Content-Type': 'application/sql'
            },
            body: createTableSQL
        });
        
        console.log(`Status: ${response2.statusCode}`);
        
        if (response2.statusCode === 200) {
            console.log('✅ Table creation via direct SQL successful');
            return true;
        } else {
            console.log(`❌ Direct SQL failed: ${response2.statusCode}`);
            console.log(`Response: ${response2.body}`);
            return false;
        }
        
    } catch (error) {
        console.log(`❌ Table creation test failed: ${error.message}`);
        return false;
    }
}

async function testInsertData() {
    console.log('\n📝 Test 4: Try to insert test data');
    console.log('='.repeat(40));
    
    const testData = {
        test_field: 'debug_test'
    };
    
    try {
        const response = await makeRequest(`${SUPABASE_URL}/rest/v1/crash_reports_debug`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_SERVICE_KEY,
                'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal'
            },
            body: JSON.stringify(testData)
        });
        
        console.log(`Status: ${response.statusCode}`);
        
        if (response.statusCode === 200 || response.statusCode === 201) {
            console.log('✅ Data insertion successful');
            return true;
        } else {
            console.log(`❌ Data insertion failed: ${response.statusCode}`);
            console.log(`Response: ${response.body}`);
            return false;
        }
    } catch (error) {
        console.log(`❌ Insert test failed: ${error.message}`);
        return false;
    }
}

async function cleanup() {
    console.log('\n🧹 Cleanup: Dropping test table');
    console.log('='.repeat(40));
    
    try {
        const response = await makeRequest(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_SERVICE_KEY,
                'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ sql: 'DROP TABLE IF EXISTS crash_reports_debug;' })
        });
        
        if (response.statusCode === 200) {
            console.log('✅ Test table cleaned up');
        } else {
            console.log('⚠️  Could not clean up test table (this is okay)');
        }
    } catch (error) {
        console.log('⚠️  Cleanup failed (this is okay)');
    }
}

async function main() {
    console.log('🔍 Supabase Connection Debug Tool');
    console.log('='.repeat(50));
    console.log(`URL: ${SUPABASE_URL}`);
    console.log(`Key: ${SUPABASE_SERVICE_KEY.substring(0, 20)}...`);
    console.log('');
    
    try {
        // Run all tests
        const basicConn = await testBasicConnection();
        const tableExists = await testTableExistence();
        const canCreate = await testTableCreation();
        const canInsert = await testInsertData();
        
        // Cleanup
        await cleanup();
        
        // Summary
        console.log('\n📋 Test Summary');
        console.log('='.repeat(20));
        console.log(`Basic Connection: ${basicConn ? '✅' : '❌'}`);
        console.log(`Table Exists: ${tableExists ? '✅' : '❌'}`);
        console.log(`Can Create Tables: ${canCreate ? '✅' : '❌'}`);
        console.log(`Can Insert Data: ${canInsert ? '✅' : '❌'}`);
        
        if (!basicConn) {
            console.log('\n❌ Basic connection failed - check your Supabase URL and service key');
        } else if (!canCreate) {
            console.log('\n⚠️  Cannot create tables - this explains why crash reports fail');
            console.log('💡 The worker needs to be able to create tables automatically');
        } else if (!canInsert) {
            console.log('\n⚠️  Cannot insert data - check your database permissions');
        } else {
            console.log('\n✅ All tests passed! Supabase is working correctly');
        }
        
    } catch (error) {
        console.error('❌ Debug failed:', error.message);
    }
}

if (require.main === module) {
    main().catch(console.error);
}
