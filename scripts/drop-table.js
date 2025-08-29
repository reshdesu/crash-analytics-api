#!/usr/bin/env node
/**
 * Drop the crash_reports table so it can be recreated automatically
 */

// Load environment variables from .env file
require('dotenv').config();

const https = require('https');

// Configuration - Environment variables are REQUIRED
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

function makeRequest(url, options) {
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
        req.end();
    });
}

async function dropTable() {
    // Validate required environment variables
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
        console.error('❌ Missing required environment variables:');
        console.error('   SUPABASE_URL and SUPABASE_SERVICE_KEY must be set');
        process.exit(1);
    }
    
    console.log('🗑️  Dropping crash_reports table...');
    console.log(`📡 Using Supabase: ${SUPABASE_URL}`);
    
    try {
        // Delete all rows first (Supabase requires WHERE clause)
        const deleteResponse = await makeRequest(`${SUPABASE_URL}/rest/v1/crash_reports?id=gt.0`, {
            method: 'DELETE',
            headers: {
                'apikey': SUPABASE_SERVICE_KEY,
                'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal'
            }
        });
        
        if (deleteResponse.statusCode === 200) {
            console.log('✅ All rows deleted successfully');
        } else {
            console.log(`⚠️  Row deletion response: HTTP ${deleteResponse.statusCode}`);
        }
        
        // Now try to drop the table
        const response = await makeRequest(`${SUPABASE_URL}/rest/v1/crash_reports`, {
            method: 'DELETE',
            headers: {
                'apikey': SUPABASE_SERVICE_KEY,
                'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal'
            }
        });
        
        if (response.statusCode === 200) {
            console.log('✅ Table dropped successfully!');
            console.log('📝 The table will be recreated automatically on the next crash report');
        } else {
            console.log(`⚠️  Unexpected response: HTTP ${response.statusCode}`);
            console.log(`Response: ${response.body}`);
            
            // Try to check if table exists
            const checkResponse = await makeRequest(`${SUPABASE_URL}/rest/v1/crash_reports?select=id&limit=1`, {
                method: 'GET',
                headers: {
                    'apikey': SUPABASE_SERVICE_KEY,
                    'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (checkResponse.statusCode === 404) {
                console.log('✅ Table does not exist (already dropped)');
            } else {
                console.log('❌ Table still exists');
            }
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

if (require.main === module) {
    dropTable().catch(console.error);
}
