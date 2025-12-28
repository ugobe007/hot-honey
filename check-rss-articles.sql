-- Check what RSS articles we have that might contain funding info
-- Run this in Supabase SQL Editor

-- Check if rss_articles table exists and has data
SELECT 
  EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'rss_articles'
  ) as rss_articles_exists;

-- If table exists, check for funding-related articles
SELECT COUNT(*) as total_articles
FROM rss_articles
WHERE title ILIKE '%funding%' 
   OR title ILIKE '%raises%'
   OR title ILIKE '%investment%'
   OR title ILIKE '%series%'
   OR title ILIKE '%seed%';

-- Sample funding articles
SELECT 
  title,
  url,
  published_at,
  created_at
FROM rss_articles
WHERE title ILIKE '%funding%' 
   OR title ILIKE '%raises%'
   OR title ILIKE '%investment%'
ORDER BY published_at DESC
LIMIT 10;

-- Check startup_news table
SELECT 
  EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'startup_news'
  ) as startup_news_exists;

-- If startup_news exists, check for funding articles
SELECT COUNT(*) as funding_news
FROM startup_news
WHERE headline ILIKE '%funding%' 
   OR headline ILIKE '%raises%'
   OR headline ILIKE '%investment%';

-- Sample funding news
SELECT 
  headline,
  url,
  published_date,
  summary
FROM startup_news
WHERE headline ILIKE '%funding%' 
   OR headline ILIKE '%raises%'
ORDER BY published_date DESC
LIMIT 10;





