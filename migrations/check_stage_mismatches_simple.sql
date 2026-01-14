-- Simple Diagnostic: Check for Stage Mismatches
-- Run this first to see what data exists

-- Check all Series C+ companies (stage = 5)
SELECT 
  id,
  name,
  stage,
  raise_amount,
  raise_type,
  website
FROM startup_uploads
WHERE status = 'approved'
  AND stage = 5
ORDER BY name;
