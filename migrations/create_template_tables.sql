-- Migration: Create Template Completion and Recommendations Tables
-- Description: Tables for tracking template completions and GOD score-based recommendations
-- Created: 2025-01-09

-- Template Completions Table
CREATE TABLE IF NOT EXISTS template_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id UUID NOT NULL REFERENCES startup_uploads(id) ON DELETE CASCADE,
  template_slug TEXT NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  result_summary TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one completion record per startup/template combo
  UNIQUE(startup_id, template_slug)
);

-- Template Recommendations Table
CREATE TABLE IF NOT EXISTS template_recommendations (
  startup_id UUID PRIMARY KEY REFERENCES startup_uploads(id) ON DELETE CASCADE,
  recommendations JSONB NOT NULL DEFAULT '[]',
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_template_completions_startup 
ON template_completions(startup_id);

CREATE INDEX IF NOT EXISTS idx_template_completions_slug 
ON template_completions(template_slug);

CREATE INDEX IF NOT EXISTS idx_template_completions_completed 
ON template_completions(completed_at DESC);

-- Add step_number column to service_templates if it doesn't exist
ALTER TABLE service_templates 
ADD COLUMN IF NOT EXISTS step_number INTEGER DEFAULT 999;

-- Add god_score_impact column to service_templates if it doesn't exist
ALTER TABLE service_templates 
ADD COLUMN IF NOT EXISTS god_score_impact TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Comments
COMMENT ON TABLE template_completions IS 'Tracks which templates each startup has completed';
COMMENT ON TABLE template_recommendations IS 'Stores GOD score-based template recommendations for each startup';
COMMENT ON COLUMN service_templates.step_number IS 'Order number for sequential template flow (1, 2, 3, etc.)';
COMMENT ON COLUMN service_templates.god_score_impact IS 'Array of GOD score components this template improves (e.g., ["traction", "team"])';

