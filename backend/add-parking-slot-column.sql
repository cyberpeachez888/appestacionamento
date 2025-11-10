-- Add parking_slot column to monthly_customers table
-- Run this in your Supabase SQL Editor

-- Add parking_slot column (required field)
ALTER TABLE monthly_customers 
  ADD COLUMN IF NOT EXISTS parking_slot INTEGER;

-- Create unique index to prevent duplicate slots for active customers
-- Note: This allows the same slot to be reused after a customer becomes inactive
CREATE UNIQUE INDEX IF NOT EXISTS idx_monthly_customers_active_slot 
  ON monthly_customers(parking_slot) 
  WHERE status = 'active';

-- Add regular index for queries
CREATE INDEX IF NOT EXISTS idx_monthly_customers_parking_slot 
  ON monthly_customers(parking_slot);

-- Add comment for documentation
COMMENT ON COLUMN monthly_customers.parking_slot IS 'Unique parking slot number assigned to this customer. One slot per customer, regardless of number of vehicles (max 5).';
