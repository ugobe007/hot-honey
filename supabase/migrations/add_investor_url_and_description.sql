-- Add url and investment_firm_description columns to investors table
-- Run this in Supabase SQL Editor or via migration tool

-- Add url column for website URL
ALTER TABLE investors 
ADD COLUMN IF NOT EXISTS url TEXT;

-- Add investment_firm_description column for firm description
ALTER TABLE investors 
ADD COLUMN IF NOT EXISTS investment_firm_description TEXT;

-- Add comments for documentation
COMMENT ON COLUMN investors.url IS 'Primary website URL for the investor/firm';
COMMENT ON COLUMN investors.investment_firm_description IS 'Description of the investment firm, typically scraped from their website or manually curated';

-- Create index on url for faster lookups (optional but helpful)
CREATE INDEX IF NOT EXISTS idx_investors_url ON investors(url) WHERE url IS NOT NULL;

-- Verify columns were added
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'investors' 
  AND column_name IN ('url', 'investment_firm_description');


