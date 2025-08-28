-- Example Analytics Queries for Universal Crash Analytics API
-- Use these queries to analyze your crash data and build dashboards

-- ===================================
-- BASIC CRASH STATISTICS
-- ===================================

-- Total crashes by app (all time)
SELECT 
    app_name, 
    COUNT(*) as total_crashes,
    COUNT(DISTINCT ip_hash) as unique_users,
    MIN(created_at) as first_crash,
    MAX(created_at) as latest_crash
FROM crash_reports 
GROUP BY app_name 
ORDER BY total_crashes DESC;

-- Recent crashes (last 24 hours)
SELECT app_name, COUNT(*) as crashes_today
FROM crash_reports 
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY app_name
ORDER BY crashes_today DESC;

-- Crash trend by hour (last 7 days) - Great for charts
SELECT 
    DATE_TRUNC('hour', created_at) as hour,
    COUNT(*) as crashes,
    COUNT(DISTINCT ip_hash) as unique_users
FROM crash_reports 
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE_TRUNC('hour', created_at)
ORDER BY hour;

-- ===================================
-- APP VERSION ANALYSIS
-- ===================================

-- Crashes by app version (identify problematic releases)
SELECT 
    app_name,
    app_version,
    COUNT(*) as crashes,
    COUNT(DISTINCT ip_hash) as affected_users,
    ROUND(COUNT(*)::numeric / COUNT(DISTINCT ip_hash), 2) as crashes_per_user
FROM crash_reports 
GROUP BY app_name, app_version
ORDER BY app_name, crashes DESC;

-- Version comparison for specific app
SELECT 
    app_version,
    COUNT(*) as total_crashes,
    COUNT(DISTINCT ip_hash) as unique_users,
    DATE(MIN(created_at)) as version_first_seen
FROM crash_reports 
WHERE app_name = 'oopsie-daisy'  -- Replace with your app name
GROUP BY app_version
ORDER BY version_first_seen DESC;

-- ===================================
-- PLATFORM ANALYSIS
-- ===================================

-- Crashes by platform
SELECT 
    platform,
    COUNT(*) as crashes,
    COUNT(DISTINCT ip_hash) as unique_users,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM crash_reports 
GROUP BY platform
ORDER BY crashes DESC;

-- Platform stability over time
SELECT 
    platform,
    DATE(created_at) as date,
    COUNT(*) as daily_crashes
FROM crash_reports 
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY platform, DATE(created_at)
ORDER BY date DESC, crashes DESC;

-- ===================================
-- ERROR ANALYSIS
-- ===================================

-- Most common error messages
SELECT 
    LEFT(error_message, 100) as error_preview,
    COUNT(*) as frequency,
    COUNT(DISTINCT ip_hash) as affected_users,
    array_agg(DISTINCT app_name) as affected_apps
FROM crash_reports 
WHERE error_message IS NOT NULL
GROUP BY LEFT(error_message, 100)
ORDER BY frequency DESC
LIMIT 20;

-- Error patterns by app
SELECT 
    app_name,
    LEFT(error_message, 80) as error_type,
    COUNT(*) as occurrences
FROM crash_reports 
WHERE app_name = 'your-app-name'  -- Replace with your app
AND error_message IS NOT NULL
GROUP BY app_name, LEFT(error_message, 80)
ORDER BY occurrences DESC;

-- ===================================
-- HARDWARE ANALYSIS
-- ===================================

-- Crashes by operating system
SELECT 
    hardware_specs->'platform'->>'system' as operating_system,
    COUNT(*) as crashes,
    COUNT(DISTINCT ip_hash) as unique_users
FROM crash_reports 
WHERE hardware_specs->'platform'->>'system' IS NOT NULL
GROUP BY hardware_specs->'platform'->>'system'
ORDER BY crashes DESC;

-- Memory-related crash analysis
SELECT 
    CASE 
        WHEN (hardware_specs->'memory'->>'total')::bigint < 4000000000 THEN 'Low (< 4GB)'
        WHEN (hardware_specs->'memory'->>'total')::bigint < 8000000000 THEN 'Medium (4-8GB)'
        WHEN (hardware_specs->'memory'->>'total')::bigint < 16000000000 THEN 'High (8-16GB)'
        ELSE 'Very High (16GB+)'
    END as memory_category,
    COUNT(*) as crashes,
    COUNT(DISTINCT ip_hash) as users
FROM crash_reports 
WHERE hardware_specs->'memory'->>'total' IS NOT NULL
GROUP BY memory_category
ORDER BY crashes DESC;

