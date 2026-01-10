-- Check RLS and Access Permissions
-- This verifies the frontend can actually query the table

-- 1. Check if RLS is enabled
SELECT 
    tablename,
    rowsecurity as rls_enabled,
    CASE 
        WHEN rowsecurity THEN '✅ RLS Enabled'
        ELSE '⚠️ RLS Disabled (less secure)'
    END as status
FROM pg_tables
WHERE tablename = 'startup_investor_matches'
  AND schemaname = 'public';

-- 2. List all RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd as command,
    CASE 
        WHEN qual IS NOT NULL THEN 'Has USING clause'
        ELSE 'No USING clause'
    END as using_clause,
    CASE 
        WHEN with_check IS NOT NULL THEN 'Has WITH CHECK clause'
        ELSE 'No WITH CHECK clause'
    END as with_check_clause
FROM pg_policies
WHERE tablename = 'startup_investor_matches';

-- 3. Test SELECT query (what frontend does)
SELECT 'Testing SELECT query...' as test;
SELECT COUNT(*) as can_select FROM startup_investor_matches;

-- 4. Test the exact frontend query
SELECT 'Testing exact frontend query...' as test;
SELECT 
    id, 
    match_score, 
    confidence_level, 
    startup_id, 
    investor_id, 
    reasoning, 
    why_you_match
FROM startup_investor_matches
WHERE status = 'suggested'
  AND match_score >= 35
LIMIT 1;

-- 5. Check if anon role has access
SELECT 
    'Checking permissions...' as test,
    grantee,
    privilege_type
FROM information_schema.role_table_grants
WHERE table_name = 'startup_investor_matches'
  AND table_schema = 'public'
  AND grantee IN ('anon', 'authenticated', 'public');
