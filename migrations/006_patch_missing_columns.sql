-- ============================================================
-- PATCH MIGRATION: Add missing columns to existing tables
-- Run this in Supabase SQL Editor
-- Safe: only adds columns, never drops anything
-- ============================================================

-- 1. PATCH email_unsubscribes: add user_id column
ALTER TABLE public.email_unsubscribes
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_email_unsubscribes_user ON public.email_unsubscribes(user_id);

ALTER TABLE public.email_unsubscribes ENABLE ROW LEVEL SECURITY;

-- 2. PATCH notifications: add email tracking columns
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS email_status TEXT DEFAULT 'pending';

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMPTZ;

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS email_error TEXT;

CREATE INDEX IF NOT EXISTS idx_notifications_email_pending
  ON public.notifications(email_status, created_at)
  WHERE email_status = 'pending';

CREATE INDEX IF NOT EXISTS idx_notifications_user_sent_today
  ON public.notifications(user_id, email_status, email_sent_at)
  WHERE email_status = 'sent';

-- 3. PATCH profiles: add email alert settings
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS email_alerts_enabled BOOLEAN DEFAULT true;

ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS digest_enabled BOOLEAN DEFAULT false;

ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS digest_time_local TEXT DEFAULT '08:00';

ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/Los_Angeles';

-- 4. Advisory lock helpers (for multi-instance safety)
CREATE OR REPLACE FUNCTION public.pg_try_advisory_lock(key BIGINT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN pg_try_advisory_lock(key);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.pg_advisory_unlock(key BIGINT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN pg_advisory_unlock(key);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create startup_alert_state if missing
CREATE TABLE IF NOT EXISTS public.startup_alert_state (
    startup_id UUID PRIMARY KEY,
    last_investor_state_sector TEXT,
    last_momentum_signal NUMERIC,
    last_evidence_signal NUMERIC,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_startup_alert_state_updated ON public.startup_alert_state(updated_at DESC);

-- Done!
SELECT 'Patch complete! Added missing columns to email_unsubscribes, notifications, profiles' AS status;
