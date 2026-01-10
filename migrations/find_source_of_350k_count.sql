-- Find where the 350,800 count is coming from
-- Both tables are empty, but dashboard shows this number!

-- 1. Check if there's a VIEW that might have cached data
SELECT 
  schemaname,
  viewname,
  definition
FROM pg_views
WHERE schemaname = 'public'
ORDER BY viewname;

-- 2. Check ALL tables in public schema (maybe there's another match table?)
SELECT 
  tablename,
  tableowner
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- 3. Check if startup_investor_matches has any rows at all (double-check)
SELECT 
  'Double-check startup_investor_matches' as check_type,
  COUNT(*)::bigint as row_count,
  COUNT(*) FILTER (WHERE match_score IS NOT NULL)::bigint as with_scores,
  MIN(created_at) as oldest_match,
  MAX(created_at) as newest_match
FROM startup_investor_matches;

-- 4. Check for materialized views
SELECT 
  schemaname,
  matviewname,
  ispopulated,
  definition
FROM pg_matviews
WHERE schemaname = 'public';

-- 5. Check if there's a function that returns a count
SELECT 
  p.proname as function_name,
  pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND (p.proname LIKE '%match%' OR p.proname LIKE '%count%')
LIMIT 10;

-- 6. Check matching_queue - maybe dashboard is counting queue entries as matches?
SELECT 
  'matching_queue total' as source,
  COUNT(*)::bigint as total_entries
FROM matching_queue;

-- 7. Calculate: startups × investors = potential matches?
-- Maybe dashboard is showing potential combinations, not actual matches?
SELECT 
  'Potential Match Combinations' as calculation,
  (SELECT COUNT(*) FROM startup_uploads WHERE status = 'approved')::bigint as approved_startups,
  (SELECT COUNT(*) FROM investors WHERE status = 'active')::bigint as active_investors,
  ((SELECT COUNT(*) FROM startup_uploads WHERE status = 'approved')::bigint * 
   (SELECT COUNT(*) FROM investors WHERE status = 'active')::bigint) as potential_matches;

-- If potential_matches is close to 350,800, that's the answer!
