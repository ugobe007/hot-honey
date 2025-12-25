-- Check for triggers on startup_uploads
SELECT trigger_name, event_manipulation, action_statement 
FROM information_schema.triggers 
WHERE event_object_table = 'startup_uploads';

-- Check column default
SELECT column_name, column_default 
FROM information_schema.columns 
WHERE table_name = 'startup_uploads' AND column_name = 'total_god_score';
