-- =============================================================================
-- HOT MONEY HONEY - OPENAI INTEGRATION SCHEMA (CORRECTED V2)
-- =============================================================================
-- Purpose: Extend Supabase to handle OpenAI-scraped startup data
-- Workflow: OpenAI scraping → Supabase storage → Admin review → Publishing
-- Matches existing BulkImport.tsx data structure with fivePoints array
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. ADD OPENAI COLUMNS TO EXISTING STARTUPS TABLE
-- -----------------------------------------------------------------------------
-- Matches your existing fivePoints array structure from BulkImport/Submit pages
-- Stores both array format (for frontend compatibility) and individual columns

-- First, add all missing base columns
ALTER TABLE startups 
ADD COLUMN IF NOT EXISTS name TEXT,                        -- Startup name
ADD COLUMN IF NOT EXISTS website TEXT,                     -- Company website URL
ADD COLUMN IF NOT EXISTS logo TEXT;                        -- Logo URL

-- Core 5-point format (stored both ways for flexibility)
ALTER TABLE startups
ADD COLUMN IF NOT EXISTS five_points TEXT[5],              -- Array: [valueProp, market, unique, team, raise]
ADD COLUMN IF NOT EXISTS value_proposition TEXT,           -- Point 1: Value prop/tagline
ADD COLUMN IF NOT EXISTS problem TEXT,                     -- Point 2: Market size/problem
ADD COLUMN IF NOT EXISTS solution TEXT,                    -- Point 3: Unique value/differentiator  
ADD COLUMN IF NOT EXISTS team TEXT,                        -- Point 4: Team background
ADD COLUMN IF NOT EXISTS investment TEXT;                  -- Point 5: Funding/raise amount

-- Matches BulkImport enriched data structure
ALTER TABLE startups
ADD COLUMN IF NOT EXISTS tagline TEXT,                     -- One-line pitch
ADD COLUMN IF NOT EXISTS pitch TEXT,                       -- Short pitch/tagline (same as tagline)
ADD COLUMN IF NOT EXISTS stage TEXT DEFAULT 'Seed',        -- Pre-Seed, Seed, Series A, etc.
ADD COLUMN IF NOT EXISTS funding TEXT,                     -- e.g., "$3M Seed"
ADD COLUMN IF NOT EXISTS industry TEXT,                    -- e.g., "FinTech", "AI"
ADD COLUMN IF NOT EXISTS pitch_deck_url TEXT;              -- Link to pitch deck PDF

-- Scraping metadata
ALTER TABLE startups
ADD COLUMN IF NOT EXISTS scraped_by TEXT,                  -- Source URL (e.g., YC portfolio page)
ADD COLUMN IF NOT EXISTS scraped_at TIMESTAMP DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS entity_type TEXT DEFAULT 'startup'; -- startup | vc_firm | accelerator

-- Workflow status
ALTER TABLE startups
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending',    -- pending → published | rejected
ADD COLUMN IF NOT EXISTS reviewed_by TEXT,                 -- Admin who reviewed
ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS published_at TIMESTAMP;

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_startups_status ON startups(status);
CREATE INDEX IF NOT EXISTS idx_startups_entity_type ON startups(entity_type);
CREATE INDEX IF NOT EXISTS idx_startups_scraped_at ON startups(scraped_at DESC);
CREATE INDEX IF NOT EXISTS idx_startups_published_at ON startups(published_at DESC);

-- -----------------------------------------------------------------------------
-- 2. VIEW: PENDING STARTUPS (ADMIN REVIEW QUEUE)
-- -----------------------------------------------------------------------------
-- Shows all startups awaiting admin review
-- Used by: /admin/review page

CREATE OR REPLACE VIEW pending_startups AS
SELECT 
  id,
  name,
  website,
  logo,
  tagline,
  pitch,
  five_points,
  value_proposition,
  problem,
  solution,
  team,
  investment,
  stage,
  funding,
  industry,
  pitch_deck_url,
  scraped_by,
  scraped_at,
  entity_type,
  status
FROM startups
WHERE status = 'pending' AND entity_type = 'startup'
ORDER BY scraped_at DESC;

-- -----------------------------------------------------------------------------
-- 3. VIEW: PUBLISHED STARTUPS (LIVE VOTING PAGE)
-- -----------------------------------------------------------------------------
-- Shows approved startups with vote counts
-- Used by: VotePage, Dashboard, Portfolio

