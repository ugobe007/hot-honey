-- Diagnose Queue Processor Status
-- Comprehensive check to see why the queue processor isn't working

-- STEP 1: Current queue status
SELECT 
  COUNT(*) as total_pending_jobs,
  COUNT(*) FILTER (WHERE status = 'pending') as pending_status,
  COUNT(*) FILTER (WHERE status = 'processing') as currently_processing,
  COUNT(*) FILTER (WHERE status = 'completed') as completed_status,
  COUNT(*) FILTER (WHERE status = 'failed') as failed_status,
  MIN(created_at) as oldest_pending_job,
  MAX(created_at) as newest_pending_job,
  MIN(created_at) FILTER (WHERE processed_at IS NOT NULL) as most_recent_processed_job
FROM matching_queue;

-- STEP 2: Failed jobs (might indicate why processor stopped)
SELECT 
  COUNT(*) as failed_jobs_count,
  error_message,
  attempts,
  MIN(created_at) as first_failure,
  MAX(created_at) as last_failure
FROM matching_queue
WHERE status = 'failed'
GROUP BY error_message, attempts
ORDER BY COUNT(*) DESC
LIMIT 10;

-- STEP 3: Sample of pending jobs (to see what's waiting)
SELECT 
  id,
  startup_id,
  status,
  attempts,
  created_at,
  processed_at,
  error_message
FROM matching_queue
WHERE processed_at IS NULL
ORDER BY created_at ASC
LIMIT 20;

-- STEP 4: Queue statistics by status
SELECT 
  status,
  COUNT(*) as job_count,
  AVG(attempts) as avg_attempts,
  MAX(attempts) as max_attempts,
  MIN(created_at) as oldest_job,
  MAX(created_at) as newest_job
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

-- STEP 5: Check if there are any recently processed jobs (last 7 days)
SELECT 
  COUNT(*) as processed_last_7d,
  MIN(processed_at) as first_processed,
  MAX(processed_at) as last_processed,
  COUNT(DISTINCT DATE(processed_at)) as days_with_activity
FROM matching_queue
WHERE processed_at >= NOW() - INTERVAL '7 days';

-- STEP 6: Startup IDs in queue (check if they're valid)
SELECT 
  COUNT(DISTINCT mq.startup_id) as unique_startups_in_queue,
  COUNT(DISTINCT su.id) as matching_startups_in_database,
  COUNT(*) FILTER (WHERE su.id IS NULL) as orphaned_queue_entries
FROM matching_queue mq
LEFT JOIN startup_uploads su ON mq.startup_id = su.id
WHERE mq.processed_at IS NULL;
