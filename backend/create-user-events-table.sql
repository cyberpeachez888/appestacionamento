-- Create audit log table for user actions
CREATE TABLE IF NOT EXISTS user_events (
  id uuid PRIMARY KEY,
  actor_id text NOT NULL,
  actor_login text,
  actor_name text,
  action text NOT NULL,
  target_type text,
  target_id text,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_user_events_created_at ON user_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_events_action ON user_events (action);
CREATE INDEX IF NOT EXISTS idx_user_events_actor ON user_events (actor_id);
