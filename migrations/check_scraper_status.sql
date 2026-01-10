-- Quick Scraper Status Check
-- Run this directly in Supabase SQL Editor (no API keys needed!)

-- 1. Check discovered_startups waiting to import
SELECT 
  'DISCOVERED STARTUPS' as category,
  COUNT(*) FILTER (WHERE imported_to_startups = false OR imported_to_startups IS NULL) as waiting_to_import,
  COUNT(*) FILTER (WHERE imported_to_startups = true) as already_imported,
  COUNT(*) as total,
  MAX(created_at) as most_recent
FROM discovered_startups;

-- 2. Recent discoveries (last 24h)
SELECT 
  'RECENT DISCOVERIES (Last 24h)' as category,
  COUNT(*) as count
FROM discovered_startups
WHERE created_at >= NOW() - INTERVAL '24 hours';

-- 3. Recent discoveries (last 7 days)
SELECT 
  'RECENT DISCOVERIES (Last 7 days)' as category,
  COUNT(*) as count
FROM discovered_startups
WHERE created_at >= NOW() - INTERVAL '7 days';

-- 4. Show 5 most recent unimported
SELECT 
  'RECENT UNIMPORTED (Top 5)' as category,
  name as company_name,
  created_at,
  rss_source as source
FROM discovered_startups
WHERE imported_to_startups = false OR imported_to_startups IS NULL
ORDER BY created_at DESC
LIMIT 5;

-- 5. Check RSS sources
SELECT 
  'RSS SOURCES' as category,
  COUNT(*) FILTER (WHERE active = true) as active_sources,
  COUNT(*) FILTER (WHERE active = false) as inactive_sources,
  COUNT(*) as total
FROM rss_sources;

-- 6. Recent RSS articles
SELECT 
  'RSS ARTICLES (Last 24h)' as category,
  COUNT(*) as count
FROM rss_articles
WHERE created_at >= NOW() - INTERVAL '24 hours';

-- Summary
SELECT 
  CASE 
    WHEN (SELECT COUNT(*) FROM discovered_startups WHERE imported_to_startups = false OR imported_to_startups IS NULL) > 0 
    THEN '⚠️ ' || (SELECT COUNT(*)::text FROM discovered_startups WHERE imported_to_startups = false OR imported_to_startups IS NULL) || ' startups waiting to import'
    ELSE '✅ No startups waiting - all imported or none discovered'
  END as status;
