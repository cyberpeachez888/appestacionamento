-- ADD VEHICLE TYPES TABLE
-- Run this in your Supabase SQL Editor

-- Vehicle types table
CREATE TABLE IF NOT EXISTS vehicle_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default vehicle types
INSERT INTO vehicle_types (name, is_default) VALUES 
  ('Carro', true),
  ('Moto', true),
  ('Caminhonete', true),
  ('Van', true),
  ('Ônibus', true)
ON CONFLICT (name) DO NOTHING;
