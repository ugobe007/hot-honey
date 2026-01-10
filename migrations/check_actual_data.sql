-- Check ACTUAL Data in Database
-- This shows what tables exist and how many rows they have

-- 1. List ALL tables with row counts
SELECT 
    schemaname,
    tablename,
    (SELECT COUNT(*) 
     FROM information_schema.columns 
     WHERE table_schema = t.schemaname 
     AND table_name = t.tablename) as column_count
FROM pg_tables t
WHERE schemaname = 'public'
ORDER BY tablename;

-- 2. Count rows in startup_uploads (where your 3000 startups should be)
SELECT 
    'startup_uploads' as table_name,
    COUNT(*) as row_count,
    COUNT(*) FILTER (WHERE status = 'approved') as approved_count,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_count
FROM startup_uploads;

-- 3. Count rows in investors (where your 3100 investors should be)
SELECT 
    'investors' as table_name,
    COUNT(*) as row_count
FROM investors;

-- 4. Count rows in startup_investor_matches (the matches table)
SELECT 
    'startup_investor_matches' as table_name,
    COUNT(*) as total_matches,
    COUNT(*) FILTER (WHERE status = 'suggested') as suggested_matches,
    COUNT(*) FILTER (WHERE match_score >= 20) as matches_above_20,
    COUNT(*) FILTER (WHERE match_score >= 35) as matches_above_35
FROM startup_investor_matches;

-- 5. Check if there are other startup tables
SELECT 
    table_name,
    'Check if this is where startups are' as note
FROM information_schema.tables
WHERE table_schema = 'public'
  AND (
    table_name LIKE '%startup%'
    OR table_name = 'startups'  -- Old table name?
  )
ORDER BY table_name;

-- 6. Check what tables the matching engine should query
-- Show sample data from startup_uploads
SELECT 
    'Sample from startup_uploads' as section,
    id,
    name,
    status,
    total_god_score,
    created_at
FROM startup_uploads
LIMIT 5;

-- 7. Show sample data from investors
SELECT 
    'Sample from investors' as section,
    id,
    name,
    firm,
    type,
    created_at
FROM investors
LIMIT 5;
