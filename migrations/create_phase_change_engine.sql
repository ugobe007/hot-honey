-- ============================
-- PHASE CHANGE ENGINE (PCE)
-- Core Schema for Multidimensional State Transition Detection
-- ============================
-- Purpose: Detect, score, and compound multidimensional phase transitions
-- to surface Goldilocks startups before consensus.
-- 
-- This is not a feature. This is a core inference layer.
-- ============================

-- ============================
-- STEP 1: Core tables + enums
-- ============================

-- 1) Domain enum
DO $$ BEGIN
  CREATE TYPE public.phase_domain AS ENUM ('product','capital','human','customer','market');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2) Evidence source enum (optional but useful)
DO $$ BEGIN
  CREATE TYPE public.phase_evidence_source AS ENUM ('scraper','nlp','repo','website','filing','social','human_verified','partner_signal');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 3) Phase changes (state transitions)
CREATE TABLE IF NOT EXISTS public.startup_phase_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id uuid NOT NULL REFERENCES startup_uploads(id) ON DELETE CASCADE,

  domain public.phase_domain NOT NULL,
  subtype text NOT NULL,           -- e.g. 'pivot_icp', 'technical_cofounder_joined', 'first_enterprise_customer'

  detected_at timestamptz NOT NULL DEFAULT now(),
  effective_at timestamptz NULL,   -- when it "actually" took effect (if known)

  -- Physics properties (0..1 unless otherwise noted)
  magnitude numeric NOT NULL DEFAULT 0.30 CHECK (magnitude >= 0 AND magnitude <= 1),
  irreversibility numeric NOT NULL DEFAULT 0.30 CHECK (irreversibility >= 0 AND irreversibility <= 1),
  velocity numeric NOT NULL DEFAULT 0.30 CHECK (velocity >= 0 AND velocity <= 1),
  coupling numeric NOT NULL DEFAULT 0.00 CHECK (coupling >= 0 AND coupling <= 1),
  confidence numeric NOT NULL DEFAULT 0.60 CHECK (confidence >= 0 AND confidence <= 1),

  -- Optional: "directionality" (did it improve odds?) -1..+1
  directionality numeric NOT NULL DEFAULT 0.25 CHECK (directionality >= -1 AND directionality <= 1),

  -- Evidence payload (URLs, commits, quotes, etc.)
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,

  -- For dedupe + reprocessing
  fingerprint text NULL,
  is_active boolean NOT NULL DEFAULT true,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_phase_changes_startup_time
  ON public.startup_phase_changes (startup_id, detected_at DESC);

CREATE INDEX IF NOT EXISTS idx_phase_changes_domain_time
  ON public.startup_phase_changes (domain, detected_at DESC);

CREATE INDEX IF NOT EXISTS idx_phase_changes_subtype
  ON public.startup_phase_changes (subtype);

CREATE INDEX IF NOT EXISTS idx_phase_changes_active
  ON public.startup_phase_changes (is_active);

CREATE UNIQUE INDEX IF NOT EXISTS uq_phase_changes_fingerprint
  ON public.startup_phase_changes (startup_id, fingerprint)
  WHERE fingerprint IS NOT NULL;

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.tg_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS tr_phase_changes_touch ON public.startup_phase_changes;
CREATE TRIGGER tr_phase_changes_touch
BEFORE UPDATE ON public.startup_phase_changes
FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

-- ============================
-- STEP 2: PhaseChangeScore (The Physics)
-- ============================

CREATE OR REPLACE FUNCTION public.phase_change_score(
  magnitude numeric,
  irreversibility numeric,
  velocity numeric,
  coupling numeric,
  confidence numeric,
  directionality numeric
) RETURNS numeric
LANGUAGE sql
IMMUTABLE
AS $$
  -- base physics: product of "real" transition properties
  -- directionality: negative transitions should reduce score sharply
  WITH d AS (
    SELECT
      GREATEST(-1, LEAST(1, directionality)) AS dir,
      GREATEST(0, LEAST(1, magnitude)) AS m,
      GREATEST(0, LEAST(1, irreversibility)) AS i,
      GREATEST(0, LEAST(1, velocity)) AS v,
      GREATEST(0, LEAST(1, coupling)) AS c,
      GREATEST(0, LEAST(1, confidence)) AS conf
  )
  SELECT
    (
      (m * 0.30) +
      (i * 0.25) +
      (v * 0.20) +
      (c * 0.15) +
      (conf * 0.10)
    )
    *
    -- Directionality gate: map [-1..1] → [0.1..1.25]
    (CASE
      WHEN dir <= -0.50 THEN 0.10
      WHEN dir <=  0.00 THEN 0.60
      WHEN dir <=  0.50 THEN 1.00
      ELSE 1.25
    END)
  FROM d
