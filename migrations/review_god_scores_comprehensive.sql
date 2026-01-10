-- Comprehensive GOD Score Review
-- This query answers all three questions about GOD scores

-- [1] CURRENT GOD SCORE STATISTICS
SELECT 
  '=== CURRENT GOD SCORE STATISTICS ===' as section,
  COUNT(*) FILTER (WHERE total_god_score IS NOT NULL) as startups_with_scores,
  COUNT(*) FILTER (WHERE total_god_score IS NULL AND status = 'approved') as startups_without_scores,
  ROUND(AVG(total_god_score)::numeric, 2) as average_score,
  MIN(total_god_score) as min_score,
  MAX(total_god_score) as max_score,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY total_god_score) as median_score,
  PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY total_god_score) as p25_score,
  PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY total_god_score) as p75_score,
  COUNT(*) FILTER (WHERE total_god_score >= 90) as elite_count,
  COUNT(*) FILTER (WHERE total_god_score >= 80 AND total_god_score < 90) as excellent_count,
  COUNT(*) FILTER (WHERE total_god_score >= 70 AND total_god_score < 80) as good_count,
  COUNT(*) FILTER (WHERE total_god_score >= 60 AND total_god_score < 70) as average_count,
  COUNT(*) FILTER (WHERE total_god_score < 60) as needs_work_count
FROM startup_uploads
WHERE status = 'approved';

-- [2] GOD SCORES BY INDUSTRY/SECTOR
SELECT 
  '=== GOD SCORES BY INDUSTRY/SECTOR ===' as section,
  unnest(sectors) as industry,
  COUNT(*) as startup_count,
  ROUND(AVG(total_god_score)::numeric, 2) as avg_god_score,
  ROUND(MIN(total_god_score)::numeric, 2) as min_score,
  ROUND(MAX(total_god_score)::numeric, 2) as max_score,
  COUNT(*) FILTER (WHERE total_god_score >= 80) as high_scorers,
  ROUND(COUNT(*) FILTER (WHERE total_god_score >= 80)::numeric / COUNT(*)::numeric * 100, 1) as high_score_percentage
FROM startup_uploads
WHERE status = 'approved' 
  AND total_god_score IS NOT NULL
  AND sectors IS NOT NULL
  AND array_length(sectors, 1) > 0
GROUP BY unnest(sectors)
ORDER BY avg_god_score DESC, startup_count DESC
LIMIT 20;

-- [2B] GOD SCORES BY INDUSTRY (Alternative - using tags or other columns if available)
-- Note: Using sectors only since industries column doesn't exist
-- This query is commented out but kept for reference if industries column is added later

-- [3] GOD SCORE COMPONENT BREAKDOWN (To understand algorithm health)
-- Note: This query will include ecosystem_score, grit_score, and problem_validation_score
-- after running migrations/add_ecosystem_grit_scores.sql
-- For now, it only includes the 5 core components that exist
SELECT 
  ROUND(AVG(team_score)::numeric, 2) as avg_team_score,
  ROUND(AVG(traction_score)::numeric, 2) as avg_traction_score,
  ROUND(AVG(market_score)::numeric, 2) as avg_market_score,
  ROUND(AVG(product_score)::numeric, 2) as avg_product_score,
  ROUND(AVG(vision_score)::numeric, 2) as avg_vision_score
  -- Uncomment these after running migrations/add_ecosystem_grit_scores.sql:
  -- , ROUND(AVG(ecosystem_score)::numeric, 2) as avg_ecosystem_score
  -- , ROUND(AVG(grit_score)::numeric, 2) as avg_grit_score
  -- , ROUND(AVG(problem_validation_score)::numeric, 2) as avg_problem_validation_score
FROM startup_uploads
WHERE status = 'approved' 
  AND total_god_score IS NOT NULL;

-- [3B] COMPONENT SCORE DISTRIBUTION (High/Low bias detection)
-- Note: This query will work after running migrations/add_ecosystem_grit_scores.sql
-- For now, it includes only the 5 core components. After migration, you can add ecosystem, grit, and problem_validation.
SELECT 
  'Team' as component,
  ROUND(AVG(team_score)::numeric, 2) as avg_score,
  COUNT(*) FILTER (WHERE team_score >= 75) as high_count,
  COUNT(*) FILTER (WHERE team_score < 45) as low_count,
  CASE 
    WHEN AVG(team_score) > 75 THEN 'HIGH BIAS'
    WHEN AVG(team_score) < 45 THEN 'LOW BIAS'
    ELSE 'NORMAL'
  END as bias_status
