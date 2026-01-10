-- Migration: Add ecosystem_score and grit_score columns to startup_uploads
-- Description: Adds the missing GOD algorithm component scores to complete the 8-factor scoring system
-- Created: 2026-01-10

-- Add ecosystem_score column (0-100, default 50)
-- Ecosystem measures: Strategic partners, advisors, platform dependencies, ecosystem fit
ALTER TABLE startup_uploads
ADD COLUMN IF NOT EXISTS ecosystem_score INTEGER DEFAULT 50;

-- Add grit_score column (0-100, default 50)
-- Grit measures: Pivots, iteration speed, customer feedback frequency, resilience
ALTER TABLE startup_uploads
ADD COLUMN IF NOT EXISTS grit_score INTEGER DEFAULT 50;

-- Add problem_validation_score column (0-100, default 50) if it doesn't exist
-- Problem Validation measures: Customer interviews, pain data, ICP clarity
ALTER TABLE startup_uploads
ADD COLUMN IF NOT EXISTS problem_validation_score INTEGER DEFAULT 50;

-- Add comment to document these columns
COMMENT ON COLUMN startup_uploads.ecosystem_score IS 'Ecosystem fit score (0-100): Strategic partners, advisors, platform dependencies';
COMMENT ON COLUMN startup_uploads.grit_score IS 'Grit score (0-100): Pivots, iteration speed, customer feedback, resilience';
COMMENT ON COLUMN startup_uploads.problem_validation_score IS 'Problem validation score (0-100): Customer interviews, pain data, ICP clarity';

-- Optional: Add indexes for filtering/sorting by these scores
CREATE INDEX IF NOT EXISTS idx_startup_uploads_ecosystem_score ON startup_uploads(ecosystem_score DESC);
CREATE INDEX IF NOT EXISTS idx_startup_uploads_grit_score ON startup_uploads(grit_score DESC);
CREATE INDEX IF NOT EXISTS idx_startup_uploads_problem_validation_score ON startup_uploads(problem_validation_score DESC);
