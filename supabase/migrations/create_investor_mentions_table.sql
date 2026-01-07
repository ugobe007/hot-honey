-- ============================================================================
-- CREATE INVESTOR MENTIONS TABLE
-- ============================================================================
-- This table stores Layer A: Investor Mentions (cheap, noisy, many)
-- Before they are promoted to Layer B: Investor Entities (clean, sparse, trusted)
-- ============================================================================

CREATE TABLE IF NOT EXISTS investor_mentions_raw (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mention_text TEXT NOT NULL,
  name TEXT,
  firm TEXT,
  confidence NUMERIC DEFAULT 0.5,
  extraction_method TEXT,
  source_url TEXT,
  context_snippet TEXT,
  promoted_to_entity_id UUID REFERENCES investors(id) ON DELETE SET NULL,
  validation_reason TEXT,
  validation_confidence NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_investor_mentions_promoted ON investor_mentions_raw(promoted_to_entity_id) WHERE promoted_to_entity_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_investor_mentions_unpromoted ON investor_mentions_raw(id) WHERE promoted_to_entity_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_investor_mentions_confidence ON investor_mentions_raw(confidence DESC);
CREATE INDEX IF NOT EXISTS idx_investor_mentions_source ON investor_mentions_raw(source_url);
CREATE INDEX IF NOT EXISTS idx_investor_mentions_text ON investor_mentions_raw(mention_text);

-- Comments
COMMENT ON TABLE investor_mentions_raw IS 'Layer A: Raw investor mentions extracted from articles, RSS feeds, etc. These are cheap, noisy, and many. Only validated mentions are promoted to the investors table.';
COMMENT ON COLUMN investor_mentions_raw.mention_text IS 'The raw text that was extracted as a potential investor mention';
COMMENT ON COLUMN investor_mentions_raw.confidence IS 'Confidence score (0.0-1.0) for this mention being a real investor';
COMMENT ON COLUMN investor_mentions_raw.extraction_method IS 'How this mention was extracted (pattern, NER, LLM, etc.)';
COMMENT ON COLUMN investor_mentions_raw.promoted_to_entity_id IS 'If this mention was promoted to an investor entity, link to that entity';
COMMENT ON COLUMN investor_mentions_raw.validation_reason IS 'Reason why this mention was or was not promoted';


