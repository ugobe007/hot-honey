-- Funding Rounds Table
-- Stores historical funding rounds for startups to enable velocity calculations
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS funding_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id UUID REFERENCES startup_uploads(id) ON DELETE CASCADE,
  
  -- Round Details
  round_type TEXT NOT NULL,
  amount NUMERIC,
  valuation NUMERIC,
  date DATE NOT NULL,
  
  -- Investor Info
  lead_investor TEXT,
  investors TEXT[],
  
  -- Metadata
  source TEXT,
  source_url TEXT,
  announced BOOLEAN DEFAULT true,
  
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



