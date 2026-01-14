-- Migration: Add extraction_metadata to startup_uploads
-- Description: Stores provenance, confidence, and extraction method for all extracted fields
-- Created: 2025-01-10

-- Add extraction_metadata JSONB column
ALTER TABLE startup_uploads
ADD COLUMN IF NOT EXISTS extraction_metadata JSONB DEFAULT '{}'::jsonb;

-- Create index for querying by extraction method
CREATE INDEX IF NOT EXISTS idx_startup_extraction_method 
ON startup_uploads USING GIN ((extraction_metadata->>'extraction_method'));

-- Add comment
COMMENT ON COLUMN startup_uploads.extraction_metadata IS 'Stores provenance, confidence, extraction method, source URLs, and evidence for all extracted fields. Format: { field_name: { value, source_url, extracted_at, extraction_method, confidence, evidence_text } }';