-- CPU core analysis
SELECT 
    (hardware_specs->'cpu'->>'cores')::int as cpu_cores,
    COUNT(*) as crashes,
    COUNT(DISTINCT ip_hash) as users
FROM crash_reports 
WHERE hardware_specs->'cpu'->>'cores' IS NOT NULL
GROUP BY (hardware_specs->'cpu'->>'cores')::int
ORDER BY cpu_cores;

-- ===================================
-- HARDWARE ANALYSIS - LAST 7 DAYS
-- ===================================

-- GPU-based crashes (last 7 days)
SELECT 
    hardware_specs->'gpu'->>'name' as gpu_name,
    COUNT(*) as crashes_7d,
    COUNT(DISTINCT ip_hash) as unique_users_7d,
    COUNT(DISTINCT app_name) as affected_apps,
    ROUND(AVG((hardware_specs->'gpu'->>'memory')::bigint) / 1000000000.0, 1) as avg_gpu_memory_gb
FROM crash_reports 
WHERE created_at > NOW() - INTERVAL '7 days'
AND hardware_specs->'gpu'->>'name' IS NOT NULL
GROUP BY hardware_specs->'gpu'->>'name'
ORDER BY crashes_7d DESC;

-- CPU model crashes (last 7 days)
SELECT 
    hardware_specs->'cpu'->>'name' as cpu_model,
    (hardware_specs->'cpu'->>'cores')::int as cores,
    (hardware_specs->'cpu'->>'freq')::int as frequency_mhz,
    COUNT(*) as crashes_7d,
    COUNT(DISTINCT ip_hash) as unique_users_7d,
    array_agg(DISTINCT app_name) as affected_apps
FROM crash_reports 
WHERE created_at > NOW() - INTERVAL '7 days'
AND hardware_specs->'cpu'->>'name' IS NOT NULL
GROUP BY hardware_specs->'cpu'->>'name', 
         (hardware_specs->'cpu'->>'cores')::int,
         (hardware_specs->'cpu'->>'freq')::int
ORDER BY crashes_7d DESC;

-- Memory configuration crashes (last 7 days)
SELECT 
    CASE 
        WHEN (hardware_specs->'memory'->>'total')::bigint < 4000000000 THEN '< 4GB'
        WHEN (hardware_specs->'memory'->>'total')::bigint < 8000000000 THEN '4-8GB'
        WHEN (hardware_specs->'memory'->>'total')::bigint < 16000000000 THEN '8-16GB'
        WHEN (hardware_specs->'memory'->>'total')::bigint < 32000000000 THEN '16-32GB'
        ELSE '32GB+'
    END as memory_range,
    COUNT(*) as crashes_7d,
    COUNT(DISTINCT ip_hash) as unique_users_7d,
    ROUND(AVG((hardware_specs->'memory'->>'total')::bigint) / 1000000000.0, 1) as avg_memory_gb,
    ROUND(AVG((hardware_specs->'memory'->>'available')::bigint) / 1000000000.0, 1) as avg_available_gb
FROM crash_reports 
WHERE created_at > NOW() - INTERVAL '7 days'
AND hardware_specs->'memory'->>'total' IS NOT NULL
GROUP BY CASE 
    WHEN (hardware_specs->'memory'->>'total')::bigint < 4000000000 THEN '< 4GB'
    WHEN (hardware_specs->'memory'->>'total')::bigint < 8000000000 THEN '4-8GB'
    WHEN (hardware_specs->'memory'->>'total')::bigint < 16000000000 THEN '8-16GB'
    WHEN (hardware_specs->'memory'->>'total')::bigint < 32000000000 THEN '16-32GB'
    ELSE '32GB+'
END
ORDER BY crashes_7d DESC;

-- Platform version crashes (last 7 days)
SELECT 
    hardware_specs->'platform'->>'system' as os,
    hardware_specs->'platform'->>'version' as os_version,
    hardware_specs->'platform'->>'release' as os_release,
    COUNT(*) as crashes_7d,
    COUNT(DISTINCT ip_hash) as unique_users_7d,
    COUNT(DISTINCT app_name) as affected_apps
FROM crash_reports 
WHERE created_at > NOW() - INTERVAL '7 days'
AND hardware_specs->'platform'->>'system' IS NOT NULL
GROUP BY hardware_specs->'platform'->>'system',
         hardware_specs->'platform'->>'version',
         hardware_specs->'platform'->>'release'
ORDER BY crashes_7d DESC;

