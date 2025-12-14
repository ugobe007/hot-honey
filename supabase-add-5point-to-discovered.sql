-- Add Hot Money 5-Point Format to discovered_startups table
-- This allows AI scrapers to populate structured data for GOD algorithm

ALTER TABLE discovered_startups
ADD COLUMN IF NOT EXISTS value_proposition TEXT,
ADD COLUMN IF NOT EXISTS problem TEXT,
ADD COLUMN IF NOT EXISTS solution TEXT,
ADD COLUMN IF NOT EXISTS market_size TEXT,
ADD COLUMN IF NOT EXISTS team_companies TEXT[],
ADD COLUMN IF NOT EXISTS sectors TEXT[];

-- Add comment
COMMENT ON COLUMN discovered_startups.value_proposition IS 'One-line tagline (e.g., "Tesla for home solar")';
COMMENT ON COLUMN discovered_startups.problem IS 'Specific customer pain/problem being solved';
COMMENT ON COLUMN discovered_startups.solution IS 'How they solve it - unique approach';
COMMENT ON COLUMN discovered_startups.market_size IS 'TAM/market opportunity description';
COMMENT ON COLUMN discovered_startups.team_companies IS 'Notable previous companies of founders/team';
COMMENT ON COLUMN discovered_startups.sectors IS 'Industry categories (HealthTech, FinTech, etc)';
