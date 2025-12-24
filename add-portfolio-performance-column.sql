-- Add portfolio_performance column to investors table
-- Run this in Supabase SQL Editor if the column is missing

ALTER TABLE investors 
ADD COLUMN IF NOT EXISTS portfolio_performance JSONB;

-- Add comment
COMMENT ON COLUMN investors.portfolio_performance IS 'JSONB field storing portfolio performance metrics: total_exits, total_exit_value, acquisitions, mergers, ipos, etc.';



