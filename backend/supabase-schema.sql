-- Supabase Schema for App Estacionamento
-- Run this in your Supabase SQL Editor to create all required tables

-- Rates table
CREATE TABLE IF NOT EXISTS rates (
  id UUID PRIMARY KEY,
  vehicle_type TEXT NOT NULL,
  rate_type TEXT NOT NULL,
  value NUMERIC NOT NULL,
  unit TEXT NOT NULL,
  courtesy_minutes INTEGER DEFAULT 0,
  config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- Pricing rules (used by advanced calculator)
CREATE TABLE IF NOT EXISTS pricing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rate_id UUID NOT NULL REFERENCES rates(id) ON DELETE CASCADE,
  rule_type TEXT NOT NULL,
  conditions JSONB DEFAULT '{}'::jsonb,
  value_adjustment JSONB,
  priority INTEGER DEFAULT 0,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pricing_rules_rate ON pricing_rules(rate_id);

-- Time windows for complex tariffs (diária, pernoite, semanal, quinzenal)
CREATE TABLE IF NOT EXISTS rate_time_windows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rate_id UUID NOT NULL REFERENCES rates(id) ON DELETE CASCADE,
  window_type TEXT NOT NULL,
  start_time TIME,
  end_time TIME,
  start_day SMALLINT,
  end_day SMALLINT,
  duration_limit_minutes INTEGER,
  extra_rate_id UUID REFERENCES rates(id),
  metadata JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rate_time_windows_rate ON rate_time_windows(rate_id);
CREATE INDEX IF NOT EXISTS idx_rate_time_windows_type ON rate_time_windows(window_type);

-- Thresholds / caps to suggest or auto aplicar outras tarifas (ex.: diária)
CREATE TABLE IF NOT EXISTS rate_thresholds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_rate_id UUID NOT NULL REFERENCES rates(id) ON DELETE CASCADE,
  target_rate_id UUID NOT NULL REFERENCES rates(id),
  threshold_amount NUMERIC NOT NULL,
  auto_apply BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_rate_thresholds_unique
ON rate_thresholds (source_rate_id, target_rate_id);


-- Monthly customers table
CREATE TABLE IF NOT EXISTS monthly_customers (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  cpf TEXT,
  plate TEXT,
  vehicle_type TEXT,
  value NUMERIC NOT NULL,
  contract_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_payment TIMESTAMP WITH TIME ZONE,
  due_date TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tickets table
CREATE TABLE IF NOT EXISTS tickets (
  id UUID PRIMARY KEY,
  vehicle_plate TEXT NOT NULL,
  vehicle_type TEXT NOT NULL,
  entry_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  exit_time TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER,
  amount NUMERIC,
  status TEXT DEFAULT 'open',
  metadata JSONB,
  tariff_id UUID,
  tariff_type TEXT,
  reissued_from UUID,
  reissued_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tickets_tariff ON tickets(tariff_id);
CREATE INDEX IF NOT EXISTS idx_tickets_reissued_from ON tickets(reissued_from);

-- Ticket coupons (entry/exit, reemissão)
CREATE TABLE IF NOT EXISTS ticket_coupons (
  id UUID PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- entry, exit
  issued_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT DEFAULT 'active', -- active, void_tariff_change, void_manual, used
  metadata JSONB,
  reissued_from UUID REFERENCES ticket_coupons(id),
  reissued_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ticket_coupons_ticket ON ticket_coupons(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_coupons_status ON ticket_coupons(status);

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY,
  target_type TEXT NOT NULL, -- 'ticket', 'monthly_customer'
  target_id UUID NOT NULL,
  date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  value NUMERIC NOT NULL,
  method TEXT NOT NULL, -- 'cash', 'card', 'pix', etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Users table (authentication & RBAC)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  date_of_birth DATE,
  email TEXT UNIQUE NOT NULL,
  login TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'operator', -- 'admin', 'operator'
  permissions JSONB DEFAULT '{}'::jsonb, -- fine-grained permissions flags
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_login ON users(login);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Company config table (single row)
CREATE TABLE IF NOT EXISTS company_config (
  id TEXT PRIMARY KEY DEFAULT 'default',
  name TEXT,
  legal_name TEXT,
  cnpj TEXT,
  address TEXT,
  phone TEXT,
  primary_color TEXT DEFAULT '#2563eb',
  receipt_counter INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Vehicle types table
CREATE TABLE IF NOT EXISTS vehicle_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_entry_time ON tickets(entry_time);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(date);
CREATE INDEX IF NOT EXISTS idx_payments_target ON payments(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_monthly_customers_status ON monthly_customers(status);

-- Insert default company config
INSERT INTO company_config (id, name) VALUES ('default', 'Estacionamento')
ON CONFLICT (id) DO NOTHING;

-- Create initial admin user placeholder (requires manual password hash insertion)
-- Example hash can be generated with bcryptjs (cost 10):
-- INSERT INTO users (id, name, email, login, password_hash, role) VALUES (
--   gen_random_uuid(), 'Administrador', 'admin@example.com', 'admin', '$2a$10$CHANGE_ME_HASH', 'admin'
-- ) ON CONFLICT (login) DO NOTHING;

-- Insert default vehicle types
INSERT INTO vehicle_types (name, is_default) VALUES 
  ('Carro', true),
  ('Moto', true),
  ('Caminhonete', true),
  ('Van', true),
  ('Ônibus', true)
ON CONFLICT (name) DO NOTHING;

-- Audit log table for user actions
CREATE TABLE IF NOT EXISTS user_events (
  id UUID PRIMARY KEY,
  actor_id TEXT NOT NULL,
  actor_login TEXT,
  actor_name TEXT,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_events_created_at ON user_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_events_action ON user_events (action);
CREATE INDEX IF NOT EXISTS idx_user_events_actor ON user_events (actor_id);
