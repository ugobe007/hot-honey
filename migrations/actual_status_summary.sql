-- ACTUAL STATUS SUMMARY
-- Run this to get the real current state

-- 1. Actual matches in database
SELECT 
  'ACTUAL MATCHES IN DATABASE' as status,
  COUNT(*)::bigint as total_rows,
  COUNT(DISTINCT startup_id)::bigint as unique_startups,
  COUNT(DISTINCT investor_id)::bigint as unique_investors
FROM startup_investor_matches;

-- 2. Approved startups ready to match
SELECT 
  'APPROVED STARTUPS' as status,
  COUNT(*)::bigint as total_approved
FROM startup_uploads
WHERE status = 'approved';

-- 3. Active investors ready to match
SELECT 
  'ACTIVE INVESTORS' as status,
  COUNT(*)::bigint as total_active
FROM investors
WHERE status = 'active';

-- 4. Matching queue status
SELECT 
  'MATCHING QUEUE' as status,
  COUNT(*)::bigint as total_queued,
  COUNT(*) FILTER (WHERE status = 'pending')::bigint as pending,
  COUNT(*) FILTER (WHERE status = 'completed')::bigint as completed,
  COUNT(*) FILTER (WHERE status = 'processing')::bigint as processing,
  COUNT(*) FILTER (WHERE status = 'failed')::bigint as failed
FROM matching_queue;

-- 5. CONCLUSION
SELECT 
  'CONCLUSION' as summary,
  CASE 
    WHEN (SELECT COUNT(*) FROM startup_investor_matches) = 0 
    THEN '❌ NO MATCHES - Queue processor needs to run!'
    ELSE '✅ Matches exist'
  END as status,
  (SELECT COUNT(*) FROM startup_investor_matches)::bigint as actual_match_count,
  (SELECT COUNT(*) FROM matching_queue WHERE status = 'pending')::bigint as pending_in_queue;
