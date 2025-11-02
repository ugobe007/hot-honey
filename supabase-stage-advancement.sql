-- =============================================================================
-- HOT MONEY HONEY - STAGE ADVANCEMENT SYSTEM
-- =============================================================================
-- Automatically advance startups to next stage when they reach vote threshold
-- Notify YES voters when their startup advances
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. ADD STAGE COLUMN TO STARTUPS (if not exists)
-- -----------------------------------------------------------------------------
ALTER TABLE startups 
ADD COLUMN IF NOT EXISTS stage INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS stage_advanced_at TIMESTAMP;

-- Add index for stage queries
CREATE INDEX IF NOT EXISTS idx_startups_stage ON startups(stage);

-- -----------------------------------------------------------------------------
-- 2. CREATE NOTIFICATIONS TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL,
  startup_id TEXT NOT NULL REFERENCES startups(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL, -- 'stage_advance', 'deal_close', etc.
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can read their own notifications
DROP POLICY IF EXISTS "Users can read own notifications" ON notifications;
CREATE POLICY "Users can read own notifications"
  ON notifications FOR SELECT
  USING (true); -- Public can read (we filter by user_id in app)

-- Users can update their own notifications (mark as read)
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (true);

-- -----------------------------------------------------------------------------
-- 3. FUNCTION: CHECK AND ADVANCE STAGE
-- -----------------------------------------------------------------------------
-- Called after every OFFICIAL VOTE insert/update to check if stage should advance
-- NOTE: This ONLY counts rows from the 'votes' table (official investment votes)
-- Social reactions (thumbs up/down in 'reactions' table) do NOT trigger this

CREATE OR REPLACE FUNCTION check_and_advance_stage()
RETURNS TRIGGER AS $$
DECLARE
  current_yes_votes INTEGER;
  current_stage INTEGER;
  votes_needed INTEGER;
  startup_name TEXT;
BEGIN
  -- Get current OFFICIAL vote count (from votes table only, NOT reactions)
  SELECT 
    COUNT(*) FILTER (WHERE vote_type = 'yes'),
    s.stage,
    s.name
  INTO current_yes_votes, current_stage, startup_name
  FROM votes v  -- ONLY official votes count, NOT reactions!
  JOIN startups s ON s.id = v.startup_id
  WHERE v.startup_id = NEW.startup_id
  GROUP BY s.stage, s.name;

  -- Determine votes needed for current stage
  IF current_stage = 4 THEN
    votes_needed := 1;  -- Final stage only needs 1 vote
  ELSE
    votes_needed := 5;  -- All other stages need 5 votes
  END IF;

  -- Check if we've reached the threshold
  IF current_yes_votes >= votes_needed AND current_stage < 4 THEN
    -- Advance to next stage
    UPDATE startups
    SET 
      stage = current_stage + 1,
      stage_advanced_at = NOW()
    WHERE id = NEW.startup_id;

    -- Notify all YES voters
    INSERT INTO notifications (user_id, startup_id, notification_type, message)
    SELECT 
      v.user_id,
      v.startup_id,
      'stage_advance',
      '🎉 ' || startup_name || ' advanced to Stage ' || (current_stage + 1) || '! Vote again to keep it moving forward.'
    FROM votes v
    WHERE v.startup_id = NEW.startup_id
      AND v.vote_type = 'yes';

    RAISE NOTICE 'Startup % advanced to stage %', startup_name, current_stage + 1;
  
  -- Special handling for final stage (Stage 4)
  ELSIF current_yes_votes >= 1 AND current_stage = 4 THEN
    -- Mark as deal closed
    UPDATE startups
    SET 
      status = 'closed',
      stage_advanced_at = NOW()
    WHERE id = NEW.startup_id;

    -- Notify all YES voters of deal close
    INSERT INTO notifications (user_id, startup_id, notification_type, message)
    SELECT 
      v.user_id,
      v.startup_id,
      'deal_close',
      '🎊 Deal closed! ' || startup_name || ' has been funded. Congratulations!'
    FROM votes v
    WHERE v.startup_id = NEW.startup_id
      AND v.vote_type = 'yes';

    RAISE NOTICE 'Startup % deal closed!', startup_name;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -----------------------------------------------------------------------------
-- 4. CREATE TRIGGER ON VOTES TABLE
-- -----------------------------------------------------------------------------
-- Trigger fires after INSERT or UPDATE on votes table

DROP TRIGGER IF EXISTS trigger_check_stage_advancement ON votes;
CREATE TRIGGER trigger_check_stage_advancement
  AFTER INSERT OR UPDATE ON votes
  FOR EACH ROW
  EXECUTE FUNCTION check_and_advance_stage();

-- -----------------------------------------------------------------------------
-- 5. VIEW: USER NOTIFICATIONS
-- -----------------------------------------------------------------------------
-- Get unread notifications for a user

CREATE OR REPLACE VIEW user_notifications AS
SELECT 
  n.id,
  n.user_id,
  n.startup_id,
  s.name as startup_name,
  s.logo as startup_logo,
  n.notification_type,
  n.message,
  n.read,
  n.created_at
FROM notifications n
LEFT JOIN startups s ON n.startup_id = s.id
ORDER BY n.created_at DESC;

-- -----------------------------------------------------------------------------
-- 6. FUNCTION: MARK NOTIFICATION AS READ
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION mark_notification_read(notification_id TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE notifications
  SET read = true
  WHERE id = notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -----------------------------------------------------------------------------
-- 7. FUNCTION: MARK ALL USER NOTIFICATIONS AS READ
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION mark_all_notifications_read(user_id_param TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE notifications
  SET read = true
  WHERE user_id = user_id_param AND read = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -----------------------------------------------------------------------------
-- 8. FUNCTION: GET UNREAD COUNT
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION get_unread_notification_count(user_id_param TEXT)
RETURNS INTEGER AS $$
DECLARE
  unread_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO unread_count
  FROM notifications
  WHERE user_id = user_id_param AND read = false;
  
  RETURN unread_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -----------------------------------------------------------------------------
-- COMPLETE!
-- -----------------------------------------------------------------------------
-- Next steps:
-- 1. Run this SQL in Supabase SQL Editor
-- 2. Create React notification component to display notifications
-- 3. Test voting to trigger stage advancement
-- 4. Verify notifications are created for YES voters
-- =============================================================================

-- Example test query to check notifications:
-- SELECT * FROM user_notifications WHERE user_id = 'your-user-id' LIMIT 10;
