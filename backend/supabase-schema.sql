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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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
