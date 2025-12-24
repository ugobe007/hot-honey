-- Check if any startups have 2+ rounds (ready for velocity calculation)
-- Run this in Supabase SQL Editor

-- Startups with multiple rounds
SELECT 
  su.name,
  COUNT(fr.id) as rounds,
  MIN(fr.date) as first_round,
  MAX(fr.date) as latest_round,
  (MAX(fr.date) - MIN(fr.date)) as days_between_rounds
FROM startup_uploads su
JOIN funding_rounds fr ON fr.startup_id = su.id
GROUP BY su.id, su.name
HAVING COUNT(fr.id) > 1
ORDER BY rounds DESC;

-- Summary
SELECT 
  COUNT(DISTINCT fr.startup_id) as startups_with_rounds,
  COUNT(*) as total_rounds,
  COUNT(DISTINCT CASE WHEN rc.round_count > 1 THEN fr.startup_id END) as startups_with_multiple_rounds
FROM funding_rounds fr
LEFT JOIN (
  SELECT startup_id, COUNT(*) as round_count
  FROM funding_rounds
  GROUP BY startup_id
) rc ON rc.startup_id = fr.startup_id;

-- All funding rounds summary
SELECT 
  su.name,
  fr.round_type,
  fr.amount,
  fr.date
FROM funding_rounds fr
JOIN startup_uploads su ON su.id = fr.startup_id
ORDER BY su.name, fr.date DESC;

