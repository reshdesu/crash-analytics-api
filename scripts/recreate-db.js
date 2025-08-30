#!/usr/bin/env node
/**
 * Drop and recreate database objects without iphash column
 */

// Load environment variables from .env file
require('dotenv').config();

const https = require('https');

// Configuration - Environment variables are REQUIRED
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

async function recreateDatabase() {
    // Validate required environment variables
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
        console.error('❌ Missing required environment variables:');
        console.error('   SUPABASE_URL and SUPABASE_SERVICE_KEY must be set');
        process.exit(1);
    }
    
    console.log('🗑️  Dropping and recreating database objects...');
    console.log(`📡 Using Supabase: ${SUPABASE_URL}`);
    
    const dropAndRecreateSQL = `
        -- Drop existing objects
        DROP VIEW IF EXISTS crash_analytics CASCADE;
        DROP POLICY IF EXISTS "crash_reports_insert_only" ON crash_reports CASCADE;
        DROP TABLE IF EXISTS crash_reports CASCADE;
        
        -- Create new table without iphash column
        CREATE TABLE crash_reports (
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
        
        -- Create indexes
        CREATE INDEX idx_crash_reports_app_name ON crash_reports(app_name);
        CREATE INDEX idx_crash_reports_created_at ON crash_reports(created_at DESC);
        CREATE INDEX idx_crash_reports_app_version ON crash_reports(app_name, app_version);
        CREATE INDEX idx_crash_reports_platform ON crash_reports(platform);
        
        -- Enable RLS
        ALTER TABLE crash_reports ENABLE ROW LEVEL SECURITY;
        
        -- Create policy
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
        console.log('📝 Executing SQL...');
        
        // Method 1: Try using the SQL endpoint with different content type
        console.log('📝 Method 1: Using SQL endpoint...');
        const response1 = await makeRequest(`${SUPABASE_URL}/rest/v1/`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_SERVICE_KEY,
                'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
                'Content-Type': 'text/plain',
            },
            body: dropAndRecreateSQL
        });
        
        if (response1.statusCode === 200) {
            console.log('✅ Database objects recreated successfully via SQL endpoint!');
            console.log('📊 New table structure:');
            console.log('   - crash_reports table (no iphash column)');
            console.log('   - crash_analytics view');
            console.log('   - RLS policies');
            console.log('   - All indexes');
            return;
        }
        
        // Method 2: Try using the SQL editor endpoint
        console.log('📝 Method 2: Using SQL editor endpoint...');
        const response2 = await makeRequest(`${SUPABASE_URL}/rest/v1/sql`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_SERVICE_KEY,
                'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query: dropAndRecreateSQL })
        });
        
        if (response2.statusCode === 200) {
            console.log('✅ Database objects recreated successfully via SQL editor!');
            console.log('📊 New table structure:');
            console.log('   - crash_reports table (no iphash column)');
            console.log('   - crash_analytics view');
            console.log('   - RLS policies');
            console.log('   - All indexes');
            return;
        }
        
        // Method 3: Try using the RPC endpoint with exec_sql
        console.log('📝 Method 3: Using RPC exec_sql endpoint...');
        const response3 = await makeRequest(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_SERVICE_KEY,
                'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ sql: dropAndRecreateSQL })
        });
        
        if (response3.statusCode === 200) {
            console.log('✅ Database objects recreated successfully via RPC!');
            console.log('📊 New table structure:');
            console.log('   - crash_reports table (no iphash column)');
            console.log('   - crash_analytics view');
            console.log('   - RLS policies');
            console.log('   - All indexes');
            return;
        }
        
        // If all methods fail, provide manual instructions
        console.log(`❌ All SQL execution methods failed:`);
        console.log(`   SQL endpoint: ${response1.statusCode}`);
        console.log(`   SQL editor: ${response2.statusCode}`);
        console.log(`   RPC endpoint: ${response3.statusCode}`);
        console.log('\n📋 Manual Setup Required:');
        console.log('1. Go to: https://supabase.com/dashboard');
        console.log('2. Select your project: your-project-id');
        console.log('3. Go to: SQL Editor');
        console.log('4. Copy and paste the SQL script below:');
        console.log('\n' + '='.repeat(60));
        console.log(dropAndRecreateSQL);
        console.log('='.repeat(60));
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

if (require.main === module) {
    recreateDatabase().catch(console.error);
}
