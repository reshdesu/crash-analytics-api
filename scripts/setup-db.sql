-- Initial database setup for Crash Analytics API
-- Run this in Supabase SQL Editor when first creating the project

-- Create crash_reports table
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
    CONSTRAINT crash_reports_app_version_check CHECK (app_version ~ '^v[0-9]+\.[0-9]+\\.[0-9]+'),
    CONSTRAINT crash_reports_error_message_check CHECK (length(error_message) < 5000),
    CONSTRAINT crash_reports_stack_trace_check CHECK (length(stack_trace) < 20000),
    CONSTRAINT crash_reports_platform_check CHECK (platform IN ('windows', 'linux', 'macos', 'android', 'ios'))
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_crash_reports_app_name ON crash_reports(app_name);
CREATE INDEX IF NOT EXISTS idx_crash_reports_created_at ON crash_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crash_reports_app_version ON crash_reports(app_name, app_version);
CREATE INDEX IF NOT EXISTS idx_crash_reports_platform ON crash_reports(platform);

-- Enable RLS
ALTER TABLE crash_reports ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "crash_reports_insert_only" ON crash_reports
FOR INSERT 
WITH CHECK (
    crash_timestamp > (NOW() - INTERVAL '24 hours') AND
    crash_timestamp <= NOW() AND
    length(app_name) > 0 AND
    app_version ~ '^v[0-9]+\\.[0-9]+\\.[0-9]+' AND
    platform IN ('windows', 'linux', 'macos', 'android', 'ios') AND
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

-- Insert sample data for first-time setup
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