FROM startup_uploads
WHERE status = 'approved' AND team_score IS NOT NULL
UNION ALL
SELECT 
  'Traction' as component,
  ROUND(AVG(traction_score)::numeric, 2) as avg_score,
  COUNT(*) FILTER (WHERE traction_score >= 75) as high_count,
  COUNT(*) FILTER (WHERE traction_score < 45) as low_count,
  CASE 
    WHEN AVG(traction_score) > 75 THEN 'HIGH BIAS'
    WHEN AVG(traction_score) < 45 THEN 'LOW BIAS'
    ELSE 'NORMAL'
  END as bias_status
FROM startup_uploads
WHERE status = 'approved' AND traction_score IS NOT NULL
UNION ALL
SELECT 
  'Market' as component,
  ROUND(AVG(market_score)::numeric, 2) as avg_score,
  COUNT(*) FILTER (WHERE market_score >= 75) as high_count,
  COUNT(*) FILTER (WHERE market_score < 45) as low_count,
  CASE 
    WHEN AVG(market_score) > 75 THEN 'HIGH BIAS'
    WHEN AVG(market_score) < 45 THEN 'LOW BIAS'
    ELSE 'NORMAL'
  END as bias_status
FROM startup_uploads
WHERE status = 'approved' AND market_score IS NOT NULL
UNION ALL
SELECT 
  'Product' as component,
  ROUND(AVG(product_score)::numeric, 2) as avg_score,
  COUNT(*) FILTER (WHERE product_score >= 75) as high_count,
  COUNT(*) FILTER (WHERE product_score < 45) as low_count,
  CASE 
    WHEN AVG(product_score) > 75 THEN 'HIGH BIAS'
    WHEN AVG(product_score) < 45 THEN 'LOW BIAS'
    ELSE 'NORMAL'
  END as bias_status
FROM startup_uploads
WHERE status = 'approved' AND product_score IS NOT NULL
UNION ALL
SELECT 
  'Vision' as component,
  ROUND(AVG(vision_score)::numeric, 2) as avg_score,
  COUNT(*) FILTER (WHERE vision_score >= 75) as high_count,
  COUNT(*) FILTER (WHERE vision_score < 45) as low_count,
  CASE 
    WHEN AVG(vision_score) > 75 THEN 'HIGH BIAS'
    WHEN AVG(vision_score) < 45 THEN 'LOW BIAS'
    ELSE 'NORMAL'
  END as bias_status
FROM startup_uploads
WHERE status = 'approved' AND vision_score IS NOT NULL;

-- [4] TOP 20 STARTUPS BY GOD SCORE (For ranking page)
SELECT 
  '=== TOP 20 STARTUPS BY GOD SCORE ===' as section,
  ROW_NUMBER() OVER (ORDER BY total_god_score DESC) as rank,
  name,
  total_god_score,
  team_score,
  traction_score,
  market_score,
  product_score,
  vision_score,
  sectors,
  stage,
  created_at
FROM startup_uploads
WHERE status = 'approved' 
  AND total_god_score IS NOT NULL
ORDER BY total_god_score DESC
LIMIT 20;

-- [5] GOD SCORE BY FUNDING STAGE (To see if scores correlate with stage)
SELECT 
  CASE 
    WHEN stage IS NULL THEN 'Unknown'
    WHEN stage = 0 THEN 'Pre-Seed'
    WHEN stage = 1 THEN 'Pre-Seed'
    WHEN stage = 2 THEN 'Seed'
    WHEN stage = 3 THEN 'Series A'
    WHEN stage = 4 THEN 'Series B'
    WHEN stage = 5 THEN 'Series C+'
    ELSE 'Stage ' || stage::text
  END as funding_stage,
  COUNT(*) as startup_count,
  ROUND(AVG(total_god_score)::numeric, 2) as avg_god_score,
  ROUND(MIN(total_god_score)::numeric, 2) as min_score,
  ROUND(MAX(total_god_score)::numeric, 2) as max_score
FROM startup_uploads
WHERE status = 'approved' 
  AND total_god_score IS NOT NULL
GROUP BY stage
ORDER BY avg_god_score DESC;
