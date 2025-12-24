-- Extract Funding Rounds from RSS Articles (SQL Only)
-- This version doesn't need Node.js or .env file
-- Run this in Supabase SQL Editor

-- Step 1: Check what RSS articles we have
SELECT 
  COUNT(*) as total_articles,
  COUNT(CASE 
    WHEN title ILIKE '%funding%' OR title ILIKE '%raises%' OR title ILIKE '%investment%' 
    THEN 1 
  END) as funding_articles
FROM rss_articles;

-- Step 2: See sample funding articles
SELECT 
  id,
  title,
  url,
  published_at,
  LEFT(content, 200) as content_preview
FROM rss_articles
WHERE title ILIKE '%funding%' 
   OR title ILIKE '%raises%'
   OR title ILIKE '%investment%'
   OR title ILIKE '%series%'
   OR title ILIKE '%seed%'
ORDER BY published_at DESC
LIMIT 20;

-- Step 3: Manual extraction approach
-- Since we can't use AI in SQL, we'll need to manually identify funding rounds
-- or use a pattern-based extraction

-- This creates a view to help identify potential funding rounds
CREATE OR REPLACE VIEW potential_funding_rounds AS
SELECT 
  ra.id as article_id,
  ra.title,
  ra.url,
  ra.published_at as funding_date,
  -- Try to extract company name from title (basic pattern matching)
  CASE 
    WHEN title ~* '([A-Z][a-z]+ [A-Z][a-z]+|([A-Z][a-z]+)) (raises|raised|closes|secured)' 
    THEN REGEXP_REPLACE(title, '^([A-Z][a-z]+(?: [A-Z][a-z]+)?) .*', '\1')
    ELSE NULL
  END as potential_company,
  -- Try to extract amount (basic pattern)
  CASE 
    WHEN title ~* '\$[\d.]+[MBK]'
    THEN REGEXP_REPLACE(title, '.*\$([\d.]+[MBK]).*', '\1', 'i')
    ELSE NULL
  END as potential_amount,
  -- Try to extract round type
  CASE 
    WHEN title ~* 'series [abc]' THEN REGEXP_REPLACE(title, '.*series ([abc]).*', 'series_\1', 'i')
    WHEN title ~* 'seed' THEN 'seed'
    WHEN title ~* 'pre-seed' THEN 'pre-seed'
    WHEN title ~* 'angel' THEN 'angel'
    ELSE 'unknown'
  END as potential_round_type
FROM rss_articles ra
WHERE title ILIKE '%funding%' 
   OR title ILIKE '%raises%'
   OR title ILIKE '%investment%'
   OR title ILIKE '%series%'
   OR title ILIKE '%seed%';

-- Step 4: See potential funding rounds
SELECT * FROM potential_funding_rounds
WHERE potential_company IS NOT NULL
ORDER BY funding_date DESC
LIMIT 20;

-- Step 5: Manual insertion example
-- Once you identify a funding round, you can insert it like this:
/*
INSERT INTO funding_rounds (
  startup_id,
  round_type,
  amount,
  date,
  source,
  source_url,
  announced
)
SELECT 
  su.id,
  'series_a',  -- Change based on actual round
  5000000,     -- Change based on actual amount (in USD)
  '2024-01-15'::DATE,  -- Change to actual date
  'rss_articles',
  'https://article-url.com',
  true
FROM startup_uploads su
WHERE LOWER(su.name) = LOWER('Company Name Here')  -- Match company name
LIMIT 1;
*/

-- Step 6: Check current funding rounds
SELECT 
  COUNT(*) as total_rounds,
  COUNT(DISTINCT startup_id) as startups_with_rounds
FROM funding_rounds;

-- Step 7: See which startups have funding rounds
SELECT 
  su.name,
  COUNT(fr.id) as rounds,
  MAX(fr.date) as latest_round,
  SUM(fr.amount) as total_funding
FROM startup_uploads su
LEFT JOIN funding_rounds fr ON fr.startup_id = su.id
GROUP BY su.id, su.name
HAVING COUNT(fr.id) > 0
ORDER BY rounds DESC, latest_round DESC;



