-- ============================================================================
-- QUARANTINE GARBAGE INVESTORS
-- ============================================================================
-- Creates a quarantine table and moves garbage investor records
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Step 1: Create quarantine table
CREATE TABLE IF NOT EXISTS investor_mentions_raw (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_investor_id UUID REFERENCES investors(id) ON DELETE SET NULL,
  mention_text TEXT NOT NULL,
  firm TEXT,
  source_url TEXT,
  validation_reason TEXT,
  validation_confidence NUMERIC,
  missing_count INTEGER,
  quarantined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  original_data JSONB
);

-- Step 2: Identify garbage records (run this first to see what will be quarantined)
-- This query identifies records that should be quarantined
WITH garbage_candidates AS (
  SELECT 
    id,
    name,
    firm,
    url,
    linkedin_url,
    bio,
    sectors,
    stage,
    -- Missing count
    (
      CASE WHEN bio IS NULL OR LENGTH(bio) < 50 THEN 1 ELSE 0 END +
      CASE WHEN url IS NULL THEN 1 ELSE 0 END +
      CASE WHEN linkedin_url IS NULL THEN 1 ELSE 0 END +
      CASE WHEN sectors IS NULL OR array_length(sectors, 1) IS NULL OR array_length(sectors, 1) = 0 THEN 1 ELSE 0 END +
      CASE WHEN stage IS NULL OR array_length(stage, 1) IS NULL OR array_length(stage, 1) = 0 THEN 1 ELSE 0 END
    ) AS missing_count,
    -- Garbage indicators
    CASE WHEN name ~* '^(article|min read|day ago|how|why|what|and|or|but|as|with|for|to|of|in|on|at|by|from)\s+' THEN true ELSE false END AS starts_with_stopword,
    CASE WHEN name ~* '^(article|min read|day ago)' THEN true ELSE false END AS has_article_prefix,
    CASE WHEN name ~* '(Managing|Senior Finance|Senior Research|Finance|Research|Design|Operations|Policy|Council)' THEN true ELSE false END AS has_job_title,
    CASE WHEN LENGTH(name) < 3 THEN true ELSE false END AS too_short,
    CASE WHEN name !~* '[A-Z][a-z]+\s+[A-Z][a-z]+' AND name !~* '(Capital|Ventures|Partners|Fund|Investments|Group|Equity|Holdings)$' THEN true ELSE false END AS no_proper_name
  FROM investors
)
SELECT 
  id,
  name,
  firm,
  missing_count,
  starts_with_stopword,
  has_article_prefix,
  has_job_title,
  too_short,
  no_proper_name,
  CASE 
    WHEN missing_count >= 7 AND url IS NULL AND linkedin_url IS NULL AND (starts_with_stopword OR has_article_prefix OR too_short) THEN 'quarantine'
    WHEN has_article_prefix THEN 'quarantine'
    WHEN has_job_title AND url IS NULL THEN 'quarantine'
    WHEN too_short AND no_proper_name THEN 'quarantine'
    ELSE 'keep'
  END AS action
FROM garbage_candidates
WHERE 
  -- Quarantine criteria
  (
    missing_count >= 7 AND url IS NULL AND linkedin_url IS NULL AND (starts_with_stopword OR has_article_prefix OR too_short)
    OR has_article_prefix
    OR (has_job_title AND url IS NULL)
    OR (too_short AND no_proper_name)
  )
ORDER BY missing_count DESC, name ASC
LIMIT 500;

-- Step 3: Move garbage records to quarantine (UNCOMMENT TO EXECUTE)
/*
WITH garbage_candidates AS (
  SELECT 
    id,
    name,
    firm,
    url,
    linkedin_url,
    bio,
    sectors,
    stage,
    (
      CASE WHEN bio IS NULL OR LENGTH(bio) < 50 THEN 1 ELSE 0 END +
      CASE WHEN url IS NULL THEN 1 ELSE 0 END +
      CASE WHEN linkedin_url IS NULL THEN 1 ELSE 0 END +
      CASE WHEN sectors IS NULL OR array_length(sectors, 1) IS NULL OR array_length(sectors, 1) = 0 THEN 1 ELSE 0 END +
      CASE WHEN stage IS NULL OR array_length(stage, 1) IS NULL OR array_length(stage, 1) = 0 THEN 1 ELSE 0 END
    ) AS missing_count,
    CASE WHEN name ~* '^(article|min read|day ago|how|why|what|and|or|but|as|with|for|to|of|in|on|at|by|from)\s+' THEN true ELSE false END AS starts_with_stopword,
    CASE WHEN name ~* '^(article|min read|day ago)' THEN true ELSE false END AS has_article_prefix,
    CASE WHEN name ~* '(Managing|Senior Finance|Senior Research|Finance|Research|Design|Operations|Policy|Council)' THEN true ELSE false END AS has_job_title,
    CASE WHEN LENGTH(name) < 3 THEN true ELSE false END AS too_short,
    CASE WHEN name !~* '[A-Z][a-z]+\s+[A-Z][a-z]+' AND name !~* '(Capital|Ventures|Partners|Fund|Investments|Group|Equity|Holdings)$' THEN true ELSE false END AS no_proper_name,
    to_jsonb(i.*) AS original_data
  FROM investors i
  WHERE 
    (
      (
        CASE WHEN bio IS NULL OR LENGTH(bio) < 50 THEN 1 ELSE 0 END +
        CASE WHEN url IS NULL THEN 1 ELSE 0 END +
        CASE WHEN linkedin_url IS NULL THEN 1 ELSE 0 END +
        CASE WHEN sectors IS NULL OR array_length(sectors, 1) IS NULL OR array_length(sectors, 1) = 0 THEN 1 ELSE 0 END +
        CASE WHEN stage IS NULL OR array_length(stage, 1) IS NULL OR array_length(stage, 1) = 0 THEN 1 ELSE 0 END
      ) >= 7 AND url IS NULL AND linkedin_url IS NULL AND (
        name ~* '^(article|min read|day ago|how|why|what|and|or|but|as|with|for|to|of|in|on|at|by|from)\s+'
        OR name ~* '^(article|min read|day ago)'
        OR LENGTH(name) < 3
      )
      OR name ~* '^(article|min read|day ago)'
      OR (name ~* '(Managing|Senior Finance|Senior Research|Finance|Research|Design|Operations|Policy|Council)' AND url IS NULL)
      OR (LENGTH(name) < 3 AND name !~* '[A-Z][a-z]+\s+[A-Z][a-z]+' AND name !~* '(Capital|Ventures|Partners|Fund|Investments|Group|Equity|Holdings)$')
    )
)
INSERT INTO investor_mentions_raw (
  original_investor_id,
  mention_text,
  firm,
  source_url,
  validation_reason,
  missing_count,
  original_data
)
SELECT 
  id,
  name,
  firm,
  url,
  CASE 
    WHEN has_article_prefix THEN 'article_metadata'
    WHEN has_job_title THEN 'role_based_hallucination'
    WHEN too_short AND no_proper_name THEN 'sentence_fragment'
    ELSE 'promotion_gate_failed'
  END,
  missing_count,
  original_data
FROM garbage_candidates;

-- Step 4: Delete quarantined records from investors table (UNCOMMENT TO EXECUTE)
-- WARNING: This will delete records. Make sure you've reviewed the quarantine table first!
/*
DELETE FROM investors
WHERE id IN (
  SELECT original_investor_id 
  FROM investor_mentions_raw 
  WHERE original_investor_id IS NOT NULL
);
*/


