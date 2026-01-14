-- ============================================================================
-- DIAGNOSE MATCHING ENGINE ARRAY_AGG BUG
-- ============================================================================
-- This script helps identify views/functions with problematic array_agg usage
-- Run each step in Supabase SQL Editor
-- ============================================================================

-- STEP 1: Find all views with "match" in the name
-- Run this first (safe, metadata-only)
SELECT
  schemaname,
  viewname,
  viewowner
FROM pg_catalog.pg_views
WHERE schemaname = 'public'
  AND viewname ILIKE '%match%'
ORDER BY viewname;

-- STEP 2: Find all functions with "match" in the name
-- Run this if Step 1 doesn't find the issue (also safe)
SELECT
  n.nspname AS schema,
  p.proname AS function_name,
  p.prokind,
  pg_get_function_identity_arguments(p.oid) AS arguments,
  CASE 
    WHEN p.prokind = 'f' THEN 'function'
    WHEN p.prokind = 'p' THEN 'procedure'
    WHEN p.prokind = 'a' THEN 'aggregate'
    WHEN p.prokind = 'w' THEN 'window'
    ELSE 'other'
  END AS kind
FROM pg_catalog.pg_proc p
JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname ILIKE '%match%'
ORDER BY p.proname;

-- STEP 3: Search for views with array_agg that might be problematic
-- This finds views that use array_agg
SELECT
  viewname,
  CASE 
    WHEN definition ILIKE '%group by%' THEN 'Has GROUP BY'
    WHEN definition ILIKE '%over%' THEN 'Has OVER (window)'
    WHEN definition ILIKE '%lateral%' THEN 'Has LATERAL'
    ELSE '⚠️ NO GROUPING CONTEXT'
  END AS grouping_context,
  LENGTH(definition) as def_length
FROM pg_catalog.pg_views
WHERE schemaname = 'public'
  AND definition ILIKE '%array_agg%'
ORDER BY viewname;

-- STEP 4: Extract full definition of matching views
-- Replace <VIEW_NAME> with actual view names from Step 1
-- Example: match_analytics, top_matched_startups, top_active_investors, match_statistics

-- For each view, run:
/*
SELECT 
  viewname,
  definition
FROM pg_catalog.pg_views
WHERE schemaname = 'public'
  AND viewname = 'match_analytics';
*/

-- STEP 5: Check for array_agg in JOIN conditions (common bug)
-- This is harder to detect automatically, but look for patterns like:
-- ❌ JOIN ... ON array_agg(...) = ...
-- ❌ WHERE array_agg(...) IN (...)

-- STEP 6: Test each matching view to see which one fails
-- Run each view query individually to find the one that errors:

-- Test match_analytics
SELECT * FROM match_analytics LIMIT 1;

-- Test top_matched_startups  
SELECT * FROM top_matched_startups LIMIT 1;

-- Test top_active_investors
SELECT * FROM top_active_investors LIMIT 1;

-- Test match_statistics
SELECT * FROM match_statistics LIMIT 1;

-- If any of these fail with "array_agg must be used in aggregate context"
-- that's your problematic view!

-- STEP 7: Once identified, extract the full definition
-- Replace <PROBLEM_VIEW> with the view that failed:
/*
SELECT definition
FROM pg_catalog.pg_views
WHERE schemaname = 'public'
  AND viewname = '<PROBLEM_VIEW>';
*/

-- STEP 8: Common fixes for array_agg bugs:
-- 
-- ❌ BAD (array_agg without grouping):
--   SELECT s.id, array_agg(t.tag) as tags
--   FROM startups s
--   JOIN tags t ON s.id = t.startup_id;
--
-- ✅ GOOD (with GROUP BY):
--   SELECT s.id, array_agg(t.tag) as tags
--   FROM startups s
--   JOIN tags t ON s.id = t.startup_id
--   GROUP BY s.id;
--
-- ✅ GOOD (with window function):
--   SELECT s.id, array_agg(t.tag) OVER (PARTITION BY s.id) as tags
--   FROM startups s
--   JOIN tags t ON s.id = t.startup_id;
--
-- ✅ GOOD (with LATERAL):
--   SELECT s.id, t.tags
--   FROM startups s
--   LEFT JOIN LATERAL (
--     SELECT array_agg(tag) as tags
--     FROM tags
--     WHERE startup_id = s.id
--   ) t ON true;
