-- Fix RLS on discovered_startups to allow service role inserts
-- This ensures service role can insert even with RLS enabled

-- 1. Check current RLS status
SELECT 
  'BEFORE FIX' as check_type,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'discovered_startups'
  AND schemaname = 'public';

-- 2. Ensure service_role can INSERT (service role bypasses RLS by default, but let's be explicit)
-- Service role should automatically bypass RLS, but let's verify policies allow it

-- Drop existing INSERT policy if it's restrictive
DROP POLICY IF EXISTS "Allow service role insert on discovered_startups" ON public.discovered_startups;

-- Create policy that allows service role to insert
CREATE POLICY "Allow service role insert on discovered_startups"
ON public.discovered_startups
FOR INSERT
TO service_role
WITH CHECK (true);

-- Also ensure authenticated users can insert (if needed)
DROP POLICY IF EXISTS "Allow authenticated insert on discovered_startups" ON public.discovered_startups;

CREATE POLICY "Allow authenticated insert on discovered_startups"
ON public.discovered_startups
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow public read (for SELECT queries)
DROP POLICY IF EXISTS "Allow public read on discovered_startups" ON public.discovered_startups;

CREATE POLICY "Allow public read on discovered_startups"
ON public.discovered_startups
FOR SELECT
USING (true);

-- 3. Verify policies after fix
SELECT 
  'AFTER FIX' as check_type,
  policyname,
  roles,
  cmd as command
FROM pg_policies
WHERE tablename = 'discovered_startups'
  AND schemaname = 'public'
ORDER BY policyname;
