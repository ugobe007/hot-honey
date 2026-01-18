-- ============================================================
-- Migration: Alerts Foundation (SAFE - handles existing tables)
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. WATCHLISTS TABLE
CREATE TABLE IF NOT EXISTS public.watchlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    startup_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add unique constraint if not exists
DO $$ BEGIN
    ALTER TABLE public.watchlists ADD CONSTRAINT watchlists_user_startup_unique UNIQUE (user_id, startup_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_watchlists_user ON public.watchlists(user_id);
CREATE INDEX IF NOT EXISTS idx_watchlists_startup ON public.watchlists(startup_id);
ALTER TABLE public.watchlists ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own watchlist" ON public.watchlists;
CREATE POLICY "Users can view own watchlist" ON public.watchlists FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can add to own watchlist" ON public.watchlists;
CREATE POLICY "Users can add to own watchlist" ON public.watchlists FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can remove from own watchlist" ON public.watchlists;
CREATE POLICY "Users can remove from own watchlist" ON public.watchlists FOR DELETE USING (auth.uid() = user_id);

-- 2. DROP AND RECREATE NOTIFICATIONS TABLE (clean slate)
DROP TABLE IF EXISTS public.notifications CASCADE;

CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    kind TEXT NOT NULL DEFAULT 'system',
    entity_type TEXT NOT NULL DEFAULT 'startup',
    entity_id TEXT,
    title TEXT NOT NULL DEFAULT '',
    body TEXT NOT NULL DEFAULT '',
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_read ON public.notifications(user_id, is_read);
CREATE INDEX idx_notifications_created ON public.notifications(created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

-- 3. STARTUP_ALERT_STATE TABLE
CREATE TABLE IF NOT EXISTS public.startup_alert_state (
    startup_id UUID PRIMARY KEY,
    last_investor_state_sector TEXT,
    last_momentum_signal NUMERIC,
    last_evidence_signal NUMERIC,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_startup_alert_state_updated ON public.startup_alert_state(updated_at DESC);

-- 4. HELPER FUNCTIONS
CREATE OR REPLACE FUNCTION public.notification_sent_recently(
    p_user_id UUID,
    p_kind TEXT,
    p_entity_id TEXT,
    p_hours INTEGER DEFAULT 24
) RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.notifications
        WHERE user_id = p_user_id
          AND kind = p_kind
          AND entity_id = p_entity_id
          AND created_at > NOW() - (p_hours || ' hours')::INTERVAL
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_unread_notification_count(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    count_val INTEGER;
BEGIN
    SELECT COUNT(*) INTO count_val
    FROM public.notifications
    WHERE user_id = p_user_id AND is_read = FALSE;
    RETURN count_val;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT 'Migration complete!' AS status;
