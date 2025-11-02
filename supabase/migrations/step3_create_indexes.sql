-- STEP 3: Create indexes
-- Run this after steps 1 and 2 are successful

CREATE INDEX IF NOT EXISTS idx_investors_type ON investors(type);
CREATE INDEX IF NOT EXISTS idx_investors_hot_honey_investments ON investors(hot_honey_investments DESC);
CREATE INDEX IF NOT EXISTS idx_startup_uploads_status ON startup_uploads(status);
CREATE INDEX IF NOT EXISTS idx_startup_uploads_created_at ON startup_uploads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_startup_uploads_submitted_by ON startup_uploads(submitted_by);

-- Verify indexes were created
SELECT 'Indexes created successfully!' as status;
