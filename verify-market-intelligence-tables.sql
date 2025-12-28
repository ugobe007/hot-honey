-- Verification Query: Check that all market intelligence tables were created
-- Run this in Supabase SQL Editor to verify

-- Check if tables exist
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_name IN ('talent_pool', 'founder_hire_matches', 'market_intelligence', 'key_variables_tracking')
ORDER BY table_name;

-- Check if views exist
SELECT 
  table_name as view_name
FROM information_schema.views
WHERE table_schema = 'public' 
  AND table_name IN ('v_founder_hire_match_quality', 'v_market_intelligence_summary')
ORDER BY table_name;

-- Check if indexes exist
SELECT 
  tablename,
  indexname
FROM pg_indexes
WHERE schemaname = 'public' 
  AND tablename IN ('talent_pool', 'founder_hire_matches', 'market_intelligence', 'key_variables_tracking')
ORDER BY tablename, indexname;





