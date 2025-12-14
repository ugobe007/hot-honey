-- Algorithm Weight History Table
-- Tracks all changes made to GOD algorithm weights via ML recommendations
-- NOTE: Run supabase-ml-feedback-tables.sql first to create ml_recommendations table

-- Create ml_recommendations table if it doesn't exist
CREATE TABLE IF NOT EXISTS ml_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recommendation_type VARCHAR(50) NOT NULL,
  priority VARCHAR(20) NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  current_value JSONB,
  proposed_value JSONB,
  expected_impact TEXT,
  confidence_score DECIMAL(3,2),
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  applied_at TIMESTAMPTZ,
  applied_by TEXT
);

CREATE TABLE IF NOT EXISTS algorithm_weight_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recommendation_id UUID REFERENCES ml_recommendations(id),
  applied_by TEXT NOT NULL DEFAULT 'system',
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Weight changes applied
  weight_updates JSONB NOT NULL,
  -- Example: [
  --   { "component": "traction", "old_weight": 3.0, "new_weight": 3.5, "reason": "..." },
  --   { "component": "team", "old_weight": 3.0, "new_weight": 2.8, "reason": "..." }
  -- ]
  
  -- Performance metrics before application
  performance_before JSONB,
  -- Example: {
  --   "total_matches": 156,
  --   "avg_match_score": 82.3,
  --   "avg_god_score": 78.5,
  --   "success_rate": 0.269
  -- }
  
  -- Performance metrics after application (measured after 30 days)
  performance_after JSONB,
  
  -- Rollback tracking
  rolled_back BOOLEAN DEFAULT FALSE,
  rolled_back_at TIMESTAMPTZ,
  rollback_reason TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_weight_history_recommendation 
  ON algorithm_weight_history(recommendation_id);

CREATE INDEX IF NOT EXISTS idx_weight_history_applied_at 
  ON algorithm_weight_history(applied_at DESC);

CREATE INDEX IF NOT EXISTS idx_weight_history_rolled_back 
  ON algorithm_weight_history(rolled_back) 
  WHERE rolled_back = FALSE;

-- Add indexes to ml_recommendations
CREATE INDEX IF NOT EXISTS idx_ml_recommendations_status 
  ON ml_recommendations(status);

CREATE INDEX IF NOT EXISTS idx_ml_recommendations_created_at 
  ON ml_recommendations(created_at DESC);

-- View for active weights (most recent non-rolled-back changes)
CREATE OR REPLACE VIEW current_algorithm_weights AS
SELECT 
  weight_updates,
  applied_at,
  applied_by,
  performance_before,
  performance_after
FROM algorithm_weight_history
WHERE rolled_back = FALSE
ORDER BY applied_at DESC
LIMIT 1;

-- Function to calculate weight change impact
CREATE OR REPLACE FUNCTION calculate_weight_impact(history_id UUID)
RETURNS TABLE (
  component TEXT,
  weight_change NUMERIC,
  performance_change NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (jsonb_array_elements(weight_updates)->>'component')::TEXT as component,
    ((jsonb_array_elements(weight_updates)->>'new_weight')::NUMERIC - 
     (jsonb_array_elements(weight_updates)->>'old_weight')::NUMERIC) as weight_change,
    CASE 
      WHEN performance_after IS NOT NULL THEN
        ((performance_after->>'success_rate')::NUMERIC - 
         (performance_before->>'success_rate')::NUMERIC) * 100
      ELSE NULL
    END as performance_change
  FROM algorithm_weight_history
  WHERE id = history_id;
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON TABLE algorithm_weight_history IS 
  'Tracks all changes to GOD algorithm component weights, including rollback capability';

COMMENT ON COLUMN algorithm_weight_history.weight_updates IS 
  'Array of weight changes with old/new values and reasons';

COMMENT ON COLUMN algorithm_weight_history.performance_before IS 
  'Performance metrics captured before applying weight changes';

COMMENT ON COLUMN algorithm_weight_history.performance_after IS 
  'Performance metrics measured 30 days after applying changes';
