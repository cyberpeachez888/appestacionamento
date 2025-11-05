-- Create tickets table
CREATE TABLE IF NOT EXISTS tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number TEXT UNIQUE NOT NULL,
  vehicle_plate TEXT NOT NULL,
  vehicle_type TEXT NOT NULL CHECK (vehicle_type IN ('car', 'motorcycle', 'truck')),
  entry_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  exit_time TIMESTAMP WITH TIME ZONE,
  is_monthly_client BOOLEAN DEFAULT FALSE,
  monthly_client_id UUID,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create monthly_clients table
CREATE TABLE IF NOT EXISTS monthly_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  vehicle_plate TEXT UNIQUE NOT NULL,
  vehicle_type TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  monthly_fee DECIMAL(10, 2) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create rates table
CREATE TABLE IF NOT EXISTS rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_type TEXT NOT NULL,
  rate_type TEXT NOT NULL CHECK (rate_type IN ('hourly', 'daily', 'monthly')),
  amount DECIMAL(10, 2) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID,
  monthly_client_id UUID,
  amount DECIMAL(10, 2) NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'card', 'pix')),
  payment_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT fk_ticket FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE SET NULL,
  CONSTRAINT fk_monthly_client FOREIGN KEY (monthly_client_id) REFERENCES monthly_clients(id) ON DELETE SET NULL
);

-- Create receipts table
CREATE TABLE IF NOT EXISTS receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_number TEXT UNIQUE NOT NULL,
  payment_id UUID NOT NULL,
  ticket_id UUID,
  monthly_client_id UUID,
  amount DECIMAL(10, 2) NOT NULL,
  issued_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT fk_payment FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE,
  CONSTRAINT fk_receipt_ticket FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE SET NULL,
  CONSTRAINT fk_receipt_monthly_client FOREIGN KEY (monthly_client_id) REFERENCES monthly_clients(id) ON DELETE SET NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_vehicle_plate ON tickets(vehicle_plate);
CREATE INDEX IF NOT EXISTS idx_tickets_entry_time ON tickets(entry_time);
CREATE INDEX IF NOT EXISTS idx_monthly_clients_vehicle_plate ON monthly_clients(vehicle_plate);
CREATE INDEX IF NOT EXISTS idx_monthly_clients_is_active ON monthly_clients(is_active);
CREATE INDEX IF NOT EXISTS idx_payments_ticket_id ON payments(ticket_id);
CREATE INDEX IF NOT EXISTS idx_payments_monthly_client_id ON payments(monthly_client_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_receipts_payment_id ON receipts(payment_id);
CREATE INDEX IF NOT EXISTS idx_receipts_receipt_number ON receipts(receipt_number);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_tickets_updated_at BEFORE UPDATE ON tickets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_monthly_clients_updated_at BEFORE UPDATE ON monthly_clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rates_updated_at BEFORE UPDATE ON rates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
