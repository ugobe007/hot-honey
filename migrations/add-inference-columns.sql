-- Add inference extraction columns to discovered_startups
-- These fields feed directly into the GOD Score inference engine

-- Execution signals (Question 3: SOLUTION)
ALTER TABLE discovered_startups ADD COLUMN IF NOT EXISTS has_technical_cofounder BOOLEAN DEFAULT FALSE;
ALTER TABLE discovered_startups ADD COLUMN IF NOT EXISTS is_launched BOOLEAN DEFAULT FALSE;
ALTER TABLE discovered_startups ADD COLUMN IF NOT EXISTS has_demo BOOLEAN DEFAULT FALSE;
ALTER TABLE discovered_startups ADD COLUMN IF NOT EXISTS has_revenue BOOLEAN DEFAULT FALSE;
ALTER TABLE discovered_startups ADD COLUMN IF NOT EXISTS has_customers BOOLEAN DEFAULT FALSE;
ALTER TABLE discovered_startups ADD COLUMN IF NOT EXISTS customer_count INTEGER;
ALTER TABLE discovered_startups ADD COLUMN IF NOT EXISTS growth_rate TEXT;

-- Team/GRIT signals (Question 4: TEAM)
ALTER TABLE discovered_startups ADD COLUMN IF NOT EXISTS team_signals TEXT[];
ALTER TABLE discovered_startups ADD COLUMN IF NOT EXISTS grit_signals TEXT[];
ALTER TABLE discovered_startups ADD COLUMN IF NOT EXISTS execution_signals TEXT[];
ALTER TABLE discovered_startups ADD COLUMN IF NOT EXISTS credential_signals TEXT[];
ALTER TABLE discovered_startups ADD COLUMN IF NOT EXISTS founders TEXT[];

-- Investment signals (Question 5: INVESTMENT)  
ALTER TABLE discovered_startups ADD COLUMN IF NOT EXISTS lead_investor TEXT;
ALTER TABLE discovered_startups ADD COLUMN IF NOT EXISTS problem_severity INTEGER DEFAULT 5;
ALTER TABLE discovered_startups ADD COLUMN IF NOT EXISTS problem_keywords TEXT[];

-- Add same columns to startup_uploads for when startups are approved
ALTER TABLE startup_uploads ADD COLUMN IF NOT EXISTS has_technical_cofounder BOOLEAN DEFAULT FALSE;
ALTER TABLE startup_uploads ADD COLUMN IF NOT EXISTS is_launched BOOLEAN DEFAULT FALSE;
ALTER TABLE startup_uploads ADD COLUMN IF NOT EXISTS has_demo BOOLEAN DEFAULT FALSE;
ALTER TABLE startup_uploads ADD COLUMN IF NOT EXISTS has_revenue BOOLEAN DEFAULT FALSE;
ALTER TABLE startup_uploads ADD COLUMN IF NOT EXISTS has_customers BOOLEAN DEFAULT FALSE;
ALTER TABLE startup_uploads ADD COLUMN IF NOT EXISTS customer_count INTEGER;
ALTER TABLE startup_uploads ADD COLUMN IF NOT EXISTS growth_rate TEXT;
ALTER TABLE startup_uploads ADD COLUMN IF NOT EXISTS team_signals TEXT[];
ALTER TABLE startup_uploads ADD COLUMN IF NOT EXISTS grit_signals TEXT[];
ALTER TABLE startup_uploads ADD COLUMN IF NOT EXISTS execution_signals TEXT[];
ALTER TABLE startup_uploads ADD COLUMN IF NOT EXISTS credential_signals TEXT[];
ALTER TABLE startup_uploads ADD COLUMN IF NOT EXISTS founders TEXT[];
ALTER TABLE startup_uploads ADD COLUMN IF NOT EXISTS lead_investor TEXT;
ALTER TABLE startup_uploads ADD COLUMN IF NOT EXISTS problem_severity INTEGER DEFAULT 5;
ALTER TABLE startup_uploads ADD COLUMN IF NOT EXISTS problem_keywords TEXT[];

-- Comment on new columns for documentation
COMMENT ON COLUMN discovered_startups.has_technical_cofounder IS 'Extracted from text - presence of CTO/technical cofounder';
COMMENT ON COLUMN discovered_startups.is_launched IS 'Product is live/in production';
COMMENT ON COLUMN discovered_startups.grit_signals IS 'GRIT signals extracted - serial entrepreneur, previous exit, etc.';
COMMENT ON COLUMN discovered_startups.team_signals IS 'Team credentials - ex-FAANG, PhD, YC Alum, etc.';
COMMENT ON COLUMN discovered_startups.execution_signals IS 'Execution evidence - has revenue, has customers, growth rate';
COMMENT ON COLUMN discovered_startups.lead_investor IS 'Lead investor name from funding announcement';
