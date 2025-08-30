#!/usr/bin/env node
/**
 * Create Database Tables Programmatically
 * Uses Supabase's SQL execution to create all required tables
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

async function executeSQL(sql) {
    console.log('📝 Executing SQL...');
    
    try {
        // Method 1: Try using the SQL endpoint directly
        const response = await makeRequest(`${SUPABASE_URL}/rest/v1/`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_SERVICE_KEY,
                'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
                'Content-Type': 'application/sql'
            },
            body: sql
        });
        
        if (response.statusCode === 200) {
            console.log('✅ SQL executed successfully via direct endpoint');
            return true;
        }
        
        // Method 2: Try using the SQL editor endpoint
        console.log('📝 Trying alternative SQL endpoint...');
        const response2 = await makeRequest(`${SUPABASE_URL}/rest/v1/sql`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_SERVICE_KEY,
                'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ query: sql })
        });
        
        if (response2.statusCode === 200) {
            console.log('✅ SQL executed successfully via SQL endpoint');
            return true;
        }
        
        // Method 3: Try using the RPC endpoint with exec_sql
        console.log('📝 Trying RPC exec_sql endpoint...');
        const response3 = await makeRequest(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_SERVICE_KEY,
                'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ sql: sql })
        });
        
        if (response3.statusCode === 200) {
            console.log('✅ SQL executed successfully via RPC endpoint');
            return true;
        }
        
        // If all methods fail, show the error
        console.log(`❌ All SQL execution methods failed:`);
        console.log(`   Direct endpoint: ${response.statusCode}`);
        console.log(`   SQL endpoint: ${response2.statusCode}`);
        console.log(`   RPC endpoint: ${response3.statusCode}`);
        
        return false;
        
    } catch (error) {
        console.log(`❌ SQL execution failed: ${error.message}`);
        return false;
    }
}

async function createTables() {
    console.log('🏗️  Creating crash_reports table and related objects...');
    
    const createTableSQL = `
-- Universal crash reporting table for all applications
CREATE TABLE IF NOT EXISTS crash_reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- App identification
    app_name TEXT NOT NULL,
    app_version TEXT NOT NULL,
    
    -- Crash details
    crash_timestamp TIMESTAMPTZ NOT NULL,
    platform TEXT NOT NULL,
    error_message TEXT,
    stack_trace TEXT,
    
    -- System information
    hardware_specs JSONB,
    
    -- Optional tracking
    user_id TEXT,
    session_id TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT crash_reports_app_name_check CHECK (length(app_name) > 0 AND length(app_name) < 100),
    CONSTRAINT crash_reports_app_version_check CHECK (app_version ~ '^v[0-9]+\\.[0-9]+\\.[0-9]+.*$'),
    CONSTRAINT crash_reports_error_message_check CHECK (length(error_message) < 5000),
    CONSTRAINT crash_reports_stack_trace_check CHECK (length(stack_trace) < 20000),
    CONSTRAINT crash_reports_platform_check CHECK (platform IN ('windows', 'linux', 'macos', 'android', 'ios'))
);
    `;
    
    const createIndexesSQL = `
-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_crash_reports_app_name ON crash_reports(app_name);
CREATE INDEX IF NOT EXISTS idx_crash_reports_created_at ON crash_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crash_reports_app_version ON crash_reports(app_name, app_version);
CREATE INDEX IF NOT EXISTS idx_crash_reports_platform ON crash_reports(platform);
    `;
    
    const enableRLSSQL = `
-- Enable Row Level Security
ALTER TABLE crash_reports ENABLE ROW LEVEL SECURITY;
    `;
    
    const createPolicySQL = `
-- Create policy for insert-only access
DROP POLICY IF EXISTS "crash_reports_insert_only" ON crash_reports;
CREATE POLICY "crash_reports_insert_only" ON crash_reports
FOR INSERT 
WITH CHECK (
    -- Timestamp must be recent (within last 24 hours)
    crash_timestamp > (NOW() - INTERVAL '24 hours') AND
    crash_timestamp <= NOW() AND
    
    -- App name must be non-empty
    length(app_name) > 0 AND
    
    -- Version format validation
    app_version ~ '^v[0-9]+\\.[0-9]+\\.[0-9]+' AND
    
    -- Platform validation
    platform IN ('windows', 'linux', 'macos', 'android', 'ios') AND
    
    -- Size limits
    (error_message IS NULL OR length(error_message) < 5000) AND
    (stack_trace IS NULL OR length(stack_trace) < 20000)
);
    `;
    
    const createViewSQL = `
-- Create analytics view
DROP VIEW IF EXISTS crash_analytics;
CREATE VIEW crash_analytics AS
SELECT 
    app_name,
    app_version,
    platform,
    DATE_TRUNC('hour', created_at) as hour,
    COUNT(*) as crash_count,
    COUNT(*) as unique_users
FROM crash_reports 
GROUP BY app_name, app_version, platform, DATE_TRUNC('hour', created_at)
ORDER BY hour DESC;
    `;
    
    try {
        // Execute each SQL statement separately for better error handling
        console.log('\n📋 Step 1: Creating crash_reports table...');
        const tableCreated = await executeSQL(createTableSQL);
        if (!tableCreated) {
            console.log('❌ Failed to create table');
            return false;
        }
        
        console.log('\n📋 Step 2: Creating indexes...');
        const indexesCreated = await executeSQL(createIndexesSQL);
        if (!indexesCreated) {
            console.log('❌ Failed to create indexes');
            return false;
        }
        
        console.log('\n📋 Step 3: Enabling Row Level Security...');
        const rlsEnabled = await executeSQL(enableRLSSQL);
        if (!rlsEnabled) {
            console.log('❌ Failed to enable RLS');
            return false;
        }
        
        console.log('\n📋 Step 4: Creating security policy...');
        const policyCreated = await executeSQL(createPolicySQL);
        if (!policyCreated) {
            console.log('❌ Failed to create policy');
            return false;
        }
        
        console.log('\n📋 Step 5: Creating analytics view...');
        const viewCreated = await executeSQL(createViewSQL);
        if (!viewCreated) {
            console.log('❌ Failed to create view');
            return false;
        }
        
        console.log('\n🎉 All database objects created successfully!');
        return true;
        
    } catch (error) {
        console.error('❌ Error creating tables:', error.message);
        return false;
    }
}

async function verifyTablesExist() {
    console.log('\n🔍 Verifying tables exist...');
    
    try {
        const response = await makeRequest(`${SUPABASE_URL}/rest/v1/crash_reports?select=id&limit=1`, {
            method: 'GET',
            headers: {
                'apikey': SUPABASE_SERVICE_KEY,
                'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.statusCode === 200) {
            console.log('✅ crash_reports table exists!');
            return true;
        } else {
            console.log(`❌ Table still doesn't exist: ${response.statusCode}`);
            return false;
        }
    } catch (error) {
        console.log(`❌ Verification failed: ${error.message}`);
        return false;
    }
}

async function testInsertData() {
    console.log('\n🧪 Testing data insertion...');
    
    const testData = {
        app_name: 'test-app',
        app_version: 'v1.0.0',
        platform: 'linux',
        crash_timestamp: new Date().toISOString(),
        error_message: 'Test crash for initialization',
        stack_trace: 'Test stack trace',
        hardware_specs: { test: true },
        user_id: 'test-user',
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
        
        if (response.statusCode === 200 || response.statusCode === 201) {
            console.log('✅ Test data insertion successful!');
            return true;
        } else {
            console.log(`❌ Test insertion failed: ${response.statusCode}`);
            console.log(`Response: ${response.body}`);
            return false;
        }
    } catch (error) {
        console.log(`❌ Test insertion failed: ${error.message}`);
        return false;
    }
}

async function main() {
    console.log('🚀 Supabase Database Table Creator');
    console.log('='.repeat(50));
    console.log(`URL: ${SUPABASE_URL}`);
    console.log(`Key: ${SUPABASE_SERVICE_KEY.substring(0, 20)}...`);
    console.log('');
    
    try {
        // Check if tables already exist
        const tablesExist = await verifyTablesExist();
        
        if (tablesExist) {
            console.log('🎉 Database is already initialized!');
            console.log('💡 You can now run: pnpm test');
            return;
        }
        
        // Create tables
        const success = await createTables();
        
        if (success) {
            // Verify tables were created
            const verified = await verifyTablesExist();
            
            if (verified) {
                // Test data insertion
                const insertTest = await testInsertData();
                
                if (insertTest) {
                    console.log('\n🎉 SUCCESS! Your crash analytics database is ready!');
                    console.log('\n📚 Next Steps:');
                    console.log('1. Test your API: pnpm test');
                    console.log('2. Start using the crash reporter in your apps');
                    console.log('3. Check your Supabase dashboard for the data');
                } else {
                    console.log('\n⚠️  Tables created but data insertion failed');
                    console.log('💡 Check your database permissions');
                }
            } else {
                console.log('\n❌ Tables were not created successfully');
            }
        } else {
            console.log('\n❌ Failed to create database tables');
            console.log('💡 You may need to create tables manually in Supabase dashboard');
        }
        
    } catch (error) {
        console.error('❌ Table creation failed:', error.message);
    }
}

if (require.main === module) {
    main().catch(console.error);
}
