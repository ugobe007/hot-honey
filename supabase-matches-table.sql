-- Startup-Investor Matches Table
-- Tracks which startups have been matched with which investors

CREATE TABLE IF NOT EXISTS matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relationship
  startup_id TEXT NOT NULL REFERENCES startups(id) ON DELETE CASCADE,
  investor_id UUID NOT NULL REFERENCES investors(id) ON DELETE CASCADE,
  
  -- Match Details
  match_score DECIMAL(5,2), -- 0.00 to 100.00 (matching algorithm score)
  match_type VARCHAR(50) DEFAULT 'algorithm', -- 'algorithm', 'manual', 'user_saved'
  
  -- Status
  status VARCHAR(20) DEFAULT 'suggested', -- 'suggested', 'interested', 'contacted', 'meeting_scheduled', 'passed', 'invested'
  
  -- GOD Score at time of match
  god_score DECIMAL(5,2),
  
  -- Matching reasons (JSON array of factors)
  match_reasons JSONB DEFAULT '[]',
  -- Example: ["industry_match", "stage_match", "geography_match", "investment_size_fit"]
  
  -- Interaction tracking
  viewed_by_investor BOOLEAN DEFAULT FALSE,
  viewed_at TIMESTAMP,
  investor_interest VARCHAR(20), -- 'very_interested', 'interested', 'maybe', 'not_interested'
  investor_notes TEXT,
  
  -- Communication
  contacted BOOLEAN DEFAULT FALSE,
  contacted_at TIMESTAMP,
  contact_method VARCHAR(50), -- 'email', 'platform_message', 'phone', 'meeting'
  
  -- Outcome tracking
  meeting_scheduled BOOLEAN DEFAULT FALSE,
  meeting_date TIMESTAMP,
  investment_made BOOLEAN DEFAULT FALSE,
  investment_amount VARCHAR(50),
  investment_date TIMESTAMP,
  
  -- Metadata
  matched_by UUID REFERENCES auth.users(id), -- Who created this match (if manual)
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Prevent duplicate matches
  UNIQUE(startup_id, investor_id)
);

-- Indexes for performance
CREATE INDEX idx_matches_startup ON matches(startup_id);
CREATE INDEX idx_matches_investor ON matches(investor_id);
CREATE INDEX idx_matches_status ON matches(status);
CREATE INDEX idx_matches_score ON matches(match_score DESC);
CREATE INDEX idx_matches_created ON matches(created_at DESC);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_matches_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER matches_updated_at
  BEFORE UPDATE ON matches
  FOR EACH ROW
  EXECUTE FUNCTION update_matches_updated_at();

-- Row Level Security
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

-- Policy: Public can read all matches
CREATE POLICY "Anyone can view matches"
  ON matches FOR SELECT
  TO public
  USING (true);

-- Policy: Authenticated users can create matches
CREATE POLICY "Authenticated users can create matches"
  ON matches FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Users can update matches they created or are involved in
CREATE POLICY "Users can update their matches"
  ON matches FOR UPDATE
  TO authenticated
  USING (true);

-- Policy: Service role has full access
CREATE POLICY "Service role has full access to matches"
  ON matches FOR ALL
  TO service_role
  USING (true);

-- Match Analytics View
CREATE OR REPLACE VIEW match_analytics AS
SELECT 
  COUNT(*) as total_matches,
  COUNT(DISTINCT startup_id) as unique_startups_matched,
  COUNT(DISTINCT investor_id) as unique_investors_matched,
  AVG(match_score) as avg_match_score,
  COUNT(CASE WHEN viewed_by_investor THEN 1 END) as viewed_by_investor_count,
  COUNT(CASE WHEN contacted THEN 1 END) as contacted_count,
  COUNT(CASE WHEN meeting_scheduled THEN 1 END) as meeting_scheduled_count,
  COUNT(CASE WHEN investment_made THEN 1 END) as investment_made_count,
  COUNT(CASE WHEN status = 'suggested' THEN 1 END) as suggested_count,
  COUNT(CASE WHEN status = 'interested' THEN 1 END) as interested_count,
  COUNT(CASE WHEN status = 'passed' THEN 1 END) as passed_count
FROM matches;

-- Top Matched Startups View
CREATE OR REPLACE VIEW top_matched_startups AS
SELECT 
  s.id,
  s.name,
  s.website,
  s.status as startup_status,
  COUNT(m.id) as match_count,
  AVG(m.match_score) as avg_match_score,
  COUNT(CASE WHEN m.viewed_by_investor THEN 1 END) as views_by_investors,
  COUNT(CASE WHEN m.contacted THEN 1 END) as contacts,
  MAX(m.created_at) as last_matched_at
FROM startups s
LEFT JOIN matches m ON s.id = m.startup_id
GROUP BY s.id, s.name, s.website, s.status
ORDER BY match_count DESC, avg_match_score DESC;

-- Top Active Investors View
CREATE OR REPLACE VIEW top_active_investors AS
SELECT 
  i.id,
  i.name,
  i.firm,
  COUNT(m.id) as match_count,
  AVG(m.match_score) as avg_match_score,
  COUNT(CASE WHEN m.viewed_by_investor THEN 1 END) as viewed_count,
  COUNT(CASE WHEN m.contacted THEN 1 END) as contacted_count,
  COUNT(CASE WHEN m.investment_made THEN 1 END) as investments_made,
  MAX(m.created_at) as last_matched_at
FROM investors i
LEFT JOIN matches m ON i.id = m.investor_id
GROUP BY i.id, i.name, i.firm
ORDER BY match_count DESC, investments_made DESC;

COMMENT ON TABLE matches IS 'Tracks startup-investor pairings from matching algorithm and manual matches';
COMMENT ON COLUMN matches.match_score IS 'Algorithm-generated score from 0-100 indicating fit quality';
COMMENT ON COLUMN matches.match_reasons IS 'JSON array of factors that led to this match';
COMMENT ON COLUMN matches.status IS 'Current state of the match: suggested, interested, contacted, meeting_scheduled, passed, invested';
