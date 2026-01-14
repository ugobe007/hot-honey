-- Fix Orphaned Queue Entries
-- Removes queue entries for startups that no longer exist

-- STEP 1: Find orphaned queue entries (startups that don't exist)
SELECT 
  mq.id,
  mq.startup_id,
  mq.status,
  mq.attempts,
  mq.created_at,
  mq.processed_at,
  mq.error_message
FROM matching_queue mq
LEFT JOIN startup_uploads su ON mq.startup_id = su.id
WHERE su.id IS NULL
ORDER BY mq.created_at DESC
LIMIT 50;

-- STEP 2: Count orphaned entries
SELECT 
  COUNT(*) as orphaned_count,
  COUNT(*) FILTER (WHERE mq.status = 'pending') as orphaned_pending,
  COUNT(*) FILTER (WHERE mq.status = 'failed') as orphaned_failed,
  COUNT(*) FILTER (WHERE mq.status = 'processing') as orphaned_processing
FROM matching_queue mq
LEFT JOIN startup_uploads su ON mq.startup_id = su.id
WHERE su.id IS NULL;

-- STEP 3: Delete orphaned queue entries (startups that don't exist)
DELETE FROM matching_queue
WHERE startup_id NOT IN (SELECT id FROM startup_uploads);

-- STEP 4: Verify cleanup (should return 0)
SELECT 
  COUNT(*) as remaining_orphaned
FROM matching_queue mq
LEFT JOIN startup_uploads su ON mq.startup_id = su.id
WHERE su.id IS NULL;

-- STEP 5: Fix completed jobs with missing processed_at (data inconsistency)
UPDATE matching_queue
SET processed_at = created_at
WHERE status = 'completed'
  AND processed_at IS NULL;

-- STEP 6: Reset stuck 'processing' jobs (jobs stuck in processing state)
UPDATE matching_queue
SET status = 'pending',
    processed_at = NULL,
    attempts = 0
WHERE status = 'processing'
  AND processed_at IS NULL
  AND created_at < NOW() - INTERVAL '1 hour';

-- STEP 7: Reset failed jobs that might be recoverable (if you want to retry)
-- Uncomment this if you want to retry failed jobs:
-- UPDATE matching_queue
-- SET status = 'pending',
--     processed_at = NULL,
--     error_message = NULL,
--     attempts = 0
-- WHERE status = 'failed'
--   AND attempts < 3;
