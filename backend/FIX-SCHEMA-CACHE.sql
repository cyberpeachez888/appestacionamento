-- ============================================
-- FIX: Schema Cache Error for parking_slot
-- ============================================
-- 
-- This fixes the error:
-- "Could not find the 'parkingSlot' column of 'monthly_customers' in the schema cache"
--
-- Run this in Supabase SQL Editor
-- ============================================

-- Method 1: Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- Verify the columns exist
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'monthly_customers'
AND column_name IN ('parking_slot', 'cpf', 'phone', 'plates', 'operator_name')
ORDER BY column_name;

-- Expected output should show all 5 columns
-- If any are missing, run the COMPLETE-MIGRATION.sql first
