-- Migration: Create Scraper Selectors Table
-- Description: Stores CSS selectors, parsing strategies, and success rates for self-healing scrapers
-- Created: 2025-01-07

CREATE TABLE IF NOT EXISTS scraper_selectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Website identification
  domain TEXT NOT NULL,
  data_type TEXT NOT NULL, -- 'startup', 'investor', 'article', 'funding', etc.
  field TEXT, -- 'name', 'description', 'funding_amount', etc.
  
  -- Selector information
  selector TEXT NOT NULL, -- CSS selector, regex pattern, or strategy identifier
  strategy TEXT NOT NULL DEFAULT 'css', -- 'css', 'ai', 'pattern', 'browser', 'json-ld'
  
  -- Performance tracking
  success_rate INTEGER DEFAULT 100, -- 0-100 percentage
  usage_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  last_success TIMESTAMPTZ,
  last_failure TIMESTAMPTZ,
  
  -- Status
  active BOOLEAN DEFAULT true,
  
  -- Additional metadata (JSON)
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_scraper_selectors_domain_type 
ON scraper_selectors(domain, data_type) WHERE active = true;

CREATE INDEX IF NOT EXISTS idx_scraper_selectors_success_rate 
ON scraper_selectors(success_rate DESC) WHERE active = true;

CREATE INDEX IF NOT EXISTS idx_scraper_selectors_strategy 
ON scraper_selectors(strategy) WHERE active = true;

-- Unique constraint: one selector per domain/type/field/selector combination
CREATE UNIQUE INDEX IF NOT EXISTS idx_scraper_selectors_unique 
ON scraper_selectors(domain, data_type, field, selector) WHERE active = true;

-- Comments
COMMENT ON TABLE scraper_selectors IS 'Stores CSS selectors and parsing strategies for self-healing scrapers';
COMMENT ON COLUMN scraper_selectors.selector IS 'CSS selector, regex pattern, or strategy identifier';
COMMENT ON COLUMN scraper_selectors.strategy IS 'Parsing strategy: css, ai, pattern, browser, json-ld';
COMMENT ON COLUMN scraper_selectors.success_rate IS 'Success rate percentage (0-100). Selectors with <30% are auto-deactivated';

