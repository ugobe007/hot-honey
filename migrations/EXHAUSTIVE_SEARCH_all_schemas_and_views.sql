-- EXHAUSTIVE SEARCH: Find 4.5M matches - check EVERYWHERE
-- This searches all schemas, views, materialized views, and partitions

-- 1. Search ALL schemas for ANY table/view with 'match' in name
SELECT 
  'ALL SCHEMAS - ANY MATCH TABLE/VIEW' as search_type,
  n.nspname as schema_name,
  c.relname as object_name,
  CASE c.relkind
    WHEN 'r' THEN 'table'
    WHEN 'v' THEN 'view'
    WHEN 'm' THEN 'materialized_view'
    WHEN 'p' THEN 'partitioned_table'
    ELSE 'other'
  END as object_type,
  pg_size_pretty(pg_total_relation_size(n.nspname||'.'||c.relname)) as total_size,
  CASE 
    WHEN c.relkind = 'r' THEN (SELECT n_live_tup::bigint FROM pg_stat_user_tables WHERE schemaname = n.nspname AND relname = c.relname)
    WHEN c.relkind = 'm' THEN (SELECT reltuples::bigint FROM pg_class WHERE oid = c.oid)
    ELSE NULL
  END as row_count
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE (c.relname ILIKE '%match%' OR c.relname ILIKE '%pair%' OR c.relname ILIKE '%connection%')
  AND n.nspname NOT LIKE 'pg_%'
  AND n.nspname != 'information_schema'
  AND c.relkind IN ('r', 'v', 'm', 'p')
ORDER BY 
  CASE 
    WHEN c.relkind = 'r' THEN (SELECT n_live_tup::bigint FROM pg_stat_user_tables WHERE schemaname = n.nspname AND relname = c.relname)
    WHEN c.relkind = 'm' THEN (SELECT reltuples::bigint FROM pg_class WHERE oid = c.oid)
    ELSE 0
  END DESC NULLS LAST;

-- 2. Check for tables with > 1M rows (4.5M should show up)
SELECT 
  'TABLES WITH >1M ROWS' as search_type,
  schemaname,
  relname as table_name,
  n_live_tup::bigint as row_count,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||relname)) as total_size,
  last_analyze,
  last_autoanalyze
FROM pg_stat_user_tables
WHERE schemaname = 'public'
  AND n_live_tup > 1000000
ORDER BY n_live_tup DESC;

-- 3. Check for tables with > 100k rows (broader search)
SELECT 
  'TABLES WITH >100k ROWS' as search_type,
  schemaname,
  relname as table_name,
  n_live_tup::bigint as row_count,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||relname)) as total_size
FROM pg_stat_user_tables
WHERE schemaname = 'public'
  AND n_live_tup > 100000
ORDER BY n_live_tup DESC;

-- 4. Check ALL materialized views (might have cached data)
SELECT 
  'ALL MATERIALIZED VIEWS' as search_type,
  schemaname,
  matviewname,
  ispopulated,
  hasindexes,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||matviewname)) as total_size,
  (SELECT reltuples::bigint FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relname = matviewname AND n.nspname = schemaname) as row_count
FROM pg_matviews
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||matviewname) DESC NULLS LAST;

-- 5. Check for ANY large tables (sorted by size) - 4.5M rows should be large
SELECT 
  'ALL TABLES BY SIZE (LARGEST FIRST)' as search_type,
  schemaname,
  relname as table_name,
  n_live_tup::bigint as row_count,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||relname)) as total_size,
  pg_size_pretty(pg_relation_size(schemaname||'.'||relname)) as data_size,
  pg_size_pretty(pg_indexes_size(schemaname||'.'||relname)) as index_size
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||relname) DESC NULLS LAST
LIMIT 50;
