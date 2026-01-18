-- ============================================================
-- Migration: Create share_links table for Elite share feature
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor > New Query)
-- ============================================================

-- Create share_links table
CREATE TABLE IF NOT EXISTS public.share_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    startup_id UUID NOT NULL,
    payload JSONB NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast token lookups
CREATE INDEX IF NOT EXISTS idx_share_links_token ON public.share_links(token);

-- Index for user's share links
CREATE INDEX IF NOT EXISTS idx_share_links_user ON public.share_links(user_id);

-- Index for expired link cleanup
CREATE INDEX IF NOT EXISTS idx_share_links_expires ON public.share_links(expires_at);

-- Enable RLS
ALTER TABLE public.share_links ENABLE ROW LEVEL SECURITY;

-- Users can view their own share links
CREATE POLICY "Users can view own share links" ON public.share_links
    FOR SELECT USING (auth.uid() = user_id);

-- Users can create share links
CREATE POLICY "Users can create share links" ON public.share_links
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can delete their own share links
CREATE POLICY "Users can delete own share links" ON public.share_links
    FOR DELETE USING (auth.uid() = user_id);

-- Public read access via token (for unauthenticated share page)
-- Note: This is handled by service role key in server, not RLS

-- ============================================================
-- OPTIONAL: Scheduled cleanup of expired links
-- Run this periodically or set up a cron job
-- ============================================================
-- DELETE FROM public.share_links WHERE expires_at < NOW();
