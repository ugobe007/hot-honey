-- Diagnose Match Score Distribution Issue
-- IMPORTANT: Run this in Supabase SQL Editor with SERVICE ROLE permissions
-- Or use: Settings → API → Use service role key
-- If you get 0 matches, RLS is blocking - use service role or check RLS policies

-- 1. Check actual match score distribution
SELECT 
  CASE 
    WHEN match_score >= 80 THEN '80-100 (Excellent)'
    WHEN match_score >= 60 THEN '60-79 (Good)'
    WHEN match_score >= 40 THEN '40-59 (Fair)'
    ELSE '0-39 (Poor)'
  END as quality_range,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage,
  MIN(match_score) as min_score,
  MAX(match_score) as max_score,
  ROUND(AVG(match_score), 2) as avg_score
FROM startup_investor_matches
GROUP BY 
  CASE 
    WHEN match_score >= 80 THEN '80-100 (Excellent)'
    WHEN match_score >= 60 THEN '60-79 (Good)'
    WHEN match_score >= 40 THEN '40-59 (Fair)'
    ELSE '0-39 (Poor)'
  END
ORDER BY MIN(match_score) DESC;

-- 2. Check score statistics
SELECT 
  COUNT(*) as total_matches,
  MIN(match_score) as min_score,
  MAX(match_score) as max_score,
  ROUND(AVG(match_score)::numeric, 2) as avg_score,
  ROUND((PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY match_score))::numeric, 2) as median_score,
  ROUND(STDDEV(match_score)::numeric, 2) as std_dev,
  COUNT(DISTINCT match_score) as unique_scores
FROM startup_investor_matches;

-- 3. Check for suspicious patterns (all scores the same?)
SELECT 
  match_score,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM startup_investor_matches), 2) as percentage
FROM startup_investor_matches
GROUP BY match_score
ORDER BY count DESC
LIMIT 20;

-- 4. Check if scores are being rounded/capped
SELECT 
  match_score,
  COUNT(*) as count
FROM startup_investor_matches
WHERE match_score >= 60 AND match_score < 80
GROUP BY match_score
ORDER BY match_score DESC
LIMIT 10;

-- 5. Check recent matches vs old matches (has scoring changed?)
SELECT 
  CASE 
    WHEN created_at >= NOW() - INTERVAL '24 hours' THEN 'Last 24h'
    WHEN created_at >= NOW() - INTERVAL '7 days' THEN 'Last 7 days'
    ELSE 'Older'
  END as age_group,
  COUNT(*) as count,
  MIN(match_score) as min_score,
  MAX(match_score) as max_score,
  ROUND(AVG(match_score), 2) as avg_score
FROM startup_investor_matches
GROUP BY 
  CASE 
    WHEN created_at >= NOW() - INTERVAL '24 hours' THEN 'Last 24h'
    WHEN created_at >= NOW() - INTERVAL '7 days' THEN 'Last 7 days'
    ELSE 'Older'
  END
ORDER BY MIN(created_at) DESC;
