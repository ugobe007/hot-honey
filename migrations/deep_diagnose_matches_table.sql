-- Deep Diagnosis: Why dashboard shows 350,800 but SQL shows 0?
-- Run with SERVICE ROLE key in Supabase SQL Editor

-- 1. Check ALL tables with "match" in name
SELECT 
  schemaname,
  tablename,
  tableowner
FROM pg_tables
WHERE tablename LIKE '%match%'
  AND schemaname IN ('public', 'auth')
ORDER BY tablename;

-- 2. Check ALL views with "match" in name
SELECT 
  schemaname,
  viewname,
  viewowner
FROM pg_views
WHERE viewname LIKE '%match%'
  AND schemaname IN ('public', 'auth')
ORDER BY viewname;

-- 3. Check if startup_investor_matches table actually exists
SELECT 
  'Table Exists Check' as check_type,
  EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'startup_investor_matches'
  ) as table_exists,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'startup_investor_matches') as count;

-- 4. Try to describe the table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'startup_investor_matches'
ORDER BY ordinal_position;

-- 5. Check row count with different methods
SELECT 
  'Method 1: Direct COUNT' as method,
  COUNT(*)::bigint as row_count
FROM startup_investor_matches;

SELECT 
  'Method 2: COUNT with schema' as method,
  COUNT(*)::bigint as row_count
FROM public.startup_investor_matches;

-- 6. Check if there are any rows at all (even if match_score is null)
SELECT 
  'Total Rows Check' as check_type,
  COUNT(*)::bigint as total_rows,
  COUNT(match_score)::bigint as rows_with_score,
  COUNT(*) FILTER (WHERE match_score IS NULL)::bigint as rows_null_score
FROM startup_investor_matches;

-- 7. Check all columns to see if data exists but in wrong format
SELECT 
  'Sample Data Check' as check_type,
  id,
  startup_id,
  investor_id,
  match_score,
  created_at
FROM startup_investor_matches
LIMIT 5;

-- 8. Check if maybe the dashboard is reading from a different database/instance?
SELECT 
  current_database() as current_db,
  current_schema() as current_schema,
  version() as postgres_version;

-- 9. Check for materialized views or other hidden structures
SELECT 
  schemaname,
  matviewname,
  hasindexes,
  ispopulated
FROM pg_matviews
WHERE matviewname LIKE '%match%';

-- 10. Check if the count is being cached or stored elsewhere
SELECT 
  'Cache Check' as check_type,
  COUNT(*)::bigint as startup_investor_matches_count
FROM startup_investor_matches;

-- If all of these return 0, the table is truly empty
-- The dashboard might be:
-- 1. Reading from a different database
-- 2. Showing cached/stale data
-- 3. Reading from a different table/view
-- 4. Has a bug in how it calculates the count
