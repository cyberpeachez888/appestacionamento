-- CRITICAL: Run this migration BEFORE using the monthly customer registration
-- This adds the required parking_slot column to the monthly_customers table

-- Step 1: Add the parking_slot column (allow NULL initially for migration)
ALTER TABLE monthly_customers 
  ADD COLUMN IF NOT EXISTS parking_slot INTEGER;

-- Step 2: Add operator_name if not exists (from previous migration)
ALTER TABLE monthly_customers 
  ADD COLUMN IF NOT EXISTS operator_name TEXT;

-- Step 3: Update existing records to have a default parking slot if any exist
-- This prevents constraint violations on existing data
UPDATE monthly_customers 
SET parking_slot = id::text::int % 100 + 1
WHERE parking_slot IS NULL;

-- Step 4: Now make parking_slot NOT NULL
ALTER TABLE monthly_customers 
  ALTER COLUMN parking_slot SET NOT NULL;

-- Step 5: Create unique index to prevent duplicate slots for active customers
DROP INDEX IF EXISTS idx_monthly_customers_active_slot;
CREATE UNIQUE INDEX idx_monthly_customers_active_slot 
  ON monthly_customers(parking_slot) 
  WHERE status = 'active';

-- Step 6: Add regular index for queries
CREATE INDEX IF NOT EXISTS idx_monthly_customers_parking_slot 
  ON monthly_customers(parking_slot);

-- Step 7: Add indexes for new fields
CREATE INDEX IF NOT EXISTS idx_monthly_customers_cpf ON monthly_customers(cpf);
CREATE INDEX IF NOT EXISTS idx_monthly_customers_phone ON monthly_customers(phone);

-- Step 8: Add comment for documentation
COMMENT ON COLUMN monthly_customers.parking_slot IS 'Unique parking slot number assigned to this customer. One slot per customer, regardless of number of vehicles (max 5).';

-- Verification query - should return column info
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'monthly_customers' 
  AND column_name IN ('parking_slot', 'cpf', 'phone', 'plates', 'operator_name')
ORDER BY column_name;
