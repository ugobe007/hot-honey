-- CRITICAL: Table is 71 MB but shows 0 rows - statistics are stale!
-- Force ANALYZE to update statistics, then get real counts

-- 1. Force ANALYZE on the table to refresh statistics
ANALYZE VERBOSE public.startup_investor_matches;

-- 2. Now check updated statistics
SELECT 
  'UPDATED STATISTICS' as check_type,
  schemaname,
  relname as table_name,
  n_live_tup::bigint as estimated_rows_after_analyze,
  n_dead_tup::bigint as dead_rows,
  last_autoanalyze,
  last_analyze
FROM pg_stat_user_tables
WHERE schemaname = 'public'
  AND relname = 'startup_investor_matches';

-- 3. Try to get actual count (may be slow for 4.5M rows, but will work)
SELECT 
  'ACTUAL COUNT (slow but accurate)' as method,
  COUNT(*)::bigint as total_rows
FROM public.startup_investor_matches;

-- 4. Try count with LIMIT to see if we can at least access the data
SELECT 
  'SAMPLE ACCESS TEST' as test,
  COUNT(*)::bigint as can_access_rows
FROM (
  SELECT id FROM public.startup_investor_matches LIMIT 1000
) subquery;

-- 5. Check if maybe there are constraints or triggers blocking counts
SELECT 
  'TABLE INFO' as check_type,
  tablename,
  tableowner,
  hasindexes,
  hasrules,
  hastriggers
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'startup_investor_matches';

-- 6. Check for any constraints that might be hiding data
SELECT 
  'CONSTRAINTS' as check_type,
  conname as constraint_name,
  contype as constraint_type,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.startup_investor_matches'::regclass;

-- 7. Try to see if maybe the table is actually empty but the size is from indexes
SELECT 
  'SIZE BREAKDOWN' as check_type,
  pg_size_pretty(pg_relation_size('public.startup_investor_matches'::regclass)) as table_size,
  pg_size_pretty(pg_indexes_size('public.startup_investor_matches'::regclass)) as indexes_size,
  pg_size_pretty(pg_total_relation_size('public.startup_investor_matches'::regclass)) as total_size;
