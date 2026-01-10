-- Find All Startups and Investors in Database
-- Run this directly in Supabase SQL Editor (copy/paste the SQL, not the file path)

-- ============================================================
-- 1. STARTUPS - Summary Statistics
-- ============================================================

SELECT 
  'STARTUPS SUMMARY' as section,
  COUNT(*)::bigint as total_startups,
  COUNT(*) FILTER (WHERE status = 'approved')::bigint as approved_startups,
  COUNT(*) FILTER (WHERE status = 'pending')::bigint as pending_startups,
  COUNT(*) FILTER (WHERE status = 'rejected')::bigint as rejected_startups,
  COUNT(*) FILTER (WHERE total_god_score IS NOT NULL)::bigint as startups_with_god_score,
  ROUND(AVG(total_god_score)::numeric, 2) as avg_god_score,
  MIN(created_at) as oldest_startup,
  MAX(created_at) as newest_startup
FROM startup_uploads;

-- ============================================================
-- 2. STARTUPS - By Status (Detailed)
-- ============================================================

SELECT 
  'STARTUPS BY STATUS' as section,
  status,
  COUNT(*)::bigint as count,
  COUNT(*) FILTER (WHERE total_god_score IS NOT NULL)::bigint as with_god_score,
  ROUND(AVG(total_god_score)::numeric, 2) as avg_god_score
FROM startup_uploads
GROUP BY status
ORDER BY 
  CASE status
    WHEN 'approved' THEN 1
    WHEN 'pending' THEN 2
    WHEN 'rejected' THEN 3
    ELSE 4
  END;

-- ============================================================
-- 3. STARTUPS - Top 20 by Name (Sample)
-- ============================================================

SELECT 
  'STARTUPS SAMPLE (Top 20)' as section,
  id,
  name,
  status,
  total_god_score,
  sectors,
  stage,
  created_at
FROM startup_uploads
ORDER BY created_at DESC
LIMIT 20;

-- ============================================================
-- 4. INVESTORS - Summary Statistics
-- ============================================================

SELECT 
  'INVESTORS SUMMARY' as section,
  COUNT(*)::bigint as total_investors,
  COUNT(*) FILTER (WHERE status = 'active')::bigint as active_investors,
  COUNT(*) FILTER (WHERE status = 'inactive')::bigint as inactive_investors,
  COUNT(*) FILTER (WHERE type = 'VC')::bigint as vc_count,
  COUNT(*) FILTER (WHERE type = 'Angel')::bigint as angel_count,
  COUNT(*) FILTER (WHERE type = 'Fund')::bigint as fund_count,
  MIN(created_at) as oldest_investor,
  MAX(created_at) as newest_investor
FROM investors;

-- ============================================================
-- 5. INVESTORS - By Status (Detailed)
-- ============================================================

SELECT 
  'INVESTORS BY STATUS' as section,
  status,
  COUNT(*)::bigint as count
FROM investors
GROUP BY status
ORDER BY 
  CASE status
    WHEN 'active' THEN 1
    WHEN 'inactive' THEN 2
    ELSE 3
  END;

-- ============================================================
-- 6. INVESTORS - By Type (Detailed)
-- ============================================================

SELECT 
  'INVESTORS BY TYPE' as section,
  type,
  COUNT(*)::bigint as count,
  COUNT(*) FILTER (WHERE status = 'active')::bigint as active_count
FROM investors
GROUP BY type
ORDER BY count DESC;

-- ============================================================
-- 7. INVESTORS - Top 20 by Name (Sample)
-- ============================================================

SELECT 
  'INVESTORS SAMPLE (Top 20)' as section,
  id,
  name,
  firm,
  type,
  status,
  sectors,
  stage,
  created_at
FROM investors
ORDER BY created_at DESC
LIMIT 20;

-- ============================================================
-- 8. FULL LIST - All Startups (Complete)
-- ============================================================

SELECT 
  id,
  name,
  tagline,
  status,
  total_god_score,
  sectors,
  stage,
  location,
  website,
  created_at
FROM startup_uploads
ORDER BY 
  CASE status
    WHEN 'approved' THEN 1
    WHEN 'pending' THEN 2
    ELSE 3
  END,
  created_at DESC;

-- ============================================================
-- 9. FULL LIST - All Investors (Complete)
-- ============================================================

SELECT 
  id,
  name,
  firm,
  type,
  status,
  sectors,
  stage,
  check_size_min,
  check_size_max,
  geography_focus,
  created_at
FROM investors
ORDER BY 
  CASE status
    WHEN 'active' THEN 1
    WHEN 'inactive' THEN 2
    ELSE 3
  END,
  created_at DESC;

-- ============================================================
-- 10. VERIFICATION - Check for Missing Data
-- ============================================================

SELECT 
  'DATA VERIFICATION' as section,
  'startup_uploads' as table_name,
  COUNT(*)::bigint as total_rows,
  COUNT(*) FILTER (WHERE name IS NULL OR name = '')::bigint as missing_names,
  COUNT(*) FILTER (WHERE sectors IS NULL OR sectors = '[]'::jsonb)::bigint as missing_sectors
FROM startup_uploads

UNION ALL

SELECT 
  'DATA VERIFICATION' as section,
  'investors' as table_name,
  COUNT(*)::bigint as total_rows,
  COUNT(*) FILTER (WHERE name IS NULL OR name = '')::bigint as missing_names,
  COUNT(*) FILTER (WHERE sectors IS NULL OR sectors = '[]'::jsonb)::bigint as missing_sectors
FROM investors;
