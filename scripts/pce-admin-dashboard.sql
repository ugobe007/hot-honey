-- ========================================
-- PHASE CHANGE ENGINE - ADMIN DASHBOARD QUERIES
-- ========================================
-- Quick queries for monitoring PCE health and finding Goldilocks startups
-- Copy/paste these into Supabase SQL Editor

-- ========================================
-- 1. PCE HEALTH CHECK
-- ========================================
\echo '==== PCE HEALTH CHECK ===='

SELECT 
  'Total Phase Changes' AS metric,
  COUNT(*)::text AS value
FROM startup_phase_changes
WHERE is_active = true

UNION ALL

SELECT 
  'Startups with Phases',
  COUNT(DISTINCT startup_id)::text
FROM startup_phase_changes
WHERE is_active = true

UNION ALL

SELECT 
  'Last 24h Detections',
  COUNT(*)::text
FROM startup_phase_changes
WHERE detected_at > now() - interval '24 hours'

UNION ALL

SELECT 
  'Queue Pending',
  COUNT(*)::text
FROM phase_detection_queue
WHERE status = 'pending'

UNION ALL

SELECT
  'Goldilocks Candidates (Surge+Breakout)',
  COUNT(*)::text
FROM startup_goldilocks_phase_triggers
WHERE goldilocks_phase_state IN ('surge', 'breakout');

-- ========================================
-- 2. GOLDILOCKS LEADERBOARD
-- ========================================
\echo '\n==== GOLDILOCKS LEADERBOARD ===='

SELECT 
  su.name AS startup_name,
  ROUND(su.total_god_score, 1) AS base_god,
  sgpt.goldilocks_phase_state AS state,
  ROUND(spv.pvi_7d::numeric, 2) AS pvi_7d,
  spv.domains_7d AS domains,
  ROUND(spm.pcm::numeric, 2) AS multiplier,
  ROUND((su.total_god_score * spm.pcm)::numeric, 1) AS adjusted_god,
  ROUND(((spm.pcm - 1) * 100)::numeric, 1) || '%' AS boost
FROM startup_uploads su
INNER JOIN startup_phase_velocity spv ON su.id = spv.startup_id
INNER JOIN startup_goldilocks_phase_triggers sgpt ON su.id = sgpt.startup_id
INNER JOIN startup_phase_multiplier spm ON su.id = spm.startup_id
WHERE 
  su.status = 'approved'
  AND sgpt.goldilocks_phase_state IN ('surge', 'breakout')
ORDER BY (su.total_god_score * spm.pcm) DESC
LIMIT 20;

-- ========================================
-- 3. PHASE ACTIVITY BY DOMAIN (Last 7 Days)
-- ========================================
\echo '\n==== PHASE ACTIVITY BY DOMAIN (7D) ===='

SELECT 
  domain,
  COUNT(*) AS total_changes,
  ROUND(AVG(magnitude)::numeric, 2) AS avg_magnitude,
  ROUND(AVG(irreversibility)::numeric, 2) AS avg_irreversibility,
  ROUND(AVG(velocity)::numeric, 2) AS avg_velocity,
  ROUND(AVG(
    public.phase_change_score(
      magnitude, irreversibility, velocity, 
      coupling, confidence, directionality
    )
  )::numeric, 2) AS avg_phase_score
FROM startup_phase_changes
WHERE 
  is_active = true 
  AND detected_at > now() - interval '7 days'
GROUP BY domain
ORDER BY total_changes DESC;

-- ========================================
-- 4. TOP PHASE CHANGES (Most Impactful)
-- ========================================
\echo '\n==== TOP PHASE CHANGES (LAST 30D) ===='

SELECT 
  su.name AS startup_name,
  pc.domain,
  pc.subtype,
  ROUND(public.phase_change_score(
    pc.magnitude, pc.irreversibility, pc.velocity,
    pc.coupling, pc.confidence, pc.directionality
  )::numeric, 2) AS phase_score,
  ROUND(pc.magnitude::numeric, 2) AS magnitude,
  ROUND(pc.irreversibility::numeric, 2) AS irreversibility,
  pc.detected_at,
  jsonb_array_length(pc.evidence->'signals') AS signal_count
