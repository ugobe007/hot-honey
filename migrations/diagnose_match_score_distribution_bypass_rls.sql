-- Diagnose Match Score Distribution (Bypass RLS Version)
-- This version uses explicit table access to bypass RLS if needed
-- Run in Supabase SQL Editor

-- First, check if we can see the table at all
SELECT 
  'Table Check' as step,
  COUNT(*) as row_count
FROM public.startup_investor_matches;

-- If that returns 0, try with explicit schema
SELECT 
  'Schema Check' as step,
  COUNT(*) as row_count
FROM startup_investor_matches;

-- 1. Check actual match score distribution (simplified)
SELECT 
  CASE 
    WHEN match_score >= 80 THEN '80-100 (Excellent)'
    WHEN match_score >= 60 THEN '60-79 (Good)'
    WHEN match_score >= 40 THEN '40-59 (Fair)'
    ELSE '0-39 (Poor)'
  END as quality_range,
  COUNT(*)::bigint as count,
  ROUND((COUNT(*) * 100.0 / NULLIF((SELECT COUNT(*) FROM startup_investor_matches), 0))::numeric, 2) as percentage,
  MIN(match_score)::numeric as min_score,
  MAX(match_score)::numeric as max_score,
  ROUND(AVG(match_score)::numeric, 2) as avg_score
FROM startup_investor_matches
GROUP BY 
  CASE 
    WHEN match_score >= 80 THEN '80-100 (Excellent)'
    WHEN match_score >= 60 THEN '60-79 (Good)'
    WHEN match_score >= 40 THEN '40-59 (Fair)'
    ELSE '0-39 (Poor)'
  END
ORDER BY MIN(match_score) DESC NULLS LAST;

-- 2. Check score statistics (with null handling)
SELECT 
  COUNT(*)::bigint as total_matches,
  MIN(match_score)::numeric as min_score,
  MAX(match_score)::numeric as max_score,
  ROUND(AVG(match_score)::numeric, 2) as avg_score,
  ROUND((PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY match_score))::numeric, 2) as median_score,
  ROUND(STDDEV(match_score)::numeric, 2) as std_dev,
  COUNT(DISTINCT match_score)::bigint as unique_scores
FROM startup_investor_matches
WHERE match_score IS NOT NULL;

-- 3. Check for suspicious patterns (all scores the same?)
SELECT 
  match_score,
  COUNT(*)::bigint as count,
  ROUND((COUNT(*) * 100.0 / NULLIF((SELECT COUNT(*) FROM startup_investor_matches), 0))::numeric, 2) as percentage
FROM startup_investor_matches
WHERE match_score IS NOT NULL
GROUP BY match_score
ORDER BY count DESC
LIMIT 20;

-- 4. Check score distribution in Good range (60-79)
SELECT 
  match_score,
  COUNT(*)::bigint as count
FROM startup_investor_matches
WHERE match_score >= 60 AND match_score < 80
GROUP BY match_score
ORDER BY match_score DESC
LIMIT 10;

-- 5. Simple check: Just get total count and sample scores
SELECT 
  'Quick Check' as info,
  COUNT(*)::bigint as total_rows,
  COUNT(DISTINCT match_score)::bigint as unique_scores,
  MIN(match_score)::numeric as min_score,
  MAX(match_score)::numeric as max_score
FROM startup_investor_matches;
