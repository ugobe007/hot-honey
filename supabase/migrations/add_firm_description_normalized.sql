-- Add firm_description_normalized column to investors table
-- This column stores standardized, third-person descriptions for consistent matching/display
-- The investment_firm_description column keeps the raw/authentic voice

ALTER TABLE investors 
ADD COLUMN IF NOT EXISTS firm_description_normalized TEXT;

-- Add comment for documentation
COMMENT ON COLUMN investors.firm_description_normalized IS 'Standardized, third-person firm description following a consistent format. Used for matching and display. The investment_firm_description column contains the raw/authentic voice.';

-- Create index for faster searches (optional)
CREATE INDEX IF NOT EXISTS idx_investors_firm_description_normalized ON investors(firm_description_normalized) WHERE firm_description_normalized IS NOT NULL;

-- Verify column was added
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'investors' 
  AND column_name = 'firm_description_normalized';


