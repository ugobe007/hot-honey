-- Migration: Add referral/invite system tables
-- Prompt 24: Referral/Invite Loop ("Invite 3, Get 7 Days Elite")

-- Table: invites - tracks invite tokens and their status
CREATE TABLE IF NOT EXISTS invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token VARCHAR(32) UNIQUE NOT NULL,
  inviter_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invitee_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  invitee_email VARCHAR(255),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'opened', 'accepted', 'expired')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  opened_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days')
);

-- Table: referral_rewards - tracks granted rewards
CREATE TABLE IF NOT EXISTS referral_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reward_type VARCHAR(50) NOT NULL CHECK (reward_type IN ('elite_7_days', 'elite_14_days', 'elite_30_days', 'pro_7_days')),
  reason VARCHAR(100) NOT NULL, -- e.g., 'referral_milestone_3', 'referral_milestone_5'
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  applied BOOLEAN DEFAULT FALSE,
  applied_at TIMESTAMPTZ
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_invites_inviter ON invites(inviter_user_id);
CREATE INDEX IF NOT EXISTS idx_invites_token ON invites(token);
CREATE INDEX IF NOT EXISTS idx_invites_status ON invites(status);
CREATE INDEX IF NOT EXISTS idx_invites_invitee ON invites(invitee_user_id) WHERE invitee_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_referral_rewards_user ON referral_rewards(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_rewards_expires ON referral_rewards(expires_at) WHERE applied = FALSE;

-- Add referral_code column to profiles if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'referral_code'
  ) THEN
    ALTER TABLE profiles ADD COLUMN referral_code VARCHAR(12) UNIQUE;
  END IF;
  
  -- Track referrer for new signups
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'referred_by'
  ) THEN
    ALTER TABLE profiles ADD COLUMN referred_by UUID REFERENCES auth.users(id);
  END IF;
  
  -- Track total successful referrals
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'referral_count'
  ) THEN
    ALTER TABLE profiles ADD COLUMN referral_count INTEGER DEFAULT 0;
  END IF;
END $$;

-- Function to generate unique referral code
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS VARCHAR(12) AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- No I, O, 1, 0 for clarity
  result VARCHAR(12) := '';
  i INTEGER;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate referral code for new profiles
CREATE OR REPLACE FUNCTION set_referral_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    -- Generate unique code, retry if collision
    LOOP
      NEW.referral_code := generate_referral_code();
      EXIT WHEN NOT EXISTS (SELECT 1 FROM profiles WHERE referral_code = NEW.referral_code);
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_referral_code ON profiles;
CREATE TRIGGER trigger_set_referral_code
  BEFORE INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION set_referral_code();

-- Backfill referral codes for existing profiles
UPDATE profiles 
SET referral_code = generate_referral_code() 
WHERE referral_code IS NULL;

-- RLS Policies
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_rewards ENABLE ROW LEVEL SECURITY;

-- Users can see their own invites (as inviter)
DROP POLICY IF EXISTS "Users can view own invites" ON invites;
CREATE POLICY "Users can view own invites" ON invites
  FOR SELECT USING (auth.uid() = inviter_user_id);

-- Users can create invites
DROP POLICY IF EXISTS "Users can create invites" ON invites;
CREATE POLICY "Users can create invites" ON invites
  FOR INSERT WITH CHECK (auth.uid() = inviter_user_id);

-- Users can update their own invites (for marking opened/accepted)
DROP POLICY IF EXISTS "Users can update invites" ON invites;
CREATE POLICY "Users can update invites" ON invites
  FOR UPDATE USING (TRUE);

-- Users can see their own rewards
DROP POLICY IF EXISTS "Users can view own rewards" ON referral_rewards;
CREATE POLICY "Users can view own rewards" ON referral_rewards
  FOR SELECT USING (auth.uid() = user_id);

-- Service role can manage all (for backend operations)
DROP POLICY IF EXISTS "Service role manages invites" ON invites;
CREATE POLICY "Service role manages invites" ON invites
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

DROP POLICY IF EXISTS "Service role manages rewards" ON referral_rewards;
CREATE POLICY "Service role manages rewards" ON referral_rewards
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Grant permissions
GRANT ALL ON invites TO authenticated;
GRANT ALL ON referral_rewards TO authenticated;

COMMENT ON TABLE invites IS 'Tracks invite tokens sent by users for the referral program';
COMMENT ON TABLE referral_rewards IS 'Tracks Elite trial rewards granted through referrals';

-- Function to safely increment referral count
CREATE OR REPLACE FUNCTION increment_referral_count(user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE profiles
  SET referral_count = COALESCE(referral_count, 0) + 1
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
