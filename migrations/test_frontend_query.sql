-- Test Query: This is EXACTLY what the frontend is querying
-- Run this to see if the frontend can access matches

-- This matches the frontend query in MatchingEngine.tsx (line 348-354)
SELECT 
    id, 
    match_score, 
    confidence_level, 
    startup_id, 
    investor_id, 
    reasoning, 
    why_you_match,
    status
FROM startup_investor_matches
WHERE status = 'suggested'
  AND match_score >= 35
ORDER BY match_score DESC
LIMIT 100;

-- Count how many matches meet the criteria
SELECT 
    COUNT(*) as total_matches_meeting_criteria,
    'Matches with status=suggested AND score >= 35' as description
FROM startup_investor_matches
WHERE status = 'suggested'
  AND match_score >= 35;

-- Show ALL matches regardless of score (to see what we have)
SELECT 
    match_score,
    status,
    confidence_level,
    COUNT(*) as count
FROM startup_investor_matches
GROUP BY match_score, status, confidence_level
ORDER BY match_score DESC;

-- Show the actual matches (even low scores)
SELECT 
    id,
    match_score,
    status,
    confidence_level,
    reasoning,
    created_at
FROM startup_investor_matches
ORDER BY match_score DESC
LIMIT 20;
