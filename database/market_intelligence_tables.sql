-- ============================================
-- MARKET INTELLIGENCE & TALENT MATCHING TABLES
-- ============================================
-- Purpose: Track key variables for market intelligence and enable founder-hire matching
-- Created: 2025-01-XX

-- ============================================
-- 1. TALENT POOL TABLE
-- ============================================
-- Stores potential key hires that can be matched with founders
CREATE TABLE IF NOT EXISTS talent_pool (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Basic Info
  name TEXT NOT NULL,
  email TEXT,
  linkedin_url TEXT,
  location TEXT,
  
  -- Skills & Experience
  skill_type TEXT NOT NULL CHECK (skill_type IN ('technical', 'business', 'design', 'operations', 'sales', 'marketing', 'finance', 'other')),
  experience_level TEXT NOT NULL CHECK (experience_level IN ('junior', 'mid', 'senior', 'executive')),
  previous_startup_experience BOOLEAN DEFAULT false,
  years_experience INTEGER,
  
  -- Work Style & Attributes (for matching with founders)
  work_style TEXT CHECK (work_style IN ('fast-paced', 'methodical', 'balanced')),
  risk_tolerance TEXT CHECK (risk_tolerance IN ('low', 'moderate', 'high')),
  execution_speed TEXT CHECK (execution_speed IN ('fast', 'moderate', 'slow')),
  
  -- Founder Attributes (Ben Horowitz / a16z framework)
  candidate_courage TEXT CHECK (candidate_courage IN ('low', 'moderate', 'high', 'exceptional')),
  candidate_intelligence TEXT CHECK (candidate_intelligence IN ('low', 'moderate', 'high', 'exceptional')),
  
  -- Preferences
  sectors TEXT[], -- Preferred sectors to work in
  stage_preference TEXT[], -- Preferred startup stages
  remote_ok BOOLEAN DEFAULT true,
  equity_preference TEXT CHECK (equity_preference IN ('high', 'moderate', 'low', 'none')),
  
  -- Availability
  availability_status TEXT DEFAULT 'available' CHECK (availability_status IN ('available', 'exploring', 'committed', 'not_looking')),
  current_role_name TEXT, -- Renamed from current_role (reserved keyword)
  current_company TEXT,
  
  -- Metadata
  source TEXT, -- How they were added ('manual', 'application', 'referral', 'scraped')
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for talent pool
CREATE INDEX IF NOT EXISTS idx_talent_pool_skill_type ON talent_pool(skill_type);
CREATE INDEX IF NOT EXISTS idx_talent_pool_experience_level ON talent_pool(experience_level);
CREATE INDEX IF NOT EXISTS idx_talent_pool_availability ON talent_pool(availability_status);
CREATE INDEX IF NOT EXISTS idx_talent_pool_sectors ON talent_pool USING GIN (sectors);
CREATE INDEX IF NOT EXISTS idx_talent_pool_courage ON talent_pool(candidate_courage);
CREATE INDEX IF NOT EXISTS idx_talent_pool_intelligence ON talent_pool(candidate_intelligence);

-- ============================================
-- 2. FOUNDER-HIRE MATCHES TABLE
-- ============================================
-- Stores matches between founders and potential key hires
CREATE TABLE IF NOT EXISTS founder_hire_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- References
  startup_id UUID NOT NULL REFERENCES startup_uploads(id) ON DELETE CASCADE,
  talent_id UUID NOT NULL REFERENCES talent_pool(id) ON DELETE CASCADE,
  
  -- Match Score & Reasons
  match_score INTEGER NOT NULL CHECK (match_score >= 0 AND match_score <= 100),
  match_reasons TEXT[], -- Array of reasons why they match
  
  -- Alignment Details
  alignment_type TEXT[], -- 'courage_match', 'intelligence_match', 'skill_complement', 'work_style_match', 'sector_match'
  
  -- Founder Attributes (snapshot at match time)
  founder_courage TEXT,
  founder_intelligence TEXT,
  founder_speed_score NUMERIC,
  founder_technical BOOLEAN,
  
  -- Candidate Attributes (snapshot at match time)
  candidate_courage TEXT,
  candidate_intelligence TEXT,
  candidate_skill_type TEXT,
  candidate_experience_level TEXT,
  
  -- Match Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'interviewed', 'hired', 'rejected', 'not_interested')),
  contacted_at TIMESTAMP WITH TIME ZONE,
  interviewed_at TIMESTAMP WITH TIME ZONE,
  hired_at TIMESTAMP WITH TIME ZONE,
  rejected_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique matches
  UNIQUE(startup_id, talent_id)
);

-- Indexes for matches
CREATE INDEX IF NOT EXISTS idx_founder_hire_matches_startup ON founder_hire_matches(startup_id);
CREATE INDEX IF NOT EXISTS idx_founder_hire_matches_talent ON founder_hire_matches(talent_id);
CREATE INDEX IF NOT EXISTS idx_founder_hire_matches_score ON founder_hire_matches(match_score DESC);
CREATE INDEX IF NOT EXISTS idx_founder_hire_matches_status ON founder_hire_matches(status);

