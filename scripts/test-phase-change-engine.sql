-- ============================
-- PHASE CHANGE ENGINE - TEST DATA
-- ============================
-- Purpose: Insert example phase changes to verify PCE is working
-- 
-- Instructions:
-- 1. Replace the startup_id with a real UUID from your startup_uploads table
-- 2. Run this in Supabase SQL Editor
-- 3. Verify with the SELECT queries at the bottom
-- ============================

-- ============================
-- STEP 1: Get a real startup UUID
-- ============================
-- Uncomment and run this first to get a startup ID:
-- SELECT id, name FROM startup_uploads WHERE status = 'approved' LIMIT 5;

-- Then replace this UUID:
DO $$
DECLARE
  test_startup_id uuid := '00000000-0000-0000-0000-000000000000';  -- ⚠️ REPLACE THIS
BEGIN
  -- Verify the startup exists
  IF NOT EXISTS (SELECT 1 FROM startup_uploads WHERE id = test_startup_id) THEN
    RAISE EXCEPTION 'Startup ID % does not exist. Update test_startup_id variable.', test_startup_id;
  END IF;
  
  RAISE NOTICE 'Using startup ID: %', test_startup_id;
END $$;

-- ============================
-- STEP 2: Insert Test Phase Changes
-- ============================

-- Timeline: A startup going through Goldilocks acceleration
-- T-30d: Product pivot (ICP narrowing)
-- T-25d: Technical cofounder joins
-- T-20d: First non-friendly customer
-- T-15d: Product usage concentration detected
-- T-10d: First institutional capital
-- T-5d:  First customer expansion
-- T-1d:  Domain expert joins

-- ============================
-- Phase 1: Product - ICP Narrowing (30 days ago)
-- ============================
INSERT INTO public.startup_phase_changes
(startup_id, domain, subtype, magnitude, irreversibility, velocity, coupling, confidence, directionality, evidence, fingerprint, effective_at)
VALUES
(
  '00000000-0000-0000-0000-000000000000',  -- ⚠️ REPLACE THIS
  'product',
  'pivot_icp_narrowed',
  0.65,  -- Significant reachable future change
  0.55,  -- Medium irreversibility (can pivot again)
  0.70,  -- Fast adaptation
  0.25,  -- Will trigger customer changes
  0.60,  -- Medium confidence (website diff signals)
  0.55,  -- Positive direction
  jsonb_build_object(
    'sources', jsonb_build_array('website_diff', 'scraper'),
    'artifacts', jsonb_build_array('https://example.com/about'),
    'signals', jsonb_build_array(
      'Messaging shifted from "all SMBs" to "midmarket logistics ops"',
      'Feature page now highlights industry-specific use cases'
    )
  ),
  'test:product:pivot_icp:v1',
  now() - interval '30 days'
);

-- ============================
-- Phase 2: Human - Technical Cofounder Joined (25 days ago)
-- ============================
INSERT INTO public.startup_phase_changes
(startup_id, domain, subtype, magnitude, irreversibility, velocity, coupling, confidence, directionality, evidence, fingerprint, effective_at)
VALUES
(
  '00000000-0000-0000-0000-000000000000',  -- ⚠️ REPLACE THIS
  'human',
  'technical_cofounder_joined',
  0.85,  -- Extreme: changes everything
  0.75,  -- Very high: cofounder equity is sticky
  0.80,  -- Fast: rapid integration
  0.45,  -- Will trigger product acceleration
  0.85,  -- High confidence (LinkedIn + GitHub)
  0.70,  -- Very positive
  jsonb_build_object(
    'sources', jsonb_build_array('linkedin', 'github'),
    'artifacts', jsonb_build_array(
      'https://linkedin.com/in/test-cto',
      'https://github.com/test-startup/repo/commits'
    ),
    'signals', jsonb_build_array(
      'Former senior eng at Stripe joined as Co-Founder & CTO',
      '50+ commits in first week',
      'Equity grant filed'
    )
  ),
  'test:human:technical_cofounder:v1',
  now() - interval '25 days'
);