-- Hardware combination analysis (last 7 days)
SELECT 
    hardware_specs->'platform'->>'system' as os,
    (hardware_specs->'cpu'->>'cores')::int as cpu_cores,
    CASE 
        WHEN (hardware_specs->'memory'->>'total')::bigint < 8000000000 THEN '< 8GB'
        WHEN (hardware_specs->'memory'->>'total')::bigint < 16000000000 THEN '8-16GB'
        ELSE '16GB+'
    END as memory_tier,
    COALESCE(hardware_specs->'gpu'->>'name', 'Integrated/Unknown') as gpu_type,
    COUNT(*) as crashes_7d,
    COUNT(DISTINCT ip_hash) as unique_users_7d
FROM crash_reports 
WHERE created_at > NOW() - INTERVAL '7 days'
AND hardware_specs->'platform'->>'system' IS NOT NULL
AND hardware_specs->'cpu'->>'cores' IS NOT NULL
AND hardware_specs->'memory'->>'total' IS NOT NULL
GROUP BY hardware_specs->'platform'->>'system',
         (hardware_specs->'cpu'->>'cores')::int,
         CASE 
             WHEN (hardware_specs->'memory'->>'total')::bigint < 8000000000 THEN '< 8GB'
             WHEN (hardware_specs->'memory'->>'total')::bigint < 16000000000 THEN '8-16GB'
             ELSE '16GB+'
         END,
         COALESCE(hardware_specs->'gpu'->>'name', 'Integrated/Unknown')
HAVING COUNT(*) > 1  -- Only show combinations with multiple crashes
ORDER BY crashes_7d DESC;

-- Daily hardware trend (last 7 days)
SELECT 
    DATE(created_at) as crash_date,
    hardware_specs->'platform'->>'system' as os,
    COUNT(*) as daily_crashes,
    COUNT(DISTINCT ip_hash) as daily_users,
    COUNT(DISTINCT hardware_specs->'gpu'->>'name') as unique_gpus,
    COUNT(DISTINCT hardware_specs->'cpu'->>'name') as unique_cpus
FROM crash_reports 
WHERE created_at > NOW() - INTERVAL '7 days'
AND hardware_specs->'platform'->>'system' IS NOT NULL
GROUP BY DATE(created_at), hardware_specs->'platform'->>'system'
ORDER BY crash_date DESC, daily_crashes DESC;

-- Low-resource device crashes (last 7 days)
SELECT 
    app_name,
    COUNT(*) as crashes_7d,
    COUNT(DISTINCT ip_hash) as affected_users,
    AVG((hardware_specs->'cpu'->>'cores')::int) as avg_cpu_cores,
    ROUND(AVG((hardware_specs->'memory'->>'total')::bigint) / 1000000000.0, 1) as avg_memory_gb,
    array_agg(DISTINCT LEFT(error_message, 50)) FILTER (WHERE error_message IS NOT NULL) as common_errors
FROM crash_reports 
WHERE created_at > NOW() - INTERVAL '7 days'
AND (
    (hardware_specs->'cpu'->>'cores')::int <= 4 
    OR (hardware_specs->'memory'->>'total')::bigint < 8000000000
)
GROUP BY app_name
ORDER BY crashes_7d DESC;

-- High-end device crashes (last 7 days) - might indicate optimization issues
SELECT 
    app_name,
    COUNT(*) as crashes_7d,
    COUNT(DISTINCT ip_hash) as affected_users,
    AVG((hardware_specs->'cpu'->>'cores')::int) as avg_cpu_cores,
    ROUND(AVG((hardware_specs->'memory'->>'total')::bigint) / 1000000000.0, 1) as avg_memory_gb,
    COUNT(DISTINCT hardware_specs->'gpu'->>'name') as unique_gpus
FROM crash_reports 
WHERE created_at > NOW() - INTERVAL '7 days'
AND (hardware_specs->'cpu'->>'cores')::int >= 12 
AND (hardware_specs->'memory'->>'total')::bigint >= 32000000000
GROUP BY app_name
HAVING COUNT(*) > 2  -- Only apps with multiple high-end crashes
ORDER BY crashes_7d DESC;

-- ===================================
-- TIME-BASED ANALYSIS
-- ===================================

-- Crashes by day of week
SELECT 
    TO_CHAR(created_at, 'Day') as day_of_week,
    COUNT(*) as crashes
FROM crash_reports 
GROUP BY TO_CHAR(created_at, 'Day'), EXTRACT(dow FROM created_at)
ORDER BY EXTRACT(dow FROM created_at);

