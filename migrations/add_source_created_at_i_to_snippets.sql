-- Add source_created_at_i column to pythia_speech_snippets
-- This stores Algolia's created_at_i timestamp for incremental collection

ALTER TABLE pythia_speech_snippets 
ADD COLUMN IF NOT EXISTS source_created_at_i BIGINT;

-- Add index for efficient "get last created_at_i" queries
CREATE INDEX IF NOT EXISTS idx_pythia_snippets_entity_source_created_at 
ON pythia_speech_snippets(entity_id, source_type, source_created_at_i DESC NULLS LAST);

-- Comment
COMMENT ON COLUMN pythia_speech_snippets.source_created_at_i IS 'Algolia created_at_i timestamp for incremental collection (only set for forum_post source_type)';
