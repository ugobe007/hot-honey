-- URGENT: Check What Tables Actually Exist
-- This will show you EXACTLY what's in your database right now

-- ============================================================
-- 1. Check if 'startups' table exists (old table - should be replaced)
-- ============================================================

SELECT 
  'CHECK: startups table (OLD - should be replaced)' as check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'startups'
    )
    THEN '⚠️ EXISTS (but codebase uses startup_uploads now)'
    ELSE '✅ DOES NOT EXIST (expected - replaced by startup_uploads)'
  END as status,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'startups'
    )
    THEN (SELECT COUNT(*)::bigint FROM startups)
    ELSE NULL
  END as row_count_if_exists;

-- ============================================================
-- 2. Check if 'startup_uploads' table exists (CURRENT TABLE)
-- ============================================================

SELECT 
  'CHECK: startup_uploads table (CURRENT - should exist)' as check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'startup_uploads'
    )
    THEN '✅ EXISTS'
    ELSE '❌ DOES NOT EXIST - THIS IS THE PROBLEM!'
  END as status,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'startup_uploads'
    )
    THEN (SELECT COUNT(*)::bigint FROM startup_uploads)
    ELSE NULL
  END as row_count_if_exists;

-- ============================================================
-- 3. If startup_uploads EXISTS, show detailed info
-- ============================================================

SELECT 
  'startup_uploads DETAILED INFO' as check_type,
  COUNT(*)::bigint as total_startups,
  COUNT(*) FILTER (WHERE status = 'approved')::bigint as approved,
  COUNT(*) FILTER (WHERE status = 'pending')::bigint as pending,
  COUNT(*) FILTER (WHERE name IS NULL OR name = '')::bigint as missing_names,
  MIN(created_at) as oldest_startup,
  MAX(created_at) as newest_startup,
  pg_size_pretty(pg_total_relation_size('public.startup_uploads')) as table_size
FROM startup_uploads
WHERE EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'startup_uploads'
);

-- ============================================================
-- 4. Check ALL tables in public schema (complete list)
-- ============================================================

SELECT 
  'ALL TABLES IN PUBLIC SCHEMA' as check_type,
  tablename,
  CASE 
    WHEN rowsecurity THEN 'RLS Enabled'
    ELSE 'RLS Disabled'
  END as rls_status,
  (SELECT n_live_tup::bigint FROM pg_stat_user_tables 
   WHERE schemaname = 'public' AND relname = t.tablename) as estimated_rows,
  pg_size_pretty(pg_total_relation_size('public.' || tablename)) as size
FROM pg_tables t
WHERE schemaname = 'public'
ORDER BY tablename;

-- ============================================================
-- 5. Check for investors table
-- ============================================================

SELECT 
  'CHECK: investors table' as check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'investors'
    )
    THEN '✅ EXISTS'
    ELSE '❌ DOES NOT EXIST'
  END as status,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'investors'
    )
    THEN (SELECT COUNT(*)::bigint FROM investors)
    ELSE NULL
  END as row_count_if_exists;

-- ============================================================
-- 6. Check startup_investor_matches table
-- ============================================================

SELECT 
  'CHECK: startup_investor_matches table' as check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'startup_investor_matches'
    )
    THEN '✅ EXISTS'
    ELSE '❌ DOES NOT EXIST'
  END as status,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'startup_investor_matches'
    )
    THEN (SELECT COUNT(*)::bigint FROM startup_investor_matches)
    ELSE NULL
  END as row_count_if_exists;

-- ============================================================
-- 7. IMPORTANT CLARIFICATION
-- ============================================================

SELECT 
  'IMPORTANT CLARIFICATION' as note,
  'The codebase uses startup_uploads (NOT startups) as the main table.' as info,
  'If startup_uploads exists with data, you are fine.' as status,
  'If startup_uploads does NOT exist, that is the problem to fix.' as action_needed;
