-- MATCHING ALGORITHM DIAGNOSTIC QUERIES
-- Run these in your Supabase SQL editor to check algorithm performance

-- 1. Check if high GOD score startups are getting good matches
SELECT 
  s.name,
  s.total_god_score,
  COUNT(m.id) as match_count,
  AVG(m.match_score) as avg_match_score,
  MAX(m.match_score) as max_match_score,
  MIN(m.match_score) as min_match_score,
  COUNT(CASE WHEN m.match_score >= 70 THEN 1 END) as high_matches_70plus,
  COUNT(CASE WHEN m.match_score >= 80 THEN 1 END) as elite_matches_80plus
FROM startup_uploads s
LEFT JOIN startup_investor_matches m ON s.id = m.startup_id
WHERE s.status = 'approved' 
  AND s.total_god_score >= 70
GROUP BY s.id, s.name, s.total_god_score
ORDER BY s.total_god_score DESC
LIMIT 20;

-- 2. Match score distribution
SELECT 
  CASE 
    WHEN match_score >= 90 THEN '90-100 (Elite)'
    WHEN match_score >= 80 THEN '80-89 (Excellent)'
    WHEN match_score >= 70 THEN '70-79 (Good)'
    WHEN match_score >= 60 THEN '60-69 (Fair)'
    WHEN match_score >= 50 THEN '50-59 (Below Average)'
    WHEN match_score >= 40 THEN '40-49 (Poor)'
    ELSE '<40 (Very Poor)'
  END as score_range,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 1) as percentage
FROM startup_investor_matches
GROUP BY 
  CASE 
    WHEN match_score >= 90 THEN '90-100 (Elite)'
    WHEN match_score >= 80 THEN '80-89 (Excellent)'
    WHEN match_score >= 70 THEN '70-79 (Good)'
    WHEN match_score >= 60 THEN '60-69 (Fair)'
    WHEN match_score >= 50 THEN '50-59 (Below Average)'
    WHEN match_score >= 40 THEN '40-49 (Poor)'
    ELSE '<40 (Very Poor)'
  END
ORDER BY MIN(match_score) DESC;

-- 3. Find quality startups with poor matches
SELECT 
  s.name,
  s.total_god_score,
  AVG(m.match_score) as avg_match_score,
  COUNT(m.id) as match_count,
  CASE 
    WHEN AVG(m.match_score) < s.total_god_score - 20 THEN '⚠️ Underperforming'
    WHEN AVG(m.match_score) < s.total_god_score - 10 THEN '⚠️ Below Expected'
    ELSE '✓ OK'
  END as status
FROM startup_uploads s
LEFT JOIN startup_investor_matches m ON s.id = m.startup_id
WHERE s.status = 'approved' 
  AND s.total_god_score >= 70
GROUP BY s.id, s.name, s.total_god_score
HAVING COUNT(m.id) > 0
ORDER BY s.total_god_score DESC, avg_match_score ASC
LIMIT 20;

-- 4. Check match bonus effectiveness
-- This shows if stage/sector matches are actually improving scores
SELECT 
  s.total_god_score,
  AVG(m.match_score) as avg_final_score,
  AVG(m.match_score - s.total_god_score) as avg_bonus_points,
  COUNT(*) as match_count
FROM startup_investor_matches m
JOIN startup_uploads s ON m.startup_id = s.id
WHERE s.status = 'approved'
GROUP BY s.total_god_score
ORDER BY s.total_god_score DESC;

-- 5. Sector match effectiveness
-- Check if startups with sector matches get better scores
SELECT 
  CASE 
    WHEN m.reasoning ILIKE '%sector%' OR m.reasoning ILIKE '%industry%' THEN 'Has Sector Match'
    ELSE 'No Sector Match'
  END as has_sector_match,
  COUNT(*) as count,
  AVG(m.match_score) as avg_score,
  AVG(s.total_god_score) as avg_god_score,
  AVG(m.match_score - s.total_god_score) as avg_bonus
FROM startup_investor_matches m
JOIN startup_uploads s ON m.startup_id = s.id
WHERE s.status = 'approved'
GROUP BY 
  CASE 
    WHEN m.reasoning ILIKE '%sector%' OR m.reasoning ILIKE '%industry%' THEN 'Has Sector Match'
    ELSE 'No Sector Match'
  END;

-- 6. Overall algorithm health check
SELECT 
  'Total Matches' as metric,
  COUNT(*)::text as value
FROM startup_investor_matches
UNION ALL
SELECT 
  'Average Match Score',
  ROUND(AVG(match_score), 1)::text
FROM startup_investor_matches
UNION ALL
SELECT 
  'Startups with Matches',
  COUNT(DISTINCT startup_id)::text
FROM startup_investor_matches
UNION ALL
SELECT 
  'Investors with Matches',
  COUNT(DISTINCT investor_id)::text
FROM startup_investor_matches
UNION ALL
SELECT 
  'High Quality Matches (70+)',
  COUNT(*)::text
FROM startup_investor_matches
WHERE match_score >= 70
UNION ALL
SELECT 
  'Elite Matches (80+)',
  COUNT(*)::text
FROM startup_investor_matches
WHERE match_score >= 80
UNION ALL
SELECT 
  'Poor Matches (<50)',
  COUNT(*)::text
FROM startup_investor_matches
WHERE match_score < 50;





