-- Check Why Only 4 Startups Were Processed (Out of 832)
-- This will show the import status breakdown

-- ============================================================
-- 1. Breakdown by Import Status
-- ============================================================

SELECT 
  'IMPORT STATUS BREAKDOWN' as section,
  CASE 
    WHEN imported_to_startups = true THEN 'Already Imported'
    WHEN imported_to_startups = false THEN 'Not Imported'
    WHEN imported_to_startups IS NULL THEN 'Null (Not Imported)'
    ELSE 'Unknown'
  END as import_status,
  COUNT(*)::bigint as count,
  MIN(created_at) as oldest,
  MAX(created_at) as newest
FROM discovered_startups
GROUP BY 
  CASE 
    WHEN imported_to_startups = true THEN 'Already Imported'
    WHEN imported_to_startups = false THEN 'Not Imported'
    WHEN imported_to_startups IS NULL THEN 'Null (Not Imported)'
    ELSE 'Unknown'
  END
ORDER BY count DESC;

-- ============================================================
-- 2. Sample of Unimported Startups (First 20)
-- ============================================================

SELECT 
  'SAMPLE: Unimported Startups (First 20)' as section,
  id,
  name,
  website,
  description,
  imported_to_startups,
  startup_id,
  created_at
FROM discovered_startups
WHERE imported_to_startups = false OR imported_to_startups IS NULL
ORDER BY created_at DESC
LIMIT 20;

-- ============================================================
-- 3. Check for Duplicates by Name/Website
-- ============================================================

SELECT 
  'DUPLICATE CHECK' as section,
  LOWER(COALESCE(name, '')) as name_lower,
  COUNT(*)::bigint as duplicate_count
FROM discovered_startups
GROUP BY LOWER(COALESCE(name, ''))
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC
LIMIT 20;

-- ============================================================
-- 4. Check if Unimported Startups Already Exist in startup_uploads
-- ============================================================

SELECT 
  'POTENTIAL DUPLICATES IN startup_uploads' as section,
  ds.name as discovered_name,
  ds.website as discovered_website,
  su.id as existing_startup_id,
  su.name as existing_name,
  su.website as existing_website
FROM discovered_startups ds
LEFT JOIN startup_uploads su ON 
  (LOWER(COALESCE(ds.name, '')) = LOWER(COALESCE(su.name, '')))
  OR (ds.website IS NOT NULL AND su.website IS NOT NULL 
      AND LOWER(ds.website) = LOWER(su.website))
WHERE (ds.imported_to_startups = false OR ds.imported_to_startups IS NULL)
  AND su.id IS NOT NULL
LIMIT 20;

-- ============================================================
-- 5. Recent Discovered Startups (Last 30 days)
-- ============================================================

SELECT 
  'RECENT DISCOVERED (Last 30 Days)' as section,
  COUNT(*)::bigint as total_recent,
  COUNT(*) FILTER (WHERE imported_to_startups = true)::bigint as imported,
  COUNT(*) FILTER (WHERE imported_to_startups = false OR imported_to_startups IS NULL)::bigint as unimported
FROM discovered_startups
WHERE created_at >= NOW() - INTERVAL '30 days';
