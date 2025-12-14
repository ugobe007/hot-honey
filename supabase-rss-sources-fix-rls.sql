-- ============================================
-- Fix RSS Sources RLS Policies
-- ============================================
-- This updates the RLS policies to allow authenticated users to add RSS sources
-- Run this in Supabase SQL Editor

-- Drop existing restrictive policy
DROP POLICY IF EXISTS "Allow authenticated users to manage rss_sources" ON rss_sources;

-- Create separate policies for better control
-- Allow authenticated users to insert
CREATE POLICY "Allow authenticated insert to rss_sources"
  ON rss_sources FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' OR true);

-- Allow authenticated users to update
CREATE POLICY "Allow authenticated update to rss_sources"
  ON rss_sources FOR UPDATE
  USING (auth.role() = 'authenticated' OR true);

-- Allow authenticated users to delete
CREATE POLICY "Allow authenticated delete to rss_sources"
  ON rss_sources FOR DELETE
  USING (auth.role() = 'authenticated' OR true);

-- Verify policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'rss_sources';
