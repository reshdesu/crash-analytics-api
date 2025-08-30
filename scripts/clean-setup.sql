-- Clean setup for Crash Analytics API
-- This script drops everything and recreates with correct constraints

-- Drop everything first
DROP VIEW IF EXISTS crash_analytics CASCADE;
DROP POLICY IF EXISTS "crash_reports_insert_only" ON crash_reports CASCADE;
DROP TABLE IF EXISTS crash_reports CASCADE;

-- Create crash_reports table with correct constraints
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

-- Test the constraint first with a simple insert
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

-- If that works, insert the demo data
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

-- Verify the data was inserted
SELECT COUNT(*) as total_records FROM crash_reports;
