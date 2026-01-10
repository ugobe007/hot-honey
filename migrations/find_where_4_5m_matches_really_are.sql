-- CRITICAL: Table is 0 bytes but indexes are 71 MB - data was deleted!
-- Find where the actual 4.5M matches are stored

-- 1. Check ALL schemas for match tables (not just public)
SELECT 
  'ALL SCHEMAS - MATCH TABLES' as search_type,
  n.nspname as schema_name,
  c.relname as table_name,
  c.relkind as relation_type,  -- 'r'=table, 'v'=view, 'm'=materialized view
  pg_size_pretty(pg_total_relation_size(n.nspname||'.'||c.relname)) as total_size,
  CASE 
    WHEN c.relkind = 'r' THEN (SELECT n_live_tup::bigint FROM pg_stat_user_tables WHERE schemaname = n.nspname AND relname = c.relname)
    ELSE NULL
  END as row_count
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relname LIKE '%match%'
  AND n.nspname NOT LIKE 'pg_%'
  AND n.nspname != 'information_schema'
ORDER BY pg_total_relation_size(n.nspname||'.'||c.relname) DESC NULLS LAST;

-- 2. Check for materialized views (might have the data cached)
SELECT 
  'MATERIALIZED VIEWS' as search_type,
  schemaname,
  matviewname,
  ispopulated,
  hasindexes,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||matviewname)) as total_size
FROM pg_matviews
WHERE schemaname = 'public'
  AND matviewname LIKE '%match%';

-- 3. Check ALL views (might be aggregating from elsewhere)
SELECT 
  'ALL VIEWS' as search_type,
  schemaname,
  viewname,
  LEFT(definition, 200) as definition_preview
FROM pg_views
WHERE schemaname = 'public'
  AND viewname LIKE '%match%';

-- 4. Check for partitioned tables (data might be in partitions)
SELECT 
  'PARTITIONED TABLES' as search_type,
  n.nspname as schema_name,
  c.relname as partition_name,
  pg_get_expr(c.relpartbound, c.oid) as partition_bound,
  pg_size_pretty(pg_total_relation_size(n.nspname||'.'||c.relname)) as partition_size,
  (SELECT n_live_tup::bigint FROM pg_stat_user_tables WHERE schemaname = n.nspname AND relname = c.relname) as row_count
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind = 'r'
  AND c.relispartition = true
  AND (c.relname LIKE '%match%' OR EXISTS (
    SELECT 1 FROM pg_inherits i 
    JOIN pg_class p ON p.oid = i.inhparent 
    WHERE i.inhrelid = c.oid AND p.relname LIKE '%match%'
  ))
ORDER BY pg_total_relation_size(n.nspname||'.'||c.relname) DESC NULLS LAST;

-- 5. Check parent tables of partitions
SELECT 
  'PARTITION PARENTS' as search_type,
  n.nspname as schema_name,
  p.relname as parent_table,
  COUNT(c.oid) as partition_count,
  SUM((SELECT n_live_tup::bigint FROM pg_stat_user_tables WHERE schemaname = n.nspname AND relname = c.relname)) as total_rows_in_partitions
FROM pg_inherits i
JOIN pg_class p ON p.oid = i.inhparent
JOIN pg_class c ON c.oid = i.inhrelid
JOIN pg_namespace n ON n.oid = p.relnamespace
WHERE n.nspname = 'public'
  AND (p.relname LIKE '%match%' OR c.relname LIKE '%match%')
GROUP BY n.nspname, p.relname
ORDER BY total_rows_in_partitions DESC NULLS LAST;

-- 6. Check if startup_investor_matches has any child tables (partitions)
SELECT 
  'CHILD TABLES OF startup_investor_matches' as search_type,
  n.nspname as schema_name,
  c.relname as child_table_name,
  pg_size_pretty(pg_total_relation_size(n.nspname||'.'||c.relname)) as child_size,
  (SELECT n_live_tup::bigint FROM pg_stat_user_tables WHERE schemaname = n.nspname AND relname = c.relname) as child_row_count
FROM pg_inherits i
JOIN pg_class p ON p.oid = i.inhparent
JOIN pg_class c ON c.oid = i.inhrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND p.relname = 'startup_investor_matches'
ORDER BY child_row_count DESC NULLS LAST;

-- 7. Check ALL tables with more than 1M rows (4.5M should show up)
SELECT 
  'TABLES WITH >1M ROWS' as search_type,
  schemaname,
  relname as table_name,
  n_live_tup::bigint as row_count,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||relname)) as total_size
FROM pg_stat_user_tables
WHERE schemaname = 'public'
  AND n_live_tup > 1000000
ORDER BY n_live_tup DESC;

-- 8. Rebuild/recreate indexes if table is empty but indexes exist
-- (This is just diagnostic - don't run unless confirmed)
SELECT 
  'INDEX INFO FOR startup_investor_matches' as check_type,
  indexname,
  indexdef,
  pg_size_pretty(pg_relation_size(indexname::regclass)) as index_size
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'startup_investor_matches'
ORDER BY pg_relation_size(indexname::regclass) DESC;

-- 9. Check if maybe data is in a different database connection
-- (Can't query from SQL, but this shows what to check)
SELECT 
  'CHECKLIST' as reminder,
  '1. Check Supabase project URL matches .env file' as step1,
  '2. Check if dashboard connects to different project' as step2,
  '3. Check if data is in staging vs production' as step3,
  '4. Check browser console for actual API responses' as step4;
