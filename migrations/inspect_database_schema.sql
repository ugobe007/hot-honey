-- Database Schema Inspection Query
-- Run this in Supabase SQL Editor to see all tables and their structure

-- 1. List ALL tables in the public schema
SELECT 
    table_name,
    table_type,
    (SELECT COUNT(*) 
     FROM information_schema.columns 
     WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
ORDER BY table_name;

-- 2. Check if startup_investor_matches table exists and its structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'startup_investor_matches'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Check for duplicate or conflicting table names
SELECT 
    table_name,
    COUNT(*) as occurrences
FROM information_schema.tables
WHERE table_schema = 'public'
  AND (table_name LIKE '%match%' 
       OR table_name LIKE '%startup%' 
       OR table_name LIKE '%investor%')
GROUP BY table_name
ORDER BY table_name;

-- 4. Check if startup_uploads table exists (referenced by matches)
SELECT 
    'startup_uploads' as table_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = 'startup_uploads' 
            AND table_schema = 'public'
        ) THEN 'EXISTS ✅'
        ELSE 'MISSING ❌'
    END as status;

-- 5. Check if investors table exists (referenced by matches)
SELECT 
    'investors' as table_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = 'investors' 
            AND table_schema = 'public'
        ) THEN 'EXISTS ✅'
        ELSE 'MISSING ❌'
    END as status;

-- 6. Check for orphaned or test tables (common patterns)
SELECT 
    table_name,
    'Possible junk/test table' as note
FROM information_schema.tables
WHERE table_schema = 'public'
  AND (
    table_name LIKE '%test%'
    OR table_name LIKE '%temp%'
    OR table_name LIKE '%old%'
    OR table_name LIKE '%backup%'
    OR table_name LIKE '%_v1'
    OR table_name LIKE '%_v2'
    OR table_name LIKE '%_old'
    OR table_name = 'matches'  -- Old name?
    OR table_name = 'startups'  -- Old name?
  )
ORDER BY table_name;

-- 7. Count rows in key tables
SELECT 
    'startup_investor_matches' as table_name,
    COUNT(*) as row_count
FROM startup_investor_matches
UNION ALL
SELECT 
    'startup_uploads' as table_name,
    COUNT(*) as row_count
FROM startup_uploads
UNION ALL
SELECT 
    'investors' as table_name,
    COUNT(*) as row_count
FROM investors;

-- 8. Check RLS policies on startup_investor_matches
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'startup_investor_matches';

-- 9. Check indexes on startup_investor_matches
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'startup_investor_matches';
