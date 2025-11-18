-- Cash Register Sessions Table
-- Stores cash register opening and closing sessions
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS cash_register_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Session Information
  opened_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMP WITH TIME ZONE,
  
  -- Financial Information
  opening_amount NUMERIC NOT NULL DEFAULT 0,
  closing_amount NUMERIC,
  
  -- Operator Information
  operator_id UUID REFERENCES users(id) ON DELETE SET NULL,
  operator_name TEXT NOT NULL,
  
  -- Status
  is_open BOOLEAN NOT NULL DEFAULT TRUE,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_cash_sessions_opened ON cash_register_sessions(opened_at DESC);
CREATE INDEX IF NOT EXISTS idx_cash_sessions_operator ON cash_register_sessions(operator_id);
CREATE INDEX IF NOT EXISTS idx_cash_sessions_open ON cash_register_sessions(is_open) WHERE is_open = TRUE;
CREATE INDEX IF NOT EXISTS idx_cash_sessions_closed ON cash_register_sessions(closed_at DESC) WHERE closed_at IS NOT NULL;

-- Comments
COMMENT ON TABLE cash_register_sessions IS 'Stores cash register opening and closing sessions for audit and tracking';
COMMENT ON COLUMN cash_register_sessions.opening_amount IS 'Amount in cash register when opened';
COMMENT ON COLUMN cash_register_sessions.closing_amount IS 'Amount in cash register when closed';
COMMENT ON COLUMN cash_register_sessions.is_open IS 'Whether this session is currently open';

