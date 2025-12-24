-- Step 1: Create the table
CREATE TABLE IF NOT EXISTS funding_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id UUID REFERENCES startup_uploads(id) ON DELETE CASCADE,
  round_type TEXT NOT NULL,
  amount NUMERIC,
  valuation NUMERIC,
  date DATE NOT NULL,
  lead_investor TEXT,
  investors TEXT[],
  source TEXT,
  source_url TEXT,
  announced BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Create indexes (run after table is created)
CREATE INDEX IF NOT EXISTS idx_funding_rounds_startup ON funding_rounds(startup_id);
CREATE INDEX IF NOT EXISTS idx_funding_rounds_date ON funding_rounds(date DESC);
CREATE INDEX IF NOT EXISTS idx_funding_rounds_startup_date ON funding_rounds(startup_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_funding_rounds_type ON funding_rounds(round_type);

-- Step 3: Create the trigger function
CREATE OR REPLACE FUNCTION update_funding_rounds_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Step 4: Create the trigger
CREATE TRIGGER trigger_update_funding_rounds_updated_at
  BEFORE UPDATE ON funding_rounds
  FOR EACH ROW
  EXECUTE FUNCTION update_funding_rounds_updated_at();



