-- Check Actual Schema of funding_rounds Table
-- Run this FIRST to see what columns actually exist

-- ============================================================
-- 1. Check if funding_rounds table exists
-- ============================================================

SELECT 
  'TABLE EXISTS CHECK' as check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'funding_rounds'
    )
    THEN '✅ funding_rounds table EXISTS'
    ELSE '❌ funding_rounds table DOES NOT EXIST'
  END as status;

-- ============================================================
-- 2. List ALL columns in funding_rounds table
-- ============================================================

SELECT 
  'COLUMNS IN funding_rounds' as check_type,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'funding_rounds'
ORDER BY ordinal_position;

-- ============================================================
-- 3. Sample data from funding_rounds (if it exists)
-- ============================================================

SELECT 
  'SAMPLE DATA FROM funding_rounds' as check_type,
  *
FROM funding_rounds
LIMIT 5;
