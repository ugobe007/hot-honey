-- Create matching_queue table if it doesn't exist
-- This is required for the queue processor to work

CREATE TABLE IF NOT EXISTS matching_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id UUID NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  attempts INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  UNIQUE(startup_id)
);

CREATE INDEX IF NOT EXISTS idx_matching_queue_status ON matching_queue(status);
CREATE INDEX IF NOT EXISTS idx_matching_queue_startup_id ON matching_queue(startup_id);

-- Enable RLS
ALTER TABLE matching_queue ENABLE ROW LEVEL SECURITY;

-- Allow public insert (for queue processor)
CREATE POLICY "Allow public insert on matching_queue"
  ON matching_queue FOR INSERT
  WITH CHECK (true);

-- Allow public update (for queue processor)
CREATE POLICY "Allow public update on matching_queue"
  ON matching_queue FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Allow public select (for queue processor)
CREATE POLICY "Allow public select on matching_queue"
  ON matching_queue FOR SELECT
  USING (true);

SELECT '✅ matching_queue table created!' as status;
