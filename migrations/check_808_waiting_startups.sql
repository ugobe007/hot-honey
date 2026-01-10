-- Check Where the 808 Waiting Startups Are
-- Run this to see where they're located

-- ============================================================
-- 1. Check discovered_startups table
-- ============================================================

SELECT 
  'discovered_startups' as source_table,
  COUNT(*)::bigint as total_count,
  COUNT(*) FILTER (WHERE imported_to_startups = false OR imported_to_startups IS NULL)::bigint as unimported,
  COUNT(*) FILTER (WHERE imported_to_startups = true)::bigint as imported,
  MIN(created_at) as oldest,
  MAX(created_at) as newest
FROM discovered_startups;

-- ============================================================
-- 2. Check startup_uploads with pending status
-- ============================================================

SELECT 
  'startup_uploads (pending)' as source_table,
  COUNT(*)::bigint as total_pending,
  MIN(created_at) as oldest,
  MAX(created_at) as newest
FROM startup_uploads
WHERE status = 'pending';

-- ============================================================
-- 3. Check startup_uploads with reviewing status
-- ============================================================

SELECT 
  'startup_uploads (reviewing)' as source_table,
  COUNT(*)::bigint as total_reviewing,
  MIN(created_at) as oldest,
  MAX(created_at) as newest
FROM startup_uploads
WHERE status = 'reviewing';

-- ============================================================
-- 4. Sample of waiting startups from discovered_startups
-- ============================================================

SELECT 
  'SAMPLE: discovered_startups (first 10 unimported)' as section,
  id,
  name,
  description,
  website,
  imported_to_startups,
  startup_id,
  created_at
FROM discovered_startups
WHERE imported_to_startups = false OR imported_to_startups IS NULL
ORDER BY created_at DESC
LIMIT 10;

-- ============================================================
-- 5. Check for any other startup-related staging tables
-- ============================================================

SELECT 
  'ALL STARTUP-RELATED TABLES' as section,
  tablename,
  (SELECT n_live_tup::bigint FROM pg_stat_user_tables 
   WHERE schemaname = 'public' AND relname = tablename) as row_count
FROM pg_tables
WHERE schemaname = 'public'
  AND (tablename LIKE '%startup%' OR tablename LIKE '%discovered%')
ORDER BY tablename;
