-- ML Feedback and Training Data Tables
-- These tables capture match outcomes to train the GOD algorithm

-- Match Feedback Table (Already exists in matchFeedback.ts but adding to schema)
CREATE TABLE IF NOT EXISTS match_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Match Reference
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  startup_id TEXT NOT NULL REFERENCES startups(id) ON DELETE CASCADE,
  investor_id UUID NOT NULL REFERENCES investors(id) ON DELETE CASCADE,
  
  -- Feedback Type
  feedback_type VARCHAR(50) NOT NULL, -- 'intro_sent', 'meeting_scheduled', 'investment_made', 'passed', 'no_response'
  feedback_date TIMESTAMP NOT NULL,
  
  -- Investment Details (if applicable)
  investment_amount DECIMAL(15,2), -- In millions
  investment_date TIMESTAMP,
  
  -- Notes
  notes TEXT,
  
  -- Metadata
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ML Training Patterns Table
-- Stores successful/unsuccessful match patterns for algorithm learning
CREATE TABLE IF NOT EXISTS ml_training_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Match Reference
  match_id UUID REFERENCES matches(id),
  
  -- Pattern Type
  pattern_type VARCHAR(50) NOT NULL, -- 'successful', 'unsuccessful', 'anomaly'
  
  -- Features (JSON of characteristics that led to outcome)
  features JSONB NOT NULL DEFAULT '{}',
  -- Example: {
  --   "stage_match": true,
  --   "sector_overlap": ["AI/ML", "B2B SaaS"],
  --   "check_size_fit": true,
  --   "god_score": 85,
  --   "founder_experience": "senior",
  --   "traction": "revenue_positive"
  -- }
  
  -- Outcome
  outcome VARCHAR(50) NOT NULL, -- 'invested', 'meeting', 'passed', 'no_response'
  outcome_quality DECIMAL(3,2), -- 0.00 to 1.00 (quality score of outcome)
  
  -- Weight (importance for training)
  weight DECIMAL(3,2) DEFAULT 1.00, -- Higher weight = more important for learning
  
  -- Metadata
  extracted_at TIMESTAMP DEFAULT NOW(),
  last_used_at TIMESTAMP, -- Last time this pattern was used in training
  use_count INTEGER DEFAULT 0 -- How many times used in training
);

-- Algorithm Performance Metrics Table
-- Tracks GOD algorithm performance over time
CREATE TABLE IF NOT EXISTS algorithm_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Metrics Period
  period_start TIMESTAMP NOT NULL,
  period_end TIMESTAMP NOT NULL,
  
  -- Volume Metrics
  total_matches INTEGER DEFAULT 0,
  successful_matches INTEGER DEFAULT 0, -- Led to meeting or investment
  
  -- Quality Metrics
  avg_match_score DECIMAL(5,2),
  avg_god_score DECIMAL(5,2),
  conversion_rate DECIMAL(5,4), -- Matches that led to outcomes
  
  -- Score Distribution
  score_distribution JSONB, -- {"0-50": 10, "51-70": 50, "71-85": 80, "86-100": 60}
  
  -- Algorithm Version
  algorithm_version VARCHAR(50), -- Track which version of GOD algorithm
  
  -- Comparison to Previous Period
  improvement_percent DECIMAL(5,2), -- % improvement from last period
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- ML Recommendations Table
-- Stores algorithm improvement recommendations from ML analysis
CREATE TABLE IF NOT EXISTS ml_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Recommendation Details
  recommendation_type VARCHAR(50) NOT NULL, -- 'threshold_adjust', 'weight_change', 'new_factor'
  priority VARCHAR(20) DEFAULT 'medium', -- 'critical', 'high', 'medium', 'low'
  
  -- Description
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  
  -- Proposed Changes
  current_value JSONB, -- Current configuration
  proposed_value JSONB, -- Suggested configuration
  expected_impact TEXT, -- Expected outcome if applied
  
  -- Status
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'applied', 'rejected', 'testing'
  applied_at TIMESTAMP,
  
  -- Results (if applied)
  actual_impact TEXT,
  performance_change DECIMAL(5,2), -- % change in performance
  
  created_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Indexes for Performance
