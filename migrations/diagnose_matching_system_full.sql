-- FULL DIAGNOSIS - Run ALL of these to see the complete picture
-- Run each section separately if needed

-- ============================================
-- SECTION 1: STARTUPS CHECK
-- ============================================
SELECT 
    'STARTUPS' as section,
    COUNT(*) as total_startups,
    COUNT(*) FILTER (WHERE status = 'approved') as approved_startups,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_startups,
    COUNT(*) FILTER (WHERE total_god_score IS NOT NULL) as startups_with_god_score
FROM startup_uploads;

-- ============================================
-- SECTION 2: INVESTORS CHECK  
-- ============================================
SELECT 
    'INVESTORS' as section,
    COUNT(*) as total_investors,
    COUNT(*) FILTER (WHERE status = 'active') as active_investors,
    COUNT(*) FILTER (WHERE status IS NULL) as investors_no_status
FROM investors;

-- ============================================
-- SECTION 3: MATCHING QUEUE TABLE EXISTS?
-- ============================================
SELECT 
    'MATCHING_QUEUE TABLE' as section,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = 'matching_queue' 
            AND table_schema = 'public'
        ) THEN '✅ EXISTS'
        ELSE '❌ DOES NOT EXIST - NEEDS TO BE CREATED!'
    END as status;

-- ============================================
-- SECTION 4: QUEUE CONTENTS (if table exists)
-- ============================================
-- Only run if matching_queue exists
SELECT 
    'QUEUE STATUS' as section,
    status,
    COUNT(*) as count
FROM matching_queue
GROUP BY status
ORDER BY status;

-- ============================================
-- SECTION 5: MATCHES GENERATED
-- ============================================
SELECT 
    'MATCHES GENERATED' as section,
    COUNT(*) as total_matches,
    COUNT(DISTINCT startup_id) as unique_startups_matched,
    COUNT(DISTINCT investor_id) as unique_investors_matched,
    MIN(match_score) as min_score,
    MAX(match_score) as max_score,
    ROUND(AVG(match_score)::numeric, 2) as avg_score
FROM startup_investor_matches;

-- ============================================
-- SECTION 6: WHEN WERE MATCHES LAST CREATED?
-- ============================================
SELECT 
    'LAST MATCH GENERATION' as section,
    MAX(created_at) as last_match_created,
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as matches_last_24h,
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as matches_last_7d
FROM startup_investor_matches;

-- ============================================
-- SECTION 7: ESTIMATE EXPECTED MATCHES
-- ============================================
SELECT 
    'EXPECTED MATCHES' as section,
    (SELECT COUNT(*) FROM startup_uploads WHERE status = 'approved') as approved_startups,
    (SELECT COUNT(*) FROM investors WHERE status = 'active') as active_investors,
    (SELECT COUNT(*) FROM startup_uploads WHERE status = 'approved') * 
    (SELECT COUNT(*) FROM investors WHERE status = 'active') as potential_total_matches,
    (SELECT COUNT(*) FROM startup_investor_matches) as actual_matches,
    CASE 
        WHEN (SELECT COUNT(*) FROM startup_investor_matches) = 0 THEN '❌ NO MATCHES - QUEUE PROCESSOR HAS NOT RUN'
        WHEN (SELECT COUNT(*) FROM startup_investor_matches) < 100 THEN '⚠️ VERY FEW MATCHES - QUEUE PROCESSOR PARTIALLY RUN'
        ELSE '✅ MATCHES EXIST'
    END as status
FROM startup_uploads
LIMIT 1;
