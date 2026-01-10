-- URGENT: Find where 4.5M matches are actually stored
-- Don't assume table names - search everywhere!

-- 1. List ALL tables in public schema
SELECT 
  'ALL TABLES' as search_type,
  tablename,
  tableowner,
  schemaname
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- 2. Search for ANY table with 'match' in the name (case insensitive doesn't work, so try variations)
SELECT 
  'MATCH TABLES' as search_type,
  tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND (
    tablename ILIKE '%match%' 
    OR tablename ILIKE '%pair%'
    OR tablename ILIKE '%connection%'
    OR tablename ILIKE '%link%'
    OR tablename = 'matches'
    OR tablename = 'startup_investor_matches'
    OR tablename = 'investor_startup_matches'
    OR tablename = 'startup_matches'
    OR tablename = 'investor_matches'
  )
ORDER BY tablename;

-- 3. Check for views that might aggregate matches
SELECT 
  'MATCH VIEWS' as search_type,
  viewname,
  definition
FROM pg_views
WHERE schemaname = 'public'
  AND viewname ILIKE '%match%';

-- 4. Check ALL schemas, not just public
SELECT 
  'ALL SCHEMAS' as search_type,
  schemaname,
  tablename
FROM pg_tables
WHERE schemaname IN ('public', 'auth', 'storage', 'realtime', 'graphql_public')
  AND tablename ILIKE '%match%'
ORDER BY schemaname, tablename;

-- 5. Try to query startup_investor_matches with explicit schema and no filters
SELECT 
  'Direct Query' as test,
  COUNT(*)::bigint as total_rows
FROM public.startup_investor_matches;

-- 6. Try with different query methods
SELECT COUNT(*)::bigint FROM startup_investor_matches;
SELECT COUNT(*)::bigint FROM public.startup_investor_matches WHERE true;
SELECT COUNT(*)::bigint FROM public.startup_investor_matches WHERE 1=1;

-- 7. Check table statistics (might show actual row count even if queries fail)
SELECT 
  schemaname,
  tablename,
  n_live_tup as estimated_rows,
  n_dead_tup as dead_rows,
  last_vacuum,
  last_autovacuum
FROM pg_stat_user_tables
WHERE tablename LIKE '%match%'
ORDER BY n_live_tup DESC;

-- 8. Check if there's a partition table
SELECT 
  'PARTITIONS' as search_type,
  schemaname,
  tablename,
  relkind
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname LIKE '%match%'
  AND c.relkind IN ('r', 'p'); -- 'r' = regular table, 'p' = partition

-- 9. Get actual row count using pg_class (bypasses RLS)
SELECT 
  'pg_class row count' as method,
  schemaname,
  tablename,
  reltuples::bigint as estimated_rows,
  relpages as pages
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname = 'startup_investor_matches';

-- 10. Try to select actual data (sample)
SELECT 
  'Sample Data' as test,
  id,
  startup_id,
  investor_id,
  match_score,
  created_at
FROM public.startup_investor_matches
LIMIT 5;
