-- Step 1: Find all views with "match" in the name
-- Run this first (safe, metadata-only)
SELECT
  schemaname,
  viewname
FROM pg_catalog.pg_views
WHERE schemaname = 'public'
  AND viewname ILIKE '%match%'
ORDER BY viewname;

-- Step 2: Find all functions with "match" in the name
-- Run this if Step 1 doesn't find the issue (also safe)
SELECT
  n.nspname AS schema,
  p.proname AS function_name,
  p.prokind,
  pg_get_function_identity_arguments(p.oid) AS arguments
FROM pg_catalog.pg_proc p
JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname ILIKE '%match%'
ORDER BY p.proname;

-- Step 3: Once we identify the view/function, extract its definition
-- Replace <VIEW_NAME> with the actual view name from Step 1
-- For VIEWS:
/*
SELECT definition
FROM pg_catalog.pg_views
WHERE schemaname = 'public'
  AND viewname = '<VIEW_NAME>';
*/

-- For FUNCTIONS:
/*
SELECT pg_catalog.pg_get_functiondef('<FUNCTION_NAME>'::regproc);
*/

-- Step 4: Search for problematic array_agg usage in views
-- This finds views that might have array_agg without proper grouping
SELECT
  viewname,
  definition
FROM pg_catalog.pg_views
WHERE schemaname = 'public'
  AND definition ILIKE '%array_agg%'
  AND (
    definition NOT ILIKE '%group by%' 
    OR definition NOT ILIKE '%over%'
    OR definition NOT ILIKE '%lateral%'
  );
