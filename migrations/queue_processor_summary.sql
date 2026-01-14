-- Queue Processor Summary
-- Quick overview of queue status and next steps

-- STEP 1: Quick status check
SELECT 
  COUNT(*) FILTER (WHERE processed_at IS NULL) as pending_jobs,
  COUNT(*) FILTER (WHERE processed_at IS NOT NULL) as completed_jobs,
  COUNT(*) FILTER (WHERE status = 'failed') as failed_jobs,
  COUNT(*) as total_jobs,
  MIN(created_at) FILTER (WHERE processed_at IS NULL) as oldest_pending_job,
  MAX(processed_at) as most_recent_processed_job
FROM matching_queue;
