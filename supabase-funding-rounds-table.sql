-- Funding Rounds Table
-- Stores historical funding rounds for startups to enable velocity calculations

CREATE TABLE IF NOT EXISTS funding_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id UUID REFERENCES startup_uploads(id) ON DELETE CASCADE,
  
  -- Round Details
  round_type TEXT NOT NULL,  -- pre-seed, seed, series_a, series_b, series_c, etc.
  amount NUMERIC,            -- Funding amount in USD
  valuation NUMERIC,         -- Post-money valuation in USD
  date DATE NOT NULL,        -- Funding date (CRITICAL for velocity calculation)
  
  -- Investor Info
  lead_investor TEXT,        -- Lead investor name
  investors TEXT[],          -- Array of investor names
  
  -- Metadata
  source TEXT,               -- Where we got this data (crunchbase, news, etc.)
  source_url TEXT,           -- URL to source article/announcement
  announced BOOLEAN DEFAULT true,  -- Was this publicly announced?
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_funding_rounds_startup ON funding_rounds(startup_id);
CREATE INDEX IF NOT EXISTS idx_funding_rounds_date ON funding_rounds(date DESC);
CREATE INDEX IF NOT EXISTS idx_funding_rounds_startup_date ON funding_rounds(startup_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_funding_rounds_type ON funding_rounds(round_type);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_funding_rounds_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_funding_rounds_updated_at
  BEFORE UPDATE ON funding_rounds
  FOR EACH ROW
  EXECUTE FUNCTION update_funding_rounds_updated_at();

-- Add comment
COMMENT ON TABLE funding_rounds IS 'Historical funding rounds for startups. Used to calculate funding velocity (time between rounds) adjusted for sector and stage.';



