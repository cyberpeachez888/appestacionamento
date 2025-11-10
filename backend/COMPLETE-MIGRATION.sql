-- ========================================
-- COMPLETE MIGRATION FOR MONTHLY CUSTOMERS
-- ========================================
-- This migration adds ALL required columns for the enhanced monthly customer system
-- Run this ONCE in your Supabase SQL Editor

-- Step 1: Add CPF column
ALTER TABLE monthly_customers 
  ADD COLUMN IF NOT EXISTS cpf TEXT;

-- Step 2: Add phone column
ALTER TABLE monthly_customers 
  ADD COLUMN IF NOT EXISTS phone TEXT;

-- Step 3: Add parking_slot column
ALTER TABLE monthly_customers 
  ADD COLUMN IF NOT EXISTS parking_slot INTEGER;

-- Step 4: Add operator_name column
ALTER TABLE monthly_customers 
  ADD COLUMN IF NOT EXISTS operator_name TEXT;

-- Step 5: Change plates column type to JSONB (if it exists as TEXT)
-- First check if column exists and is TEXT type
DO $$ 
BEGIN
  -- Check if plates column exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'monthly_customers' AND column_name = 'plates'
  ) THEN
    -- If it exists and is TEXT, convert to JSONB
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'monthly_customers' 
        AND column_name = 'plates' 
        AND data_type = 'text'
    ) THEN
      -- Migrate existing data first
      UPDATE monthly_customers 
      SET plates = ('["' || plates || '"]')::jsonb 
      WHERE plates IS NOT NULL AND plates != '';
      
      -- Now change column type
      ALTER TABLE monthly_customers 
      ALTER COLUMN plates TYPE JSONB USING plates::jsonb;
    END IF;
  ELSE
    -- Column doesn't exist, create it as JSONB
    ALTER TABLE monthly_customers ADD COLUMN plates JSONB DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- Step 6: Update existing records with default parking slot if they have none
UPDATE monthly_customers 
SET parking_slot = CAST(SUBSTR(id::text, 1, 2) AS INTEGER) % 100 + 1
WHERE parking_slot IS NULL;

-- Step 7: Create unique index for parking_slot (active customers only)
DROP INDEX IF EXISTS idx_monthly_customers_active_slot;
CREATE UNIQUE INDEX idx_monthly_customers_active_slot 
  ON monthly_customers(parking_slot) 
  WHERE status = 'active';

-- Step 8: Add regular indexes for performance
CREATE INDEX IF NOT EXISTS idx_monthly_customers_parking_slot 
  ON monthly_customers(parking_slot);

CREATE INDEX IF NOT EXISTS idx_monthly_customers_cpf 
  ON monthly_customers(cpf);

CREATE INDEX IF NOT EXISTS idx_monthly_customers_phone 
  ON monthly_customers(phone);

-- Step 9: Add helpful column comments
COMMENT ON COLUMN monthly_customers.cpf IS 'Customer CPF document number (format: XXX.XXX.XXX-XX)';
COMMENT ON COLUMN monthly_customers.phone IS 'Customer phone number (format: (XX) XXXXX-XXXX)';
COMMENT ON COLUMN monthly_customers.parking_slot IS 'Unique parking slot number. One slot per customer, supports up to 5 vehicles.';
COMMENT ON COLUMN monthly_customers.plates IS 'Array of vehicle license plates (JSONB). Max 5 plates per customer.';
COMMENT ON COLUMN monthly_customers.operator_name IS 'Name of the operator who registered this customer';

-- Step 10: Verification - Show updated schema
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default,
  CASE 
    WHEN column_name IN ('cpf', 'phone', 'parking_slot', 'plates', 'operator_name') 
    THEN '✓ NEW' 
    ELSE '' 
  END as status
FROM information_schema.columns
WHERE table_name = 'monthly_customers'
ORDER BY 
  CASE 
    WHEN column_name IN ('cpf', 'phone', 'parking_slot', 'plates', 'operator_name') 
    THEN 0 
    ELSE 1 
  END,
  column_name;

-- Step 11: Show sample of data (if any exists)
SELECT 
  id,
  name,
  cpf,
  phone,
  parking_slot,
  plates,
  operator_name,
  status,
  created_at
FROM monthly_customers
LIMIT 5;

-- ========================================
-- MIGRATION COMPLETE!
-- ========================================
-- You should see:
-- - cpf (TEXT)
-- - phone (TEXT)
-- - parking_slot (INTEGER) with unique index
-- - plates (JSONB)
-- - operator_name (TEXT)
--
-- All columns are nullable for backward compatibility
-- ========================================
