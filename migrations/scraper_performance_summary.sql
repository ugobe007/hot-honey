-- Scraper Performance Summary
-- Quick overview of scraper effectiveness and data quality

-- Overall Performance (Last 30 Days)
SELECT 
  '=== SCRAPER PERFORMANCE SUMMARY ===' as section,
  COUNT(DISTINCT ds.id) as total_startups_discovered_30d,
  COUNT(DISTINCT ds.id) FILTER (WHERE ds.imported_to_startups = true) as imported_count,
  COUNT(DISTINCT ds.id) FILTER (WHERE ds.imported_to_startups = false OR ds.imported_to_startups IS NULL) as pending_import,
  ROUND(
    COUNT(DISTINCT ds.id) FILTER (WHERE ds.imported_to_startups = true)::numeric / 
    NULLIF(COUNT(DISTINCT ds.id), 0)::numeric * 100, 
    2
  ) as import_rate_percent,
  COUNT(DISTINCT DATE(ds.created_at)) as active_days,
  ROUND(COUNT(DISTINCT ds.id)::numeric / NULLIF(COUNT(DISTINCT DATE(ds.created_at)), 0), 2) as avg_discoveries_per_day
FROM discovered_startups ds
WHERE ds.created_at >= NOW() - INTERVAL '30 days';

-- Data Quality (Last 30 Days)
SELECT 
  '=== DATA QUALITY CHECK ===' as section,
  COUNT(*) FILTER (WHERE name IS NOT NULL AND name != '') as has_name,
  COUNT(*) FILTER (WHERE website IS NOT NULL AND website != '') as has_website,
  COUNT(*) FILTER (WHERE description IS NOT NULL AND description != '') as has_description,
  COUNT(*) FILTER (WHERE funding_stage IS NOT NULL) as has_funding_stage,
  COUNT(*) FILTER (WHERE funding_amount IS NOT NULL) as has_funding_amount,
  COUNT(*) FILTER (WHERE name IS NOT NULL AND website IS NOT NULL AND description IS NOT NULL) as complete_profiles,
  COUNT(*) as total_discovered,
  ROUND(
    COUNT(*) FILTER (WHERE name IS NOT NULL AND website IS NOT NULL AND description IS NOT NULL)::numeric / 
    NULLIF(COUNT(*), 0)::numeric * 100, 
    2
  ) as completeness_percent
FROM discovered_startups
WHERE created_at >= NOW() - INTERVAL '30 days';

-- Recent Activity (Last 7 Days)
SELECT 
  '=== RECENT ACTIVITY (Last 7 Days) ===' as section,
  COUNT(*) as startups_discovered_7d,
  COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours') as discovered_24h,
  COUNT(*) FILTER (WHERE imported_to_startups = true) as imported_7d,
  MAX(created_at) as most_recent_discovery
FROM discovered_startups
WHERE created_at >= NOW() - INTERVAL '7 days';

-- Top Performing Sources (Last 30 Days)
SELECT 
  '=== TOP PERFORMING SOURCES ===' as section,
  rss_source,
  COUNT(*) as discoveries,
  COUNT(*) FILTER (WHERE imported_to_startups = true) as imported,
  MAX(created_at) as most_recent
FROM discovered_startups
WHERE created_at >= NOW() - INTERVAL '30 days'
  AND rss_source IS NOT NULL
GROUP BY rss_source
ORDER BY discoveries DESC
LIMIT 10;
