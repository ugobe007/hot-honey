-- Check what the dashboard count query actually returns
-- The dashboard uses: supabase.from('startup_investor_matches').select('*', { count: 'exact', head: true })

-- 1. What does COUNT(*) actually return?
SELECT 
  'Direct COUNT(*) Query' as test,
  COUNT(*)::bigint as count_result
FROM public.startup_investor_matches;

-- 2. What does COUNT with WHERE true return?
SELECT 
  'COUNT with WHERE true' as test,
  COUNT(*)::bigint as count_result
FROM public.startup_investor_matches
WHERE true;

-- 3. Check if maybe there's a trigger or view that intercepts queries
SELECT 
  'TRIGGERS' as check_type,
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND event_object_table = 'startup_investor_matches';

-- 4. Check if there's a default WHERE clause in a view
SELECT 
  'VIEWS ON startup_investor_matches' as check_type,
  table_schema,
  table_name,
  view_definition
FROM information_schema.views
WHERE table_schema = 'public'
  AND (view_definition LIKE '%startup_investor_matches%' OR table_name LIKE '%match%');

-- 5. Check RLS policies - maybe they're blocking the count?
SELECT 
  'RLS POLICIES' as check_type,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd as command,
  qual as using_clause,
  with_check as with_check_clause
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'startup_investor_matches';

-- 6. Try counting as different roles
-- Service role should bypass RLS
SET ROLE postgres;
SELECT COUNT(*)::bigint FROM public.startup_investor_matches;
RESET ROLE;

-- 7. Check if table was recently truncated (check table history)
SELECT 
  'TABLE HISTORY' as check_type,
  schemaname,
  relname,
  n_tup_ins::bigint as inserts,
  n_tup_upd::bigint as updates,
  n_tup_del::bigint as deletes,
  n_live_tup::bigint as live_rows,
  n_dead_tup::bigint as dead_rows,
  last_vacuum,
  last_autovacuum,
  last_analyze,
  last_autoanalyze
FROM pg_stat_user_tables
WHERE schemaname = 'public'
  AND relname = 'startup_investor_matches';

-- 8. Check if maybe there are multiple databases/projects
-- (Can't query from SQL, but this confirms we're checking the right place)
SELECT 
  current_database() as current_database_name,
  current_schema() as current_schema_name,
  version() as postgres_version;
