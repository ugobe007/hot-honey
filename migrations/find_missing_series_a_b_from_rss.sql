-- Find RSS Articles with Series A/B Mentions That Haven't Been Imported
-- This identifies the gap between RSS mentions and captured startups

-- 1. RSS Articles with Series A/B Mentions (Last 30 Days)
SELECT 
  'RSS ARTICLES WITH SERIES A/B (Last 30 Days)' as section,
  CASE 
    WHEN title ILIKE '%Series A%' OR content ILIKE '%Series A%' THEN 'Series A'
    WHEN title ILIKE '%Series B%' OR content ILIKE '%Series B%' THEN 'Series B'
  END as funding_stage,
  COUNT(*)::bigint as total_articles
FROM rss_articles
WHERE (title ILIKE '%Series A%' OR content ILIKE '%Series A%'
   OR title ILIKE '%Series B%' OR content ILIKE '%Series B%')
  AND created_at >= NOW() - INTERVAL '30 days'
GROUP BY 
  CASE 
    WHEN title ILIKE '%Series A%' OR content ILIKE '%Series A%' THEN 'Series A'
    WHEN title ILIKE '%Series B%' OR content ILIKE '%Series B%' THEN 'Series B'
  END
ORDER BY total_articles DESC;

-- 2. RSS Articles NOT Yet Imported to discovered_startups
SELECT 
  'UNIMPORTED RSS ARTICLES (Series A/B)' as section,
  ra.id as article_id,
  ra.title,
  ra.url,
  ra.published_at,
  LEFT(ra.content, 200) as content_preview,
  CASE 
    WHEN ra.title ILIKE '%Series A%' OR ra.content ILIKE '%Series A%' THEN 'Series A'
    WHEN ra.title ILIKE '%Series B%' OR ra.content ILIKE '%Series B%' THEN 'Series B'
  END as funding_stage,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM discovered_startups ds 
      WHERE ds.article_url = ra.url OR ds.article_url ILIKE '%' || SPLIT_PART(ra.url, '/', 3) || '%'
    ) THEN 'Imported'
    ELSE 'NOT Imported'
  END as import_status
FROM rss_articles ra
WHERE (ra.title ILIKE '%Series A%' OR ra.content ILIKE '%Series A%'
   OR ra.title ILIKE '%Series B%' OR ra.content ILIKE '%Series B%')
  AND ra.created_at >= NOW() - INTERVAL '30 days'
  AND NOT EXISTS (
    SELECT 1 FROM discovered_startups ds 
    WHERE ds.article_url = ra.url OR ds.article_url ILIKE '%' || SPLIT_PART(ra.url, '/', 3) || '%'
  )
ORDER BY ra.published_at DESC
LIMIT 50;

-- 3. Count Unimported vs Imported
SELECT 
  'IMPORT STATUS BREAKDOWN' as section,
  CASE 
    WHEN ra.title ILIKE '%Series A%' OR ra.content ILIKE '%Series A%' THEN 'Series A'
    WHEN ra.title ILIKE '%Series B%' OR ra.content ILIKE '%Series B%' THEN 'Series B'
  END as funding_stage,
  COUNT(*) FILTER (
    WHERE EXISTS (
      SELECT 1 FROM discovered_startups ds 
      WHERE ds.article_url = ra.url OR ds.article_url ILIKE '%' || SPLIT_PART(ra.url, '/', 3) || '%'
    )
  )::bigint as imported_count,
  COUNT(*) FILTER (
    WHERE NOT EXISTS (
      SELECT 1 FROM discovered_startups ds 
      WHERE ds.article_url = ra.url OR ds.article_url ILIKE '%' || SPLIT_PART(ra.url, '/', 3) || '%'
    )
  )::bigint as not_imported_count,
  COUNT(*)::bigint as total_articles
FROM rss_articles ra
WHERE (ra.title ILIKE '%Series A%' OR ra.content ILIKE '%Series A%'
   OR ra.title ILIKE '%Series B%' OR ra.content ILIKE '%Series B%')
  AND ra.created_at >= NOW() - INTERVAL '30 days'
GROUP BY 
  CASE 
    WHEN ra.title ILIKE '%Series A%' OR ra.content ILIKE '%Series A%' THEN 'Series A'
    WHEN ra.title ILIKE '%Series B%' OR ra.content ILIKE '%Series B%' THEN 'Series B'
  END
ORDER BY total_articles DESC;

-- 4. Sample Unimported Articles for Manual Review
SELECT 
  'SAMPLE: Unimported Series A/B Articles' as section,
  ra.id,
  ra.title,
  ra.url,
  ra.published_at,
  LEFT(ra.content, 300) as content_preview,
  CASE 
    WHEN ra.title ILIKE '%Series A%' OR ra.content ILIKE '%Series A%' THEN 'Series A'
    WHEN ra.title ILIKE '%Series B%' OR ra.content ILIKE '%Series B%' THEN 'Series B'
  END as inferred_stage
FROM rss_articles ra
WHERE (ra.title ILIKE '%Series A%' OR ra.content ILIKE '%Series A%'
   OR ra.title ILIKE '%Series B%' OR ra.content ILIKE '%Series B%')
  AND ra.created_at >= NOW() - INTERVAL '30 days'
  AND NOT EXISTS (
    SELECT 1 FROM discovered_startups ds 
    WHERE ds.article_url = ra.url OR ds.article_url ILIKE '%' || SPLIT_PART(ra.url, '/', 3) || '%'
  )
ORDER BY ra.published_at DESC
LIMIT 20;
