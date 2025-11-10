-- Reload Supabase PostgREST Schema Cache
-- Run this in Supabase SQL Editor after creating new tables

NOTIFY pgrst, 'reload schema';

-- Verify the tables exist
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_name IN ('monthly_reports', 'archived_tickets')
ORDER BY table_name;
