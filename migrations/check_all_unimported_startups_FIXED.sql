-- Check ALL Unimported Startups (Not Just Last 30 Days)
-- FIXED VERSION - Proper GROUP BY clause
-- COPY THIS ENTIRE FILE INTO SUPABASE SQL EDITOR

-- ============================================================
-- 1. Total Unimported Startups (All Time)
-- ============================================================

SELECT 
  'ALL UNIMPORTED STARTUPS' as section,
  COUNT(*)::bigint as total_unimported,
  MIN(created_at) as oldest_unimported,
  MAX(created_at) as newest_unimported
FROM discovered_startups
WHERE imported_to_startups = false OR imported_to_startups IS NULL;

-- ============================================================
-- 2. Unimported Startups by Age (FIXED - Uses Subquery)
-- ============================================================

SELECT 
  'UNIMPORTED BY AGE' as section,
  age_category,
  COUNT(*)::bigint as count
FROM (
  SELECT 
    CASE 
      WHEN created_at >= NOW() - INTERVAL '7 days' THEN 'Last 7 Days'
      WHEN created_at >= NOW() - INTERVAL '30 days' THEN 'Last 30 Days'
      WHEN created_at >= NOW() - INTERVAL '90 days' THEN 'Last 90 Days'
      ELSE 'Older than 90 Days'
    END as age_category
  FROM discovered_startups
  WHERE imported_to_startups = false OR imported_to_startups IS NULL
) as age_groups
GROUP BY age_category
ORDER BY 
  CASE age_category
    WHEN 'Last 7 Days' THEN 1
    WHEN 'Last 30 Days' THEN 2
    WHEN 'Last 90 Days' THEN 3
    ELSE 4
  END;

-- ============================================================
-- 3. Sample of All Unimported Startups (First 20)
-- ============================================================

SELECT 
  'SAMPLE: All Unimported (First 20)' as section,
  id,
  name,
  website,
  LEFT(description, 100) as description_preview,
  imported_to_startups,
  created_at,
  AGE(NOW(), created_at) as age
FROM discovered_startups
WHERE imported_to_startups = false OR imported_to_startups IS NULL
ORDER BY created_at DESC
LIMIT 20;
