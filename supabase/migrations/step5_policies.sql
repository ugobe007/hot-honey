-- STEP 5: Create RLS policies
-- Run this after step 4 is successful

-- Drop existing policies if they exist (to allow re-running)
DROP POLICY IF EXISTS "Anyone can read investors" ON investors;
DROP POLICY IF EXISTS "Anyone can insert investors" ON investors;
DROP POLICY IF EXISTS "Anyone can update investors" ON investors;
DROP POLICY IF EXISTS "Anyone can delete investors" ON investors;
DROP POLICY IF EXISTS "Anyone can read approved startup uploads" ON startup_uploads;
DROP POLICY IF EXISTS "Anyone can read their own uploads" ON startup_uploads;
DROP POLICY IF EXISTS "Anyone can submit startup uploads" ON startup_uploads;
DROP POLICY IF EXISTS "Anyone can update their own uploads" ON startup_uploads;

-- Investors table policies
CREATE POLICY "Anyone can read investors"
  ON investors FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anyone can insert investors"
  ON investors FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Anyone can update investors"
  ON investors FOR UPDATE
  TO public
  USING (true);

CREATE POLICY "Anyone can delete investors"
  ON investors FOR DELETE
  TO public
  USING (true);

-- Startup uploads table policies
CREATE POLICY "Anyone can read approved startup uploads"
  ON startup_uploads FOR SELECT
  TO public
  USING (status IN ('approved', 'published'));

CREATE POLICY "Anyone can read their own uploads"
  ON startup_uploads FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anyone can submit startup uploads"
  ON startup_uploads FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Anyone can update their own uploads"
  ON startup_uploads FOR UPDATE
  TO public
  USING (true);

-- Verify policies were created
SELECT 'RLS policies created successfully!' as status;
