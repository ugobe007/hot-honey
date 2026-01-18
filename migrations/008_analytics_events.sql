-- ============================================================
-- 008_analytics_events.sql
-- Lightweight product analytics + attribution
-- ============================================================

CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT,
  event_name TEXT NOT NULL,
  source TEXT,              -- 'web', 'server', 'email', 'cron'
  page TEXT,                -- '/pricing', '/matches', etc.
  referrer TEXT,
  entity_type TEXT,         -- 'startup', 'investor', 'notification', 'share'
  entity_id TEXT,           -- uuid or slug
  plan TEXT,                -- snapshot at event time
  properties JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_created_at ON public.events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_user_created ON public.events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_name_created ON public.events(event_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_entity ON public.events(entity_type, entity_id, created_at DESC);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Users can insert their own client events
DROP POLICY IF EXISTS "Users can insert own events" ON public.events;
CREATE POLICY "Users can insert own events"
  ON public.events FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Users can read their own events (for debugging)
DROP POLICY IF EXISTS "Users can read own events" ON public.events;
CREATE POLICY "Users can read own events"
  ON public.events FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can do anything (for server-side tracking)
DROP POLICY IF EXISTS "Service role full access" ON public.events;
CREATE POLICY "Service role full access"
  ON public.events FOR ALL
  USING (auth.role() = 'service_role');

-- Attribution helper: store last-touch per user
CREATE TABLE IF NOT EXISTS public.user_attribution (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  last_touch_event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  last_touch_name TEXT,
  last_touch_source TEXT,
  last_touch_created_at TIMESTAMPTZ,
  last_touch_properties JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_attr_updated ON public.user_attribution(updated_at DESC);

ALTER TABLE public.user_attribution ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own attribution" ON public.user_attribution;
CREATE POLICY "Users can read own attribution"
  ON public.user_attribution FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role full access attribution" ON public.user_attribution;
CREATE POLICY "Service role full access attribution"
  ON public.user_attribution FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================
SELECT 'Analytics tables ready: events, user_attribution' AS status;
