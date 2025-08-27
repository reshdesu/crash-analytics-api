-- Universal crash reporting table for all applications
CREATE TABLE crash_reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- App identification
    app_name TEXT NOT NULL,           -- 'oopsie-daisy', 'my-other-app', etc.
    app_version TEXT NOT NULL,        -- 'v1.2.3'
    
    -- Crash details
    crash_timestamp TIMESTAMPTZ NOT NULL,
    platform TEXT NOT NULL,          -- 'windows', 'linux', 'macos'
    error_message TEXT,               -- Main error message
    stack_trace TEXT,                 -- Full stack trace
    
    -- System information
    hardware_specs JSONB,             -- CPU, RAM, GPU, OS version, etc.
    
    -- Optional tracking
    user_id TEXT,                     -- Anonymous user identifier (optional)
    session_id TEXT,                  -- Session identifier (optional)
    
    -- Security and rate limiting
    ip_hash TEXT NOT NULL,            -- SHA-256 hashed IP for rate limiting
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT crash_reports_app_name_check CHECK (length(app_name) > 0 AND length(app_name) < 100),
    CONSTRAINT crash_reports_app_version_check CHECK (app_version ~ '^v[0-9]+\.[0-9]+\.[0-9]+.*$'),
    CONSTRAINT crash_reports_error_message_check CHECK (length(error_message) < 5000),
    CONSTRAINT crash_reports_stack_trace_check CHECK (length(stack_trace) < 20000),
    CONSTRAINT crash_reports_platform_check CHECK (platform IN ('windows', 'linux', 'macos', 'android', 'ios'))
);

-- Indexes for performance
CREATE INDEX idx_crash_reports_app_name ON crash_reports(app_name);
CREATE INDEX idx_crash_reports_created_at ON crash_reports(created_at DESC);
CREATE INDEX idx_crash_reports_app_version ON crash_reports(app_name, app_version);
CREATE INDEX idx_crash_reports_platform ON crash_reports(platform);
CREATE INDEX idx_crash_reports_ip_hash ON crash_reports(ip_hash, created_at);

-- Row Level Security (RLS)
ALTER TABLE crash_reports ENABLE ROW LEVEL SECURITY;

-- Policy: Allow insert only, with strict validation
CREATE POLICY "crash_reports_insert_only" ON crash_reports
FOR INSERT 
WITH CHECK (
    -- Timestamp must be recent (within last 24 hours)
    crash_timestamp > (NOW() - INTERVAL '24 hours') AND
    crash_timestamp <= NOW() AND
    
    -- App name must be non-empty
    length(app_name) > 0 AND
    
    -- Version format validation
    app_version ~ '^v[0-9]+\.[0-9]+\.[0-9]+' AND
    
    -- Platform validation
    platform IN ('windows', 'linux', 'macos', 'android', 'ios') AND
    
    -- Size limits
    (error_message IS NULL OR length(error_message) < 5000) AND
    (stack_trace IS NULL OR length(stack_trace) < 20000) AND
    
    -- IP hash required
    length(ip_hash) = 64  -- SHA-256 hash length
);

-- No SELECT, UPDATE, or DELETE allowed
-- Only the service key can query data

-- Optional: Create a view for analytics (service key access only)
CREATE VIEW crash_analytics AS
SELECT 
    app_name,
    app_version,
    platform,
    DATE_TRUNC('hour', created_at) as hour,
    COUNT(*) as crash_count,
    COUNT(DISTINCT ip_hash) as unique_users
FROM crash_reports 
GROUP BY app_name, app_version, platform, DATE_TRUNC('hour', created_at)
ORDER BY hour DESC;