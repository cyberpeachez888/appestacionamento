-- Reload Supabase PostgREST Schema Cache
-- Run this in your Supabase SQL Editor to fix the 'Could not find column in schema cache' error

-- This command forces Supabase to reload the schema cache
-- It's needed when columns are added/modified via SQL and PostgREST hasn't detected the changes
NOTIFY pgrst, 'reload schema';

-- Alternative method if the above doesn't work:
-- You can also reload the schema by going to:
-- Supabase Dashboard > Settings > API > Schema Cache > Click "Reload schema"

-- After running this, the parking_slot, plates, cpf, phone, and operator_name columns
-- should be properly recognized by the Supabase API
