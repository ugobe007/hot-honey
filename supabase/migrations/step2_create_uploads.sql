-- STEP 2: Create the startup_uploads table
-- Run this after step 1 is successful

CREATE TABLE IF NOT EXISTS startup_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  pitch TEXT,
  description TEXT,
  tagline TEXT,
  website TEXT,
  linkedin TEXT,
  raise_amount TEXT,
  raise_type TEXT,
  stage INTEGER,
  source_type TEXT NOT NULL CHECK (source_type IN ('url', 'deck', 'manual')),
  source_url TEXT,
  deck_filename TEXT,
  extracted_data JSONB,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'approved', 'rejected', 'published')),
  admin_notes TEXT,
  submitted_by UUID,
  submitted_email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID
);

-- Verify the table was created
SELECT 'startup_uploads table created successfully!' as status;
