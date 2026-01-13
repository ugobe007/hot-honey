-- BLOCK A: Indexes for FOMO pipeline performance
-- Assumes base table: public.investor_events (with startup_id, investor_id, occurred_at)

CREATE INDEX IF NOT EXISTS investor_events_startup_time_idx
  ON public.investor_events (startup_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS investor_events_time_idx
  ON public.investor_events (occurred_at DESC);

CREATE INDEX IF NOT EXISTS investor_events_investor_time_idx
  ON public.investor_events (investor_id, occurred_at DESC);

-- If you filter/group by investor_tier often:
CREATE INDEX IF NOT EXISTS investor_events_startup_tier_time_idx
  ON public.investor_events (startup_id, investor_tier, occurred_at DESC);

-- Verification (planner should prefer indexes for time-bounded queries)
EXPLAIN ANALYZE
SELECT COUNT(*)
FROM public.investor_events
WHERE occurred_at >= NOW() - INTERVAL '24 hours';
