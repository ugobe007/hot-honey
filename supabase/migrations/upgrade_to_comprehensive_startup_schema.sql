-- Upgrade to Comprehensive Startup Schema
-- Based on the tiered scraping architecture specification
-- This migration adds all new fields while preserving existing data

-- Step 1: Add Identity fields (dedupe backbone)
ALTER TABLE startup_uploads
  ADD COLUMN IF NOT EXISTS canonical_domain TEXT,
  ADD COLUMN IF NOT EXISTS aliases JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS hq_location JSONB, -- {city, region, country}
  ADD COLUMN IF NOT EXISTS founded_year INTEGER,
  ADD COLUMN IF NOT EXISTS company_status TEXT DEFAULT 'active' CHECK (company_status IN ('active', 'acquired', 'dead', 'unknown'));

-- Step 2: Add Snapshot fields (investor-facing)
ALTER TABLE startup_uploads
  ADD COLUMN IF NOT EXISTS one_liner TEXT, -- ≤160 chars (use tagline as fallback)
  ADD COLUMN IF NOT EXISTS category_primary TEXT, -- enum (use first sector as fallback)
  ADD COLUMN IF NOT EXISTS category_tags JSONB DEFAULT '[]'::jsonb, -- secondary tags (use sectors as fallback)
  ADD COLUMN IF NOT EXISTS stage_estimate TEXT, -- pre-seed/seed/A/etc with confidence
  ADD COLUMN IF NOT EXISTS stage_confidence NUMERIC(3,2), -- 0.00-1.00
  ADD COLUMN IF NOT EXISTS product_description_short TEXT, -- 1-3 sentences
  ADD COLUMN IF NOT EXISTS problem TEXT,
  ADD COLUMN IF NOT EXISTS solution TEXT;

-- Step 3: Add Signals (GOD inputs) - stored in JSONB for flexibility
-- These are already partially in extracted_data, but we'll structure them better
-- traction_signals, team_signals, market_signals, moat_signals will be in extracted_data

-- Step 4: Add Funding/Investor Signals
ALTER TABLE startup_uploads
  ADD COLUMN IF NOT EXISTS funding_mentions JSONB DEFAULT '[]'::jsonb, -- {round, amount, date, investors[], evidence_url, confidence}
  ADD COLUMN IF NOT EXISTS investor_mentions JSONB DEFAULT '[]'::jsonb, -- if round unknown
  ADD COLUMN IF NOT EXISTS accelerators JSONB DEFAULT '[]'::jsonb; -- YC, Techstars, etc.

-- Step 5: Add Evidence + Crawl Metadata
ALTER TABLE startup_uploads
  ADD COLUMN IF NOT EXISTS evidence JSONB DEFAULT '[]'::jsonb, -- {url, source, snippet, captured_at}
  ADD COLUMN IF NOT EXISTS source_first_seen TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS source_last_seen TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS crawl_history JSONB DEFAULT '[]'::jsonb, -- {source, fetched_at, method, success, http_status, parse_version}
  ADD COLUMN IF NOT EXISTS field_provenance JSONB DEFAULT '{}'::jsonb; -- field -> {source_url, extractor, confidence, timestamp}

-- Step 6: Add GOD Outputs (some already exist, but add explainability)
ALTER TABLE startup_uploads
  ADD COLUMN IF NOT EXISTS god_score_components JSONB, -- {grit, opportunity, determination}
  ADD COLUMN IF NOT EXISTS god_reason_codes JSONB DEFAULT '[]'::jsonb, -- human-readable bullet reasons
  ADD COLUMN IF NOT EXISTS god_risk_flags JSONB DEFAULT '[]'::jsonb, -- e.g., "unclear product", "no domain", etc.
  ADD COLUMN IF NOT EXISTS god_model_version TEXT;

