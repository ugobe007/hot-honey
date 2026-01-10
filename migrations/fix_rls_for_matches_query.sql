-- Fix RLS Policies for startup_investor_matches queries
-- This ensures that when querying matches, related startup_uploads and investors data can be accessed
-- 
-- PROBLEM: When Supabase does foreign key joins, RLS policies from ALL tables apply.
-- If startup_uploads RLS only allows 'approved' status, joins will fail even if matches table allows reads.
--
-- SOLUTION: Add permissive policies that allow reading data when accessed through matches,
-- OR use separate queries (which we've implemented in the frontend).

-- Step 1: Add a more permissive policy for startup_uploads (allows reading when referenced in matches)
-- Note: We keep existing policies and ADD this one - Supabase uses OR logic for SELECT policies
DROP POLICY IF EXISTS "Allow reading startups referenced in matches" ON startup_uploads;
CREATE POLICY "Allow reading startups referenced in matches"
  ON startup_uploads FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM startup_investor_matches 
      WHERE startup_investor_matches.startup_id = startup_uploads.id
    )
  );

-- Step 2: Ensure investors table allows reading when referenced in matches
-- (Most investors should already be readable, but this ensures matches queries work)
DROP POLICY IF EXISTS "Allow reading investors referenced in matches" ON investors;
CREATE POLICY "Allow reading investors referenced in matches"
  ON investors FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM startup_investor_matches 
      WHERE startup_investor_matches.investor_id = investors.id
    )
  );

-- Step 3: Verify matches table has permissive read policy
-- Drop and recreate to ensure it's correct
DROP POLICY IF EXISTS "Allow public read access to matches" ON startup_investor_matches;
CREATE POLICY "Allow public read access to matches"
  ON startup_investor_matches FOR SELECT
  USING (true);

-- Step 4: Also allow reading match data with basic fields only (fallback)
-- This ensures basic queries work even if joins fail
DROP POLICY IF EXISTS "Allow reading match basic data" ON startup_investor_matches;
CREATE POLICY "Allow reading match basic data"
  ON startup_investor_matches FOR SELECT
  USING (true);

-- Success message
SELECT '✅ RLS policies updated!' as status;
SELECT 'Policy changes:' as info;
SELECT '  - Added policy to read startups referenced in matches' as change;
SELECT '  - Added policy to read investors referenced in matches' as change;
SELECT '  - Ensured matches table has permissive read access' as change;
SELECT '' as spacer;
SELECT 'Note: Frontend now uses separate queries to avoid RLS join issues.' as note;
SELECT 'This migration adds backup policies in case you want to use joins later.' as note;
