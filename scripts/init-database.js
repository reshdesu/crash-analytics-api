#!/usr/bin/env node
/**
 * Initialize Supabase Database for Crash Analytics API
 * Creates all required tables, indexes, and policies
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

async function createTables() {
    console.log('🏗️  Creating crash_reports table...');
    
    // We need to use the SQL editor in Supabase dashboard or create a migration
    // For now, let's try to create the table using the REST API with proper structure
    
    try {
        // First, let's check if we can access the database schema
        const schemaResponse = await makeRequest(`${SUPABASE_URL}/rest/v1/`, {
            method: 'GET',
            headers: {
                'apikey': SUPABASE_SERVICE_KEY,
                'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log(`Schema check status: ${schemaResponse.statusCode}`);
        
        if (schemaResponse.statusCode === 200) {
            console.log('✅ Can access database schema');
        } else {
            console.log(`❌ Cannot access schema: ${schemaResponse.statusCode}`);
            return false;
        }
        
        // Since we can't create tables via REST API, we need to provide instructions
        console.log('\n📋 IMPORTANT: Tables must be created manually in Supabase Dashboard');
        console.log('='.repeat(60));
        console.log('1. Go to: https://supabase.com/dashboard');
        console.log('2. Select your project: rbnjtkaprgxaocedjrfu');
        console.log('3. Go to: SQL Editor');
        console.log('4. Run the SQL script below:');
        console.log('');
        
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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_crash_reports_app_name ON crash_reports(app_name);
CREATE INDEX IF NOT EXISTS idx_crash_reports_created_at ON crash_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crash_reports_app_version ON crash_reports(app_name, app_version);
CREATE INDEX IF NOT EXISTS idx_crash_reports_platform ON crash_reports(platform);

-- Enable Row Level Security
ALTER TABLE crash_reports ENABLE ROW LEVEL SECURITY;

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
        
        console.log(createTableSQL);
        console.log('\n5. Click "Run" to execute the SQL');
        console.log('6. Wait for success message');
        console.log('7. Come back here and run: pnpm test');
        
        return true;
        
    } catch (error) {
        console.error('❌ Error:', error.message);
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

async function main() {
    console.log('🚀 Supabase Database Initialization');
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
        
        // Create tables (or provide instructions)
        const success = await createTables();
        
        if (success) {
            console.log('\n📚 After creating tables in Supabase Dashboard:');
            console.log('1. Run this script again to verify: node scripts/init-database.js');
            console.log('2. Test the API: pnpm test');
            console.log('3. Your crash analytics API will be ready!');
        }
        
    } catch (error) {
        console.error('❌ Initialization failed:', error.message);
    }
}

if (require.main === module) {
    main().catch(console.error);
}
