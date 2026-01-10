-- Fix Script: Recreate startup_investor_matches if it's missing or broken
-- Only run this if the diagnosis shows the table is missing

-- Step 1: Drop table if it exists (clean slate)
DROP TABLE IF EXISTS startup_investor_matches CASCADE;

-- Step 2: Recreate the table
CREATE TABLE startup_investor_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id UUID NOT NULL,
  investor_id UUID NOT NULL,
  match_score DECIMAL(5,2) CHECK (match_score >= 0 AND match_score <= 100),
  confidence_level VARCHAR(20) CHECK (confidence_level IN ('high', 'medium', 'low')),
  similarity_score DECIMAL(5,2),
  success_score DECIMAL(5,2),
  reasoning TEXT,
  why_you_match TEXT[],
  fit_analysis JSONB,
  status VARCHAR(50) DEFAULT 'suggested' CHECK (status IN (
    'suggested', 'viewed', 'saved', 'contacted', 'meeting_scheduled', 
    'rejected', 'interested', 'not_interested', 'funded'
  )),
  viewed_at TIMESTAMPTZ,
  intro_requested_at TIMESTAMPTZ,
  contacted_at TIMESTAMPTZ,
  last_interaction TIMESTAMPTZ,
  intro_email_subject TEXT,
  intro_email_body TEXT,
  feedback_received BOOLEAN DEFAULT FALSE,
  user_id UUID,
  created_by VARCHAR(50) DEFAULT 'god_algorithm',
  algorithm_version VARCHAR(20),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(startup_id, investor_id)
);

-- Step 3: Create indexes
CREATE INDEX idx_startup_investor_matches_startup_id ON startup_investor_matches(startup_id);
CREATE INDEX idx_startup_investor_matches_investor_id ON startup_investor_matches(investor_id);
CREATE INDEX idx_startup_investor_matches_match_score ON startup_investor_matches(match_score DESC NULLS LAST);
CREATE INDEX idx_startup_investor_matches_status ON startup_investor_matches(status) WHERE status = 'suggested';
CREATE INDEX idx_startup_investor_matches_created_at ON startup_investor_matches(created_at DESC);

-- Step 4: Enable RLS
ALTER TABLE startup_investor_matches ENABLE ROW LEVEL SECURITY;

-- Step 5: Drop old policies if they exist
DROP POLICY IF EXISTS "Allow public read access to matches" ON startup_investor_matches;
DROP POLICY IF EXISTS "Allow public insert on matches" ON startup_investor_matches;
DROP POLICY IF EXISTS "Allow public update on matches" ON startup_investor_matches;

-- Step 6: Create policies
CREATE POLICY "Allow public read access to matches"
  ON startup_investor_matches FOR SELECT USING (true);

CREATE POLICY "Allow public insert on matches"
  ON startup_investor_matches FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update on matches"
  ON startup_investor_matches FOR UPDATE USING (true) WITH CHECK (true);

-- Success message
SELECT '✅ startup_investor_matches table recreated successfully!' as status;
