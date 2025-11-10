-- Add manageBackups permission to all admin users
-- Run this in your Supabase SQL Editor after the column migration

UPDATE users
SET permissions = jsonb_set(
  COALESCE(permissions, '{}'::jsonb),
  '{manageBackups}',
  'true'::jsonb
)
WHERE role = 'admin';

-- Verify the update
SELECT id, name, email, role, permissions
FROM users
WHERE role = 'admin';
