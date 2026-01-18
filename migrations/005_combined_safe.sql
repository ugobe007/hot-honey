-- ============================================================
-- COMBINED SAFE MIGRATION (Profiles + Alerts + Email)
-- Run this single file in Supabase SQL Editor
-- Handles all edge cases and existing tables
-- ============================================================

-- ============================================================
-- PART 1: PROFILES TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    stripe_customer_id TEXT UNIQUE,
    stripe_subscription_id TEXT,
    plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'elite')),
    plan_status TEXT DEFAULT 'active' CHECK (plan_status IN ('active', 'canceled', 'past_due', 'trialing', 'incomplete')),
    current_period_end TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add email columns for alerts (idempotent)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email_alerts_enabled BOOLEAN DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS digest_enabled BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS digest_time_local TEXT DEFAULT '08:00';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/Los_Angeles';

CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer ON public.profiles(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_profiles_plan ON public.profiles(plan);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, plan)
    VALUES (NEW.id, NEW.email, 'free')
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill existing users
INSERT INTO public.profiles (id, email, plan)
SELECT id, email, 'free' FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- PART 2: WATCHLISTS TABLE
-- ============================================================

-- Check if table exists, if not create it, if yes add missing columns
DO $$
BEGIN
    -- Create table if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'watchlists') THEN
        CREATE TABLE public.watchlists (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            startup_id UUID NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
    ELSE
        -- Table exists, add missing columns
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'watchlists' AND column_name = 'id') THEN
            ALTER TABLE public.watchlists ADD COLUMN id UUID DEFAULT gen_random_uuid();
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'watchlists' AND column_name = 'user_id') THEN
            ALTER TABLE public.watchlists ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'watchlists' AND column_name = 'startup_id') THEN
            ALTER TABLE public.watchlists ADD COLUMN startup_id UUID;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'watchlists' AND column_name = 'created_at') THEN
            ALTER TABLE public.watchlists ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
        END IF;
    END IF;
    
    -- Add unique constraint only if it doesn't exist AND both columns exist
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'watchlists' AND column_name = 'user_id')
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'watchlists' AND column_name = 'startup_id')
       AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'watchlists_user_startup_unique')
    THEN
        ALTER TABLE public.watchlists ADD CONSTRAINT watchlists_user_startup_unique UNIQUE (user_id, startup_id);
    END IF;
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

-- ============================================================
-- PART 3: NOTIFICATIONS TABLE (drop and recreate cleanly)
-- ============================================================

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
    email_status TEXT DEFAULT 'pending',
    email_sent_at TIMESTAMPTZ,
    email_error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON public.notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_email_pending ON public.notifications(email_status, created_at) WHERE email_status = 'pending';
CREATE INDEX IF NOT EXISTS idx_notifications_user_sent_today ON public.notifications(user_id, email_status, email_sent_at) WHERE email_status = 'sent';

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

-- ============================================================
-- PART 4: STARTUP ALERT STATE TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.startup_alert_state (
    startup_id UUID PRIMARY KEY,
    last_investor_state_sector TEXT,
    last_momentum_signal NUMERIC,
    last_evidence_signal NUMERIC,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_startup_alert_state_updated ON public.startup_alert_state(updated_at DESC);

-- ============================================================
-- PART 5: EMAIL UNSUBSCRIBES TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.email_unsubscribes (
    email TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reason TEXT,
    unsubscribed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_unsubscribes_user ON public.email_unsubscribes(user_id);
ALTER TABLE public.email_unsubscribes ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PART 6: HELPER FUNCTIONS
-- ============================================================

-- Check if notification was sent recently
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

-- Get unread count
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

-- Advisory lock helpers (for multi-instance safety)
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

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- DONE!
-- ============================================================

SELECT 'Migration complete! Tables created: profiles, watchlists, notifications, startup_alert_state, email_unsubscribes' AS status;
