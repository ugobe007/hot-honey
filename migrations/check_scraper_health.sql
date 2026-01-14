-- Check Scraper Health & Activity
-- Comprehensive queries to verify scrapers are working and finding valuable startups

-- STEP 1: Recent RSS scraper activity (last 7 days)
SELECT 
  COUNT(*) as articles_scraped_7d,
  COUNT(DISTINCT DATE(created_at)) as active_days,
  MIN(created_at) as first_article,
  MAX(created_at) as most_recent_article,
  COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours') as articles_last_24h,
  COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '1 hour') as articles_last_hour
FROM rss_articles
WHERE created_at >= NOW() - INTERVAL '7 days';

-- STEP 2: Discovered startups status (last 7 days)
SELECT 
  COUNT(*) as total_discovered_7d,
  COUNT(*) FILTER (WHERE imported_to_startups = true) as imported_count,
  COUNT(*) FILTER (WHERE imported_to_startups = false OR imported_to_startups IS NULL) as pending_import,
  COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours') as discovered_24h,
  COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '1 hour') as discovered_last_hour,
  MIN(created_at) as first_discovery,
  MAX(created_at) as most_recent_discovery
FROM discovered_startups
WHERE created_at >= NOW() - INTERVAL '7 days';

-- STEP 3: Discovered startups by RSS source
SELECT 
  rss_source,
  COUNT(*) as total_count,
  COUNT(*) FILTER (WHERE imported_to_startups = true) as imported,
  COUNT(*) FILTER (WHERE imported_to_startups = false OR imported_to_startups IS NULL) as pending,
  MAX(created_at) as most_recent
FROM discovered_startups
WHERE created_at >= NOW() - INTERVAL '30 days'
  AND rss_source IS NOT NULL
GROUP BY rss_source
ORDER BY total_count DESC
LIMIT 20;

-- STEP 4: Active RSS sources
SELECT 
  COUNT(*) FILTER (WHERE active = true) as active_sources,
  COUNT(*) FILTER (WHERE active = false) as inactive_sources,
  COUNT(*) as total_sources,
  COUNT(*) FILTER (WHERE last_scraped >= NOW() - INTERVAL '24 hours') as scraped_last_24h,
  COUNT(*) FILTER (WHERE last_scraped >= NOW() - INTERVAL '7 days') as scraped_last_7d,
  MAX(last_scraped) as most_recent_scrape
FROM rss_sources;

-- STEP 5: Recent discovered startups (last 20, with details)
SELECT 
  id,
  name,
  website,
  description,
  rss_source,
  article_url,
  funding_stage,
  imported_to_startups,
  created_at,
  CASE
    WHEN imported_to_startups = true THEN '✅ Imported'
    WHEN imported_to_startups = false OR imported_to_startups IS NULL THEN '⏳ Pending'
    ELSE '❓ Unknown'
  END as import_status
FROM discovered_startups
WHERE created_at >= NOW() - INTERVAL '7 days'
ORDER BY created_at DESC
LIMIT 20;

-- STEP 6: Quality check - startups with complete data
SELECT 
  COUNT(*) FILTER (WHERE name IS NOT NULL AND name != '') as has_name,
  COUNT(*) FILTER (WHERE website IS NOT NULL AND website != '') as has_website,
  COUNT(*) FILTER (WHERE description IS NOT NULL AND description != '') as has_description,
  COUNT(*) FILTER (WHERE name IS NOT NULL AND website IS NOT NULL AND description IS NOT NULL) as complete_profiles,
  COUNT(*) as total_discovered
FROM discovered_startups
WHERE created_at >= NOW() - INTERVAL '7 days';

-- STEP 7: Conversion rate (discovered → imported → approved)
SELECT 
  COUNT(DISTINCT ds.id) as total_discovered_30d,
  COUNT(DISTINCT ds.id) FILTER (WHERE ds.imported_to_startups = true) as imported_count,
  COUNT(DISTINCT su.id) FILTER (WHERE su.status = 'approved' AND su.source_url IN (SELECT article_url FROM discovered_startups WHERE ds.imported_to_startups = true)) as approved_from_discovered,
  ROUND(
    COUNT(DISTINCT ds.id) FILTER (WHERE ds.imported_to_startups = true)::numeric / 
    NULLIF(COUNT(DISTINCT ds.id), 0)::numeric * 100, 
    2
  ) as import_rate_percent
FROM discovered_startups ds
LEFT JOIN startup_uploads su ON ds.startup_id = su.id
WHERE ds.created_at >= NOW() - INTERVAL '30 days';

-- STEP 8: Hourly activity breakdown (last 24 hours)
SELECT 
  DATE_TRUNC('hour', created_at) as hour,
  COUNT(*) as discovered_count
FROM discovered_startups
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', created_at)
ORDER BY hour DESC;

-- STEP 9: Top RSS sources by discoveries
SELECT 
  rs.name as source_name,
  rs.url as source_url,
  rs.active,
  COUNT(DISTINCT ds.id) as discoveries_count,
  MAX(ds.created_at) as most_recent_discovery,
  MAX(rs.last_scraped) as last_scraped
FROM rss_sources rs
LEFT JOIN discovered_startups ds ON ds.rss_source = rs.name
WHERE (ds.created_at >= NOW() - INTERVAL '30 days' OR ds.created_at IS NULL)
GROUP BY rs.id, rs.name, rs.url, rs.active, rs.last_scraped
ORDER BY discoveries_count DESC
LIMIT 20;