-- Step 7: Create indexes for new fields
CREATE INDEX IF NOT EXISTS idx_startup_uploads_canonical_domain ON startup_uploads(canonical_domain) WHERE canonical_domain IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_startup_uploads_category_primary ON startup_uploads(category_primary) WHERE category_primary IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_startup_uploads_stage_estimate ON startup_uploads(stage_estimate) WHERE stage_estimate IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_startup_uploads_company_status ON startup_uploads(company_status);
CREATE INDEX IF NOT EXISTS idx_startup_uploads_founded_year ON startup_uploads(founded_year) WHERE founded_year IS NOT NULL;

-- GIN indexes for JSONB fields
CREATE INDEX IF NOT EXISTS idx_startup_uploads_aliases ON startup_uploads USING GIN (aliases);
CREATE INDEX IF NOT EXISTS idx_startup_uploads_category_tags ON startup_uploads USING GIN (category_tags);
CREATE INDEX IF NOT EXISTS idx_startup_uploads_funding_mentions ON startup_uploads USING GIN (funding_mentions);
CREATE INDEX IF NOT EXISTS idx_startup_uploads_evidence ON startup_uploads USING GIN (evidence);

-- Step 8: Migrate existing data to new schema
-- Map existing fields to new schema
UPDATE startup_uploads
SET
  -- Identity
  canonical_domain = CASE 
    WHEN website IS NOT NULL THEN 
      LOWER(REGEXP_REPLACE(website, '^https?://(www\.)?', ''))
    ELSE NULL
  END,
  -- Snapshot
  one_liner = COALESCE(tagline, LEFT(description, 160)),
  category_primary = CASE 
    WHEN sectors IS NOT NULL AND array_length(sectors, 1) > 0 THEN sectors[1]
    ELSE 'Technology'
  END,
  category_tags = CASE 
    WHEN sectors IS NOT NULL THEN sectors::jsonb
    ELSE '[]'::jsonb
  END,
  stage_estimate = CASE 
    WHEN stage = 0 THEN 'pre-seed'
    WHEN stage = 1 THEN 'pre-seed'
    WHEN stage = 2 THEN 'seed'
    WHEN stage = 3 THEN 'series-a'
    WHEN stage = 4 THEN 'series-b'
    WHEN stage = 5 THEN 'series-c'
    ELSE 'unknown'
  END,
  -- Evidence (initialize from source_url if exists)
  evidence = CASE 
    WHEN source_url IS NOT NULL THEN 
      jsonb_build_array(
        jsonb_build_object(
          'url', source_url,
          'source', COALESCE(source_type, 'unknown'),
          'snippet', LEFT(COALESCE(description, tagline, ''), 200),
          'captured_at', created_at
        )
      )
    ELSE '[]'::jsonb
  END,
  source_first_seen = created_at,
  source_last_seen = updated_at
WHERE canonical_domain IS NULL; -- Only update if not already set

-- Step 9: Add unique constraint on canonical_domain (for dedupe)
-- Note: Only enforce uniqueness where canonical_domain is not null
CREATE UNIQUE INDEX IF NOT EXISTS idx_startup_uploads_canonical_domain_unique 
  ON startup_uploads(canonical_domain) 
  WHERE canonical_domain IS NOT NULL;

-- Step 10: Add constraint to ensure one_liner is ≤160 chars
ALTER TABLE startup_uploads
  ADD CONSTRAINT check_one_liner_length 
  CHECK (one_liner IS NULL OR LENGTH(one_liner) <= 160);

COMMENT ON COLUMN startup_uploads.canonical_domain IS 'Primary key for deduplication (e.g., acme.ai)';
COMMENT ON COLUMN startup_uploads.one_liner IS 'Investor-facing one-liner (≤160 chars)';
COMMENT ON COLUMN startup_uploads.category_primary IS 'Primary category enum';
COMMENT ON COLUMN startup_uploads.stage_estimate IS 'Stage estimate with confidence (pre-seed/seed/series-a/etc)';
COMMENT ON COLUMN startup_uploads.funding_mentions IS 'Array of funding rounds: {round, amount, date, investors[], evidence_url, confidence}';
COMMENT ON COLUMN startup_uploads.evidence IS 'Array of evidence: {url, source, snippet, captured_at}';
COMMENT ON COLUMN startup_uploads.field_provenance IS 'Map of field -> {source_url, extractor, confidence, timestamp}';