CREATE INDEX idx_feedback_match ON match_feedback(match_id);
CREATE INDEX idx_feedback_type ON match_feedback(feedback_type);
CREATE INDEX idx_feedback_date ON match_feedback(feedback_date DESC);

CREATE INDEX idx_training_pattern_type ON ml_training_patterns(pattern_type);
CREATE INDEX idx_training_outcome ON ml_training_patterns(outcome);
CREATE INDEX idx_training_quality ON ml_training_patterns(outcome_quality DESC);

CREATE INDEX idx_metrics_period ON algorithm_metrics(period_start, period_end);
CREATE INDEX idx_metrics_version ON algorithm_metrics(algorithm_version);

CREATE INDEX idx_recommendations_status ON ml_recommendations(status);
CREATE INDEX idx_recommendations_priority ON ml_recommendations(priority);

-- Update timestamp triggers
CREATE OR REPLACE FUNCTION update_ml_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER feedback_updated_at
  BEFORE UPDATE ON match_feedback
  FOR EACH ROW
  EXECUTE FUNCTION update_ml_updated_at();

-- Row Level Security
ALTER TABLE match_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE ml_training_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE algorithm_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE ml_recommendations ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can view feedback"
  ON match_feedback FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can add feedback"
  ON match_feedback FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Service role full access to ML tables"
  ON ml_training_patterns FOR ALL
  TO service_role
  USING (true);

CREATE POLICY "Service role full access to metrics"
  ON algorithm_metrics FOR ALL
  TO service_role
  USING (true);

CREATE POLICY "Anyone can view recommendations"
  ON ml_recommendations FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Admins can manage recommendations"
  ON ml_recommendations FOR ALL
  TO authenticated
  USING (true);

-- Views for ML Analysis

-- Success Patterns View
CREATE OR REPLACE VIEW ml_success_patterns AS
SELECT 
  m.id as match_id,
  m.startup_id,
  m.investor_id,
  m.match_score,
  m.god_score,
  m.match_reasons,
  mf.feedback_type,
  mf.feedback_date,
  mf.investment_amount,
  s.stage,
  s.industries,
  s.raise_amount,
  i.stage as investor_stages,
  i.sectors as investor_sectors,
  i.check_size
FROM matches m
LEFT JOIN match_feedback mf ON m.id = mf.match_id
LEFT JOIN startups s ON m.startup_id = s.id
LEFT JOIN investors i ON m.investor_id = i.id
WHERE mf.feedback_type IN ('investment_made', 'meeting_scheduled');

-- Performance Dashboard View
CREATE OR REPLACE VIEW ml_performance_dashboard AS
SELECT 
  COUNT(*) as total_matches,
  COUNT(DISTINCT m.startup_id) as unique_startups,
  COUNT(DISTINCT m.investor_id) as unique_investors,
  AVG(m.match_score) as avg_match_score,
  AVG(m.god_score) as avg_god_score,
  COUNT(CASE WHEN mf.feedback_type = 'investment_made' THEN 1 END) as investments,
  COUNT(CASE WHEN mf.feedback_type = 'meeting_scheduled' THEN 1 END) as meetings,
  COUNT(CASE WHEN mf.feedback_type = 'passed' THEN 1 END) as passed,
  CAST(COUNT(CASE WHEN mf.feedback_type IN ('investment_made', 'meeting_scheduled') THEN 1 END) AS FLOAT) / 
    NULLIF(COUNT(*), 0) as success_rate
FROM matches m
LEFT JOIN match_feedback mf ON m.id = mf.match_id;

COMMENT ON TABLE match_feedback IS 'Captures real-world outcomes of matches for ML training';
COMMENT ON TABLE ml_training_patterns IS 'Extracted patterns from successful/unsuccessful matches for algorithm optimization';
COMMENT ON TABLE algorithm_metrics IS 'Tracks GOD algorithm performance metrics over time';
COMMENT ON TABLE ml_recommendations IS 'ML-generated recommendations for improving the matching algorithm';
