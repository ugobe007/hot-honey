-- Find Potential Junk/Conflicting Tables
-- This helps identify tables that might be interfering

-- Find all tables with similar names
SELECT 
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as columns,
    'Similar name - might conflict' as note
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND (
    -- Match-related
    (table_name LIKE '%match%' AND table_name != 'startup_investor_matches')
    OR
    -- Startup-related (look for old/different names)
    (table_name LIKE '%startup%' AND table_name != 'startup_uploads' AND table_name != 'startup_investor_matches')
    OR
    -- Investor-related
    (table_name LIKE '%investor%' AND table_name != 'investors' AND table_name != 'startup_investor_matches')
  )
ORDER BY table_name;

-- Find tables with very few columns (likely test/junk)
SELECT 
    table_name,
    COUNT(*) as column_count,
    'Possible test/junk table' as note
FROM information_schema.columns
WHERE table_schema = 'public'
GROUP BY table_name
HAVING COUNT(*) < 5
ORDER BY table_name;

-- Find empty tables (might be junk)
SELECT 
    table_name,
    'Empty table - might be junk' as note
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns c
    WHERE c.table_name = t.table_name
    AND c.table_schema = 'public'
    AND c.column_name = 'id'
  )
ORDER BY table_name;
