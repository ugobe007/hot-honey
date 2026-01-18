-- Migration: Add preferences JSONB column to profiles table
-- For storing user onboarding preferences like preferred_sector

-- Add preferences column (nullable JSONB with empty object default)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN profiles.preferences IS 'User preferences from onboarding (preferred_sector, etc.)';

-- Example usage:
-- UPDATE profiles SET preferences = '{"preferred_sector": "ai-ml"}' WHERE id = '...';
-- SELECT preferences->>'preferred_sector' FROM profiles WHERE id = '...';
