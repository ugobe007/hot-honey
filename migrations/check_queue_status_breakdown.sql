-- Check Queue Status Breakdown
-- See why processor isn't finding pending jobs

-- STEP 1: Check all jobs by status
SELECT 
  status,
  COUNT(*) as job_count,
  COUNT(*) FILTER (WHERE processed_at IS NULL) as unprocessed_count,
  COUNT(*) FILTER (WHERE processed_at IS NOT NULL) as processed_count,
  MIN(created_at) as oldest_job,
  MAX(created_at) as newest_job,
  MAX(processed_at) as most_recent_processed
FROM matching_queue
GROUP BY status
ORDER BY 
  CASE status
    WHEN 'pending' THEN 1
    WHEN 'processing' THEN 2
    WHEN 'failed' THEN 3
    WHEN 'completed' THEN 4
    ELSE 5
  END;

-- STEP 2: Check jobs that appear pending but might not have status='pending'
SELECT 
  COUNT(*) FILTER (WHERE processed_at IS NULL AND status = 'pending') as truly_pending,
  COUNT(*) FILTER (WHERE processed_at IS NULL AND status != 'pending') as stuck_in_other_status,
  COUNT(*) FILTER (WHERE processed_at IS NULL AND status = 'processing') as stuck_processing,
  COUNT(*) FILTER (WHERE processed_at IS NULL AND status = 'failed') as failed_but_unprocessed,
  COUNT(*) FILTER (WHERE processed_at IS NULL) as total_unprocessed
FROM matching_queue;

-- STEP 3: Sample of jobs with processed_at IS NULL but status != 'pending'
SELECT 
  id,
  startup_id,
  status,
  attempts,
  processed_at,
  created_at,
  error_message
FROM matching_queue
WHERE processed_at IS NULL
  AND status != 'pending'
ORDER BY created_at DESC
LIMIT 20;
