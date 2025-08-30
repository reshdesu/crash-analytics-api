-- Nuclear option: Remove ALL tables and objects from the database
-- This will completely clean your database - use with caution!

-- Drop all views first
DROP VIEW IF EXISTS crash_analytics CASCADE;
DROP VIEW IF EXISTS crash_analytics CASCADE;

-- Drop all policies
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "crash_reports_insert_only" ON ' || quote_ident(r.tablename) || ' CASCADE';
    END LOOP;
END $$;

-- Drop all tables
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
        RAISE NOTICE 'Dropped table: %', r.tablename;
    END LOOP;
END $$;

-- Drop all sequences
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema = 'public') LOOP
        EXECUTE 'DROP SEQUENCE IF EXISTS ' || quote_ident(r.sequence_name) || ' CASCADE';
        RAISE NOTICE 'Dropped sequence: %', r.sequence_name;
    END LOOP;
END $$;

-- Drop all functions
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public') LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS ' || quote_ident(r.routine_name) || ' CASCADE';
        RAISE NOTICE 'Dropped function: %', r.routine_name;
    END LOOP;
END $$;

-- Verify everything is gone
SELECT 'Database cleanup complete!' as status;

-- Show what's left (should be empty)
SELECT 'Remaining tables:' as info;
SELECT tablename FROM pg_tables WHERE schemaname = 'public';

SELECT 'Remaining views:' as info;
SELECT viewname FROM pg_views WHERE schemaname = 'public';

SELECT 'Remaining sequences:' as info;
SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema = 'public';
