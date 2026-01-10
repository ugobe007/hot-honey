-- Verify RLS and Safety Checks Are Working
-- Run this to confirm everything is properly configured

-- ============================================================
-- 1. Verify Critical Tables Have RLS Enabled
-- ============================================================

SELECT 
  'RLS STATUS - CRITICAL TABLES' as check_type,
  tablename,
  CASE 
    WHEN rowsecurity THEN '✅ RLS Enabled'
    ELSE '❌ RLS Disabled - FIX NEEDED'
  END as rls_status,
  (SELECT COUNT(*)::int FROM pg_policies 
   WHERE schemaname = 'public' AND tablename = t.tablename) as policy_count
FROM pg_tables t
WHERE schemaname = 'public'
  AND tablename IN (
    'startup_uploads',
    'startup_investor_matches',
    'investors',
    'scraper_jobs',
    'scraper_logs',
    'scraper_results',
    'scraper_sources'
  )
ORDER BY 
  CASE WHEN rowsecurity THEN 0 ELSE 1 END,
  tablename;

-- ============================================================
-- 2. Verify Safety Checks Are Installed
-- ============================================================

-- Check if audit table exists
SELECT 
  'SAFETY CHECKS' as check_type,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables 
                 WHERE table_schema = 'public' 
                 AND table_name = 'data_deletion_audit')
    THEN '✅ Audit table exists'
    ELSE '❌ Audit table missing'
  END as audit_table_status;

-- Check if deletion trigger exists
SELECT 
  'DELETION TRIGGER' as check_type,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_trigger 
                 WHERE tgname = 'log_deletions_startup_investor_matches'
                 AND tgrelid = 'public.startup_investor_matches'::regclass)
    THEN '✅ Deletion logging trigger installed'
    ELSE '❌ Deletion trigger missing'
  END as trigger_status;

-- Check if safe_delete function exists
SELECT 
  'SAFE DELETE FUNCTION' as check_type,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_proc p
                 JOIN pg_namespace n ON p.pronamespace = n.oid
                 WHERE n.nspname = 'public'
                 AND p.proname = 'safe_delete_matches')
    THEN '✅ Safe delete function exists'
    ELSE '❌ Safe delete function missing'
  END as function_status;

-- ============================================================
-- 3. Test Safety Checks (Dry Run - No Actual Deletion)
-- ============================================================

-- Test that TRUNCATE is blocked (if event trigger works)
-- Note: Event triggers require superuser, may not work on Supabase
-- This is informational only

SELECT 
  'TRUNCATE PROTECTION' as check_type,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_event_trigger 
                 WHERE evtname = 'prevent_truncate_matches')
    THEN '✅ Event trigger installed (may not work on Supabase)'
    ELSE '⚠️ Event trigger not installed (normal on Supabase - use safe_delete function instead)'
  END as truncate_protection_status;

-- ============================================================
-- 4. Verify startup_investor_matches Table State
-- ============================================================

SELECT 
  'TABLE STATE' as check_type,
  (SELECT COUNT(*)::bigint FROM startup_investor_matches) as current_row_count,
  pg_size_pretty(pg_total_relation_size('public.startup_investor_matches')) as total_size,
  pg_size_pretty(pg_relation_size('public.startup_investor_matches')) as data_size,
  pg_size_pretty(pg_indexes_size('public.startup_investor_matches')) as index_size;

-- ============================================================
-- 5. Check for Any Recent Deletions (in audit log)
-- ============================================================

SELECT 
  'RECENT DELETIONS' as check_type,
  COUNT(*)::int as deletion_events_logged,
  MAX(deleted_at) as most_recent_deletion
FROM data_deletion_audit
WHERE table_name = 'startup_investor_matches';

-- ============================================================
-- 6. Summary Report
-- ============================================================

SELECT 
  'SUMMARY' as report_section,
  'All checks complete. Review results above.' as status,
  CASE 
    WHEN (SELECT COUNT(*) FROM pg_tables 
          WHERE schemaname = 'public' 
          AND tablename IN ('startup_uploads', 'startup_investor_matches', 'investors')
          AND NOT rowsecurity) = 0
    THEN '✅ All critical tables have RLS enabled'
    ELSE '❌ Some critical tables missing RLS'
  END as critical_rls_status,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables 
                 WHERE table_schema = 'public' 
                 AND table_name = 'data_deletion_audit')
    THEN '✅ Safety checks installed'
    ELSE '❌ Safety checks missing'
  END as safety_checks_status;
