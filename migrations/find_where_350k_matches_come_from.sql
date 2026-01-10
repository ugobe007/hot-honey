-- Find where the 350,800 matches count is coming from
-- The dashboard shows this number but startup_investor_matches is empty!

-- 1. Check matching_queue (maybe dashboard is counting queue entries?)
SELECT 
  'matching_queue' as source,
  COUNT(*)::bigint as total_rows,
  COUNT(*) FILTER (WHERE status = 'completed')::bigint as completed,
  COUNT(*) FILTER (WHERE status = 'pending')::bigint as pending,
  COUNT(*) FILTER (WHERE status = 'processing')::bigint as processing,
  COUNT(*) FILTER (WHERE status = 'failed')::bigint as failed
FROM matching_queue;

-- 2. Check if there's a view that aggregates matches
SELECT 
  schemaname,
  viewname,
  definition
FROM pg_views
WHERE viewname LIKE '%match%'
  AND schemaname = 'public';

-- 3. Check for any materialized views
SELECT 
  schemaname,
  matviewname,
  ispopulated,
  hasindexes
FROM pg_matviews
WHERE matviewname LIKE '%match%'
  AND schemaname = 'public';

-- 4. Check if there's a function that calculates matches
SELECT 
  proname as function_name,
  prosrc as function_body
FROM pg_proc
WHERE proname LIKE '%match%'
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
LIMIT 10;

-- 5. Check startup_uploads count (maybe dashboard is multiplying?)
SELECT 
  'startup_uploads' as source,
  COUNT(*)::bigint as total_startups,
  COUNT(*) FILTER (WHERE status = 'approved')::bigint as approved_startups
FROM startup_uploads;

-- 6. Check investors count
SELECT 
  'investors' as source,
  COUNT(*)::bigint as total_investors,
  COUNT(*) FILTER (WHERE status = 'active')::bigint as active_investors
FROM investors;

-- 7. Calculate potential match combinations
-- (Maybe dashboard is showing potential matches, not actual?)
SELECT 
  'Potential Combinations' as calculation,
  (SELECT COUNT(*) FROM startup_uploads WHERE status = 'approved')::bigint as approved_startups,
  (SELECT COUNT(*) FROM investors WHERE status = 'active')::bigint as active_investors,
  ((SELECT COUNT(*) FROM startup_uploads WHERE status = 'approved') * 
   (SELECT COUNT(*) FROM investors WHERE status = 'active'))::bigint as potential_matches;

-- 8. Check for any other tables that might store match data
SELECT 
  tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND (tablename LIKE '%match%' OR tablename LIKE '%pair%' OR tablename LIKE '%connection%')
ORDER BY tablename;
