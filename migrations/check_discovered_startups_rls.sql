-- Check RLS policies on discovered_startups table
-- Run this to see what RLS policies exist and if they're blocking inserts

-- 1. Check if RLS is enabled
SELECT 
  'RLS STATUS' as check_type,
  tablename,
  rowsecurity as rls_enabled,
  CASE 
    WHEN rowsecurity THEN 'RLS Enabled'
    ELSE 'RLS Disabled'
  END as status
FROM pg_tables
WHERE tablename = 'discovered_startups'
  AND schemaname = 'public';

-- 2. List all RLS policies on discovered_startups
SELECT 
  'RLS POLICIES' as check_type,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd as command,
  qual as using_clause,
  with_check as with_check_clause
FROM pg_policies
WHERE tablename = 'discovered_startups'
  AND schemaname = 'public';

-- 3. Check table permissions
SELECT 
  'TABLE PERMISSIONS' as check_type,
  grantee,
  privilege_type
FROM information_schema.role_table_grants
WHERE table_name = 'discovered_startups'
  AND table_schema = 'public'
  AND grantee IN ('anon', 'authenticated', 'service_role', 'postgres');
