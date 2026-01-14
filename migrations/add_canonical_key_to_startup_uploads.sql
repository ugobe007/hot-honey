-- Add canonical_key column to startup_uploads for entity deduplication
-- This allows multiple variants of the same company (e.g., "Kahoot" vs "Kahoot!") to map to the same UUID

ALTER TABLE startup_uploads 
ADD COLUMN IF NOT EXISTS canonical_key TEXT;

-- Add index for efficient canonical_key lookups
CREATE INDEX IF NOT EXISTS idx_startup_uploads_canonical_key ON startup_uploads(canonical_key) WHERE canonical_key IS NOT NULL;

-- Comment
COMMENT ON COLUMN startup_uploads.canonical_key IS 'Canonical identifier for entity deduplication (format: domain:<normalized_domain> or name:<normalized_name>)';
