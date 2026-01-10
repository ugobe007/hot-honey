-- Migration: Update Template Step Numbers and GOD Score Impact
-- Description: Sets sequential step numbers and GOD score component mappings for all templates
-- Created: 2025-01-09

-- Step 1: Pitch Deck Analyzer
-- Improves: Vision (ability to articulate) and Market (market positioning clarity)
UPDATE service_templates 
SET 
  step_number = 1,
  god_score_impact = ARRAY['vision', 'market']
WHERE slug = 'pitch-analyzer';

-- Step 2: Value Prop Sharpener
-- Improves: Vision, Market, and Product (core value proposition)
UPDATE service_templates 
SET 
  step_number = 2,
  god_score_impact = ARRAY['vision', 'market', 'product']
WHERE slug = 'value-prop-sharpener';

-- Step 3: VC Approach Playbook
-- Improves: Market (understanding of investor landscape)
UPDATE service_templates 
SET 
  step_number = 3,
  god_score_impact = ARRAY['market']
WHERE slug = 'vc-approach-playbook';

-- Step 4: Funding Strategy Roadmap
-- Improves: Market (strategic positioning) and Vision (long-term planning)
UPDATE service_templates 
SET 
  step_number = 4,
  god_score_impact = ARRAY['market', 'vision']
WHERE slug = 'funding-strategy';

-- Step 5: Traction Improvement Plan
-- Improves: Traction (growth metrics and revenue signals)
UPDATE service_templates 
SET 
  step_number = 5,
  god_score_impact = ARRAY['traction']
WHERE slug = 'traction-improvement';

-- Step 6: Team Gap Analysis
-- Improves: Team (identifying missing roles and advisors)
UPDATE service_templates 
SET 
  step_number = 6,
  god_score_impact = ARRAY['team']
WHERE slug = 'team-gap-analysis';

-- Step 7: Product-Market Fit Analysis
-- Improves: Product (PMF validation) and Traction (user engagement signals)
UPDATE service_templates 
SET 
  step_number = 7,
  god_score_impact = ARRAY['product', 'traction']
WHERE slug = 'pmf-analysis';

-- Step 8: Partnership Finder
-- Improves: Market (strategic partnerships) and Traction (growth through partnerships)
UPDATE service_templates 
SET 
  step_number = 8,
  god_score_impact = ARRAY['market', 'traction']
WHERE slug = 'partnership-opportunities';

-- Verify updates
SELECT 
  slug,
  name,
  step_number,
  god_score_impact,
  category,
  tier_required
FROM service_templates
WHERE is_active = true
ORDER BY step_number;