CREATE OR REPLACE VIEW published_startups AS
SELECT 
  s.id,
  s.name,
  s.website,
  s.logo,
  s.tagline,
  s.pitch,
  s.five_points,                          -- Array format for frontend
  s.value_proposition,
  s.problem,
  s.solution,
  s.team,
  s.investment,
  s.stage,
  s.funding,
  s.industry,
  s.pitch_deck_url,
  s.published_at,
  s.scraped_by,
  -- Calculate votes directly from votes table (no dependency on vote_counts view)
  COALESCE((SELECT COUNT(*) FROM votes WHERE startup_id = s.id AND vote_type = 'yes'), 0) AS yes_votes,
  COALESCE((SELECT COUNT(*) FROM votes WHERE startup_id = s.id AND vote_type = 'no'), 0) AS no_votes,
  COALESCE((SELECT COUNT(*) FROM votes WHERE startup_id = s.id), 0) AS total_votes
FROM startups s
WHERE s.status = 'published' AND s.validated = true AND s.entity_type = 'startup'
ORDER BY s.published_at DESC;

-- -----------------------------------------------------------------------------
-- 4. RLS POLICIES FOR OPENAI WORKFLOW
-- -----------------------------------------------------------------------------

-- Enable RLS
ALTER TABLE startups ENABLE ROW LEVEL SECURITY;

-- Public can view published startups (for voting)
DROP POLICY IF EXISTS "Anyone can view published startups" ON startups;
CREATE POLICY "Anyone can view published startups"
ON startups FOR SELECT
USING (status = 'published' AND validated = true);

-- Public can insert scraped startups (from BulkImport/Submit pages)
DROP POLICY IF EXISTS "Anyone can upload scraped startups" ON startups;
CREATE POLICY "Anyone can upload scraped startups"
ON startups FOR INSERT
WITH CHECK (status = 'pending');

-- Admins can update any startup (TODO: Add proper auth when ready)
DROP POLICY IF EXISTS "Admins can update startups" ON startups;
CREATE POLICY "Admins can update startups"
ON startups FOR UPDATE
USING (true);

-- -----------------------------------------------------------------------------
-- 5. WORKFLOW FUNCTIONS
-- -----------------------------------------------------------------------------

-- Approve and publish startup in one step (simplified workflow)
CREATE OR REPLACE FUNCTION approve_and_publish_startup(
  startup_id_param TEXT,
  reviewed_by_param TEXT
)
RETURNS SETOF startups AS $$
BEGIN
  RETURN QUERY
  UPDATE startups
  SET 
    status = 'published',
    validated = true,
    reviewed_by = reviewed_by_param,
    reviewed_at = NOW(),
    published_at = NOW()
  WHERE id = startup_id_param
  RETURNING *;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Reject a scraped startup
CREATE OR REPLACE FUNCTION reject_startup(
  startup_id_param TEXT,
  reviewed_by_param TEXT
)
RETURNS SETOF startups AS $$
BEGIN
  RETURN QUERY
  UPDATE startups
  SET 
    status = 'rejected',
    reviewed_by = reviewed_by_param,
    reviewed_at = NOW()
  WHERE id = startup_id_param
  RETURNING *;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -----------------------------------------------------------------------------
-- 6. DATA MIGRATION HELPER
-- -----------------------------------------------------------------------------
-- Use this to migrate existing localStorage 'uploadedStartups' to Supabase

-- Example: Call from React with localStorage data
-- const uploaded = JSON.parse(localStorage.getItem('uploadedStartups') || '[]');
-- for (const startup of uploaded) {
--   await supabase.from('startups').insert({
--     id: `startup_${startup.id}`,
--     name: startup.name,
--     website: startup.website,
--     tagline: startup.tagline,
--     pitch: startup.pitch,
--     five_points: startup.fivePoints,
--     stage: startup.stage,
--     funding: startup.funding,
--     industry: startup.industries?.[0],
--     scraped_by: startup.vcBacked,
--     entity_type: startup.entityType || 'startup',
--     status: 'published',  -- Auto-approve existing data
--     validated: true,
--     published_at: new Date().toISOString()
--   });
-- }

-- -----------------------------------------------------------------------------
-- COMPLETE! 
-- -----------------------------------------------------------------------------
-- Deployment steps:
-- 1. Run this SQL in Supabase SQL Editor (riryeljaqxicdnuwilai project)
-- 2. Update BulkImport.tsx to use OpenAIDataService.uploadScrapedStartup()
-- 3. Update Submit.tsx to use OpenAIDataService.uploadScrapedStartup()
-- 4. Update VotePage.tsx to fetch from published_startups view
-- 5. Create /admin/review page for pending startups
-- 6. Migrate localStorage 'uploadedStartups' to Supabase
-- =============================================================================
