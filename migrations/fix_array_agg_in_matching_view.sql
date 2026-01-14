-- ============================================================================
-- FIX ARRAY_AGG BUG IN MATCHING VIEW/FUNCTION
-- ============================================================================
-- Use this template once you've identified the problematic view/function
-- Replace <VIEW_NAME> with the actual view name from the diagnostic script
-- ============================================================================

-- STEP 1: Get the current definition of the problematic view
-- Replace <VIEW_NAME> with the actual view name (e.g., 'investor_startup_matches_view')
/*
SELECT definition
FROM pg_catalog.pg_views
WHERE schemaname = 'public'
  AND viewname = '<VIEW_NAME>';
*/

-- STEP 2: Common bug patterns and fixes:

-- ============================================================================
-- PATTERN 1: array_agg in SELECT without GROUP BY
-- ============================================================================
-- ❌ BUGGY:
/*
CREATE OR REPLACE VIEW <VIEW_NAME> AS
SELECT 
  s.id,
  s.name,
  array_agg(t.tag) as tags  -- ❌ No GROUP BY!
FROM startups s
LEFT JOIN tags t ON s.id = t.startup_id;
*/

-- ✅ FIXED (Option A - Add GROUP BY):
/*
CREATE OR REPLACE VIEW <VIEW_NAME> AS
SELECT 
  s.id,
  s.name,
  array_agg(t.tag) as tags
FROM startups s
LEFT JOIN tags t ON s.id = t.startup_id
GROUP BY s.id, s.name;  -- ✅ Added GROUP BY
*/

-- ✅ FIXED (Option B - Use LATERAL):
/*
CREATE OR REPLACE VIEW <VIEW_NAME> AS
SELECT 
  s.id,
  s.name,
  t.tags
FROM startups s
LEFT JOIN LATERAL (
  SELECT array_agg(tag) as tags
  FROM tags
  WHERE startup_id = s.id
) t ON true;  -- ✅ LATERAL subquery handles aggregation
*/

-- ============================================================================
-- PATTERN 2: array_agg in JOIN condition
-- ============================================================================
-- ❌ BUGGY:
/*
SELECT s.*
FROM startups s
JOIN (
  SELECT startup_id, array_agg(tag) as tags
  FROM tags
) t ON s.id = t.startup_id;  -- ❌ array_agg in subquery without GROUP BY
*/

-- ✅ FIXED:
/*
SELECT s.*
FROM startups s
JOIN (
  SELECT startup_id, array_agg(tag) as tags
  FROM tags
  GROUP BY startup_id  -- ✅ Added GROUP BY
) t ON s.id = t.startup_id;
*/

-- ============================================================================
-- PATTERN 3: array_agg in WHERE clause
-- ============================================================================
-- ❌ BUGGY:
/*
SELECT s.*
FROM startups s
WHERE array_agg(t.tag) && ARRAY['AI', 'ML'];  -- ❌ Can't use aggregate in WHERE
*/

-- ✅ FIXED (Use HAVING or subquery):
/*
-- Option A: Use HAVING (if grouping)
SELECT s.id, array_agg(t.tag) as tags
FROM startups s
JOIN tags t ON s.id = t.startup_id
GROUP BY s.id
HAVING array_agg(t.tag) && ARRAY['AI', 'ML'];  -- ✅ HAVING instead of WHERE

-- Option B: Use subquery
SELECT s.*
FROM startups s
WHERE s.id IN (
  SELECT startup_id
  FROM tags
  WHERE tag = ANY(ARRAY['AI', 'ML'])
  GROUP BY startup_id
);  -- ✅ Subquery handles aggregation
*/

-- ============================================================================
-- PATTERN 4: Multiple array_agg without proper grouping
-- ============================================================================
-- ❌ BUGGY:
/*
SELECT 
  s.id,
  array_agg(t.tag) as tags,
  array_agg(i.name) as investors  -- ❌ Multiple aggregates, no GROUP BY
FROM startups s
LEFT JOIN tags t ON s.id = t.startup_id
LEFT JOIN investors i ON s.id = i.startup_id;
*/

-- ✅ FIXED:
/*
SELECT 
  s.id,
  t.tags,
  i.investors
FROM startups s
LEFT JOIN LATERAL (
  SELECT array_agg(tag) as tags
  FROM tags
  WHERE startup_id = s.id
) t ON true
LEFT JOIN LATERAL (
  SELECT array_agg(name) as investors
  FROM investors
  WHERE startup_id = s.id
) i ON true;  -- ✅ Separate LATERAL for each aggregation
*/

-- ============================================================================
-- EXAMPLE: Fixing a matching view with match_reasons array
-- ============================================================================
-- If the bug is in a view that aggregates match_reasons from startup_investor_matches:

-- ❌ BUGGY (hypothetical):
/*
CREATE OR REPLACE VIEW startup_match_summary AS
SELECT 
  s.id,
  s.name,
  array_agg(m.match_reasons) as all_reasons  -- ❌ No GROUP BY
FROM startup_uploads s
LEFT JOIN startup_investor_matches m ON s.id = m.startup_id;
*/

-- ✅ FIXED:
/*
CREATE OR REPLACE VIEW startup_match_summary AS
SELECT 
  s.id,
  s.name,
  COALESCE(m.all_reasons, ARRAY[]::text[]) as all_reasons
FROM startup_uploads s
LEFT JOIN LATERAL (
  SELECT array_agg(match_reasons) as all_reasons
  FROM startup_investor_matches
  WHERE startup_id = s.id
    AND match_reasons IS NOT NULL
) m ON true;
*/

-- ============================================================================
-- STEP 3: After fixing, test the view
-- ============================================================================
-- SELECT * FROM <VIEW_NAME> LIMIT 10;

-- ============================================================================
-- STEP 4: If it's a function, use this pattern
-- ============================================================================
-- ❌ BUGGY FUNCTION:
/*
CREATE OR REPLACE FUNCTION get_startup_tags(startup_uuid UUID)
RETURNS TABLE(tags TEXT[]) AS $$
BEGIN
  RETURN QUERY
  SELECT array_agg(t.tag)  -- ❌ No GROUP BY in function
  FROM tags t
  WHERE t.startup_id = startup_uuid;
END;
$$ LANGUAGE plpgsql;
*/

-- ✅ FIXED:
/*
CREATE OR REPLACE FUNCTION get_startup_tags(startup_uuid UUID)
RETURNS TABLE(tags TEXT[]) AS $$
BEGIN
  RETURN QUERY
  SELECT array_agg(t.tag)
  FROM tags t
  WHERE t.startup_id = startup_uuid
  GROUP BY t.startup_id;  -- ✅ Added GROUP BY (or use subquery)
END;
$$ LANGUAGE plpgsql;
*/
