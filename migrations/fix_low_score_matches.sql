-- Fix: Lower the match_score threshold temporarily OR increase scores
-- The frontend requires match_score >= 35, but your matches have score 20

-- Option 1: Update existing matches to have higher scores (for testing)
-- Uncomment this if you want to boost scores temporarily
/*
UPDATE startup_investor_matches
SET match_score = match_score + 20
WHERE match_score < 35;
*/

-- Option 2: See how many matches would show if we lower threshold to 20
SELECT 
    COUNT(*) as matches_with_score_20_plus,
    'Would show if threshold was 20' as note
FROM startup_investor_matches
WHERE status = 'suggested'
  AND match_score >= 20;

-- Option 3: Check what scores we actually have
SELECT 
    MIN(match_score) as min_score,
    MAX(match_score) as max_score,
    AVG(match_score)::DECIMAL(5,2) as avg_score,
    COUNT(*) as total_matches,
    COUNT(*) FILTER (WHERE match_score >= 35) as matches_above_35,
    COUNT(*) FILTER (WHERE match_score >= 20) as matches_above_20
FROM startup_investor_matches
WHERE status = 'suggested';

-- Option 4: Show distribution of scores
SELECT 
    CASE 
        WHEN match_score >= 80 THEN '80-100 (Excellent)'
        WHEN match_score >= 60 THEN '60-79 (Good)'
        WHEN match_score >= 40 THEN '40-59 (Fair)'
        WHEN match_score >= 35 THEN '35-39 (Minimum)'
        WHEN match_score >= 20 THEN '20-34 (Below threshold)'
        ELSE '0-19 (Very Low)'
    END as score_range,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 1) as percentage
FROM startup_investor_matches
WHERE status = 'suggested'
GROUP BY 
    CASE 
        WHEN match_score >= 80 THEN '80-100 (Excellent)'
        WHEN match_score >= 60 THEN '60-79 (Good)'
        WHEN match_score >= 40 THEN '40-59 (Fair)'
        WHEN match_score >= 35 THEN '35-39 (Minimum)'
        WHEN match_score >= 20 THEN '20-34 (Below threshold)'
        ELSE '0-19 (Very Low)'
    END
ORDER BY MIN(match_score) DESC;
