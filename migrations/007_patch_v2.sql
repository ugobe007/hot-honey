-- ============================================================
-- PATCH v2: Force add missing columns (no IF NOT EXISTS)
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. email_unsubscribes: add user_id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'email_unsubscribes' 
        AND column_name = 'user_id'
    ) THEN
        ALTER TABLE public.email_unsubscribes ADD COLUMN user_id UUID;
    END IF;
END $$;

-- 2. notifications: add email columns
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'notifications' 
        AND column_name = 'email_status'
    ) THEN
        ALTER TABLE public.notifications ADD COLUMN email_status TEXT DEFAULT 'pending';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'notifications' 
        AND column_name = 'email_sent_at'
    ) THEN
        ALTER TABLE public.notifications ADD COLUMN email_sent_at TIMESTAMPTZ;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'notifications' 
        AND column_name = 'email_error'
    ) THEN
        ALTER TABLE public.notifications ADD COLUMN email_error TEXT;
    END IF;
END $$;

-- 3. profiles: add email alert settings
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'email_alerts_enabled'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN email_alerts_enabled BOOLEAN DEFAULT true;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'digest_enabled'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN digest_enabled BOOLEAN DEFAULT false;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'digest_time_local'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN digest_time_local TEXT DEFAULT '08:00';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'timezone'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN timezone TEXT DEFAULT 'America/Los_Angeles';
    END IF;
END $$;

-- 4. Create indexes (safe)
CREATE INDEX IF NOT EXISTS idx_email_unsubscribes_user ON public.email_unsubscribes(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_email_pending ON public.notifications(email_status, created_at);

-- 5. Advisory lock functions
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

-- Verify columns were added
SELECT 
    table_name, 
    column_name 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name IN ('email_unsubscribes', 'notifications', 'profiles')
AND column_name IN ('user_id', 'email_status', 'email_sent_at', 'email_error', 'email_alerts_enabled', 'digest_enabled', 'digest_time_local', 'timezone')
ORDER BY table_name, column_name;
