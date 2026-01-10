-- URGENT: Find 4.5M matches - use PostgreSQL statistics (bypasses RLS)
-- This queries pg_stat_user_tables which shows actual row counts

-- 1. Check ALL tables with actual row counts (from PostgreSQL statistics)
SELECT 
  schemaname,
  relname as table_name,
  n_live_tup::bigint as estimated_rows,
  n_dead_tup::bigint as dead_rows,
  last_vacuum,
  last_autovacuum,
  last_analyze,
  last_autoanalyze
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_live_tup DESC
LIMIT 50;

-- 2. Check specifically for match-related tables with high row counts
SELECT 
  'HIGH ROW COUNT TABLES' as search_type,
  relname as table_name,
  n_live_tup::bigint as estimated_rows
FROM pg_stat_user_tables
WHERE schemaname = 'public'
  AND n_live_tup > 100000  -- Tables with more than 100k rows
ORDER BY n_live_tup DESC;

-- 3. Get exact count using pg_class joined with pg_stat (bypasses all filters)
SELECT 
  'EXACT COUNT from pg_class' as method,
  n.nspname as schemaname,
  c.relname as table_name,
  c.reltuples::bigint as estimated_rows,
  c.relpages as pages,
  pg_size_pretty(pg_total_relation_size(n.nspname||'.'||c.relname)) as table_size
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'  -- 'r' = regular table
  AND c.relname LIKE '%match%'
ORDER BY c.reltuples DESC NULLS LAST;

-- 4. Try to query startup_investor_matches with explicit schema qualification
SELECT 
  'Direct Count Query' as method,
  COUNT(*)::bigint as total_rows
FROM public.startup_investor_matches;

-- 5. Try to get a sample - maybe RLS blocks COUNT but not SELECT?
SELECT 
  id,
  startup_id,
  investor_id,
  match_score,
  created_at
FROM public.startup_investor_matches
LIMIT 10;

-- 6. Check if there are partitions (partitioned tables)
SELECT 
  'PARTITION CHECK' as search_type,
  schemaname,
  tablename,
  pg_get_expr(c.relpartbound, c.oid) as partition_expression
FROM pg_tables t
JOIN pg_class c ON c.relname = t.tablename
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE t.schemaname = 'public'
  AND c.relkind = 'p'  -- 'p' = partition
  AND tablename LIKE '%match%';

-- 7. Check for child tables (if parent is partitioned)
SELECT 
  'CHILD TABLES' as search_type,
  n.nspname as schema,
  c.relname as child_table,
  p.relname as parent_table
FROM pg_inherits i
JOIN pg_class c ON c.oid = i.inhrelid
JOIN pg_class p ON p.oid = i.inhparent
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND (c.relname LIKE '%match%' OR p.relname LIKE '%match%');

-- 8. Get table size - if it's 4.5M rows, it should be large!
SELECT 
  'TABLE SIZES' as search_type,
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
  pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
  pg_size_pretty(pg_indexes_size(schemaname||'.'||tablename)) as indexes_size
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename LIKE '%match%'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- 9. Check ALL tables sorted by size (largest first) - matches should be one of the biggest
-- Join pg_stat_user_tables with pg_tables to get both size and row count
SELECT 
  'ALL TABLES BY SIZE' as search_type,
  t.schemaname,
  t.tablename,
  pg_size_pretty(pg_total_relation_size(t.schemaname||'.'||t.tablename)) as total_size,
  COALESCE(s.n_live_tup::bigint, 0) as estimated_rows
FROM pg_tables t
LEFT JOIN pg_stat_user_tables s ON s.relname = t.tablename AND s.schemaname = t.schemaname
WHERE t.schemaname = 'public'
ORDER BY pg_total_relation_size(t.schemaname||'.'||t.tablename) DESC NULLS LAST
LIMIT 30;
