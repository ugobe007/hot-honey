-- Add DELETE policy for investors table
-- Run this in Supabase SQL Editor NOW

-- Drop existing delete policy if it exists
DROP POLICY IF EXISTS "Anyone can delete investors" ON investors;

-- Create delete policy
CREATE POLICY "Anyone can delete investors"
  ON investors FOR DELETE
  TO public
  USING (true);

-- Verify policy was created
SELECT 'DELETE policy created successfully!' as status;
