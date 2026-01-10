-- Quick check of queue status
-- Run this to see how many startups are in the queue and how many are processed

SELECT 
    status,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 1) as percentage
FROM matching_queue
GROUP BY status
ORDER BY 
    CASE status
        WHEN 'pending' THEN 1
        WHEN 'processing' THEN 2
        WHEN 'completed' THEN 3
        WHEN 'failed' THEN 4
    END;

-- Check total matches generated
SELECT 
    COUNT(*) as total_matches,
    COUNT(DISTINCT startup_id) as unique_startups_matched,
    COUNT(DISTINCT investor_id) as unique_investors_matched,
    ROUND(AVG(match_score)::numeric, 2) as avg_match_score
FROM startup_investor_matches;
