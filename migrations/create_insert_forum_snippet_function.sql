-- Create PostgreSQL function for insert-or-ignore behavior
-- This is Option B fallback if Supabase JS ignoreDuplicates is not supported
-- Use this if you get errors with ignoreDuplicates: true

CREATE OR REPLACE FUNCTION insert_forum_snippet(
  p_entity_id uuid,
  p_entity_type text,
  p_text text,
  p_source_url text,
  p_date_published timestamptz,
  p_source_type text,
  p_tier int,
  p_context_label text,
  p_text_hash text,
  p_source_created_at_i bigint,
  p_source_item_id text
) RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Use NOT EXISTS check instead of ON CONFLICT because partial unique indexes
  -- don't work with ON CONFLICT (column list) syntax
  INSERT INTO pythia_speech_snippets (
    entity_id, entity_type, text, source_url, date_published,
    source_type, tier, context_label, text_hash,
    source_created_at_i, source_item_id
  )
  SELECT
    p_entity_id, p_entity_type, p_text, p_source_url, p_date_published,
    p_source_type, p_tier, p_context_label, p_text_hash,
    p_source_created_at_i, p_source_item_id
  WHERE NOT EXISTS (
    SELECT 1
    FROM pythia_speech_snippets
    WHERE entity_id = p_entity_id
      AND source_type = p_source_type
      AND source_item_id = p_source_item_id
  );
END;
$$;

-- Comment
COMMENT ON FUNCTION insert_forum_snippet IS 'Insert forum snippet with insert-or-ignore behavior. Conflicts (same entity_id, source_type, source_item_id) are silently ignored.';
