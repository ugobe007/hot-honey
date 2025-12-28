-- Simple Check: Velocity Ready Startups
-- Run this in Supabase SQL Editor (NOT the .md file!)

-- Startups with multiple rounds (ready for velocity calculation)
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

-- Summary counts
SELECT 
  COUNT(DISTINCT startup_id) as startups_with_rounds,
  COUNT(*) as total_rounds
FROM funding_rounds;

-- All funding rounds
SELECT 
  su.name,
  fr.round_type,
  fr.amount,
  fr.date
FROM funding_rounds fr
JOIN startup_uploads su ON su.id = fr.startup_id
ORDER BY su.name, fr.date DESC;





