-- Confirm schema: Check distinct values for enums and event types
-- Run this to verify before creating weighted view

-- Check distinct investor_tier values
SELECT DISTINCT investor_tier, COUNT(*) 
FROM investor_events 
GROUP BY investor_tier 
ORDER BY investor_tier;

-- Check distinct archetype values
SELECT DISTINCT archetype, COUNT(*) 
FROM investor_events 
GROUP BY archetype 
ORDER BY archetype;

-- Check distinct event_type values
SELECT DISTINCT event_type, COUNT(*) 
FROM investor_events 
GROUP BY event_type 
ORDER BY event_type;

-- Check column types (verify if text or enum)
SELECT 
  column_name,
  data_type,
  udt_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'investor_events'
  AND column_name IN ('investor_tier', 'archetype', 'event_type');
