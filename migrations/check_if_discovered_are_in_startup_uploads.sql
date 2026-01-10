-- Check if discovered_startups marked as imported are actually in startup_uploads
-- This will show if they're truly imported or just marked

-- 1. Check discovered_startups import status
SELECT 
  'DISCOVERED_STARTUPS IMPORT STATUS' as section,
  COUNT(*) FILTER (WHERE imported_to_startups = true)::bigint as marked_imported,
  COUNT(*) FILTER (WHERE imported_to_startups = false OR imported_to_startups IS NULL)::bigint as not_imported,
  COUNT(*)::bigint as total_discovered
FROM discovered_startups;

-- 2. Check if imported discovered startups actually exist in startup_uploads
SELECT 
  'IMPORTED DISCOVERED VS ACTUAL IN startup_uploads' as section,
  COUNT(DISTINCT ds.id)::bigint as discovered_marked_imported,
  COUNT(DISTINCT su.id)::bigint as actually_in_startup_uploads,
  COUNT(DISTINCT ds.id) FILTER (WHERE su.id IS NULL)::bigint as marked_imported_but_not_in_table
FROM discovered_startups ds
LEFT JOIN startup_uploads su ON LOWER(TRIM(su.name)) = LOWER(TRIM(ds.name))
WHERE ds.imported_to_startups = true;

-- 3. Sample of discovered startups marked as imported but not in startup_uploads
SELECT 
  'SAMPLE: Marked Imported But Not In startup_uploads' as section,
  ds.id,
  ds.name,
  ds.funding_stage,
  ds.funding_amount,
  ds.imported_to_startups,
  ds.imported_at
FROM discovered_startups ds
LEFT JOIN startup_uploads su ON LOWER(TRIM(su.name)) = LOWER(TRIM(ds.name))
WHERE ds.imported_to_startups = true
  AND su.id IS NULL
ORDER BY ds.imported_at DESC
LIMIT 20;

-- 4. Check recently extracted startups (pattern_based_extraction) status
SELECT 
  'RECENTLY EXTRACTED (pattern_based_extraction)' as section,
  COUNT(*) FILTER (WHERE imported_to_startups = true)::bigint as marked_imported,
  COUNT(*) FILTER (WHERE imported_to_startups = false OR imported_to_startups IS NULL)::bigint as not_imported,
  COUNT(*)::bigint as total,
  MIN(discovered_at) as oldest,
  MAX(discovered_at) as newest
FROM discovered_startups
WHERE rss_source = 'pattern_based_extraction'
  AND discovered_at >= NOW() - INTERVAL '1 hour';
