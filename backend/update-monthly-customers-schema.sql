-- Update monthly_customers table to support new requirements
-- Run this in your Supabase SQL Editor

-- Add new columns for CPF, phone, and change plate to plates (JSONB array)
ALTER TABLE monthly_customers 
  ADD COLUMN IF NOT EXISTS cpf TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS plates JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS operator_name TEXT;

-- Migrate existing plate data to plates array (if any data exists)
UPDATE monthly_customers 
SET plates = jsonb_build_array(plate)
WHERE plate IS NOT NULL AND plate != '' AND (plates IS NULL OR plates = '[]'::jsonb);

-- Optional: Drop the old plate column after migration (uncomment if needed)
-- ALTER TABLE monthly_customers DROP COLUMN IF EXISTS plate;

-- Add index for phone and cpf lookups
CREATE INDEX IF NOT EXISTS idx_monthly_customers_cpf ON monthly_customers(cpf);
CREATE INDEX IF NOT EXISTS idx_monthly_customers_phone ON monthly_customers(phone);
