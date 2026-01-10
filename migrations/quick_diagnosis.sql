-- Quick Diagnosis: Check if startup_investor_matches table exists and is accessible
-- Run this first to see what's wrong

-- 1. Does the table exist?
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = 'startup_investor_matches' 
            AND table_schema = 'public'
        ) THEN '✅ Table EXISTS'
        ELSE '❌ Table DOES NOT EXIST'
    END as table_status;

-- 2. Try to query it (will fail if table doesn't exist)
SELECT COUNT(*) as row_count FROM startup_investor_matches;

-- 3. Check table structure
SELECT 
    column_name, 
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'startup_investor_matches'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4. Check RLS is enabled
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'startup_investor_matches'
  AND schemaname = 'public';

-- 5. Check policies exist
SELECT 
    policyname,
    cmd as command,
    roles
FROM pg_policies
WHERE tablename = 'startup_investor_matches';

-- 6. Test a simple SELECT with RLS
SELECT * FROM startup_investor_matches LIMIT 1;
