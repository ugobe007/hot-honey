-- Migrate funding_data to funding_rounds
-- Run this in Supabase SQL Editor
-- This will match companies by name and insert funding rounds

-- First, let's see what we're working with
SELECT 
  COUNT(*) as total_funding_records,
  COUNT(DISTINCT company_name) as unique_companies
FROM funding_data;

-- Migrate funding_data to funding_rounds
-- This matches companies by name (case-insensitive)
INSERT INTO funding_rounds (
  startup_id,
  round_type,
  amount,
  valuation,
  date,
  lead_investor,
  investors,
  source,
  source_url,
  announced
)
SELECT 
  su.id as startup_id,
  fd.round_type,
  -- Parse amount (handles "$1.2M", "$500K", etc.)
  CASE 
    WHEN fd.amount ~ '^\$?[\d.]+[KMkm]?$' THEN
      CAST(
        REPLACE(REPLACE(UPPER(fd.amount), '$', ''), ',', '') AS NUMERIC
      ) * 
      CASE 
        WHEN UPPER(fd.amount) LIKE '%K' THEN 1000
        WHEN UPPER(fd.amount) LIKE '%M' THEN 1000000
        WHEN UPPER(fd.amount) LIKE '%B' THEN 1000000000
        ELSE 1
      END
    ELSE NULL
  END as amount,
  -- Parse valuation (same logic)
  CASE 
    WHEN fd.valuation ~ '^\$?[\d.]+[KMkm]?$' THEN
      CAST(
        REPLACE(REPLACE(UPPER(fd.valuation), '$', ''), ',', '') AS NUMERIC
      ) * 
      CASE 
        WHEN UPPER(fd.valuation) LIKE '%K' THEN 1000
        WHEN UPPER(fd.valuation) LIKE '%M' THEN 1000000
        WHEN UPPER(fd.valuation) LIKE '%B' THEN 1000000000
        ELSE 1
      END
    ELSE NULL
  END as valuation,
  fd.date::DATE as date,
  -- First investor as lead_investor
  CASE 
    WHEN array_length(fd.investors, 1) > 0 THEN fd.investors[1]
    ELSE NULL
  END as lead_investor,
  fd.investors,
  fd.source,
  fd.source_url,
  true as announced
FROM funding_data fd
INNER JOIN startup_uploads su 
  ON LOWER(TRIM(REPLACE(REPLACE(su.name, '.', ''), ',', ''))) = 
     LOWER(TRIM(REPLACE(REPLACE(fd.company_name, '.', ''), ',', '')))
WHERE NOT EXISTS (
  -- Avoid duplicates: check if this round already exists
  SELECT 1 
  FROM funding_rounds fr 
  WHERE fr.startup_id = su.id 
    AND fr.round_type = fd.round_type 
    AND fr.date = fd.date::DATE
)
ON CONFLICT DO NOTHING;

-- Check migration results
SELECT 
  COUNT(*) as total_rounds_migrated,
  COUNT(DISTINCT startup_id) as startups_with_rounds
FROM funding_rounds;

-- See sample migrated data
SELECT 
  su.name as startup_name,
  fr.round_type,
  fr.amount,
  fr.date,
  fr.lead_investor
FROM funding_rounds fr
JOIN startup_uploads su ON su.id = fr.startup_id
ORDER BY fr.date DESC
LIMIT 10;





