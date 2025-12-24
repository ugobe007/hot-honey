-- Check Funding Data Availability
-- Run this in Supabase SQL Editor

-- Check funding_data table
SELECT COUNT(*) as total_funding_records FROM funding_data;

-- See sample records from funding_data
SELECT 
  company_name, 
  amount, 
  round_type, 
  date, 
  investors,
  source
FROM funding_data 
ORDER BY date DESC 
LIMIT 10;

-- Check if funding_rounds table exists and has data
SELECT COUNT(*) as total_rounds FROM funding_rounds;

-- See which startups we have
SELECT COUNT(*) as total_startups FROM startup_uploads;

-- Check for startups with funding info in extracted_data
SELECT 
  COUNT(*) as startups_with_funding_data
FROM startup_uploads
WHERE extracted_data IS NOT NULL
AND (
  extracted_data->>'funding_amount' IS NOT NULL OR
  extracted_data->>'latest_funding' IS NOT NULL OR
  extracted_data->>'funding_round' IS NOT NULL OR
  extracted_data->>'funding_history' IS NOT NULL
);



