-- Signals table for tracking VC/founder sentiment and emerging trends
CREATE TABLE IF NOT EXISTS signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Source information
  source_type VARCHAR(50) NOT NULL, -- 'vc_blog', 'founder_blog', 'reddit', 'discord', 'news', 'producthunt'
  source_name VARCHAR(255) NOT NULL, -- 'a16z', 'sequoia', 'firstround', 'ycombinator', etc.
  source_url TEXT,
  
  -- Content
  title TEXT,
  content TEXT,
  summary TEXT, -- AI-extracted summary
  
  -- Extracted signals
  sectors JSONB DEFAULT '[]', -- ['ai', 'defense', 'climate']
  themes JSONB DEFAULT '[]', -- ['solo founders', 'ai-native', 'regulatory change']
  sentiment VARCHAR(20), -- 'bullish', 'bearish', 'neutral'
  signal_strength FLOAT, -- 0-1 confidence score
  
  -- Entities mentioned
  companies_mentioned JSONB DEFAULT '[]',
  technologies_mentioned JSONB DEFAULT '[]',
  trends_mentioned JSONB DEFAULT '[]',
  
  -- Metadata
  published_at TIMESTAMPTZ,
  author VARCHAR(255),
  engagement_score INT, -- likes, upvotes, comments
  
  -- Processing status
  processed BOOLEAN DEFAULT FALSE,
  processing_error TEXT
);

-- Index for efficient queries
CREATE INDEX idx_signals_source_type ON signals(source_type);
CREATE INDEX idx_signals_published_at ON signals(published_at DESC);
CREATE INDEX idx_signals_sectors ON signals USING GIN(sectors);
CREATE INDEX idx_signals_themes ON signals USING GIN(themes);

-- Aggregated signal trends
CREATE TABLE IF NOT EXISTS signal_trends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Time window
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  
  -- Trend data
  sector VARCHAR(100),
  theme VARCHAR(255),
  
  -- Metrics
  mention_count INT DEFAULT 0,
  avg_sentiment FLOAT,
  momentum FLOAT, -- change vs previous period
  
  -- Sources breakdown
  source_breakdown JSONB DEFAULT '{}', -- {'vc_blog': 5, 'reddit': 12}
  
  UNIQUE(period_start, sector, theme)
);

-- Funding outcomes for ML training
CREATE TABLE IF NOT EXISTS funding_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  startup_id UUID REFERENCES startup_uploads(id),
  startup_name VARCHAR(255),
  
  -- Outcome
  outcome_type VARCHAR(50), -- 'funded', 'acquired', 'shutdown', 'unknown'
  funding_amount BIGINT,
  funding_round VARCHAR(50), -- 'seed', 'series_a', etc.
  investor_names JSONB DEFAULT '[]',
  
  -- Timing
  outcome_date TIMESTAMPTZ,
  god_score_at_time FLOAT, -- What was their GOD score before outcome?
  days_since_scored INT,
  
  -- For ML training
  features_at_time JSONB -- Snapshot of all features when scored
);

CREATE INDEX idx_funding_outcomes_startup ON funding_outcomes(startup_id);
CREATE INDEX idx_funding_outcomes_type ON funding_outcomes(outcome_type);