FROM startup_phase_changes pc
INNER JOIN startup_uploads su ON pc.startup_id = su.id
WHERE 
  pc.is_active = true
  AND pc.detected_at > now() - interval '30 days'
ORDER BY phase_score DESC
LIMIT 20;

-- ========================================
-- 5. PHASE VELOCITY DISTRIBUTION
-- ========================================
\echo '\n==== PHASE VELOCITY DISTRIBUTION ===='

WITH pvi_buckets AS (
  SELECT 
    CASE 
      WHEN pvi_7d < 0.5 THEN '0.0-0.5 (Quiet)'
      WHEN pvi_7d < 1.0 THEN '0.5-1.0 (Watch)'
      WHEN pvi_7d < 2.0 THEN '1.0-2.0 (Warming)'
      WHEN pvi_7d < 3.0 THEN '2.0-3.0 (Surge)'
      ELSE '3.0+ (Breakout)'
    END AS pvi_bucket,
    COUNT(*) AS startup_count
  FROM startup_phase_velocity
  GROUP BY pvi_bucket
)
SELECT 
  pvi_bucket,
  startup_count,
  ROUND((startup_count * 100.0 / SUM(startup_count) OVER ())::numeric, 1) || '%' AS percentage
FROM pvi_buckets
ORDER BY pvi_bucket;

-- ========================================
-- 6. MULTIDOMAIN ACTIVATION
-- ========================================
\echo '\n==== MULTIDOMAIN ACTIVATION ===='

SELECT 
  domains_7d AS domains_activated,
  COUNT(*) AS startup_count,
  ROUND(AVG(pvi_7d)::numeric, 2) AS avg_pvi,
  ROUND(AVG(avg_irrev_7d)::numeric, 2) AS avg_irreversibility
FROM startup_phase_velocity
WHERE domains_7d > 0
GROUP BY domains_7d
ORDER BY domains_7d DESC;

-- ========================================
-- 7. RECENT HIGH-IMPACT CHANGES (Last 7 Days)
-- ========================================
\echo '\n==== RECENT HIGH-IMPACT CHANGES ===='

SELECT 
  su.name AS startup_name,
  pc.domain,
  pc.subtype,
  ROUND(pc.magnitude::numeric, 2) AS magnitude,
  ROUND(pc.irreversibility::numeric, 2) AS irreversibility,
  pc.evidence->'signals'->0 AS first_signal,
  pc.detected_at
FROM startup_phase_changes pc
INNER JOIN startup_uploads su ON pc.startup_id = su.id
WHERE 
  pc.is_active = true
  AND pc.detected_at > now() - interval '7 days'
  AND (pc.magnitude > 0.7 OR pc.irreversibility > 0.7)
ORDER BY pc.detected_at DESC
LIMIT 15;

-- ========================================
-- 8. PHASE CHANGE MULTIPLIER DISTRIBUTION
-- ========================================
\echo '\n==== PHASE CHANGE MULTIPLIER (PCM) DISTRIBUTION ===='

WITH pcm_buckets AS (
  SELECT 
    CASE 
      WHEN pcm < 1.1 THEN '1.0-1.1 (Minimal)'
      WHEN pcm < 1.3 THEN '1.1-1.3 (Low)'
      WHEN pcm < 1.5 THEN '1.3-1.5 (Medium)'
      WHEN pcm < 2.0 THEN '1.5-2.0 (High)'
      ELSE '2.0+ (Extreme)'
    END AS pcm_bucket,
    COUNT(*) AS startup_count,
    ROUND(AVG(pvi_7d)::numeric, 2) AS avg_pvi
  FROM startup_phase_multiplier
  GROUP BY pcm_bucket
)
SELECT 
  pcm_bucket,
  startup_count,
  avg_pvi,
  ROUND((startup_count * 100.0 / SUM(startup_count) OVER ())::numeric, 1) || '%' AS percentage
FROM pcm_buckets
ORDER BY pcm_bucket;

-- ========================================
-- 9. DETECTION QUEUE STATUS
-- ========================================
\echo '\n==== DETECTION QUEUE STATUS ===='

SELECT 
  status,
  COUNT(*) AS count,
  ROUND(AVG(attempts)::numeric, 1) AS avg_attempts,
  MAX(created_at) AS most_recent
