-- Complete Database Check - Run This First
-- This will show you everything in your database and help identify issues

-- ============================================
-- PART 1: Check if startup_investor_matches exists
-- ============================================
SELECT 
    'startup_investor_matches table check' as check_type,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = 'startup_investor_matches' 
            AND table_schema = 'public'
        ) THEN '✅ EXISTS'
        ELSE '❌ DOES NOT EXIST - TABLE IS MISSING!'
    END as status;

-- ============================================
-- PART 2: List ALL tables (see if there are conflicts)
-- ============================================
SELECT 
    'ALL TABLES IN DATABASE' as section,
    table_name,
    table_type,
    (SELECT COUNT(*) 
     FROM information_schema.columns 
     WHERE table_name = t.table_name 
     AND table_schema = 'public') as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
ORDER BY table_name;

-- ============================================
-- PART 3: Check for conflicting table names
-- ============================================
SELECT 
    'CONFLICTING TABLES' as section,
    table_name,
    'Possible conflict - similar name to startup_investor_matches' as note
FROM information_schema.tables
WHERE table_schema = 'public'
  AND (
    table_name LIKE '%match%' 
    OR table_name LIKE '%startup%investor%'
    OR table_name = 'matches'
    OR table_name = 'startup_matches'
    OR table_name = 'investor_matches'
  )
ORDER BY table_name;

-- ============================================
-- PART 4: Check startup_investor_matches structure (if it exists)
-- ============================================
SELECT 
    'startup_investor_matches STRUCTURE' as section,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'startup_investor_matches'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- ============================================
-- PART 5: Check if required columns exist
-- ============================================
SELECT 
    'REQUIRED COLUMNS CHECK' as section,
    column_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'startup_investor_matches'
            AND column_name = c.required_column
        ) THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as status
FROM (
    VALUES 
        ('id'), ('startup_id'), ('investor_id'), 
        ('match_score'), ('status'), ('created_at')
) as c(required_column);

-- ============================================
-- PART 6: Check Row Level Security (RLS)
-- ============================================
SELECT 
    'RLS CHECK' as section,
    tablename,
    rowsecurity as rls_enabled,
    CASE 
        WHEN rowsecurity THEN '✅ ENABLED'
        ELSE '⚠️ DISABLED - This might allow access but check policies'
    END as status
FROM pg_tables
WHERE tablename = 'startup_investor_matches'
  AND schemaname = 'public';

-- ============================================
-- PART 7: Check RLS Policies
-- ============================================
SELECT 
    'RLS POLICIES' as section,
    policyname,
    cmd as command,
    roles,
    CASE 
        WHEN policyname IS NOT NULL THEN '✅ POLICY EXISTS'
        ELSE '❌ NO POLICIES - This will block all access!'
    END as status
FROM pg_policies
WHERE tablename = 'startup_investor_matches';

-- ============================================
-- PART 8: Check row count
-- ============================================
SELECT 
    'ROW COUNT' as section,
    COUNT(*) as total_rows,
    COUNT(*) FILTER (WHERE status = 'suggested') as suggested_count,
    COUNT(*) FILTER (WHERE match_score >= 35) as high_score_count,
    COUNT(*) FILTER (WHERE status = 'suggested' AND match_score >= 35) as suggested_high_score_count
FROM startup_investor_matches;

-- ============================================
-- PART 9: Check dependent tables exist
-- ============================================
SELECT 
    'DEPENDENT TABLES CHECK' as section,
    table_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = t.check_table
            AND table_schema = 'public'
        ) THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as status
FROM (
    VALUES ('startup_uploads'), ('investors')
) as t(check_table);

-- ============================================
-- PART 10: Try a test query (will show actual error if it fails)
-- ============================================
SELECT 
    'TEST QUERY' as section,
    'Attempting to query startup_investor_matches...' as status;

-- This will error if table doesn't exist or RLS blocks it
SELECT * FROM startup_investor_matches LIMIT 1;
