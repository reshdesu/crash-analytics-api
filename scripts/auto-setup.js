#!/usr/bin/env node
/**
 * Automated Database Setup for Crash Analytics API
 * One-command setup that handles everything automatically
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

async function tryCreateTables() {
    console.log('🚀 Attempting automated table creation...');
    
    const methods = [
        // Method 1: Direct SQL endpoint
        {
            name: 'Direct SQL endpoint',
            url: `${SUPABASE_URL}/rest/v1/`,
            headers: {
                'apikey': SUPABASE_SERVICE_KEY,
                'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
                'Content-Type': 'text/plain'
            },
            body: getMinimalSchema()
        },
        
        // Method 2: SQL editor endpoint
        {
            name: 'SQL editor endpoint',
            url: `${SUPABASE_URL}/rest/v1/sql`,
            headers: {
                'apikey': SUPABASE_SERVICE_KEY,
                'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ query: getMinimalSchema() })
        },
        
        // Method 3: RPC endpoint
        {
            name: 'RPC exec_sql endpoint',
            url: `${SUPABASE_URL}/rest/v1/rpc/exec_sql`,
            headers: {
                'apikey': SUPABASE_SERVICE_KEY,
                'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ sql: getMinimalSchema() })
        }
    ];
    
    for (const method of methods) {
        try {
            console.log(`📝 Trying ${method.name}...`);
            
            const response = await makeRequest(method.url, {
                method: 'POST',
                headers: method.headers
            }, method.body);
            
            if (response.statusCode === 200) {
                console.log(`✅ Success with ${method.name}!`);
                return true;
            } else {
                console.log(`❌ ${method.name} failed: ${response.statusCode}`);
            }
        } catch (error) {
            console.log(`❌ ${method.name} error: ${error.message}`);
        }
    }
    
    return false;
}

function getMinimalSchema() {
    return `
-- Minimal schema for crash analytics API
CREATE TABLE IF NOT EXISTS crash_reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    app_name TEXT NOT NULL,
    app_version TEXT NOT NULL,
    crash_timestamp TIMESTAMPTZ NOT NULL,
    platform TEXT NOT NULL,
    error_message TEXT,
    stack_trace TEXT,
    hardware_specs JSONB,
    user_id TEXT,
    session_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Basic index
CREATE INDEX IF NOT EXISTS idx_crash_reports_app_name ON crash_reports(app_name);

-- Enable RLS
ALTER TABLE crash_reports ENABLE ROW LEVEL SECURITY;

-- Basic policy
DROP POLICY IF EXISTS "crash_reports_insert_only" ON crash_reports;
CREATE POLICY "crash_reports_insert_only" ON crash_reports
FOR INSERT WITH CHECK (length(app_name) > 0);
    `;
}

async function verifyTablesExist() {
    try {
        const response = await makeRequest(`${SUPABASE_URL}/rest/v1/crash_reports?select=id&limit=1`, {
            method: 'GET',
            headers: {
                'apikey': SUPABASE_SERVICE_KEY,
                'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        
        return response.statusCode === 200;
    } catch (error) {
        return false;
    }
}

async function testInsertData() {
    const testData = {
        app_name: 'auto-setup-test',
        app_version: 'v1.0.0',
        platform: 'linux',
        crash_timestamp: new Date().toISOString(),
        error_message: 'Automated setup test',
        hardware_specs: { test: true },
        user_id: 'auto-setup',
        session_id: 'test-session'
    };
    
    try {
        const response = await makeRequest(`${SUPABASE_URL}/rest/v1/crash_reports`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_SERVICE_KEY,
                'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal'
            },
            body: JSON.stringify(testData)
        });
        
        return response.statusCode === 200 || response.statusCode === 201;
    } catch (error) {
        return false;
    }
}

async function main() {
    console.log('🚀 Crash Analytics API - Automated Setup');
    console.log('='.repeat(50));
    
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
        console.error('❌ Missing environment variables. Check your .env file.');
        process.exit(1);
    }
    
    console.log(`📡 Supabase: ${SUPABASE_URL}`);
    
    // Check if tables already exist
    const tablesExist = await verifyTablesExist();
    if (tablesExist) {
        console.log('✅ Database is already set up!');
        console.log('💡 You can now run: pnpm test');
        return;
    }
    
    // Try to create tables automatically
    console.log('\n🏗️  Tables don\'t exist. Attempting automatic creation...');
    const autoSuccess = await tryCreateTables();
    
    if (autoSuccess) {
        console.log('\n🎉 Tables created automatically!');
        
        // Verify and test
        const verified = await verifyTablesExist();
        if (verified) {
            const insertTest = await testInsertData();
            if (insertTest) {
                console.log('✅ Database is fully functional!');
                console.log('\n📚 Next steps:');
                console.log('1. Test your API: pnpm test');
                console.log('2. Start using the crash reporter');
            } else {
                console.log('⚠️  Tables created but data insertion failed');
            }
        }
    } else {
        console.log('\n❌ Automatic setup failed. Manual setup required.');
        console.log('\n📋 Manual Setup Instructions:');
        console.log('1. Go to: https://supabase.com/dashboard');
        console.log('2. Select your project');
        console.log('3. Go to: SQL Editor');
        console.log('4. Copy and paste the SQL from scripts/setup-db.sql');
        console.log('5. Click "Run"');
        console.log('6. Come back and run: pnpm test');
        
        console.log('\n💡 Or run the full setup script:');
        console.log('   node scripts/setup-db.sql');
    }
}

if (require.main === module) {
    main().catch(console.error);
}
