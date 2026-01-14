-- Explore schema: Tables and columns for investor_events and pythia_speech_snippets
-- Run this in Supabase SQL editor to see current structure

-- 1. List all tables in public schema
SELECT 
  table_schema,
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('investor_events', 'pythia_speech_snippets', 'startup_uploads')
ORDER BY table_name;

-- 2. Get columns for investor_events
SELECT 
  column_name,
  data_type,
  udt_name,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'investor_events'
ORDER BY ordinal_position;

-- 3. Get columns for pythia_speech_snippets
SELECT 
  column_name,
  data_type,
  udt_name,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'pythia_speech_snippets'
ORDER BY ordinal_position;

-- 4. Check for enum types (if any columns use enums)
SELECT 
  t.typname AS enum_name,
  e.enumlabel AS enum_value
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE t.typname LIKE '%tier%' OR t.typname LIKE '%event%' OR t.typname LIKE '%status%'
ORDER BY t.typname, e.enumsortorder;

-- 5. Sample data from investor_events (first 5 rows to see structure)
SELECT * FROM investor_events LIMIT 5;
