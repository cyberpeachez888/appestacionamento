-- Security enhancements migration
-- Run this in your Supabase SQL Editor

-- 1. Login attempts tracking
CREATE TABLE IF NOT EXISTS login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  login TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  success BOOLEAN NOT NULL,
  failure_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_login_attempts_login ON login_attempts(login);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip ON login_attempts(ip_address);
CREATE INDEX IF NOT EXISTS idx_login_attempts_created ON login_attempts(created_at DESC);

-- 2. Account locks
CREATE TABLE IF NOT EXISTS account_locks (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  locked_until TIMESTAMP WITH TIME ZONE NOT NULL,
  lock_reason TEXT,
  failed_attempts INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster lookups (removed WHERE clause with NOW() as it's not immutable)
CREATE INDEX IF NOT EXISTS idx_account_locks_locked_until ON account_locks(locked_until);

-- 3. Password history (prevent reuse)
CREATE TABLE IF NOT EXISTS password_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_password_history_user ON password_history(user_id, created_at DESC);

-- 4. Add security fields to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_first_login BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS password_expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_login_ip TEXT;

-- 5. Function to clean old login attempts (keep last 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_login_attempts()
RETURNS void AS $$
BEGIN
  DELETE FROM login_attempts 
  WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- 6. Function to check if account is locked
CREATE OR REPLACE FUNCTION is_account_locked(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  lock_record RECORD;
BEGIN
  SELECT * INTO lock_record 
  FROM account_locks 
  WHERE user_id = p_user_id 
  AND locked_until > NOW();
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- 7. Function to unlock account
CREATE OR REPLACE FUNCTION unlock_account(p_user_id UUID)
RETURNS void AS $$
BEGIN
  DELETE FROM account_locks WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- 8. Function to add password to history
CREATE OR REPLACE FUNCTION add_password_to_history()
RETURNS TRIGGER AS $$
BEGIN
  -- Only track if password actually changed
  IF NEW.password_hash IS DISTINCT FROM OLD.password_hash THEN
    INSERT INTO password_history (user_id, password_hash)
    VALUES (NEW.id, NEW.password_hash);
    
    -- Keep only last 3 passwords
    DELETE FROM password_history
    WHERE user_id = NEW.id
    AND id NOT IN (
      SELECT id FROM password_history
      WHERE user_id = NEW.id
      ORDER BY created_at DESC
      LIMIT 3
    );
    
    -- Update password_changed_at
    NEW.password_changed_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for password history
DROP TRIGGER IF EXISTS password_history_trigger ON users;
CREATE TRIGGER password_history_trigger
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION add_password_to_history();

-- 9. Set password expiration for existing users (90 days from last change)
UPDATE users 
SET password_expires_at = COALESCE(password_changed_at, created_at) + INTERVAL '90 days'
WHERE password_expires_at IS NULL;

-- 10. Comments for documentation
COMMENT ON TABLE login_attempts IS 'Tracks all login attempts (successful and failed) for security auditing';
COMMENT ON TABLE account_locks IS 'Stores temporary account locks due to failed login attempts';
COMMENT ON TABLE password_history IS 'Stores password hashes to prevent password reuse';
COMMENT ON COLUMN users.must_change_password IS 'Forces user to change password on next login';
COMMENT ON COLUMN users.is_first_login IS 'Indicates if user has never logged in successfully';
COMMENT ON COLUMN users.password_expires_at IS 'When the password expires and must be changed';

-- Grant permissions (adjust according to your RLS policies)
-- ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE account_locks ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE password_history ENABLE ROW LEVEL SECURITY;