$$;

-- ============================
-- STEP 3: Ledger View (Per-Startup Timeline + Score)
-- ============================

CREATE OR REPLACE VIEW public.startup_phase_ledger AS
SELECT
  pc.startup_id,
  pc.id AS phase_change_id,
  pc.domain,
  pc.subtype,
  pc.detected_at,
  COALESCE(pc.effective_at, pc.detected_at) AS occurred_at,
  pc.magnitude,
  pc.irreversibility,
  pc.velocity,
  pc.coupling,
  pc.confidence,
  pc.directionality,
  public.phase_change_score(
    pc.magnitude,
    pc.irreversibility,
    pc.velocity,
    pc.coupling,
    pc.confidence,
    pc.directionality
  ) AS phase_score,
  pc.evidence
FROM public.startup_phase_changes pc
WHERE pc.is_active = true;

-- ============================
-- STEP 4: Rolling PVI (24h / 7d)
-- ============================

CREATE OR REPLACE VIEW public.startup_phase_velocity AS
WITH base AS (
  SELECT
    startup_id,
    occurred_at,
    phase_score,
    irreversibility,
    coupling,
    domain
  FROM public.startup_phase_ledger
),
roll AS (
  SELECT
    startup_id,

    -- 24h
    COUNT(*) FILTER (WHERE occurred_at >= now() - interval '24 hours') AS phase_events_24h,
    COALESCE(SUM(phase_score) FILTER (WHERE occurred_at >= now() - interval '24 hours'), 0) AS pvi_24h,

    -- 7d
    COUNT(*) FILTER (WHERE occurred_at >= now() - interval '7 days') AS phase_events_7d,
    COALESCE(SUM(phase_score) FILTER (WHERE occurred_at >= now() - interval '7 days'), 0) AS pvi_7d,

    -- irreversibility emphasis (7d)
    COALESCE(AVG(irreversibility) FILTER (WHERE occurred_at >= now() - interval '7 days'), 0) AS avg_irrev_7d,

    -- coupling emphasis (7d)
    COALESCE(AVG(coupling) FILTER (WHERE occurred_at >= now() - interval '7 days'), 0) AS avg_coupling_7d,

    -- multidimensionality: how many domains fired (7d)
    COUNT(DISTINCT domain) FILTER (WHERE occurred_at >= now() - interval '7 days') AS domains_7d
  FROM base
  GROUP BY startup_id
),
accel AS (
  SELECT
    r.*,
    -- Acceleration: compare short window density to long window density
    CASE
      WHEN r.pvi_7d <= 0 THEN 0
      ELSE (r.pvi_24h / (r.pvi_7d / 7.0))
    END AS pvi_accel_ratio
  FROM roll r
)
SELECT * FROM accel;

-- ============================
-- STEP 5: Goldilocks States (watch → warming → surge → breakout)
-- ============================

CREATE OR REPLACE VIEW public.startup_goldilocks_phase_triggers AS
SELECT
  spv.startup_id,
  spv.phase_events_24h,
  spv.pvi_24h,
  spv.phase_events_7d,
  spv.pvi_7d,
  spv.avg_irrev_7d,
  spv.avg_coupling_7d,
  spv.domains_7d,
  spv.pvi_accel_ratio,

  CASE
    WHEN spv.domains_7d >= 3
     AND spv.avg_irrev_7d >= 0.55
     AND spv.pvi_accel_ratio >= 2.5
     AND spv.pvi_7d >= 3.5
    THEN 'breakout'

    WHEN spv.domains_7d >= 2
     AND spv.avg_irrev_7d >= 0.45
     AND spv.pvi_accel_ratio >= 1.8
     AND spv.pvi_7d >= 2.3
    THEN 'surge'

    WHEN spv.domains_7d >= 2
     AND spv.pvi_7d >= 1.3
    THEN 'warming'

    WHEN spv.pvi_7d >= 0.6
    THEN 'watch'

    ELSE 'quiet'
  END AS goldilocks_phase_state

FROM public.startup_phase_velocity spv;

-- ============================
-- STEP 6: Phase Change Multiplier (PCM) - The GOD Compounding Effect
-- ============================

