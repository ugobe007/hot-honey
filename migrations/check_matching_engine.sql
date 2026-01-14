-- Check Matching Engine Health
-- Comprehensive queries to check matching queue, recent matches, and statistics

-- STEP 1: Check matching queue status
SELECT 
  COUNT(*) as pending_jobs,
  MIN(created_at) as oldest_pending_job,
  MAX(created_at) as newest_pending_job
FROM matching_queue
WHERE processed_at IS NULL;

-- STEP 2: Recent queue activity (last 24 hours)
SELECT 
  COUNT(*) FILTER (WHERE processed_at IS NULL) as pending_jobs,
  COUNT(*) FILTER (WHERE processed_at IS NOT NULL) as processed_jobs_24h,
  COUNT(*) FILTER (WHERE status = 'pending') as pending_by_status,
  COUNT(*) FILTER (WHERE status = 'completed') as completed_by_status,
  COUNT(*) FILTER (WHERE status = 'failed') as failed_by_status,
  COUNT(*) as total_jobs_24h
FROM matching_queue
WHERE created_at >= NOW() - INTERVAL '24 hours';

-- STEP 3: Recent matches generated (last 24 hours)
SELECT 
  COUNT(*) as matches_generated_24h,
  COUNT(DISTINCT startup_id) as unique_startups_matched_24h,
  COUNT(DISTINCT investor_id) as unique_investors_matched_24h,
  ROUND(AVG(match_score)::numeric, 2) as avg_match_score_24h,
  MIN(match_score) as min_score_24h,
  MAX(match_score) as max_score_24h
FROM startup_investor_matches
WHERE created_at >= NOW() - INTERVAL '24 hours';

-- STEP 4: Overall match statistics
SELECT 
  COUNT(*) as total_matches,
  COUNT(DISTINCT startup_id) as unique_startups,
  COUNT(DISTINCT investor_id) as unique_investors,
  ROUND(AVG(match_score)::numeric, 2) as avg_match_score,
  MIN(match_score) as min_score,
  MAX(match_score) as max_score,
  COUNT(*) FILTER (WHERE match_score >= 80) as high_score_matches,
  COUNT(*) FILTER (WHERE match_score >= 70 AND match_score < 80) as good_score_matches,
  COUNT(*) FILTER (WHERE match_score >= 60 AND match_score < 70) as average_score_matches,
  COUNT(*) FILTER (WHERE match_score < 60) as low_score_matches
FROM startup_investor_matches;

-- STEP 5: Recent matches by startup (last 10 startups matched)
SELECT 
  su.name as startup_name,
  su.stage,
  COUNT(sim.id) as match_count,
  ROUND(AVG(sim.match_score)::numeric, 2) as avg_match_score,
  MAX(sim.created_at) as most_recent_match
FROM startup_investor_matches sim
JOIN startup_uploads su ON sim.startup_id = su.id
WHERE sim.created_at >= NOW() - INTERVAL '24 hours'
GROUP BY su.id, su.name, su.stage
ORDER BY most_recent_match DESC
LIMIT 10;

-- STEP 6: Check for duplicate matches (should be 0 after cleanup)
SELECT 
  startup_id,
  investor_id,
  COUNT(*) as duplicate_count
FROM startup_investor_matches
GROUP BY startup_id, investor_id
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC
LIMIT 20;

-- STEP 7: Match quality distribution
SELECT 
  CASE
    WHEN match_score >= 90 THEN 'Excellent (90+)'
    WHEN match_score >= 80 THEN 'Very Good (80-89)'
    WHEN match_score >= 70 THEN 'Good (70-79)'
    WHEN match_score >= 60 THEN 'Average (60-69)'
    ELSE 'Below Average (<60)'
  END as match_quality,
  COUNT(*) as match_count,
  ROUND(COUNT(*)::numeric / (SELECT COUNT(*) FROM startup_investor_matches)::numeric * 100, 2) as percentage
FROM startup_investor_matches
GROUP BY 
  CASE
    WHEN match_score >= 90 THEN 'Excellent (90+)'
    WHEN match_score >= 80 THEN 'Very Good (80-89)'
    WHEN match_score >= 70 THEN 'Good (70-79)'
    WHEN match_score >= 60 THEN 'Average (60-69)'
    ELSE 'Below Average (<60)'
  END
ORDER BY MIN(match_score) DESC;

-- STEP 8: Check if queue processor is working (recent activity)
SELECT 
  DATE_TRUNC('hour', created_at) as hour,
  COUNT(*) FILTER (WHERE processed_at IS NOT NULL) as processed_count,
  COUNT(*) FILTER (WHERE processed_at IS NULL) as pending_count
FROM matching_queue
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE_TRUNC('hour', created_at)
ORDER BY hour DESC
LIMIT 24;
