#!/usr/bin/env node
/**
 * Read data from crash_reports table to check iphash field
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

async function readDatabase() {
    // Validate required environment variables
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
        console.error('❌ Missing required environment variables:');
        console.error('   SUPABASE_URL and SUPABASE_SERVICE_KEY must be set');
        process.exit(1);
    }
    
    console.log('📖 Reading crash_reports table...');
    console.log(`📡 Using Supabase: ${SUPABASE_URL}`);
    
    try {
        // Read all rows with specific fields
        const response = await makeRequest(`${SUPABASE_URL}/rest/v1/crash_reports?select=id,app_name,app_version,platform,crash_timestamp,ip_hash,created_at&order=created_at.desc`, {
            method: 'GET',
            headers: {
                'apikey': SUPABASE_SERVICE_KEY,
                'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.statusCode === 200) {
            const rows = JSON.parse(response.body);
            console.log(`📊 Found ${rows.length} rows in crash_reports table`);
            console.log('');
            
            if (rows.length === 0) {
                console.log('✅ Database is empty');
                return;
            }
            
            // Display each row
            rows.forEach((row, index) => {
                console.log(`--- Row ${index + 1} ---`);
                console.log(`ID: ${row.id}`);
                console.log(`App: ${row.app_name} v${row.app_version}`);
                console.log(`Platform: ${row.platform}`);
                console.log(`Crash Time: ${row.crash_timestamp}`);
                console.log(`IP Hash: ${row.ip_hash}`);
                console.log(`Created: ${row.created_at}`);
                console.log('');
            });
            
            // Check iphash field specifically
            const emptyIphash = rows.filter(row => !row.ip_hash || row.ip_hash === '{}' || row.ip_hash === '');
            if (emptyIphash.length > 0) {
                console.log(`⚠️  WARNING: ${emptyIphash.length} rows have empty or invalid iphash!`);
                emptyIphash.forEach(row => {
                    console.log(`   - Row ${row.id}: iphash = "${row.ip_hash}"`);
                });
            } else {
                console.log('✅ All rows have valid iphash values');
            }
            
        } else {
            console.log(`❌ Failed to read rows: HTTP ${response.statusCode}`);
            console.log(`Response: ${response.body}`);
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

if (require.main === module) {
    readDatabase().catch(console.error);
}
