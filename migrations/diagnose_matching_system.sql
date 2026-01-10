-- DIAGNOSE THE ACTUAL PROBLEM
-- This checks what's wrong with the matching system

-- 1. DO YOU HAVE STARTUPS?
SELECT 
    'STARTUPS CHECK' as check_name,
    COUNT(*) as total_startups,
    COUNT(*) FILTER (WHERE status = 'approved') as approved_startups,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_startups,
    COUNT(*) FILTER (WHERE total_god_score IS NOT NULL) as startups_with_god_score
FROM startup_uploads;

-- 2. DO YOU HAVE INVESTORS?
SELECT 
    'INVESTORS CHECK' as check_name,
    COUNT(*) as total_investors,
    COUNT(*) FILTER (WHERE status = 'active') as active_investors,
    COUNT(*) FILTER (WHERE status IS NULL) as investors_no_status
FROM investors;

-- 3. DO YOU HAVE A MATCHING QUEUE? (Needed for queue processor)
SELECT 
    'MATCHING QUEUE CHECK' as check_name,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'matching_queue') 
        THEN '✅ Table exists'
        ELSE '❌ Table does NOT exist - queue processor will fail!'
    END as queue_table_status;

-- 4. IF QUEUE EXISTS, CHECK IT
SELECT 
    'QUEUE CONTENTS' as check_name,
    status,
    COUNT(*) as count
FROM matching_queue
GROUP BY status;

-- 5. HOW MANY MATCHES HAVE BEEN CREATED?
SELECT 
    'MATCHES CREATED' as check_name,
    COUNT(*) as total_matches,
    COUNT(DISTINCT startup_id) as unique_startups_matched,
    COUNT(DISTINCT investor_id) as unique_investors_matched,
    MIN(match_score) as min_score,
    MAX(match_score) as max_score,
    AVG(match_score)::DECIMAL(5,2) as avg_score
FROM startup_investor_matches;

-- 6. CHECK IF QUEUE PROCESSOR HAS RUN (recent matches)
SELECT 
    'RECENT MATCHES' as check_name,
    COUNT(*) as matches_last_24h,
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as matches_last_7d
FROM startup_investor_matches
WHERE created_at > NOW() - INTERVAL '24 hours';

-- 7. SAMPLE STARTUP DATA (to see what we're working with)
SELECT 
    'SAMPLE STARTUP' as check_name,
    id,
    name,
    status,
    total_god_score,
    sectors,
    stage,
    created_at
FROM startup_uploads
WHERE status = 'approved'
LIMIT 1;

-- 8. SAMPLE INVESTOR DATA
SELECT 
    'SAMPLE INVESTOR' as check_name,
    id,
    name,
    firm,
    type,
    status,
    sectors,
    stage
FROM investors
LIMIT 1;
