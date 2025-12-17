-- EXEC SQL FUNCTIONS
-- =====================
-- Run this in your Supabase SQL Editor to create the exec_sql functions
-- These bypass PostgREST schema cache issues

-- 1. Create exec_sql - returns single JSONB result
CREATE OR REPLACE FUNCTION exec_sql(sql_query TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
BEGIN
  EXECUTE sql_query INTO result;
  RETURN COALESCE(result, '[]'::jsonb);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'error', SQLERRM,
    'code', SQLSTATE
  );
END;
$$;

-- 2. Create exec_sql_rows - returns multiple rows as JSONB array
CREATE OR REPLACE FUNCTION exec_sql_rows(sql_query TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
BEGIN
  EXECUTE 'SELECT COALESCE(jsonb_agg(row_to_json(t)), ''[]''::jsonb) FROM (' || sql_query || ') t' INTO result;
  RETURN COALESCE(result, '[]'::jsonb);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'error', SQLERRM,
    'code', SQLSTATE
  );
END;
$$;

-- 3. Create exec_sql_modify - for INSERT/UPDATE/DELETE
CREATE OR REPLACE FUNCTION exec_sql_modify(sql_query TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected_rows INTEGER;
BEGIN
  EXECUTE sql_query;
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  RETURN jsonb_build_object(
    'success', true,
    'affected_rows', affected_rows
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'code', SQLSTATE
  );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION exec_sql(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION exec_sql(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION exec_sql_rows(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION exec_sql_rows(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION exec_sql_modify(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION exec_sql_modify(TEXT) TO service_role;

-- Add comments
COMMENT ON FUNCTION exec_sql IS 'Execute a SQL query that returns a single JSONB result';
COMMENT ON FUNCTION exec_sql_rows IS 'Execute a SELECT query and return results as JSONB array';
COMMENT ON FUNCTION exec_sql_modify IS 'Execute INSERT/UPDATE/DELETE and return affected row count';

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
