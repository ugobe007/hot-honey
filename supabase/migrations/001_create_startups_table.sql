-- ================================================
-- Hot Money Honey - Startups Table Migration
-- ================================================
-- Run this in your Supabase SQL Editor
-- (Dashboard > SQL Editor > New Query)

-- Create startups table
CREATE TABLE IF NOT EXISTS public.startups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  tagline TEXT NOT NULL,
  pitch TEXT NOT NULL,
  five_points TEXT[] NOT NULL, -- PostgreSQL array of 5 strings
  secret_fact TEXT DEFAULT 'AI-researched startup from Hot Money Honey',
  logo TEXT,
  website TEXT NOT NULL UNIQUE,
  validated BOOLEAN DEFAULT false,
  scraped_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on website for fast lookups
CREATE INDEX IF NOT EXISTS idx_startups_website ON public.startups(website);

-- Create index on validated status
CREATE INDEX IF NOT EXISTS idx_startups_validated ON public.startups(validated);

-- Create index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_startups_created_at ON public.startups(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.startups ENABLE ROW LEVEL SECURITY;

-- Policy: Allow public read access
CREATE POLICY "Allow public read access" 
ON public.startups 
FOR SELECT 
TO public 
USING (true);

-- Policy: Allow authenticated users to insert
CREATE POLICY "Allow authenticated insert" 
ON public.startups 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Policy: Allow authenticated users to update
CREATE POLICY "Allow authenticated update" 
ON public.startups 
FOR UPDATE 
TO authenticated 
USING (true);

-- Policy: Allow authenticated users to delete
CREATE POLICY "Allow authenticated delete" 
ON public.startups 
FOR DELETE 
TO authenticated 
USING (true);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.startups
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ================================================
-- Sample query to verify table
-- ================================================
-- SELECT * FROM public.startups ORDER BY created_at DESC LIMIT 10;

-- ================================================
-- Query to export as TypeScript code
-- ================================================
-- SELECT 
--   '  {' || CHR(10) ||
--   '    id: ''' || id || ''',' || CHR(10) ||
--   '    name: ''' || name || ''',' || CHR(10) ||
--   '    tagline: ''' || tagline || ''',' || CHR(10) ||
--   '    pitch: ''' || pitch || ''',' || CHR(10) ||
--   '    fivePoints: ' || array_to_json(five_points)::text || ',' || CHR(10) ||
--   '    secretFact: ''' || secret_fact || ''',' || CHR(10) ||
--   '    logo: ''' || logo || ''',' || CHR(10) ||
--   '    website: ''' || website || ''',' || CHR(10) ||
--   '  }' as typescript_object
-- FROM public.startups
-- WHERE validated = true
-- ORDER BY created_at DESC;
