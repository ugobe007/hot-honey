-- Fix pythia_speech_snippets and pythia_scores to use UUID for entity_id
-- (startup_uploads.id is UUID, not INTEGER)

-- Drop existing tables if they exist (will recreate with correct types)
DROP TABLE IF EXISTS pythia_scores CASCADE;
DROP TABLE IF EXISTS pythia_speech_snippets CASCADE;

-- Recreate pythia_speech_snippets with UUID
CREATE TABLE pythia_speech_snippets (
  id BIGSERIAL PRIMARY KEY,
  entity_id UUID NOT NULL,
  entity_type TEXT NOT NULL DEFAULT 'startup',
  text TEXT NOT NULL,
  source_url TEXT,
  date_published TIMESTAMPTZ,
  source_type TEXT NOT NULL,
  tier INTEGER NOT NULL,
  context_label TEXT,
  text_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_tier CHECK (tier IN (1, 2, 3)),
  CONSTRAINT valid_source_type CHECK (source_type IN (
    'press_quote', 'company_blog', 'marketing_page', 'podcast_transcript', 
    'conf_talk', 'forum_post', 'support_thread', 'postmortem', 
    'investor_letter', 'qa_transcript', 'social_post', 'other'
  ))
);

-- Recreate pythia_scores with UUID
CREATE TABLE pythia_scores (
  id BIGSERIAL PRIMARY KEY,
  entity_id UUID NOT NULL,
  entity_type TEXT NOT NULL DEFAULT 'startup',
  
  pythia_score INTEGER NOT NULL,
  confidence NUMERIC(3,2) NOT NULL,
  
  constraint_score NUMERIC(4,2),
  mechanism_score NUMERIC(4,2),
  reality_contact_score NUMERIC(4,2),
  
  adjective_verb_penalty NUMERIC(4,2),
  narrative_no_constraint_penalty NUMERIC(4,2),
  unfalsifiable_penalty NUMERIC(4,2),
  
  drive_ontology NUMERIC(3,2),
  customer_ontology NUMERIC(3,2),
  wow_ontology NUMERIC(3,2),
  sovereignty_ontology NUMERIC(3,2),
  dominance_ontology NUMERIC(3,2),
  
  tier1_pct NUMERIC(5,2),
  tier2_pct NUMERIC(5,2),
  tier3_pct NUMERIC(5,2),
  
  snippet_count INTEGER,
  source_count INTEGER,
  context_diversity INTEGER,
  temporal_span_days INTEGER,
  
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
CREATE INDEX idx_pythia_snippets_entity ON pythia_speech_snippets(entity_id, entity_type);
CREATE INDEX idx_pythia_snippets_tier ON pythia_speech_snippets(tier);
CREATE INDEX idx_pythia_snippets_date ON pythia_speech_snippets(date_published DESC);
CREATE INDEX idx_pythia_snippets_hash ON pythia_speech_snippets(text_hash);
CREATE INDEX idx_pythia_snippets_source_type ON pythia_speech_snippets(source_type);

CREATE INDEX idx_pythia_scores_entity ON pythia_scores(entity_id, entity_type);
CREATE INDEX idx_pythia_scores_score ON pythia_scores(pythia_score DESC);
CREATE INDEX idx_pythia_scores_confidence ON pythia_scores(confidence DESC);
CREATE INDEX idx_pythia_scores_computed_at ON pythia_scores(entity_id, entity_type, computed_at DESC);

-- Helper function
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
