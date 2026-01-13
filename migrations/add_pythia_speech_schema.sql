-- -- Pythia Speech Ontology System Schema
-- Stores founder/company speech snippets with source tiers and contexts

-- Table: pythia_speech_snippets
-- Stores individual speech snippets from various sources
CREATE TABLE IF NOT EXISTS pythia_speech_snippets (
  id BIGSERIAL PRIMARY KEY,
  entity_id UUID NOT NULL, -- References startup_uploads.id (UUID) or founder_id
  entity_type TEXT NOT NULL DEFAULT 'startup', -- 'startup' or 'founder'
  text TEXT NOT NULL,
  source_url TEXT,
  date_published TIMESTAMPTZ,
  source_type TEXT NOT NULL, -- press_quote, company_blog, marketing_page, podcast_transcript, conf_talk, forum_post, support_thread, postmortem, investor_letter, qa_transcript, social_post, other
  tier INTEGER NOT NULL, -- 1 (earned), 2 (semi-earned), 3 (PR/marketed)
  context_label TEXT, -- press, product, hiring, technical, investor, support, other
  text_hash TEXT, -- For deduplication (hash of normalized text)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_tier CHECK (tier IN (1, 2, 3)),
  CONSTRAINT valid_source_type CHECK (source_type IN (
    'press_quote', 'company_blog', 'marketing_page', 'podcast_transcript', 
    'conf_talk', 'forum_post', 'support_thread', 'postmortem', 
    'investor_letter', 'qa_transcript', 'social_post', 'other'
  ))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_pythia_snippets_entity ON pythia_speech_snippets(entity_id, entity_type);
CREATE INDEX IF NOT EXISTS idx_pythia_snippets_tier ON pythia_speech_snippets(tier);
CREATE INDEX IF NOT EXISTS idx_pythia_snippets_date ON pythia_speech_snippets(date_published DESC);
CREATE INDEX IF NOT EXISTS idx_pythia_snippets_hash ON pythia_speech_snippets(text_hash);
CREATE INDEX IF NOT EXISTS idx_pythia_snippets_source_type ON pythia_speech_snippets(source_type);

-- Table: pythia_scores
-- Stores computed Pythia scores for entities
CREATE TABLE IF NOT EXISTS pythia_scores (
  id BIGSERIAL PRIMARY KEY,
  entity_id UUID NOT NULL,
  entity_type TEXT NOT NULL DEFAULT 'startup',
  
  -- Core scores
  pythia_score INTEGER NOT NULL, -- 0-100
  confidence NUMERIC(3,2) NOT NULL, -- 0.10-0.95
  
  -- Invariant scores (0-10 each)
  constraint_score NUMERIC(4,2),
  mechanism_score NUMERIC(4,2),
  reality_contact_score NUMERIC(4,2),
  
  -- Penalties (0-25 total)
  adjective_verb_penalty NUMERIC(4,2), -- 0-10
  narrative_no_constraint_penalty NUMERIC(4,2), -- 0-10
  unfalsifiable_penalty NUMERIC(4,2), -- 0-5
  
  -- Optional ontology scores (0-3 each, max 15)
  drive_ontology NUMERIC(3,2),
  customer_ontology NUMERIC(3,2),
  wow_ontology NUMERIC(3,2),
  sovereignty_ontology NUMERIC(3,2),
  dominance_ontology NUMERIC(3,2),
  
  -- Source mix (percentages)
  tier1_pct NUMERIC(5,2), -- % of snippets from Tier 1
  tier2_pct NUMERIC(5,2), -- % of snippets from Tier 2
  tier3_pct NUMERIC(5,2), -- % of snippets from Tier 3
  
  -- Metadata
  snippet_count INTEGER, -- Total snippets analyzed
  source_count INTEGER, -- Unique sources
  context_diversity INTEGER, -- Number of distinct contexts
  temporal_span_days INTEGER, -- Days between oldest and newest snippet
  
  -- Feature counts (for debugging/analysis)
  constraint_markers_count INTEGER,
  mechanism_tokens_count INTEGER,
  reality_markers_count INTEGER,
  adjective_count INTEGER,
  action_verb_count INTEGER,
  
  computed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_pythia_score CHECK (pythia_score >= 0 AND pythia_score <= 100),
  CONSTRAINT valid_confidence CHECK (confidence >= 0.10 AND confidence <= 0.95)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pythia_scores_entity ON pythia_scores(entity_id, entity_type);
CREATE INDEX IF NOT EXISTS idx_pythia_scores_score ON pythia_scores(pythia_score DESC);
CREATE INDEX IF NOT EXISTS idx_pythia_scores_confidence ON pythia_scores(confidence DESC);
CREATE INDEX IF NOT EXISTS idx_pythia_scores_computed_at ON pythia_scores(entity_id, entity_type, computed_at DESC);

-- Note: We allow multiple scores per entity for historical tracking
-- To get the latest score, use: SELECT ... WHERE entity_id = X ORDER BY computed_at DESC LIMIT 1

-- Helper function to derive tier from source_type
CREATE OR REPLACE FUNCTION derive_tier_from_source_type(source_type TEXT) 
RETURNS INTEGER AS $$
BEGIN
  CASE source_type
    WHEN 'qa_transcript', 'forum_post', 'support_thread', 'postmortem', 'investor_letter' THEN
      RETURN 1;
    WHEN 'podcast_transcript', 'conf_talk', 'social_post' THEN
      RETURN 2;
    ELSE
      RETURN 3;
  END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Comments
COMMENT ON TABLE pythia_speech_snippets IS 'Stores founder/company speech snippets with source tiers for Pythia scoring';
COMMENT ON TABLE pythia_scores IS 'Computed Pythia scores (0-100) with confidence and breakdown';
COMMENT ON COLUMN pythia_speech_snippets.tier IS '1=earned/hard-to-fake, 2=semi-earned, 3=PR/marketed';
COMMENT ON COLUMN pythia_scores.confidence IS '0.10-0.95, lower if data is sparse or mostly Tier 3';
