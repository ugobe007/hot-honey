-- Find where funding data is stored
-- Run this in Supabase SQL Editor

-- First, check what tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Check if funding_rounds table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'funding_rounds'
) as funding_rounds_exists;

-- Check startup_uploads for funding data in extracted_data
SELECT 
  COUNT(*) as total_startups,
  COUNT(CASE WHEN extracted_data IS NOT NULL THEN 1 END) as with_extracted_data,
  COUNT(CASE 
    WHEN extracted_data->>'funding_amount' IS NOT NULL OR
         extracted_data->>'latest_funding' IS NOT NULL OR
         extracted_data->>'funding_round' IS NOT NULL OR
         extracted_data->>'funding_history' IS NOT NULL OR
         extracted_data->>'total_funding' IS NOT NULL
    THEN 1 
  END) as with_funding_info
FROM startup_uploads;

-- Sample startups with funding info in extracted_data
SELECT 
  name,
  extracted_data->>'funding_amount' as funding_amount,
  extracted_data->>'latest_funding' as latest_funding,
  extracted_data->>'funding_round' as funding_round,
  extracted_data->>'total_funding' as total_funding
FROM startup_uploads
WHERE extracted_data IS NOT NULL
AND (
  extracted_data->>'funding_amount' IS NOT NULL OR
  extracted_data->>'latest_funding' IS NOT NULL OR
  extracted_data->>'funding_round' IS NOT NULL OR
  extracted_data->>'total_funding' IS NOT NULL
)
LIMIT 10;

-- Check discovered_startups for funding data
SELECT 
  COUNT(*) as total_discovered,
  COUNT(CASE WHEN extracted_data IS NOT NULL THEN 1 END) as with_extracted_data
FROM discovered_startups;





