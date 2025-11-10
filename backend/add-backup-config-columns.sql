-- Add backup configuration columns to company_config table
-- Run this in your Supabase SQL Editor

ALTER TABLE company_config
ADD COLUMN IF NOT EXISTS backup_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS backup_schedule TEXT DEFAULT '0 2 * * *',
ADD COLUMN IF NOT EXISTS backup_retention_days INTEGER DEFAULT 30;

-- Update existing row if it exists
UPDATE company_config
SET 
  backup_enabled = COALESCE(backup_enabled, FALSE),
  backup_schedule = COALESCE(backup_schedule, '0 2 * * *'),
  backup_retention_days = COALESCE(backup_retention_days, 30)
WHERE id = 'default';
