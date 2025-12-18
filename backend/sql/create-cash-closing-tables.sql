-- Daily Cash Closing System Migration

-- 1. Create cash_transactions table for Sangrias and Suprimentos
CREATE TABLE IF NOT EXISTS cash_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES cash_register_sessions(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('sangria', 'suprimento')),
  amount NUMERIC NOT NULL CHECK (amount > 0),
  description TEXT,
  operator_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cash_transactions_session ON cash_transactions(session_id);

-- 2. Update cash_register_sessions with closing details
ALTER TABLE cash_register_sessions 
ADD COLUMN IF NOT EXISTS expected_amount NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS actual_amount NUMERIC,
ADD COLUMN IF NOT EXISTS difference NUMERIC,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS report_sequential_number SERIAL;

-- 3. Add new template types to receipt_templates
-- We need to update the check constraint if it exists
DO $$ 
BEGIN
    ALTER TABLE receipt_templates DROP CONSTRAINT IF EXISTS receipt_templates_template_type_check;
    ALTER TABLE receipt_templates ADD CONSTRAINT receipt_templates_template_type_check 
    CHECK (template_type IN ('parking_ticket', 'monthly_payment', 'general_receipt', 'cash_closing_thermal', 'cash_closing_pdf'));
END $$;

-- 4. Insert Default Templates for Closing
INSERT INTO receipt_templates (
  template_name,
  template_type,
  description,
  is_default,
  available_variables
) VALUES 
(
  'Fechamento de Caixa Térmico (80mm)',
  'cash_closing_thermal',
  'Template padrão para fechamento de caixa em impressora térmica',
  TRUE,
  ARRAY['companyName', 'companyCnpj', 'companyAddress', 'companyPhone', 'date', 'openedAt', 'closedAt', 'operatorName', 'reportNumber', 'saldoInicial', 'totalEntradas', 'totalSaidas', 'saldoFinal', 'diferenca', 'mensalistasValor', 'avulsosValor', 'conveniosValor', 'dinheiro', 'cartaoDebito', 'cartaoCredito', 'pix', 'totalVeiculos', 'ticketMedio', 'tempoMedio', 'sangriasTotal', 'suprimentosTotal', 'observacoes']
),
(
  'Fechamento de Caixa PDF (A4)',
  'cash_closing_pdf',
  'Template padrão para fechamento de caixa em formato PDF A4',
  TRUE,
  ARRAY['companyName', 'companyCnpj', 'companyAddress', 'companyPhone', 'date', 'openedAt', 'closedAt', 'operatorName', 'reportNumber', 'saldoInicial', 'totalEntradas', 'totalSaidas', 'saldoFinal', 'diferenca', 'mensalistasValor', 'avulsosValor', 'conveniosValor', 'dinheiro', 'cartaoDebito', 'cartaoCredito', 'pix', 'totalVeiculos', 'ticketMedio', 'tempoMedio', 'sangriasTotal', 'suprimentosTotal', 'observacoes']
)
ON CONFLICT (template_name) DO NOTHING;
