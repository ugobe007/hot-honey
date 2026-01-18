-- ============================================================
-- 009_email_digests.sql
-- Track daily digest sends (prevents duplicate emails for same window)
-- ============================================================

-- Track digest sends so we don't resend the same window
CREATE TABLE IF NOT EXISTS public.email_digests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  digest_date DATE NOT NULL,              -- in user's local date
  window_start TIMESTAMPTZ NOT NULL,
  window_end TIMESTAMPTZ NOT NULL,
  notification_ids UUID[] NOT NULL DEFAULT '{}'::uuid[],
  email_status TEXT NOT NULL DEFAULT 'pending', -- pending|sent|failed|skipped
  email_sent_at TIMESTAMPTZ,
  email_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, digest_date)
);

CREATE INDEX IF NOT EXISTS idx_email_digests_status ON public.email_digests(email_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_digests_user ON public.email_digests(user_id, created_at DESC);

-- Add last_digest_sent_at column if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'last_digest_sent_at'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN last_digest_sent_at TIMESTAMPTZ;
  END IF;
END $$;

-- RLS policies
ALTER TABLE public.email_digests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own digests" ON public.email_digests;
CREATE POLICY "Users can read own digests"
  ON public.email_digests FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role full access digests" ON public.email_digests;
CREATE POLICY "Service role full access digests"
  ON public.email_digests FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================
SELECT 'Digest tables ready: email_digests' AS status;
