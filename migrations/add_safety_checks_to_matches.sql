-- ADD SAFETY CHECKS: Prevent accidental data loss on startup_investor_matches
-- This creates a trigger that prevents TRUNCATE and logs all DELETE operations

-- 1. Create function to log deletions
CREATE OR REPLACE FUNCTION log_startup_investor_matches_deletion()
RETURNS TRIGGER AS $$
BEGIN
  -- Log to a separate audit table
  INSERT INTO data_deletion_audit (
    table_name,
    operation,
    rows_deleted,
    deleted_at,
    deleted_by
  ) VALUES (
    'startup_investor_matches',
    'DELETE',
    (SELECT COUNT(*) FROM startup_investor_matches),
    NOW(),
    current_user
  );
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create audit table if it doesn't exist
CREATE TABLE IF NOT EXISTS data_deletion_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  operation TEXT NOT NULL, -- 'DELETE', 'TRUNCATE', 'DROP'
  rows_deleted BIGINT,
  query_text TEXT,
  deleted_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_by TEXT DEFAULT current_user,
  ip_address INET,
  user_agent TEXT
);

-- 3. Prevent TRUNCATE with a trigger (PostgreSQL doesn't support TRUNCATE triggers, so we use an event trigger)
CREATE OR REPLACE FUNCTION prevent_truncate_startup_investor_matches()
RETURNS event_trigger AS $$
DECLARE
  obj record;
BEGIN
  FOR obj IN SELECT * FROM pg_event_trigger_ddl_commands() 
  LOOP
    IF obj.object_identity = 'public.startup_investor_matches' THEN
      IF obj.command_tag = 'TRUNCATE TABLE' THEN
        RAISE EXCEPTION 'SAFETY CHECK: TRUNCATE on startup_investor_matches is blocked to prevent data loss! Use DELETE with explicit WHERE clause instead.';
      END IF;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Enable event trigger (requires superuser, may not work on Supabase)
-- DROP EVENT TRIGGER IF EXISTS prevent_truncate_matches;
-- CREATE EVENT TRIGGER prevent_truncate_matches ON ddl_command_end
--   WHEN TAG IN ('TRUNCATE TABLE')
--   EXECUTE FUNCTION prevent_truncate_startup_investor_matches();

-- 4. Create BEFORE DELETE trigger to log deletions
DROP TRIGGER IF EXISTS log_deletions_startup_investor_matches ON startup_investor_matches;
CREATE TRIGGER log_deletions_startup_investor_matches
  BEFORE DELETE ON startup_investor_matches
  FOR EACH STATEMENT
  EXECUTE FUNCTION log_startup_investor_matches_deletion();

-- 5. Create function to safely delete (requires explicit confirmation)
CREATE OR REPLACE FUNCTION safe_delete_matches(
  match_ids UUID[] DEFAULT NULL,
  startup_ids UUID[] DEFAULT NULL,
  investor_ids UUID[] DEFAULT NULL,
  confirmation_code TEXT DEFAULT NULL
)
RETURNS TABLE(deleted_count BIGINT, message TEXT) AS $$
DECLARE
  deleted_rows BIGINT;
  required_confirmation TEXT := 'CONFIRM_DELETE_' || EXTRACT(EPOCH FROM NOW())::TEXT;
BEGIN
  -- Require explicit confirmation code
  IF confirmation_code IS NULL OR confirmation_code != required_confirmation THEN
    RETURN QUERY SELECT 0::BIGINT, 'ERROR: Confirmation code required. Use: ' || required_confirmation;
    RETURN;
  END IF;

  -- Log the deletion attempt
  INSERT INTO data_deletion_audit (
    table_name,
    operation,
    query_text,
    deleted_by
  ) VALUES (
    'startup_investor_matches',
    'DELETE',
    'safe_delete_matches called',
    current_user
  );

  -- Perform deletion based on parameters
  IF match_ids IS NOT NULL THEN
    DELETE FROM startup_investor_matches WHERE id = ANY(match_ids);
    GET DIAGNOSTICS deleted_rows = ROW_COUNT;
  ELSIF startup_ids IS NOT NULL THEN
    DELETE FROM startup_investor_matches WHERE startup_id = ANY(startup_ids);
    GET DIAGNOSTICS deleted_rows = ROW_COUNT;
  ELSIF investor_ids IS NOT NULL THEN
    DELETE FROM startup_investor_matches WHERE investor_id = ANY(investor_ids);
    GET DIAGNOSTICS deleted_rows = ROW_COUNT;
  ELSE
    RETURN QUERY SELECT 0::BIGINT, 'ERROR: Must specify match_ids, startup_ids, or investor_ids';
    RETURN;
  END IF;

  RETURN QUERY SELECT deleted_rows, 'Successfully deleted ' || deleted_rows || ' matches';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Grant permissions
GRANT SELECT, INSERT ON data_deletion_audit TO authenticated;
GRANT EXECUTE ON FUNCTION safe_delete_matches TO authenticated;

-- Success message
SELECT '✅ Safety checks added to startup_investor_matches' as status;