-- Crashes by hour of day (find peak crash times)
SELECT 
    EXTRACT(hour FROM created_at) as hour,
    COUNT(*) as crashes,
    COUNT(DISTINCT ip_hash) as unique_users
FROM crash_reports 
GROUP BY EXTRACT(hour FROM created_at)
ORDER BY hour;

-- ===================================
-- USER BEHAVIOR ANALYSIS
-- ===================================

-- Users with multiple crashes (potential chronic issues)
SELECT 
    ip_hash,
    COUNT(*) as crash_count,
    COUNT(DISTINCT app_name) as apps_affected,
    array_agg(DISTINCT app_name) as app_list,
    MIN(created_at) as first_crash,
    MAX(created_at) as latest_crash
FROM crash_reports 
GROUP BY ip_hash
HAVING COUNT(*) > 5  -- Users with more than 5 crashes
ORDER BY crash_count DESC;

-- Session analysis (if session_id is provided)
SELECT 
    session_id,
    COUNT(*) as crashes_in_session,
    MAX(created_at) - MIN(created_at) as session_duration,
    app_name,
    user_id
FROM crash_reports 
WHERE session_id IS NOT NULL
GROUP BY session_id, app_name, user_id
HAVING COUNT(*) > 1  -- Sessions with multiple crashes
ORDER BY crashes_in_session DESC;

-- ===================================
-- USING THE ANALYTICS VIEW
-- ===================================

-- Quick dashboard data (uses pre-aggregated view)
SELECT * FROM crash_analytics 
WHERE hour > NOW() - INTERVAL '24 hours'
ORDER BY hour DESC;

-- Top crashing apps this week
SELECT 
    app_name,
    SUM(crash_count) as total_crashes,
    SUM(unique_users) as total_users
FROM crash_analytics 
WHERE hour > NOW() - INTERVAL '7 days'
GROUP BY app_name
ORDER BY total_crashes DESC;

-- Platform performance comparison
SELECT 
    platform,
    AVG(crash_count) as avg_crashes_per_hour,
    MAX(crash_count) as peak_crashes_per_hour
FROM crash_analytics
WHERE hour > NOW() - INTERVAL '30 days'
GROUP BY platform
ORDER BY avg_crashes_per_hour DESC;

-- ===================================
-- MONITORING & ALERTS
-- ===================================

-- Spike detection: Apps with unusually high crashes
WITH normal_rate AS (
    SELECT 
        app_name,
        AVG(crash_count) as avg_crashes,
        STDDEV(crash_count) as stddev_crashes
    FROM crash_analytics
    WHERE hour > NOW() - INTERVAL '7 days'
    AND hour < NOW() - INTERVAL '1 hour'
    GROUP BY app_name
),
recent_crashes AS (
    SELECT 
        app_name,
        crash_count as recent_crashes
    FROM crash_analytics
    WHERE hour = DATE_TRUNC('hour', NOW() - INTERVAL '1 hour')
)
SELECT 
    r.app_name,
    r.recent_crashes,
    n.avg_crashes,
    ROUND((r.recent_crashes - n.avg_crashes) / NULLIF(n.stddev_crashes, 0), 2) as z_score
FROM recent_crashes r
JOIN normal_rate n ON r.app_name = n.app_name
WHERE r.recent_crashes > n.avg_crashes + (2 * n.stddev_crashes)  -- 2 standard deviations above normal
ORDER BY z_score DESC;

-- New error types (errors not seen in last 30 days)
WITH recent_errors AS (
    SELECT DISTINCT LEFT(error_message, 100) as error_pattern
    FROM crash_reports 
    WHERE created_at > NOW() - INTERVAL '24 hours'
    AND error_message IS NOT NULL
),
historical_errors AS (
    SELECT DISTINCT LEFT(error_message, 100) as error_pattern
    FROM crash_reports 
    WHERE created_at BETWEEN NOW() - INTERVAL '30 days' AND NOW() - INTERVAL '24 hours'
    AND error_message IS NOT NULL
)
SELECT 
    r.error_pattern as new_error,
    COUNT(*) as occurrences
FROM recent_errors r
LEFT JOIN historical_errors h ON r.error_pattern = h.error_pattern
JOIN crash_reports cr ON LEFT(cr.error_message, 100) = r.error_pattern
WHERE h.error_pattern IS NULL  -- New error not seen before
AND cr.created_at > NOW() - INTERVAL '24 hours'
GROUP BY r.error_pattern
ORDER BY occurrences DESC;