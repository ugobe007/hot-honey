-- Add source_item_id column to pythia_speech_snippets for deduplication by source item identity
-- This allows deduplication by HN comment objectID instead of just text_hash
-- Fixes the "inserted=0 skippedExisting=1" issue in incremental collection

ALTER TABLE pythia_speech_snippets
ADD COLUMN IF NOT EXISTS source_item_id TEXT;

-- Add unique constraint on (entity_id, source_type, source_item_id) for HN comments
-- This prevents the same HN comment from being inserted twice for the same startup
CREATE UNIQUE INDEX IF NOT EXISTS idx_pythia_snippets_source_item_unique 
ON pythia_speech_snippets(entity_id, source_type, source_item_id) 
WHERE source_item_id IS NOT NULL;

-- Add index for efficient lookups by source_item_id
CREATE INDEX IF NOT EXISTS idx_pythia_snippets_source_item_id 
ON pythia_speech_snippets(source_item_id) 
WHERE source_item_id IS NOT NULL;

-- Comment
COMMENT ON COLUMN pythia_speech_snippets.source_item_id IS 'Unique identifier for the source item (e.g., HN comment objectID from Algolia). Used for deduplication.';
