-- Check if matches table exists and has data
-- Run this in Supabase SQL Editor

-- 1. Check if table exists
SELECT 
  schemaname,
  tablename,
  tableowner
FROM pg_tables
WHERE tablename = 'startup_investor_matches'
  AND schemaname = 'public';

-- 2. Check table row count (bypass RLS)
SELECT 
  COUNT(*) as total_rows
FROM startup_investor_matches;

-- 3. Check RLS status
SELECT 
  tablename,
  rowsecurity as rls_enabled,
  CASE 
    WHEN rowsecurity THEN '✅ RLS Enabled'
    ELSE '⚠️ RLS Disabled'
  END as status
FROM pg_tables
WHERE tablename = 'startup_investor_matches'
  AND schemaname = 'public';

-- 4. List RLS policies
SELECT 
  policyname,
  cmd as command,
  qual as using_clause,
  with_check as with_check_clause
FROM pg_policies
WHERE tablename = 'startup_investor_matches'
ORDER BY policyname;

-- 5. Try to select with explicit permissions
SELECT 
  COUNT(*) as count_with_service_role,
  MIN(match_score) as min_score,
  MAX(match_score) as max_score
FROM startup_investor_matches;

-- 6. Check if matches exist but query is failing
SELECT 
  'Sample match IDs' as info,
  id,
  match_score,
  created_at
FROM startup_investor_matches
LIMIT 5;
