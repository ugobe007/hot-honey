-- Check if recently extracted startups (pattern_based_extraction) are actually in startup_uploads
-- "imported" status might just be a flag, not actual import

-- 1. Check recently extracted startups status
SELECT 
  'RECENTLY EXTRACTED STARTUPS (Last Hour)' as section,
  COUNT(*)::bigint as total_recent,
  COUNT(*) FILTER (WHERE imported_to_startups = true)::bigint as marked_imported,
  COUNT(*) FILTER (WHERE imported_to_startups = false OR imported_to_startups IS NULL)::bigint as not_imported,
  COUNT(*) FILTER (WHERE rss_source = 'pattern_based_extraction')::bigint as from_pattern_extraction
FROM discovered_startups
WHERE discovered_at >= NOW() - INTERVAL '1 hour';

-- 2. Check if marked-as-imported startups are actually in startup_uploads
SELECT 
  'CHECK IF MARKED-AS-IMPORTED ARE IN startup_uploads' as section,
  COUNT(DISTINCT ds.id)::bigint as marked_imported_count,
  COUNT(DISTINCT su.id)::bigint as actually_in_startup_uploads,
  COUNT(DISTINCT ds.id) FILTER (WHERE su.id IS NULL)::bigint as marked_but_not_in_table
FROM discovered_startups ds
LEFT JOIN startup_uploads su ON LOWER(TRIM(su.name)) = LOWER(TRIM(ds.name))
WHERE ds.imported_to_startups = true
  AND ds.rss_source = 'pattern_based_extraction'
  AND ds.discovered_at >= NOW() - INTERVAL '1 hour';

-- 3. Sample of pattern_based_extraction startups marked as imported
SELECT 
  'RECENT PATTERN-BASED EXTRACTION (Marked Imported)' as section,
  ds.name,
  ds.funding_stage,
  ds.funding_amount,
  ds.imported_to_startups,
  ds.imported_at,
  CASE 
    WHEN su.id IS NOT NULL THEN 'In startup_uploads'
    ELSE 'NOT in startup_uploads'
  END as actual_status,
  su.status as startup_status
FROM discovered_startups ds
LEFT JOIN startup_uploads su ON LOWER(TRIM(su.name)) = LOWER(TRIM(ds.name))
WHERE ds.rss_source = 'pattern_based_extraction'
  AND ds.discovered_at >= NOW() - INTERVAL '1 hour'
  AND ds.imported_to_startups = true
ORDER BY ds.discovered_at DESC
LIMIT 20;

-- 4. Count pattern_based_extraction startups that should be imported
SELECT 
  'PATTERN-BASED EXTRACTION SUMMARY' as section,
  COUNT(*) FILTER (WHERE imported_to_startups = false OR imported_to_startups IS NULL)::bigint as need_import,
  COUNT(*) FILTER (WHERE imported_to_startups = true)::bigint as already_marked,
  COUNT(*)::bigint as total_extracted
FROM discovered_startups
WHERE rss_source = 'pattern_based_extraction'
  AND discovered_at >= NOW() - INTERVAL '1 hour';
