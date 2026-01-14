-- Add unique constraint for HN comments to prevent duplicates
-- This makes re-runs "safe by default" - upsert will handle conflicts gracefully

-- Drop existing index if it exists (might have been created with different name)
DROP INDEX IF EXISTS idx_pythia_snippets_source_item_unique;

-- Create unique index on (entity_id, source_type, source_item_id) for forum_post snippets
CREATE UNIQUE INDEX IF NOT EXISTS uniq_hn_comment_per_startup
ON pythia_speech_snippets(entity_id, source_type, source_item_id)
WHERE source_type = 'forum_post' AND source_item_id IS NOT NULL;

-- Comment
COMMENT ON INDEX uniq_hn_comment_per_startup IS 'Unique constraint: one HN comment (source_item_id) per startup (entity_id). Prevents duplicate comments across re-runs.';
