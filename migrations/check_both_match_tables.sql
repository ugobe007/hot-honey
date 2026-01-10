-- Check if there are TWO different match tables!
-- This might explain why dashboard shows data but SQL shows 0

-- 1. Check for 'matches' table (not startup_investor_matches)
SELECT 
  'matches table' as table_name,
  COUNT(*)::bigint as row_count
FROM matches;

-- 2. Check for 'startup_investor_matches' table
SELECT 
  'startup_investor_matches table' as table_name,
  COUNT(*)::bigint as row_count
FROM startup_investor_matches;

-- 3. List ALL tables with 'match' in name
SELECT 
  tablename,
  schemaname,
  tableowner
FROM pg_tables
WHERE tablename LIKE '%match%'
  AND schemaname = 'public'
ORDER BY tablename;

-- 4. Check structure of 'matches' table if it exists
SELECT 
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'matches'
ORDER BY ordinal_position;

-- 5. Check structure of 'startup_investor_matches' table
SELECT 
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'startup_investor_matches'
ORDER BY ordinal_position;

-- 6. If 'matches' table has data, check its score distribution
SELECT 
  CASE 
    WHEN match_score >= 80 THEN '80-100 (Excellent)'
    WHEN match_score >= 60 THEN '60-79 (Good)'
    WHEN match_score >= 40 THEN '40-59 (Fair)'
    ELSE '0-39 (Poor)'
  END as quality_range,
  COUNT(*)::bigint as count
FROM matches
GROUP BY 
  CASE 
    WHEN match_score >= 80 THEN '80-100 (Excellent)'
    WHEN match_score >= 60 THEN '60-79 (Good)'
    WHEN match_score >= 40 THEN '40-59 (Fair)'
    ELSE '0-39 (Poor)'
  END
ORDER BY MIN(match_score) DESC NULLS LAST;

-- 7. Quick comparison
SELECT 
  'matches' as table_name,
  COUNT(*)::bigint as total_rows,
  COUNT(DISTINCT match_score)::bigint as unique_scores,
  MIN(match_score)::numeric as min_score,
  MAX(match_score)::numeric as max_score,
  ROUND(AVG(match_score)::numeric, 2) as avg_score
FROM matches
UNION ALL
SELECT 
  'startup_investor_matches' as table_name,
  COUNT(*)::bigint,
  COUNT(DISTINCT match_score)::bigint,
  MIN(match_score)::numeric,
  MAX(match_score)::numeric,
  ROUND(AVG(match_score)::numeric, 2)
FROM startup_investor_matches;