CREATE OR REPLACE FUNCTION public.phase_change_multiplier(
  pvi_7d numeric,
  domains_7d int,
  avg_irrev_7d numeric,
  pvi_accel_ratio numeric
) RETURNS numeric
LANGUAGE sql
IMMUTABLE
AS $$
  WITH x AS (
    SELECT
      GREATEST(0, COALESCE(pvi_7d, 0)) AS p7,
      GREATEST(0, COALESCE(domains_7d, 0)) AS d7,
      GREATEST(0, LEAST(1, COALESCE(avg_irrev_7d, 0))) AS irrev,
      GREATEST(0, COALESCE(pvi_accel_ratio, 0)) AS accel
  )
  SELECT
    -- Base multiplier starts near 1.0
    1.0
    -- PVI adds lift
    + LEAST(0.85, p7 * 0.12)
    -- Multidomain bonus
    + LEAST(0.40, GREATEST(0, d7 - 1) * 0.15)
    -- Irreversibility bonus
    + LEAST(0.35, irrev * 0.35)
    -- Acceleration bonus
    + LEAST(0.50, GREATEST(0, accel - 1) * 0.12)
  FROM x
$$;

-- A view that produces PCM per startup
CREATE OR REPLACE VIEW public.startup_phase_multiplier AS
SELECT
  t.startup_id,
  t.goldilocks_phase_state,
  t.pvi_7d,
  t.domains_7d,
  t.avg_irrev_7d,
  t.pvi_accel_ratio,
  public.phase_change_multiplier(t.pvi_7d, t.domains_7d, t.avg_irrev_7d, t.pvi_accel_ratio) AS pcm
FROM public.startup_goldilocks_phase_triggers t;

-- ============================
-- STEP 7: Phase Detection Queue (Async Processing)
-- ============================

CREATE TABLE IF NOT EXISTS public.phase_detection_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id uuid NOT NULL REFERENCES startup_uploads(id) ON DELETE CASCADE,
  
  trigger_source text NOT NULL, -- 'rss_update', 'github_commit', 'crunchbase_change', 'manual', 'inference_enrichment'
  trigger_data jsonb,
  
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  priority integer NOT NULL DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
  
  attempts integer NOT NULL DEFAULT 0,
  error_message text,
  
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_phase_queue_status_priority 
  ON public.phase_detection_queue(status, priority DESC, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_phase_queue_startup 
  ON public.phase_detection_queue(startup_id);

-- ============================
-- HELPER FUNCTIONS
-- ============================

-- Get phase timeline for a startup
CREATE OR REPLACE FUNCTION public.get_phase_timeline(startup_uuid uuid)
RETURNS TABLE (
  phase_id uuid,
  domain public.phase_domain,
  subtype text,
  occurred_at timestamptz,
  phase_score numeric,
  magnitude numeric,
  irreversibility numeric,
  velocity numeric,
  coupling numeric,
  directionality numeric,
  evidence jsonb
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    spl.phase_change_id,
    spl.domain,
    spl.subtype,
    spl.occurred_at,
    spl.phase_score,
    spl.magnitude,
    spl.irreversibility,
    spl.velocity,
    spl.coupling,
    spl.directionality,
    spl.evidence
  FROM public.startup_phase_ledger spl
  WHERE spl.startup_id = startup_uuid
  ORDER BY spl.occurred_at ASC;
END;
$$ LANGUAGE plpgsql;

-- Calculate phase-adjusted GOD score
CREATE OR REPLACE FUNCTION public.calculate_phase_adjusted_god(startup_uuid uuid)
RETURNS numeric AS $$
DECLARE
  base_god_score numeric;
  startup_pcm numeric;
  adjusted_score numeric;
BEGIN
  -- Get base GOD score
  SELECT total_god_score INTO base_god_score
  FROM startup_uploads
  WHERE id = startup_uuid;
  
  -- Get PCM (Phase Change Multiplier)
  SELECT COALESCE(pcm, 1.0) INTO startup_pcm
  FROM public.startup_phase_multiplier
  WHERE startup_id = startup_uuid;
  
  -- Calculate adjusted score: GOD × PCM
  adjusted_score := base_god_score * startup_pcm;
  
  RETURN adjusted_score;
END;
$$ LANGUAGE plpgsql;

-- ============================
-- GRANT PERMISSIONS
-- ============================

GRANT SELECT ON public.startup_phase_changes TO PUBLIC;
GRANT SELECT ON public.startup_phase_ledger TO PUBLIC;
GRANT SELECT ON public.startup_phase_velocity TO PUBLIC;
GRANT SELECT ON public.startup_goldilocks_phase_triggers TO PUBLIC;
GRANT SELECT ON public.startup_phase_multiplier TO PUBLIC;
GRANT SELECT ON public.phase_detection_queue TO PUBLIC;

-- ============================
-- MIGRATION COMPLETE
-- ============================
-- Next steps:
-- 1. Run this migration in Supabase SQL Editor
-- 2. Test with example inserts (see documentation)
-- 3. Build detectors (Website Diff, Human, Customer, Capital)
-- 4. Integrate Phase Timeline UI
-- 5. Add PCM to GOD score calculation
-- ============================
