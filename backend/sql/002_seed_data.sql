-- Seed data for rates table (sample rates)
INSERT INTO rates (vehicle_type, rate_type, amount, description, is_active) VALUES
  ('car', 'hourly', 6.00, 'Hourly rate for cars', true),
  ('motorcycle', 'hourly', 4.00, 'Hourly rate for motorcycles', true),
  ('truck', 'hourly', 10.00, 'Hourly rate for trucks', true),
  ('car', 'daily', 50.00, 'Daily rate for cars', true),
  ('motorcycle', 'daily', 30.00, 'Daily rate for motorcycles', true),
  ('truck', 'daily', 80.00, 'Daily rate for trucks', true),
  ('car', 'monthly', 400.00, 'Monthly rate for cars', true),
  ('motorcycle', 'monthly', 250.00, 'Monthly rate for motorcycles', true),
  ('truck', 'monthly', 600.00, 'Monthly rate for trucks', true)
ON CONFLICT DO NOTHING;