-- ============================
-- Phase 3: Customer - First Non-Friendly Customer (20 days ago)
-- ============================
INSERT INTO public.startup_phase_changes
(startup_id, domain, subtype, magnitude, irreversibility, velocity, coupling, confidence, directionality, evidence, fingerprint, effective_at)
VALUES
(
  '00000000-0000-0000-0000-000000000000',  -- ⚠️ REPLACE THIS
  'customer',
  'first_non_friendly_customer',
  0.70,  -- High: validation begins
  0.60,  -- Medium-high: can still lose them
  0.65,  -- Good velocity
  0.30,  -- May trigger more customers
  0.70,  -- Good confidence
  0.60,  -- Positive signal
  jsonb_build_object(
    'sources', jsonb_build_array('scraper', 'case_study'),
    'artifacts', jsonb_build_array('https://example.com/customers'),
    'signals', jsonb_build_array(
      'Organic acquisition via Google search',
      'Paying customer (standard pricing)',
      'Public testimonial posted'
    )
  ),
  'test:customer:first_non_friendly:v1',
  now() - interval '20 days'
);

-- ============================
-- Phase 4: Product - Usage Concentration Spike (15 days ago)
-- ============================
INSERT INTO public.startup_phase_changes
(startup_id, domain, subtype, magnitude, irreversibility, velocity, coupling, confidence, directionality, evidence, fingerprint, effective_at)
VALUES
(
  '00000000-0000-0000-0000-000000000000',  -- ⚠️ REPLACE THIS
  'product',
  'usage_concentration_spike',
  0.80,  -- Very high: PMF signal
  0.75,  -- Hard to change once users dependent
  0.70,  -- Good velocity
  0.35,  -- Triggers customer expansion
  0.75,  -- High confidence
  0.70,  -- Very positive
  jsonb_build_object(
    'sources', jsonb_build_array('analytics', 'testimonials'),
    'artifacts', jsonb_build_array(),
    'signals', jsonb_build_array(
      '80% of users concentrated on single use case',
      'Daily active usage for core feature',
      'Multiple testimonials mention "couldn''t live without"'
    )
  ),
  'test:product:usage_concentration:v1',
  now() - interval '15 days'
);

-- ============================
-- Phase 5: Capital - First Institutional Lead (10 days ago)
-- ============================
INSERT INTO public.startup_phase_changes
(startup_id, domain, subtype, magnitude, irreversibility, velocity, coupling, confidence, directionality, evidence, fingerprint, effective_at)
VALUES
(
  '00000000-0000-0000-0000-000000000000',  -- ⚠️ REPLACE THIS
  'capital',
  'first_institutional_lead',
  0.75,  -- High: major validation
  0.85,  -- Very high: market signal is permanent
  0.60,  -- Medium velocity (capital is slower)
  0.40,  -- Will trigger hiring
  0.85,  -- High confidence (public filing)
  0.65,  -- Positive
  jsonb_build_object(
    'sources', jsonb_build_array('crunchbase', 'filing'),
    'artifacts', jsonb_build_array('https://techcrunch.com/test-funding'),
    'signals', jsonb_build_array(
      'Sequoia led seed round at $12M valuation',
      'Competitive process with 3 term sheets',
      'Strategic alignment with portfolio'
    )
  ),
  'test:capital:first_institutional:v1',
  now() - interval '10 days'
);

-- ============================
-- Phase 6: Customer - First Expansion (5 days ago)
-- ============================
INSERT INTO public.startup_phase_changes
(startup_id, domain, subtype, magnitude, irreversibility, velocity, coupling, confidence, directionality, evidence, fingerprint, effective_at)
VALUES
(
  '00000000-0000-0000-0000-000000000000',  -- ⚠️ REPLACE THIS
  'customer',
  'first_expansion_within_account',
  0.80,  -- Very high
  0.85,  -- Expansion = deep integration
  0.70,  -- Fast
  0.40,  -- Triggers more expansions
  0.75,  -- Good confidence
  0.70,  -- Very positive
  jsonb_build_object(
    'sources', jsonb_build_array('billing', 'crm'),
    'artifacts', jsonb_build_array(),
    'signals', jsonb_build_array(
      'First customer expanded from 5 to 25 seats',
      'Additional department onboarded',
      'Annual contract signed (was monthly)'
    )
  ),
  'test:customer:expansion:v1',
  now() - interval '5 days'
);

