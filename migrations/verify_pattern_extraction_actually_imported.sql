-- Verify if pattern_based_extraction startups are actually in startup_uploads
-- "imported" status might just be a flag, not actual import

-- 1. Check pattern_based_extraction startups that are marked as imported
SELECT 
  'PATTERN-BASED EXTRACTION: Marked vs Actually Imported' as section,
  COUNT(DISTINCT ds.id)::bigint as total_marked_imported,
  COUNT(DISTINCT su.id)::bigint as actually_in_startup_uploads,
  COUNT(DISTINCT ds.id) FILTER (WHERE su.id IS NULL)::bigint as marked_but_not_in_table
FROM discovered_startups ds
LEFT JOIN startup_uploads su ON LOWER(TRIM(su.name)) = LOWER(TRIM(ds.name))
WHERE ds.rss_source = 'pattern_based_extraction'
  AND ds.imported_to_startups = true;

-- 2. Sample of pattern_based_extraction startups - check if they're in startup_uploads
SELECT 
  'SAMPLE: Pattern-Based Extraction Startups' as section,
  ds.name,
  ds.funding_stage,
  ds.funding_amount,
  ds.imported_to_startups as marked_imported,
  CASE 
    WHEN su.id IS NOT NULL THEN 'In startup_uploads'
    ELSE 'NOT in startup_uploads'
  END as in_startup_uploads,
  su.status as startup_status,
  su.stage as startup_stage
FROM discovered_startups ds
LEFT JOIN startup_uploads su ON LOWER(TRIM(su.name)) = LOWER(TRIM(ds.name))
WHERE ds.rss_source = 'pattern_based_extraction'
ORDER BY ds.discovered_at DESC
LIMIT 20;

-- 3. Count pattern_based_extraction startups that need to be imported
SELECT 
  'PATTERN-BASED EXTRACTION: Import Status' as section,
  COUNT(*) FILTER (WHERE imported_to_startups = false OR imported_to_startups IS NULL)::bigint as need_import,
  COUNT(*) FILTER (WHERE imported_to_startups = true AND NOT EXISTS (SELECT 1 FROM startup_uploads su WHERE LOWER(TRIM(su.name)) = LOWER(TRIM(ds.name))))::bigint as marked_but_not_in_table,
  COUNT(*)::bigint as total_extracted
FROM discovered_startups ds
WHERE ds.rss_source = 'pattern_based_extraction';
