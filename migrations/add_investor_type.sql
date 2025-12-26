-- Add 'type' column to investors table
-- Values: 'VC Firm', 'Angel', 'Accelerator', 'Corporate VC', 'Family Office', 'VC'
ALTER TABLE investors ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'VC';

-- Update existing investors based on their characteristics
-- Set firms with "Capital", "Ventures", "Partners" in name as VC Firm
UPDATE investors 
SET type = 'VC Firm' 
WHERE type IS NULL OR type = 'VC'
  AND (
    firm ILIKE '%capital%' OR 
    firm ILIKE '%ventures%' OR 
    firm ILIKE '%partners%' OR
    name ILIKE '%capital%' OR
    name ILIKE '%ventures%'
  );

-- Set accelerators
UPDATE investors 
SET type = 'Accelerator' 
WHERE type = 'VC'
  AND (
    firm ILIKE '%accelerator%' OR 
    firm ILIKE '%combinator%' OR
    firm ILIKE '%techstars%' OR
    firm ILIKE '%500%startups%' OR
    name ILIKE '%accelerator%' OR
    name ILIKE '%combinator%'
  );

-- Set corporate VCs
UPDATE investors 
SET type = 'Corporate VC' 
WHERE type = 'VC'
  AND (
    firm ILIKE '%google%ventures%' OR 
    firm ILIKE '%intel%capital%' OR
    firm ILIKE '%salesforce%' OR
    firm ILIKE '%microsoft%' OR
    name ILIKE '%corporate%'
  );

-- Angels are typically individual names without firm patterns
UPDATE investors 
SET type = 'Angel' 
WHERE type = 'VC'
  AND firm IS NOT NULL
  AND firm = name
  AND NOT (
    name ILIKE '%capital%' OR 
    name ILIKE '%ventures%' OR
    name ILIKE '%partners%' OR
    name ILIKE '%fund%'
  );