-- ============================
-- Phase 7: Human - Domain Expert Joined (1 day ago)
-- ============================
INSERT INTO public.startup_phase_changes
(startup_id, domain, subtype, magnitude, irreversibility, velocity, coupling, confidence, directionality, evidence, fingerprint, effective_at)
VALUES
(
  '00000000-0000-0000-0000-000000000000',  -- ⚠️ REPLACE THIS
  'human',
  'domain_expert_joined',
  0.75,  -- High capability shift
  0.65,  -- Good stickiness
  0.75,  -- Fast integration
  0.35,  -- Triggers product improvements
  0.75,  -- Good confidence
  0.65,  -- Positive
  jsonb_build_object(
    'sources', jsonb_build_array('linkedin'),
    'artifacts', jsonb_build_array('https://linkedin.com/in/test-expert'),
    'signals', jsonb_build_array(
      'Former VP Product at Shopify joined as advisor',
      '15 years in e-commerce logistics',
      'Active engagement: 2 product strategy sessions already'
    )
  ),
  'test:human:domain_expert:v1',
  now() - interval '1 day'
);

-- ============================
-- STEP 3: Verify Installation
-- ============================

-- View the phase ledger (timeline)
\echo '\n==== PHASE TIMELINE ===='
SELECT
  domain,
  subtype,
  occurred_at,
  phase_score,
  magnitude,
  irreversibility,
  velocity,
  directionality
FROM public.startup_phase_ledger
WHERE startup_id = '00000000-0000-0000-0000-000000000000'  -- ⚠️ REPLACE THIS
ORDER BY occurred_at ASC;

-- View phase velocity metrics
\echo '\n==== PHASE VELOCITY (PVI) ===='
SELECT
  phase_events_24h,
  pvi_24h,
  phase_events_7d,
  pvi_7d,
  avg_irrev_7d,
  avg_coupling_7d,
  domains_7d,
  pvi_accel_ratio
FROM public.startup_phase_velocity
WHERE startup_id = '00000000-0000-0000-0000-000000000000';  -- ⚠️ REPLACE THIS

-- View Goldilocks state
\echo '\n==== GOLDILOCKS STATE ===='
SELECT
  goldilocks_phase_state,
  pvi_7d,
  domains_7d,
  avg_irrev_7d,
  pvi_accel_ratio
FROM public.startup_goldilocks_phase_triggers
WHERE startup_id = '00000000-0000-0000-0000-000000000000';  -- ⚠️ REPLACE THIS

-- View phase multiplier
\echo '\n==== PHASE CHANGE MULTIPLIER (PCM) ===='
SELECT
  goldilocks_phase_state,
  pvi_7d,
  domains_7d,
  pcm AS phase_change_multiplier
FROM public.startup_phase_multiplier
WHERE startup_id = '00000000-0000-0000-0000-000000000000';  -- ⚠️ REPLACE THIS

-- View phase-adjusted GOD score
\echo '\n==== PHASE-ADJUSTED GOD SCORE ===='
SELECT
  su.name,
  su.total_god_score AS base_god_score,
  spm.pcm AS multiplier,
  public.calculate_phase_adjusted_god(su.id) AS phase_adjusted_god_score
FROM startup_uploads su
LEFT JOIN public.startup_phase_multiplier spm ON su.id = spm.startup_id
WHERE su.id = '00000000-0000-0000-0000-000000000000';  -- ⚠️ REPLACE THIS

-- ============================
-- Expected Results:
-- ============================
-- 
-- ✅ Phase Timeline: Should show 7 phases across 4 domains (product, human, customer, capital)
-- ✅ PVI: Should be elevated (likely 2-4 range for 7d)
-- ✅ Goldilocks State: Should be 'warming' or 'surge' (4 domains, high irreversibility)
-- ✅ PCM: Should be > 1.5 (significant multiplier effect)
-- ✅ Adjusted GOD: Should be base_god × PCM
-- 
-- If you see these results, the Phase Change Engine is working correctly! 🎯
-- ============================
