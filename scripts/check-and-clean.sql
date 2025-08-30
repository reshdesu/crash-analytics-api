-- Check and Clean Database for Crash Analytics API
-- This script first shows what exists, then cleans everything up

-- Step 1: Check what currently exists
SELECT 'Current database state:' as info;

-- Check if crash_reports table exists and show its structure
SELECT 
    'Table exists: ' || 
    CASE WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'crash_reports') 
         THEN 'YES' 
         ELSE 'NO' 
    END as table_status;

-- If table exists, show its constraints
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'crash_reports') THEN
        RAISE NOTICE 'Table crash_reports exists. Checking constraints...';
        
        -- Show all constraints
        RAISE NOTICE 'Constraints: %', (
            SELECT string_agg(constraint_name || ': ' || check_clause, ', ')
            FROM information_schema.check_constraints 
            WHERE constraint_name LIKE '%crash_reports%'
        );
    ELSE
        RAISE NOTICE 'Table crash_reports does not exist.';
    END IF;
END $$;

-- Step 2: Force drop everything (with CASCADE to remove dependencies)
SELECT 'Dropping existing objects...' as info;

-- Drop view first (if it exists)
DROP VIEW IF EXISTS crash_analytics CASCADE;

-- Drop policies (if they exist)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'crash_reports') THEN
        EXECUTE 'DROP POLICY IF EXISTS "crash_reports_insert_only" ON crash_reports CASCADE';
        RAISE NOTICE 'Dropped policies';
    END IF;
END $$;

-- Drop the table with CASCADE to remove all dependencies
DROP TABLE IF EXISTS crash_reports CASCADE;

-- Step 3: Verify everything is gone
SELECT 'Verifying cleanup...' as info;

SELECT 
    'Table exists after cleanup: ' || 
    CASE WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'crash_reports') 
         THEN 'YES - CLEANUP FAILED' 
         ELSE 'NO - CLEANUP SUCCESSFUL' 
    END as cleanup_status;

-- Step 4: Create fresh table with correct constraints
SELECT 'Creating fresh table...' as info;

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
    
    -- Constraints (simplified and working)
    CONSTRAINT crash_reports_app_name_check CHECK (length(app_name) > 0 AND length(app_name) < 100),
    CONSTRAINT crash_reports_app_version_check CHECK (app_version ~ '^v[0-9]+\\.[0-9]+\\.[0-9]+'),
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

-- Create policy with simplified constraints
CREATE POLICY "crash_reports_insert_only" ON crash_reports
FOR INSERT 
WITH CHECK (
    length(app_name) > 0 AND
    app_version ~ '^v[0-9]+\\.[0-9]+\\.[0-9]+' AND
    platform IN ('windows', 'linux', 'macos', 'android', 'ios')
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

-- Step 5: Test the constraint with a simple insert
SELECT 'Testing constraints...' as info;

INSERT INTO crash_reports (
    app_name, 
    app_version, 
    platform, 
    crash_timestamp, 
    error_message, 
    stack_trace, 
    hardware_specs, 
    user_id, 
    session_id
) VALUES 
(
    'test-app',
    'v1.0.0',
    'linux',
    NOW(),
    'Test message',
    'Test stack trace',
    '{"test": true}',
    'test-user',
    'test-session'
);

-- Step 6: If test passes, insert demo data
SELECT 'Inserting demo data...' as info;

INSERT INTO crash_reports (
    app_name, 
    app_version, 
    platform, 
    crash_timestamp, 
    error_message, 
    stack_trace, 
    hardware_specs, 
    user_id, 
    session_id
) VALUES 
(
    'demo-app',
    'v1.0.0',
    'linux',
    NOW() - INTERVAL '1 hour',
    'Welcome to Crash Analytics API!',
    'This is a sample crash report to get you started.',
    '{"cpu": {"cores": 4}, "memory": {"total": 8000000000}}',
    'demo-user',
    'demo-session-001'
),
(
    'demo-app',
    'v1.0.0',
    'windows',
    NOW() - INTERVAL '30 minutes',
    'Another sample crash report',
    'This shows how crashes are tracked across platforms.',
    '{"cpu": {"cores": 8}, "memory": {"total": 16000000000}}',
    'demo-user-2',
    'demo-session-002'
);

-- Step 7: Verify everything is working
SELECT 'Final verification...' as info;

SELECT COUNT(*) as total_records FROM crash_reports;
SELECT 'Setup complete!' as status;