-- ============================================
-- 3. MARKET INTELLIGENCE TABLE
-- ============================================
-- Stores aggregated market intelligence metrics
CREATE TABLE IF NOT EXISTS market_intelligence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Metric Classification
  metric_type TEXT NOT NULL, -- 'sector_performance', 'founder_patterns', 'funding_trends', 'talent_trends', 'geographic_trends'
  metric_name TEXT NOT NULL, -- Specific metric name
  metric_category TEXT, -- Sub-category
  
  -- Metric Value (JSONB for flexibility)
  metric_value JSONB NOT NULL,
  
  -- Time Period
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  
  -- Filters/Dimensions
  sector TEXT, -- If sector-specific
  stage TEXT, -- If stage-specific
  geography TEXT, -- If geography-specific
  
  -- Metadata
  calculation_method TEXT, -- How this metric was calculated
  data_source TEXT, -- Source of the data
  confidence_score NUMERIC, -- 0-1 confidence in the metric
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for market intelligence
CREATE INDEX IF NOT EXISTS idx_market_intelligence_type ON market_intelligence(metric_type);
CREATE INDEX IF NOT EXISTS idx_market_intelligence_name ON market_intelligence(metric_name);
CREATE INDEX IF NOT EXISTS idx_market_intelligence_period ON market_intelligence(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_market_intelligence_sector ON market_intelligence(sector);
CREATE INDEX IF NOT EXISTS idx_market_intelligence_stage ON market_intelligence(stage);

-- ============================================
-- 4. KEY VARIABLES TRACKING TABLE
-- ============================================
-- Tracks key variables over time for trend analysis
CREATE TABLE IF NOT EXISTS key_variables_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Variable Identification
  variable_name TEXT NOT NULL, -- e.g., 'avg_god_score', 'founder_courage_distribution', 'mrr_growth_rate'
  variable_category TEXT NOT NULL, -- 'startup_health', 'founder_attributes', 'market_trends', 'talent_trends'
  
  -- Value
  value NUMERIC,
  value_json JSONB, -- For complex values (distributions, arrays, etc.)
  
  -- Context
  sector TEXT, -- If sector-specific
  stage TEXT, -- If stage-specific
  geography TEXT, -- If geography-specific
  
  -- Time
  measurement_date DATE NOT NULL,
  
  -- Metadata
  sample_size INTEGER, -- Number of data points used
  calculation_method TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Unique constraint: one measurement per variable per date per context
  UNIQUE(variable_name, sector, stage, geography, measurement_date)
);

-- Indexes for key variables
CREATE INDEX IF NOT EXISTS idx_key_variables_name ON key_variables_tracking(variable_name);
CREATE INDEX IF NOT EXISTS idx_key_variables_category ON key_variables_tracking(variable_category);
CREATE INDEX IF NOT EXISTS idx_key_variables_date ON key_variables_tracking(measurement_date DESC);
CREATE INDEX IF NOT EXISTS idx_key_variables_sector ON key_variables_tracking(sector);

-- ============================================
-- 5. TRIGGERS FOR UPDATED_AT
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_talent_pool_updated_at BEFORE UPDATE ON talent_pool
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_founder_hire_matches_updated_at BEFORE UPDATE ON founder_hire_matches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_market_intelligence_updated_at BEFORE UPDATE ON market_intelligence
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 6. SAMPLE DATA VIEWS (for analytics)
-- ============================================

-- View: Founder-Hire Match Quality
CREATE OR REPLACE VIEW v_founder_hire_match_quality AS
SELECT 
  fhm.startup_id,
  su.name as startup_name,
  tp.name as talent_name,
  fhm.match_score,
  fhm.alignment_type,
  fhm.status,
  fhm.founder_courage,
  fhm.founder_intelligence,
  fhm.candidate_courage,
  fhm.candidate_intelligence,
  CASE 
    WHEN fhm.match_score >= 80 THEN 'excellent'
    WHEN fhm.match_score >= 60 THEN 'good'
    WHEN fhm.match_score >= 40 THEN 'fair'
    ELSE 'poor'
  END as match_quality
FROM founder_hire_matches fhm
JOIN startup_uploads su ON fhm.startup_id = su.id
JOIN talent_pool tp ON fhm.talent_id = tp.id;

-- View: Market Intelligence Summary
CREATE OR REPLACE VIEW v_market_intelligence_summary AS
SELECT 
  metric_type,
  metric_name,
  sector,
  stage,
  period_start,
  period_end,
  metric_value,
  confidence_score,
  updated_at
FROM market_intelligence
WHERE period_end >= CURRENT_DATE - INTERVAL '90 days' -- Last 90 days
ORDER BY metric_type, metric_name, period_end DESC;

