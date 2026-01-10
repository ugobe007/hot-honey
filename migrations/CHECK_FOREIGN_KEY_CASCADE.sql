-- Check if foreign key CASCADE deletion could have deleted matches
-- This checks if deleting a startup or investor would cascade delete matches

SELECT 
  'FOREIGN KEY CONSTRAINTS ON startup_investor_matches' as check_type,
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  rc.delete_rule,
  CASE 
    WHEN rc.delete_rule = 'CASCADE' THEN '⚠️ DANGEROUS: Deleting ' || ccu.table_name || ' would DELETE matches!'
    WHEN rc.delete_rule = 'SET NULL' THEN '⚠️ Deleting ' || ccu.table_name || ' would SET matches to NULL'
    ELSE '✅ Safe: Deleting ' || ccu.table_name || ' would ' || rc.delete_rule || ' matches'
  END as impact
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
  ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'startup_investor_matches'
  AND tc.table_schema = 'public';

-- Check if matches table has any foreign keys currently
SELECT 
  'CURRENT FOREIGN KEYS' as check_type,
  conname as constraint_name,
  conrelid::regclass as table_name,
  confrelid::regclass as referenced_table,
  CASE contype
    WHEN 'f' THEN 'FOREIGN KEY'
    ELSE contype::text
  END as constraint_type,
  CASE confdeltype
    WHEN 'a' THEN 'NO ACTION'
    WHEN 'r' THEN 'RESTRICT'
    WHEN 'c' THEN 'CASCADE ⚠️ DANGEROUS'
    WHEN 'n' THEN 'SET NULL'
    WHEN 'd' THEN 'SET DEFAULT'
    ELSE confdeltype::text
  END as delete_action
FROM pg_constraint
WHERE conrelid = 'public.startup_investor_matches'::regclass
  AND contype = 'f';
