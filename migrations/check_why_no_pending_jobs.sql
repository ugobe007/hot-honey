-- Check Why Processor Says "No Pending Jobs"
-- Diagnose why the queue processor isn't finding pending jobs

-- STEP 1: Check current queue status (what processor sees)
SELECT 
  COUNT(*) FILTER (WHERE status = 'pending' AND processed_at IS NULL) as pending_jobs,
  COUNT(*) FILTER (WHERE status = 'pending' AND processed_at IS NULL AND attempts < 3) as pending_with_retries,
  COUNT(*) FILTER (WHERE status = 'processing') as processing_jobs,
  COUNT(*) FILTER (WHERE status = 'completed') as completed_jobs,
  COUNT(*) FILTER (WHERE status = 'failed') as failed_jobs,
  COUNT(*) FILTER (WHERE status = 'failed' AND attempts >= 3) as permanently_failed,
  COUNT(*) as total_jobs
FROM matching_queue;

-- STEP 2: Sample of pending jobs (check if they meet processor criteria)
SELECT 
  mq.id,
  mq.startup_id,
  mq.status,
  mq.attempts,
  su.name as startup_name,
  su.status as startup_status,
  mq.created_at
FROM matching_queue mq
LEFT JOIN startup_uploads su ON mq.startup_id = su.id
WHERE mq.status = 'pending'
  AND mq.processed_at IS NULL
  AND mq.attempts < 3
ORDER BY mq.created_at ASC
LIMIT 20;

-- STEP 3: Check if pending startups are approved (required for matching)
SELECT 
  COUNT(*) FILTER (WHERE su.status = 'approved') as approved_startups,
  COUNT(*) FILTER (WHERE su.status != 'approved' OR su.status IS NULL) as non_approved_startups,
  COUNT(*) FILTER (WHERE su.id IS NULL) as orphaned_entries
FROM matching_queue mq
LEFT JOIN startup_uploads su ON mq.startup_id = su.id
WHERE mq.status = 'pending'
  AND mq.processed_at IS NULL;

-- STEP 4: Check queue entries for non-approved startups
SELECT 
  mq.id,
  mq.startup_id,
  mq.status,
  su.name,
  su.status as startup_status,
  mq.created_at
FROM matching_queue mq
LEFT JOIN startup_uploads su ON mq.startup_id = su.id
WHERE mq.status = 'pending'
  AND mq.processed_at IS NULL
  AND (su.status != 'approved' OR su.status IS NULL OR su.id IS NULL)
ORDER BY mq.created_at DESC
LIMIT 50;
