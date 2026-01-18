-- ============================================================
-- Migration: Email Alerts (Prompt 16 + 16.5 + 16.6)
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. ADD EMAIL SETTINGS COLUMNS TO PROFILES
-- These control email alert behavior for Elite users

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS email_alerts_enabled BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS digest_enabled BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS digest_time_local TEXT DEFAULT '08:00';

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/Los_Angeles';

-- 2. ADD EMAIL TRACKING COLUMNS TO NOTIFICATIONS
-- Track email delivery status per notification
-- Prompt 16.5: Added 'sending' status for claim pattern

-- Add column (if not exists, without constraint first)
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS email_status TEXT DEFAULT 'pending';

-- Drop old constraint if exists and add new one with 'sending' status
DO $$ BEGIN
    ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_email_status_check;
    ALTER TABLE public.notifications ADD CONSTRAINT notifications_email_status_check 
        CHECK (email_status IN ('pending', 'sending', 'sent', 'failed', 'skipped'));
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMPTZ;

ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS email_error TEXT;

-- Index for efficient email delivery queries
CREATE INDEX IF NOT EXISTS idx_notifications_email_pending 
ON public.notifications(email_status, created_at) 
WHERE email_status = 'pending';

-- Prompt 16.6: Index for daily cap queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_sent_today
ON public.notifications(user_id, email_status, email_sent_at)
WHERE email_status = 'sent';

-- 3. CREATE EMAIL UNSUBSCRIBES TABLE
-- Stores global unsubscribes (takes precedence over profile settings)

CREATE TABLE IF NOT EXISTS public.email_unsubscribes (
    email TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reason TEXT,
    unsubscribed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_unsubscribes_user 
ON public.email_unsubscribes(user_id);

-- RLS: Service role only (no direct user access needed)
ALTER TABLE public.email_unsubscribes ENABLE ROW LEVEL SECURITY;

-- Service role can manage (bypasses RLS anyway)
-- No user policies needed - unsubscribe happens via server

-- 4. HELPER FUNCTION: Check if user should receive email
CREATE OR REPLACE FUNCTION public.should_send_email_alert(
    p_user_id UUID,
    p_email TEXT
) RETURNS BOOLEAN AS $$
DECLARE
    v_plan TEXT;
    v_email_enabled BOOLEAN;
    v_unsubscribed BOOLEAN;
BEGIN
    -- Check if email is globally unsubscribed
    SELECT EXISTS(
        SELECT 1 FROM public.email_unsubscribes 
        WHERE email = p_email
    ) INTO v_unsubscribed;
    
    IF v_unsubscribed THEN
        RETURN FALSE;
    END IF;
    
    -- Check profile settings
    SELECT plan, email_alerts_enabled 
    INTO v_plan, v_email_enabled
    FROM public.profiles
    WHERE id = p_user_id;
    
    -- Must be Elite with email alerts enabled
    RETURN v_plan = 'elite' AND COALESCE(v_email_enabled, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. HELPER FUNCTION: Get pending email notifications with user info
CREATE OR REPLACE FUNCTION public.get_pending_email_notifications(
    p_limit INTEGER DEFAULT 50
) RETURNS TABLE (
    notification_id UUID,
    user_id UUID,
    user_email TEXT,
    kind TEXT,
    entity_id TEXT,
    title TEXT,
    body TEXT,
    payload JSONB,
    created_at TIMESTAMPTZ,
    plan TEXT,
    email_alerts_enabled BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        n.id AS notification_id,
        n.user_id,
        p.email AS user_email,
        n.kind,
        n.entity_id,
        n.title,
        n.body,
        n.payload,
        n.created_at,
        p.plan,
        p.email_alerts_enabled
    FROM public.notifications n
    JOIN public.profiles p ON p.id = n.user_id
    WHERE n.email_status = 'pending'
      AND n.kind = 'startup_hot'
      AND n.created_at > NOW() - INTERVAL '48 hours'
      AND p.plan = 'elite'
      AND COALESCE(p.email_alerts_enabled, true) = true
      AND NOT EXISTS (
          SELECT 1 FROM public.email_unsubscribes u 
          WHERE u.email = p.email
      )
    ORDER BY n.created_at ASC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. UPDATE PROFILES UPDATED_AT ON CHANGE
CREATE OR REPLACE FUNCTION public.update_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_profiles_updated_at();

-- 7. PROMPT 16.5: Advisory lock helper functions for multi-instance safety
-- Wraps Postgres advisory locks for use via Supabase RPC

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

SELECT 'Email alerts migration complete (with 16.5 + 16.6 hardening)!' AS status;
