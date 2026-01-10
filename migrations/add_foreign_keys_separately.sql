-- Migration: Add Foreign Keys to startup_investor_matches (Run AFTER table is created)
-- Description: Adds foreign key constraints separately to avoid timeouts
-- Run this AFTER create_startup_investor_matches_fast.sql succeeds
-- IMPORTANT: Only run if you need foreign key constraints (optional)

-- Add startup foreign key (only if startup_uploads table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'startup_uploads') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_startup_investor_matches_startup') THEN
      ALTER TABLE startup_investor_matches
      ADD CONSTRAINT fk_startup_investor_matches_startup 
      FOREIGN KEY (startup_id) REFERENCES startup_uploads(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

-- Add investor foreign key (only if investors table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'investors') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_startup_investor_matches_investor') THEN
      ALTER TABLE startup_investor_matches
      ADD CONSTRAINT fk_startup_investor_matches_investor 
      FOREIGN KEY (investor_id) REFERENCES investors(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

-- Add user foreign key (only if auth.users exists AND user_id column exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'startup_investor_matches' AND column_name = 'user_id') THEN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_startup_investor_matches_user') THEN
        ALTER TABLE startup_investor_matches
        ADD CONSTRAINT fk_startup_investor_matches_user 
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
      END IF;
    END IF;
  END IF;
END $$;

SELECT 'Foreign keys added successfully!' as status;