FROM phase_detection_queue
GROUP BY status
ORDER BY 
  CASE status
    WHEN 'processing' THEN 1
    WHEN 'pending' THEN 2
    WHEN 'failed' THEN 3
    WHEN 'completed' THEN 4
  END;

-- ========================================
-- 10. GOLDILOCKS TRANSITION FUNNEL
-- ========================================
\echo '\n==== GOLDILOCKS STATE FUNNEL ===='

SELECT 
  goldilocks_phase_state AS state,
  COUNT(*) AS startup_count,
  ROUND(AVG(pvi_7d)::numeric, 2) AS avg_pvi,
  ROUND(AVG(domains_7d)::numeric, 1) AS avg_domains,
  ROUND((COUNT(*) * 100.0 / SUM(COUNT(*)) OVER ())::numeric, 1) || '%' AS percentage
FROM startup_goldilocks_phase_triggers
GROUP BY goldilocks_phase_state
ORDER BY 
  CASE goldilocks_phase_state
    WHEN 'breakout' THEN 1
    WHEN 'surge' THEN 2
    WHEN 'warming' THEN 3
    WHEN 'watch' THEN 4
    WHEN 'quiet' THEN 5
  END;

-- ========================================
-- 11. TOP BOOSTED STARTUPS (Biggest PCM Impact)
-- ========================================
\echo '\n==== TOP BOOSTED STARTUPS ===='

SELECT 
  su.name AS startup_name,
  ROUND(su.total_god_score::numeric, 1) AS base_god,
  ROUND(spm.pcm::numeric, 2) AS multiplier,
  ROUND((su.total_god_score * spm.pcm)::numeric, 1) AS adjusted_god,
  ROUND(((su.total_god_score * spm.pcm) - su.total_god_score)::numeric, 1) AS absolute_boost,
  ROUND(((spm.pcm - 1) * 100)::numeric, 1) || '%' AS percent_boost,
  spm.goldilocks_phase_state AS state,
  spv.domains_7d AS domains
FROM startup_uploads su
INNER JOIN startup_phase_multiplier spm ON su.id = spm.startup_id
INNER JOIN startup_phase_velocity spv ON su.id = spv.startup_id
WHERE su.status = 'approved'
ORDER BY (spm.pcm - 1) DESC
LIMIT 20;

-- ========================================
-- 12. PHASE TIMELINE FOR SPECIFIC STARTUP
-- ========================================
\echo '\n==== PHASE TIMELINE (Replace UUID Below) ===='

-- Replace this UUID with a real startup_id:
-- SELECT id, name FROM startup_uploads LIMIT 5;

SELECT 
  domain,
  subtype,
  occurred_at,
  ROUND(phase_score::numeric, 2) AS phase_score,
  ROUND(magnitude::numeric, 2) AS magnitude,
  ROUND(irreversibility::numeric, 2) AS irreversibility,
  ROUND(velocity::numeric, 2) AS velocity,
  ROUND(directionality::numeric, 2) AS directionality,
  jsonb_array_length(evidence->'signals') AS signals
FROM startup_phase_ledger
WHERE startup_id = '00000000-0000-0000-0000-000000000000'  -- ⚠️ REPLACE THIS
ORDER BY occurred_at ASC;

-- ========================================
-- INTERPRETATION GUIDE
-- ========================================
/*

PVI_7d Interpretation:
  < 0.6  = Quiet (baseline)
  0.6-1.3 = Watch (early signals)
  1.3-2.3 = Warming (momentum building)
  2.3-3.5 = Surge (high velocity)
  > 3.5  = Breakout (exceptional)

PCM (Phase Change Multiplier):
  1.0-1.1 = Minimal phase activity
  1.1-1.3 = Low boost
  1.3-1.5 = Medium boost
  1.5-2.0 = High boost
  2.0+    = Extreme boost (rare)

Goldilocks States (in order):
  quiet → watch → warming → surge → breakout

Domains (out of 5):
  1 = Single domain (low confidence)
  2 = Emerging multidimensionality
  3 = Strong multidomain signal
  4 = Very strong (rare)
  5 = All domains firing (extremely rare)

Phase Score:
  0.0-0.3 = Low impact
  0.3-0.5 = Medium impact
  0.5-0.7 = High impact
  0.7+    = Exceptional impact

*/
