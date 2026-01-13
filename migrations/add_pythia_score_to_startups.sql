-- Add pythia_score column to startup_uploads for GOD scoring integration
ALTER TABLE startup_uploads
ADD COLUMN IF NOT EXISTS pythia_score INTEGER DEFAULT NULL;

-- Add index for filtering/sorting by Pythia score
CREATE INDEX IF NOT EXISTS idx_startup_pythia_score ON startup_uploads(pythia_score DESC NULLS LAST);

-- Add comment
COMMENT ON COLUMN startup_uploads.pythia_score IS 'Pythia speech ontology score (0-100). Computed from speech snippets analysis.';
