-- =====================================================
-- MIGRATION: Add Invoice PDF Storage and Enhanced Fields
-- =====================================================
-- Date: 2026-01-19
-- Description: Adds PDF storage paths, enhanced period tracking,
--              and email fields for invoice generation system
-- =====================================================

-- Add new columns to convenios_faturas table
ALTER TABLE convenios_faturas
ADD COLUMN IF NOT EXISTS pdf_path TEXT,
ADD COLUMN IF NOT EXISTS pdf_filename TEXT,
ADD COLUMN IF NOT EXISTS pdf_generated_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS periodo_data_inicio DATE,
ADD COLUMN IF NOT EXISTS periodo_data_fim DATE,
ADD COLUMN IF NOT EXISTS email_envio TEXT,
ADD COLUMN IF NOT EXISTS num_vagas_cortesia INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS num_vagas_pagas INTEGER DEFAULT 0;

-- Add comments for new columns
COMMENT ON COLUMN convenios_faturas.pdf_path IS 'Caminho do arquivo PDF no servidor (ex: /storage/faturas/2026/fatura-2026-001.pdf)';
COMMENT ON COLUMN convenios_faturas.pdf_filename IS 'Nome do arquivo PDF para download (ex: Fatura-2026-001-Empresa-ABC.pdf)';
COMMENT ON COLUMN convenios_faturas.pdf_generated_at IS 'Timestamp de quando o PDF foi gerado';
COMMENT ON COLUMN convenios_faturas.periodo_data_inicio IS 'Data de início do período de referência';
COMMENT ON COLUMN convenios_faturas.periodo_data_fim IS 'Data de fim do período de referência';
COMMENT ON COLUMN convenios_faturas.email_envio IS 'Email de destino para envio da fatura';
COMMENT ON COLUMN convenios_faturas.num_vagas_cortesia IS 'Número de vagas extras cortesia incluídas na fatura';
COMMENT ON COLUMN convenios_faturas.num_vagas_pagas IS 'Número de vagas extras pagas incluídas na fatura';

-- Create index for PDF lookup
CREATE INDEX IF NOT EXISTS idx_faturas_pdf_path ON convenios_faturas(pdf_path) WHERE pdf_path IS NOT NULL;

-- Create index for date range queries
CREATE INDEX IF NOT EXISTS idx_faturas_periodo_datas ON convenios_faturas(periodo_data_inicio, periodo_data_fim);

-- Add check constraint to ensure PDF fields are consistent
ALTER TABLE convenios_faturas
ADD CONSTRAINT check_pdf_consistency CHECK (
  (pdf_path IS NULL AND pdf_filename IS NULL AND pdf_generated_at IS NULL) OR
  (pdf_path IS NOT NULL AND pdf_filename IS NOT NULL AND pdf_generated_at IS NOT NULL)
);

-- Add check constraint for period dates
ALTER TABLE convenios_faturas
ADD CONSTRAINT check_periodo_dates CHECK (
  periodo_data_fim IS NULL OR periodo_data_inicio IS NULL OR periodo_data_fim >= periodo_data_inicio
);

-- Update existing records to have backward compatibility
UPDATE convenios_faturas
SET 
  num_vagas_cortesia = 0,
  num_vagas_pagas = 0
WHERE num_vagas_cortesia IS NULL OR num_vagas_pagas IS NULL;

-- =====================================================
-- Add columns to convenios_movimentacoes for better tracking
-- =====================================================

-- Add tipo_vaga and tipo_vaga_extra if not exists (may already exist from previous work)
ALTER TABLE convenios_movimentacoes
ADD COLUMN IF NOT EXISTS tipo_vaga TEXT DEFAULT 'regular' CHECK (tipo_vaga IN ('regular', 'extra')),
ADD COLUMN IF NOT EXISTS tipo_vaga_extra TEXT CHECK (tipo_vaga_extra IN ('paga', 'cortesia', NULL)),
ADD COLUMN IF NOT EXISTS valor_cobrado DECIMAL(10,2) DEFAULT 0 CHECK (valor_cobrado >= 0),
ADD COLUMN IF NOT EXISTS vinculado_por UUID REFERENCES users(id);

-- Add comments
COMMENT ON COLUMN convenios_movimentacoes.tipo_vaga IS 'Tipo de vaga: regular (veículo cadastrado) ou extra (visitante)';
COMMENT ON COLUMN convenios_movimentacoes.tipo_vaga_extra IS 'Se tipo_vaga=extra: paga ou cortesia';
COMMENT ON COLUMN convenios_movimentacoes.valor_cobrado IS 'Valor cobrado para vaga extra paga';
COMMENT ON COLUMN convenios_movimentacoes.vinculado_por IS 'Usuário que vinculou a vaga extra';

-- Create index for filtering vagas extras
CREATE INDEX IF NOT EXISTS idx_movimentacoes_tipo_vaga ON convenios_movimentacoes(tipo_vaga);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_tipo_vaga_extra ON convenios_movimentacoes(tipo_vaga_extra) WHERE tipo_vaga_extra IS NOT NULL;

-- =====================================================
-- Create function to generate next invoice number
-- =====================================================

CREATE OR REPLACE FUNCTION get_next_invoice_number(p_year INTEGER)
RETURNS TEXT AS $$
DECLARE
  v_max_num INTEGER;
  v_next_num INTEGER;
  v_invoice_number TEXT;
BEGIN
  -- Get max number for the year
  SELECT COALESCE(MAX(
    CAST(
      SUBSTRING(numero_fatura FROM POSITION('-' IN numero_fatura) + 1)
      AS INTEGER
    )
  ), 0)
  INTO v_max_num
  FROM convenios_faturas
  WHERE SUBSTRING(numero_fatura FROM 1 FOR 4) = p_year::TEXT;
  
  -- Increment
  v_next_num := v_max_num + 1;
  
  -- Format as YYYY-NNN
  v_invoice_number := p_year::TEXT || '-' || LPAD(v_next_num::TEXT, 3, '0');
  
  RETURN v_invoice_number;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_next_invoice_number IS 'Gera o próximo número de fatura no formato YYYY-NNN, resetando a cada ano';

-- =====================================================
-- Create view for pending vagas extras (ready to invoice)
-- =====================================================

CREATE OR REPLACE VIEW convenios_vagas_extras_pendentes AS
SELECT 
  m.*,
  c.nome_empresa,
  c.email_contato,
  u.name as vinculado_por_nome
FROM convenios_movimentacoes m
JOIN convenios c ON m.convenio_id = c.id
LEFT JOIN users u ON m.vinculado_por = u.id
WHERE m.tipo_vaga = 'extra'
  AND m.data_saida IS NOT NULL  -- Finalized (vehicle has exited)
  AND m.faturado = false;       -- Not yet invoiced

COMMENT ON VIEW convenios_vagas_extras_pendentes IS 'Vagas extras finalizadas (com saída) que ainda não foram faturadas';

-- =====================================================
-- END OF MIGRATION
-- =====================================================
