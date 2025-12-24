-- Check table structures to see what columns exist
-- Run this in Supabase SQL Editor

-- Check startup_uploads columns
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'startup_uploads'
ORDER BY ordinal_position;

-- Check discovered_startups columns
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'discovered_startups'
ORDER BY ordinal_position;

-- Check if funding_rounds table exists and has data
SELECT 
  EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'funding_rounds'
  ) as funding_rounds_exists;

SELECT COUNT(*) as total_rounds FROM funding_rounds;

-- Check what data we have in startup_uploads
SELECT 
  COUNT(*) as total_startups,
  COUNT(CASE WHEN website IS NOT NULL THEN 1 END) as with_website,
  COUNT(CASE WHEN description IS NOT NULL THEN 1 END) as with_description,
  COUNT(CASE WHEN tagline IS NOT NULL THEN 1 END) as with_tagline
FROM startup_uploads;

-- Sample startups
SELECT 
  id,
  name,
  website,
  funding_stage,
  created_at
FROM startup_uploads
ORDER BY created_at DESC
LIMIT 10;



