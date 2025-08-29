#!/usr/bin/env node
/**
 * Clear all rows from crash_reports table
 */

// Load environment variables from .env file
require('dotenv').config();

const https = require('https');

// Configuration - Use environment variables
const SUPABASE_URL = process.env.SUPABASE_URL || "https://your-project-id.supabase.co";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || "your-service-key-here";

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

async function clearDatabase() {
    console.log('🗑️  Clearing crash_reports table...');
    
    try {
        // First, let's see how many rows we have
        const countResponse = await makeRequest(`${SUPABASE_URL}/rest/v1/crash_reports?select=id`, {
            method: 'GET',
            headers: {
                'apikey': SUPABASE_SERVICE_KEY,
                'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (countResponse.statusCode === 200) {
            const rows = JSON.parse(countResponse.body);
            console.log(`📊 Found ${rows.length} rows to delete`);
            
            if (rows.length === 0) {
                console.log('✅ Database is already empty');
                return;
            }
            
            // Delete all rows (using a WHERE clause that matches all rows)
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
                console.log('✅ Successfully deleted all rows from crash_reports table');
            } else {
                console.log(`❌ Failed to delete rows: HTTP ${deleteResponse.statusCode}`);
                console.log(`Response: ${deleteResponse.body}`);
            }
        } else {
            console.log(`❌ Failed to count rows: HTTP ${countResponse.statusCode}`);
            console.log(`Response: ${countResponse.body}`);
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

if (require.main === module) {
    clearDatabase().catch(console.error);
}
