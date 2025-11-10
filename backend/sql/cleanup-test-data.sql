-- Cleanup script to remove all test data before production use
-- Run this during the first-run setup process

-- This script will be executed via the setup controller

-- Delete all test tickets
DELETE FROM tickets WHERE id IS NOT NULL;

-- Delete all test monthly customers
DELETE FROM monthly_customers WHERE id IS NOT NULL;

-- Delete all test payments
DELETE FROM payments WHERE id IS NOT NULL;

-- Delete all test vehicle types (except defaults we'll recreate)
DELETE FROM vehicle_types WHERE id IS NOT NULL;

-- Delete all test rates
DELETE FROM rates WHERE id IS NOT NULL;

-- Delete all test users except the one being created during setup
-- (This will be handled programmatically to preserve the new admin user)

-- Delete all test receipts
DELETE FROM receipts WHERE id IS NOT NULL;

-- Delete all monthly reports
DELETE FROM monthly_reports WHERE id IS NOT NULL;

-- Delete all user events/audit logs
DELETE FROM user_events WHERE id IS NOT NULL;

-- Reset sequences if needed
-- Note: Supabase/PostgreSQL will auto-manage sequences

COMMENT ON TABLE tickets IS 'All test tickets removed during setup';
