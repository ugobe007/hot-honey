-- Migration: Add benchmark_score column to startup_uploads
-- Description: Stores the overall benchmark score (0-100) for each startup
-- Created: 2025-01-XX

ALTER TABLE startup_uploads
ADD COLUMN IF NOT EXISTS benchmark_score INTEGER;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_startup_uploads_benchmark_score ON startup_uploads(benchmark_score DESC);

-- Add comment
COMMENT ON COLUMN startup_uploads.benchmark_score IS 'Overall benchmark score (0-100) comparing startup to industry peers based on GOD score, team size, and MRR';



