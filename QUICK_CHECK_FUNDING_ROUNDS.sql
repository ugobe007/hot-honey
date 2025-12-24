-- Quick Check: See Funding Rounds Created
-- Copy and paste this into Supabase SQL Editor

-- Total funding rounds
SELECT COUNT(*) as total_rounds FROM funding_rounds;

-- See all funding rounds with startup names
SELECT 
  su.name as startup_name,
  fr.round_type,
  fr.amount,
  fr.date,
  fr.source
FROM funding_rounds fr
JOIN startup_uploads su ON su.id = fr.startup_id
ORDER BY fr.date DESC;



