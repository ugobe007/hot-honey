-- Quick connection test
-- Run this FIRST to verify your Supabase connection is working

SELECT 
  'Supabase connection is working!' as status,
  current_database() as database,
  current_user as user,
  version() as postgres_version;
