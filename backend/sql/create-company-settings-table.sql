-- Create company_settings table for first-run setup
-- This stores the parking company's information

CREATE TABLE IF NOT EXISTS company_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name VARCHAR(255), -- Will be filled during setup
  cnpj VARCHAR(18), -- Format: 00.000.000/0000-00
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(2),
  zip_code VARCHAR(9), -- Format: 00000-000
  phone VARCHAR(20),
  email VARCHAR(255),
  logo_url TEXT,
  setup_completed BOOLEAN DEFAULT false,
  setup_completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure only one company settings record exists
CREATE UNIQUE INDEX IF NOT EXISTS idx_single_company_settings ON company_settings ((true));

-- Add RLS policies
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read company settings (needed for setup check)
CREATE POLICY "Allow anyone to read company settings"
  ON company_settings
  FOR SELECT
  USING (true);

-- Allow anyone to manage company settings
CREATE POLICY "Allow anyone to manage company settings"
  ON company_settings
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_company_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_company_settings_timestamp
  BEFORE UPDATE ON company_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_company_settings_updated_at();

-- Insert initial empty record (setup not completed)
INSERT INTO company_settings (setup_completed)
VALUES (false)
ON CONFLICT DO NOTHING;

COMMENT ON TABLE company_settings IS 'Stores parking company information configured during first-run setup';
COMMENT ON COLUMN company_settings.setup_completed IS 'Indicates whether the initial setup wizard has been completed';
COMMENT ON COLUMN company_settings.cnpj IS 'Brazilian company registration number (Cadastro Nacional da Pessoa Jurídica)';
