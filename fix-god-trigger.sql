-- STEP 1: Find and list all triggers on startup_uploads
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'startup_uploads';

-- STEP 2: Drop the trigger that's overriding GOD scores
-- (Run this after identifying the trigger name from Step 1)
-- DROP TRIGGER IF EXISTS calculate_god_score_trigger ON startup_uploads;
-- DROP TRIGGER IF EXISTS set_god_score_trigger ON startup_uploads;
-- DROP TRIGGER IF EXISTS update_god_score_trigger ON startup_uploads;

-- STEP 3: Or modify the trigger to only run when total_god_score is NULL
-- CREATE OR REPLACE FUNCTION calculate_god_score()
-- RETURNS TRIGGER AS $$
-- BEGIN
--   IF NEW.total_god_score IS NULL THEN
--     NEW.total_god_score := 40; -- default
--   END IF;
--   RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql;
