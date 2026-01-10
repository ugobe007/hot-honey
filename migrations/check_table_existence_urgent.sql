-- URGENT: Check Which Tables Actually Exist
-- Run this IMMEDIATELY to see what's in the database

-- ============================================================
-- 1. Check if 'startups' table exists
-- ============================================================

SELECT 
  'TABLE CHECK: startups' as check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'startups'
    )
    THEN '✅ Table EXISTS'
    ELSE '❌ Table DOES NOT EXIST'
  END as status,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'startups'
    )
    THEN (SELECT COUNT(*)::bigint FROM startups)
    ELSE 0
  END as row_count;

-- ============================================================
-- 2. Check if 'startup_uploads' table exists
-- ============================================================

SELECT 
  'TABLE CHECK: startup_uploads' as check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'startup_uploads'
    )
    THEN '✅ Table EXISTS'
    ELSE '❌ Table DOES NOT EXIST'
  END as status,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'startup_uploads'
    )
    THEN (SELECT COUNT(*)::bigint FROM startup_uploads)
    ELSE 0
  END as row_count;

-- ============================================================
-- 3. Check ALL tables with 'startup' in the name
-- ============================================================

SELECT 
  'ALL STARTUP-RELATED TABLES' as check_type,
  tablename,
  (SELECT COUNT(*)::bigint 
   FROM information_schema.tables t2
   WHERE t2.table_schema = 'public' 
   AND t2.table_name = t.tablename) as exists_check,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_stat_user_tables 
      WHERE schemaname = 'public' 
      AND relname = tablename
    )
    THEN (SELECT n_live_tup::bigint FROM pg_stat_user_tables 
          WHERE schemaname = 'public' AND relname = tablename)
    ELSE 0
  END as estimated_rows
FROM pg_tables t
WHERE schemaname = 'public'
  AND tablename LIKE '%startup%'
ORDER BY tablename;

-- ============================================================
-- 4. Check recent table drops (if audit log exists)
-- ============================================================

SELECT 
  'RECENT TABLE OPERATIONS' as check_type,
  'Check Supabase logs for DROP TABLE commands' as note;

-- ============================================================
-- 5. Check for any startup-related views
-- ============================================================

SELECT 
  'STARTUP-RELATED VIEWS' as check_type,
  viewname,
  definition
FROM pg_views
WHERE schemaname = 'public'
  AND viewname LIKE '%startup%';

-- ============================================================
-- 6. Verify startup_uploads has data (if it exists)
-- ============================================================

SELECT 
  'startup_uploads DATA CHECK' as check_type,
  COUNT(*)::bigint as total_rows,
  COUNT(*) FILTER (WHERE status = 'approved')::bigint as approved,
  COUNT(*) FILTER (WHERE status = 'pending')::bigint as pending,
  MIN(created_at) as oldest,
  MAX(created_at) as newest
FROM startup_uploads
WHERE EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'startup_uploads'
);
