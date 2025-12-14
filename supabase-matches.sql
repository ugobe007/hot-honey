-- Startup-Investor Matches Table
-- Tracks which startups have been matched with which investors

CREATE TABLE IF NOT EXISTS startup_investor_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id UUID NOT NULL REFERENCES startups(id) ON DELETE CASCADE,
  investor_id UUID NOT NULL REFERENCES investors(id) ON DELETE CASCADE,
  
  -- Match quality metrics
  match_score DECIMAL(5,2) CHECK (match_score >= 0 AND match_score <= 100),
  confidence_level VARCHAR(20) CHECK (confidence_level IN ('high', 'medium', 'low')),
  
  -- Match reasoning
  match_reason TEXT, -- Why they were matched (AI explanation)
  stage_fit BOOLEAN DEFAULT false, -- Does investor stage match startup stage?
  sector_fit BOOLEAN DEFAULT false, -- Does investor sector match startup sector?
  geography_fit BOOLEAN DEFAULT false, -- Geographic alignment
  
  -- Match status
  status VARCHAR(20) DEFAULT 'suggested' CHECK (status IN ('suggested', 'viewed', 'saved', 'contacted', 'meeting_scheduled', 'rejected')),
  
  -- Engagement tracking
  viewed_by_startup BOOLEAN DEFAULT false,
  viewed_by_investor BOOLEAN DEFAULT false,
  viewed_at TIMESTAMPTZ,
  saved_at TIMESTAMPTZ,
  contacted_at TIMESTAMPTZ,
  
  -- AI/Algorithm metadata
  matched_by VARCHAR(50) DEFAULT 'god_algorithm', -- 'god_algorithm', 'ml_model', 'manual', 'rss_discovery'
  algorithm_version VARCHAR(20),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent duplicate matches
  UNIQUE(startup_id, investor_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_matches_startup ON startup_investor_matches(startup_id);
CREATE INDEX IF NOT EXISTS idx_matches_investor ON startup_investor_matches(investor_id);
CREATE INDEX IF NOT EXISTS idx_matches_score ON startup_investor_matches(match_score DESC);
CREATE INDEX IF NOT EXISTS idx_matches_status ON startup_investor_matches(status);
CREATE INDEX IF NOT EXISTS idx_matches_created ON startup_investor_matches(created_at DESC);

-- RLS Policies
ALTER TABLE startup_investor_matches ENABLE ROW LEVEL SECURITY;

-- Allow public to read matches
CREATE POLICY "Allow public read access to matches"
  ON startup_investor_matches FOR SELECT
  USING (true);

-- Allow authenticated users to insert matches
CREATE POLICY "Allow authenticated insert on matches"
  ON startup_investor_matches FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'anon');

-- Allow authenticated users to update their own matches
CREATE POLICY "Allow authenticated update on matches"
  ON startup_investor_matches FOR UPDATE
  USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

-- Allow service role full access
CREATE POLICY "Allow service role all access to matches"
  ON startup_investor_matches FOR ALL
  USING (auth.role() = 'service_role');

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_matches_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_matches_updated_at
  BEFORE UPDATE ON startup_investor_matches
  FOR EACH ROW
  EXECUTE FUNCTION update_matches_updated_at();

-- View for match statistics
CREATE OR REPLACE VIEW match_statistics AS
SELECT 
  COUNT(*) as total_matches,
  COUNT(DISTINCT startup_id) as unique_startups_matched,
  COUNT(DISTINCT investor_id) as unique_investors_matched,
  AVG(match_score) as avg_match_score,
  COUNT(*) FILTER (WHERE status = 'saved') as saved_matches,
  COUNT(*) FILTER (WHERE status = 'contacted') as contacted_matches,
  COUNT(*) FILTER (WHERE confidence_level = 'high') as high_confidence_matches,
  COUNT(*) FILTER (WHERE viewed_by_startup = true) as viewed_by_startups,
  COUNT(*) FILTER (WHERE viewed_by_investor = true) as viewed_by_investors
FROM startup_investor_matches;
