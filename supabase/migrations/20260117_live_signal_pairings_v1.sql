-- ============================================================
-- Live Signal Pairings View v1 (Simplified)
-- Pairs top-signal startups with sector-matching investors
-- ============================================================

-- Drop existing view if exists
DROP VIEW IF EXISTS public.live_signal_pairings_v1 CASCADE;

-- Create the view (simplified version without CROSS JOIN LATERAL)
CREATE OR REPLACE VIEW public.live_signal_pairings_v1 AS
WITH
-- Step 1: Get top startups with good signals
top_startups AS (
  SELECT
    id,
    name,
    sector_key,
    investor_signal_sector_0_10,
    investor_state_sector,
    sector_momentum_0_10,
    sector_evidence_0_10,
    sector_narrative_0_10
  FROM public.startup_intel_v5_sector
  WHERE sector_key IS NOT NULL
    AND investor_signal_sector_0_10 IS NOT NULL
    AND investor_signal_sector_0_10 >= 5
  ORDER BY
    CASE WHEN investor_state_sector = 'hot' THEN 0 ELSE 1 END,
    investor_signal_sector_0_10 DESC NULLS LAST
  LIMIT 100
),

-- Step 2: Join with investors by sector match
raw_pairings AS (
  SELECT
    s.id AS startup_id,
    s.name AS startup_name,
    i.id AS investor_id,
    i.name AS investor_name,
    s.sector_key,
    s.investor_signal_sector_0_10,
    s.investor_state_sector,
    s.sector_momentum_0_10,
    s.sector_evidence_0_10,
    s.sector_narrative_0_10,
    ROW_NUMBER() OVER (PARTITION BY s.id ORDER BY random()) AS inv_rank
  FROM top_startups s
  JOIN public.investors i ON (
    -- Match by sectors array (if exists)
    (i.sectors IS NOT NULL AND s.sector_key = ANY(i.sectors))
    -- OR by investment_thesis text
    OR (i.investment_thesis ILIKE '%' || s.sector_key || '%')
    -- OR by firm description
    OR (i.firm_description_normalized ILIKE '%' || s.sector_key || '%')
  )
  WHERE i.name IS NOT NULL
)

-- Step 3: Pick one investor per startup and compute reason
SELECT
  startup_id,
  startup_name,
  investor_id,
  investor_name,
  -- Determine reason based on strongest dimension
  CASE
    WHEN COALESCE(sector_momentum_0_10, 0) >= COALESCE(sector_evidence_0_10, 0)
     AND COALESCE(sector_momentum_0_10, 0) >= COALESCE(sector_narrative_0_10, 0)
    THEN 'Capital velocity'
    WHEN COALESCE(sector_evidence_0_10, 0) >= COALESCE(sector_momentum_0_10, 0)
     AND COALESCE(sector_evidence_0_10, 0) >= COALESCE(sector_narrative_0_10, 0)
    THEN 'Stage readiness'
    ELSE 'Thesis convergence'
  END AS reason,
  -- Confidence = signal / 10, clamped 0-1
  LEAST(GREATEST(COALESCE(investor_signal_sector_0_10, 0) / 10.0, 0), 1) AS confidence,
  sector_key,
  NOW() AS created_at
FROM raw_pairings
WHERE inv_rank = 1  -- One investor per startup
ORDER BY
  CASE WHEN investor_state_sector = 'hot' THEN 0 ELSE 1 END,
  confidence DESC;

-- Grant access to the view
GRANT SELECT ON public.live_signal_pairings_v1 TO anon, authenticated;

-- ============================================================
-- Test query: Verify it works
-- ============================================================
-- SELECT * FROM public.live_signal_pairings_v1 LIMIT 10;
