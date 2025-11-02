-- Create investors table
CREATE TABLE IF NOT EXISTS investors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('vc_firm', 'accelerator', 'angel_network', 'corporate_vc')),
  tagline TEXT,
  description TEXT,
  website TEXT,
  logo TEXT,
  linkedin TEXT,
  twitter TEXT,
  contact_email TEXT,
  
  -- Financial info
  aum TEXT, -- Assets Under Management (e.g., "$85B")
  fund_size TEXT, -- Latest fund size
  check_size TEXT, -- Typical check size (e.g., "$500K - $100M")
  
  -- Investment focus
  stage JSONB, -- Array of stages: ["seed", "series_a", "series_b", etc.]
  sectors JSONB, -- Array of sectors
  geography TEXT, -- Primary geographic focus
  
  -- Portfolio stats
  portfolio_count INTEGER DEFAULT 0,
  exits INTEGER DEFAULT 0,
  unicorns INTEGER DEFAULT 0,
  notable_investments JSONB, -- Array of notable company names
  
  -- Hot Honey specific
  hot_honey_investments INTEGER DEFAULT 0, -- Number of investments made through platform
  hot_honey_startups JSONB DEFAULT '[]'::jsonb, -- Array of startup IDs invested in through platform
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create startup_uploads table
CREATE TABLE IF NOT EXISTS startup_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Basic info
  name TEXT NOT NULL,
  pitch TEXT,
  description TEXT,
  tagline TEXT,
  website TEXT,
  linkedin TEXT,
  
  -- Raise info
  raise_amount TEXT, -- e.g., "$2M"
  raise_type TEXT, -- e.g., "Seed", "Series A"
  stage INTEGER, -- 1-5 scale
  
  -- Upload source
  source_type TEXT NOT NULL CHECK (source_type IN ('url', 'deck', 'manual')),
  source_url TEXT, -- Website URL if extracted from URL
  deck_filename TEXT, -- Original filename if uploaded deck
  
  -- Extracted data (JSON blob of all data extracted)
  extracted_data JSONB,
  
  -- Processing status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'approved', 'rejected', 'published')),
  admin_notes TEXT,
  
  -- Who submitted
  submitted_by UUID, -- User ID (can be null for anonymous)
  submitted_email TEXT, -- Contact email
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_investors_type ON investors(type);
CREATE INDEX IF NOT EXISTS idx_investors_hot_honey_investments ON investors(hot_honey_investments DESC);
CREATE INDEX IF NOT EXISTS idx_startup_uploads_status ON startup_uploads(status);
CREATE INDEX IF NOT EXISTS idx_startup_uploads_created_at ON startup_uploads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_startup_uploads_submitted_by ON startup_uploads(submitted_by);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_investors_updated_at BEFORE UPDATE ON investors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_startup_uploads_updated_at BEFORE UPDATE ON startup_uploads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE investors ENABLE ROW LEVEL SECURITY;
ALTER TABLE startup_uploads ENABLE ROW LEVEL SECURITY;

-- RLS Policies for investors table
-- Allow everyone to read investors
CREATE POLICY "Anyone can read investors"
  ON investors FOR SELECT
  TO public
  USING (true);

-- Only authenticated users can insert/update investors (admin only in practice)
CREATE POLICY "Authenticated users can insert investors"
  ON investors FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update investors"
  ON investors FOR UPDATE
  TO authenticated
  USING (true);

-- RLS Policies for startup_uploads table
-- Allow everyone to read approved/published uploads
CREATE POLICY "Anyone can read approved startup uploads"
  ON startup_uploads FOR SELECT
  TO public
  USING (status IN ('approved', 'published'));

-- Allow authenticated users to see their own submissions
CREATE POLICY "Users can read their own startup uploads"
  ON startup_uploads FOR SELECT
  TO authenticated
  USING (submitted_by = auth.uid());

-- Allow anyone to insert (submit) startups
CREATE POLICY "Anyone can submit startup uploads"
  ON startup_uploads FOR INSERT
  TO public
  WITH CHECK (true);

-- Only submitter can update their own pending submissions
CREATE POLICY "Users can update their own pending submissions"
  ON startup_uploads FOR UPDATE
  TO authenticated
  USING (submitted_by = auth.uid() AND status = 'pending');

-- Admins can update any submission (implement admin check in application layer)
CREATE POLICY "Admins can update any startup upload"
  ON startup_uploads FOR UPDATE
  TO authenticated
  USING (true); -- Add admin role check in your application

COMMENT ON TABLE investors IS 'VC firms, accelerators, angel networks, and corporate VCs on the platform';
COMMENT ON TABLE startup_uploads IS 'Startups submitted to the platform via URL, deck upload, or manual entry';
