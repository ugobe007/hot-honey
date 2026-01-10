-- Migration: Update ALL Template Step Numbers and GOD Score Impact
-- Description: Sets sequential step numbers and GOD score component mappings for ALL templates
-- Created: 2025-01-09 (Updated with all templates)

-- ============================================
-- CORE SEQUENTIAL TEMPLATES (Steps 1-8)
-- ============================================

-- Step 1: Pitch Deck Analyzer
UPDATE service_templates 
SET 
  step_number = 1,
  god_score_impact = ARRAY['vision', 'market']
WHERE slug = 'pitch-analyzer';

-- Step 2: Value Prop Sharpener
UPDATE service_templates 
SET 
  step_number = 2,
  god_score_impact = ARRAY['vision', 'market', 'product']
WHERE slug = 'value-prop-sharpener';

-- Step 3: VC Approach Playbook
UPDATE service_templates 
SET 
  step_number = 3,
  god_score_impact = ARRAY['market']
WHERE slug = 'vc-approach-playbook';

-- Step 4: Funding Strategy Roadmap
UPDATE service_templates 
SET 
  step_number = 4,
  god_score_impact = ARRAY['market', 'vision']
WHERE slug = 'funding-strategy';

-- Step 5: Traction Improvement Plan
UPDATE service_templates 
SET 
  step_number = 5,
  god_score_impact = ARRAY['traction']
WHERE slug = 'traction-improvement';

-- Step 6: Team Gap Analysis
UPDATE service_templates 
SET 
  step_number = 6,
  god_score_impact = ARRAY['team']
WHERE slug = 'team-gap-analysis';

-- Step 7: Product-Market Fit Analysis
UPDATE service_templates 
SET 
  step_number = 7,
  god_score_impact = ARRAY['product', 'traction']
WHERE slug = 'pmf-analysis';

-- Step 8: Strategic Partnership Finder
UPDATE service_templates 
SET 
  step_number = 8,
  god_score_impact = ARRAY['market', 'traction']
WHERE slug = 'partnership-opportunities';

-- ============================================
-- SUPPORTING TEMPLATES (Steps 9-16)
-- These are optional but recommended after core steps
-- ============================================

-- Step 9: Warm Intro Path Finder
-- Improves: Market (investor connections), Vision (pitch clarity)
UPDATE service_templates 
SET 
  step_number = 9,
  god_score_impact = ARRAY['market', 'vision']
WHERE slug = 'warm-intro-finder';

-- Step 10: Founder Story Framework
-- Improves: Vision (compelling narrative), Team (founder credibility)
UPDATE service_templates 
SET 
  step_number = 10,
  god_score_impact = ARRAY['vision', 'team']
WHERE slug = 'story-framework';

-- Step 11: Customer Story Templates
-- Improves: Traction (social proof), Product (validation)
UPDATE service_templates 
SET 
  step_number = 11,
  god_score_impact = ARRAY['traction', 'product']
WHERE slug = 'customer-stories';

-- Step 12: Competitive Intelligence Report
-- Improves: Market (positioning), Product (differentiation)
UPDATE service_templates 
SET 
  step_number = 12,
  god_score_impact = ARRAY['market', 'product']
WHERE slug = 'competitive-intel';

-- Step 13: Strategic Advisor Matching
-- Improves: Team (advisory support), Market (industry connections)
UPDATE service_templates 
SET 
  step_number = 13,
  god_score_impact = ARRAY['team', 'market']
WHERE slug = 'advisor-matching';

-- Step 14: Talent Finder
-- Improves: Team (hiring strategy)
UPDATE service_templates 
SET 
  step_number = 14,
  god_score_impact = ARRAY['team']
WHERE slug = 'talent-finder';

-- Step 15: Co-Founder Matching
-- Improves: Team (cofounder fit)
UPDATE service_templates 
SET 
  step_number = 15,
  god_score_impact = ARRAY['team']
WHERE slug = 'cofounder-match';

-- Step 16: Advisor Matching (alternative)
-- Improves: Team (advisory support)
UPDATE service_templates 
SET 
  step_number = 16,
  god_score_impact = ARRAY['team']
WHERE slug = 'advisor-match';

-- ============================================
-- GROWTH & ECOSYSTEM TEMPLATES (Steps 17-22)
-- Advanced templates for growth stage
-- ============================================

-- Step 17: Media & PR Match
-- Improves: Traction (brand awareness), Market (visibility)
UPDATE service_templates 
SET 
  step_number = 17,
  god_score_impact = ARRAY['traction', 'market']
WHERE slug = 'media-match';

-- Step 18: Community Finder
-- Improves: Traction (user engagement), Product (community validation)
UPDATE service_templates 
SET 
  step_number = 18,
  god_score_impact = ARRAY['traction', 'product']
WHERE slug = 'community-finder';

-- Step 19: Customer Intro Finder
-- Improves: Traction (customer acquisition), Market (distribution)
UPDATE service_templates 
SET 
  step_number = 19,
  god_score_impact = ARRAY['traction', 'market']
WHERE slug = 'customer-intro';

-- Step 20: Service Provider Match
-- Improves: Product (operational support), Traction (efficiency)
UPDATE service_templates 
SET 
  step_number = 20,
  god_score_impact = ARRAY['product', 'traction']
WHERE slug = 'service-provider-match';

-- Step 21: Accelerator Finder
-- Improves: Market (ecosystem access), Team (mentorship)
UPDATE service_templates 
SET 
  step_number = 21,
  god_score_impact = ARRAY['market', 'team']
WHERE slug = 'accelerator-match';

-- ============================================
-- VERIFICATION QUERY
-- ============================================

-- Verify all templates are updated
SELECT 
  step_number,
  slug,
  name,
  god_score_impact,
  category,
  tier_required,
  CASE 
    WHEN step_number = 999 THEN '❌ NEEDS UPDATE'
    WHEN array_length(god_score_impact, 1) IS NULL THEN '⚠️ MISSING IMPACT'
    ELSE '✅ UPDATED'
  END as status
FROM service_templates
WHERE is_active = true
ORDER BY 
  CASE WHEN step_number = 999 THEN 9999 ELSE step_number END,
  name;

