-- Add founder language analysis fields to startup_uploads

ALTER TABLE startup_uploads 
ADD COLUMN IF NOT EXISTS founder_voice_score NUMERIC DEFAULT NULL,
ADD COLUMN IF NOT EXISTS language_analysis JSONB DEFAULT NULL;

-- Create index for querying by voice score
CREATE INDEX IF NOT EXISTS idx_startup_uploads_founder_voice_score 
ON startup_uploads(founder_voice_score) 
WHERE founder_voice_score IS NOT NULL;

-- Add comment
COMMENT ON COLUMN startup_uploads.founder_voice_score IS 'Linguistic analysis score (0-100) based on founder communication patterns';
COMMENT ON COLUMN startup_uploads.language_analysis IS 'Detailed breakdown of founder language patterns';
