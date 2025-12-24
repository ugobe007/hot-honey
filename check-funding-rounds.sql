-- Check funding rounds that were created
-- Run this in Supabase SQL Editor

-- Total funding rounds
SELECT COUNT(*) as total_rounds FROM funding_rounds;

-- See all funding rounds
SELECT 
  su.name as startup_name,
  fr.round_type,
  fr.amount,
  fr.date,
  fr.source,
  fr.source_url
FROM funding_rounds fr
JOIN startup_uploads su ON su.id = fr.startup_id
ORDER BY fr.date DESC;

-- Startups with multiple rounds (for velocity calculation)
SELECT 
  su.name,
  COUNT(fr.id) as rounds,
  MIN(fr.date) as first_round,
  MAX(fr.date) as latest_round,
  SUM(fr.amount) as total_funding
FROM startup_uploads su
JOIN funding_rounds fr ON fr.startup_id = su.id
GROUP BY su.id, su.name
HAVING COUNT(fr.id) > 1
ORDER BY rounds DESC;



