-- Migration: Create entity_keys table for entity resolution
-- Description: Stores normalized entity keys for matching and deduplication
-- Created: 2025-01-10

-- Create entity_keys table
CREATE TABLE IF NOT EXISTS entity_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL, -- 'startup' or 'investor'
  entity_id UUID NOT NULL,
  entity_key TEXT NOT NULL, -- normalized key (domain or name|country)
  domain TEXT,
  normalized_name TEXT,
  country TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_entity_type CHECK (entity_type IN ('startup', 'investor')),
  UNIQUE(entity_type, entity_key)
);

-- Create indexes for efficient lookup
CREATE INDEX IF NOT EXISTS idx_entity_keys_key ON entity_keys(entity_key);
CREATE INDEX IF NOT EXISTS idx_entity_keys_domain ON entity_keys(domain);
CREATE INDEX IF NOT EXISTS idx_entity_keys_entity ON entity_keys(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_entity_keys_normalized_name ON entity_keys(normalized_name);

-- Add comments
COMMENT ON TABLE entity_keys IS 'Stores normalized entity keys for entity resolution and deduplication';
COMMENT ON COLUMN entity_keys.entity_key IS 'Deterministic key: normalized domain if available, else normalized_name|country';
COMMENT ON COLUMN entity_keys.domain IS 'Normalized domain (www stripped, lowercase)';
COMMENT ON COLUMN entity_keys.normalized_name IS 'Normalized name (Inc/LLC stripped, punctuation removed, lowercase)';
