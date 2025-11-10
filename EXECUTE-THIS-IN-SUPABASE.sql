-- ================================================
-- THEPROPARKING APP - FIRST-RUN SETUP SQL
-- Execute este script no Supabase SQL Editor
-- ================================================

-- Este script cria a tabela company_settings necessária
-- para o wizard de primeira execução funcionar.

-- ================================================
-- 1. CREATE COMPANY_SETTINGS TABLE
-- ================================================

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

-- ================================================
-- 2. ENSURE ONLY ONE COMPANY RECORD
-- ================================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_single_company_settings 
  ON company_settings ((true));

-- ================================================
-- 3. ENABLE ROW LEVEL SECURITY
-- ================================================

ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;

-- ================================================
-- 4. RLS POLICIES
-- ================================================

-- Allow authenticated users to read company settings
DROP POLICY IF EXISTS "Allow authenticated users to read company settings" ON company_settings;
CREATE POLICY "Allow authenticated users to read company settings"
  ON company_settings
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow service role to manage (for setup process)
DROP POLICY IF EXISTS "Allow service role to manage company settings" ON company_settings;
CREATE POLICY "Allow service role to manage company settings"
  ON company_settings
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ================================================
-- 5. AUTO-UPDATE TIMESTAMP FUNCTION
-- ================================================

CREATE OR REPLACE FUNCTION update_company_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- 6. TRIGGER FOR AUTO-UPDATE
-- ================================================

DROP TRIGGER IF EXISTS update_company_settings_timestamp ON company_settings;
CREATE TRIGGER update_company_settings_timestamp
  BEFORE UPDATE ON company_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_company_settings_updated_at();

-- ================================================
-- 7. INSERT INITIAL EMPTY RECORD
-- ================================================

INSERT INTO company_settings (setup_completed)
VALUES (false)
ON CONFLICT DO NOTHING;

-- ================================================
-- 8. ADD COMMENTS FOR DOCUMENTATION
-- ================================================

COMMENT ON TABLE company_settings IS 'Stores parking company information configured during first-run setup';
COMMENT ON COLUMN company_settings.setup_completed IS 'Indicates whether the initial setup wizard has been completed';
COMMENT ON COLUMN company_settings.cnpj IS 'Brazilian company registration number (Cadastro Nacional da Pessoa Jurídica)';

-- ================================================
-- SETUP COMPLETE!
-- ================================================

-- Verification query (should return 1 row with setup_completed = false)
SELECT 
  id, 
  company_name, 
  setup_completed, 
  created_at 
FROM company_settings;

-- Expected result:
-- | id (UUID) | company_name (null) | setup_completed (false) | created_at (now) |

-- ================================================
-- NOTA: Depois de executar este SQL, reinicie o
-- frontend. Você será redirecionado automaticamente
-- para o wizard de configuração em /setup
-- ================================================
