-- Extract funding rounds from extracted_data JSONB fields
-- This creates funding rounds from existing startup data
-- Run this in Supabase SQL Editor

-- First, let's see what funding data we have in extracted_data
SELECT 
  COUNT(*) as total_startups,
  COUNT(CASE 
    WHEN extracted_data->>'funding_amount' IS NOT NULL OR
         extracted_data->>'latest_funding' IS NOT NULL OR
         extracted_data->>'funding_round' IS NOT NULL OR
         extracted_data->>'total_funding' IS NOT NULL OR
         extracted_data->>'funding_stage' IS NOT NULL
    THEN 1 
  END) as with_funding_info
FROM startup_uploads
WHERE extracted_data IS NOT NULL;

-- Sample of what funding data looks like
SELECT 
  name,
  extracted_data->>'funding_amount' as funding_amount,
  extracted_data->>'latest_funding' as latest_funding,
  extracted_data->>'funding_round' as funding_round,
  extracted_data->>'funding_stage' as funding_stage,
  extracted_data->>'total_funding' as total_funding,
  extracted_data
FROM startup_uploads
WHERE extracted_data IS NOT NULL
AND (
  extracted_data->>'funding_amount' IS NOT NULL OR
  extracted_data->>'latest_funding' IS NOT NULL OR
  extracted_data->>'funding_round' IS NOT NULL
)
LIMIT 5;



