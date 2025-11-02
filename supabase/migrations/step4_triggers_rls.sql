-- STEP 4: Create triggers and RLS policies
-- Run this after steps 1-3 are successful

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers
CREATE TRIGGER update_investors_updated_at BEFORE UPDATE ON investors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_startup_uploads_updated_at BEFORE UPDATE ON startup_uploads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE investors ENABLE ROW LEVEL SECURITY;
ALTER TABLE startup_uploads ENABLE ROW LEVEL SECURITY;

-- Verify triggers and RLS were created
SELECT 'Triggers and RLS enabled successfully!' as status;
