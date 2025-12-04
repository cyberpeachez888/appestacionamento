-- ================================================
-- VERIFICAR E CRIAR TABELA cash_register_sessions
-- Execute este script no Supabase SQL Editor
-- ================================================

-- 1. Verificar se a tabela existe
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'cash_register_sessions'
) AS table_exists;

-- 2. Se não existir, criar a tabela
CREATE TABLE IF NOT EXISTS cash_register_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Session Information
  opened_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMP WITH TIME ZONE,
  
  -- Financial Information
  opening_amount NUMERIC NOT NULL DEFAULT 0,
  closing_amount NUMERIC,
  
  -- Operator Information
  operator_id UUID REFERENCES users(id) ON DELETE SET NULL,
  operator_name TEXT NOT NULL,
  
  -- Status
  is_open BOOLEAN NOT NULL DEFAULT TRUE,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_cash_sessions_opened ON cash_register_sessions(opened_at DESC);
CREATE INDEX IF NOT EXISTS idx_cash_sessions_operator ON cash_register_sessions(operator_id);
CREATE INDEX IF NOT EXISTS idx_cash_sessions_open ON cash_register_sessions(is_open) WHERE is_open = TRUE;
CREATE INDEX IF NOT EXISTS idx_cash_sessions_closed ON cash_register_sessions(closed_at DESC) WHERE closed_at IS NOT NULL;

-- 4. Adicionar comentários
COMMENT ON TABLE cash_register_sessions IS 'Stores cash register opening and closing sessions for audit and tracking';
COMMENT ON COLUMN cash_register_sessions.opening_amount IS 'Amount in cash register when opened';
COMMENT ON COLUMN cash_register_sessions.closing_amount IS 'Amount in cash register when closed';
COMMENT ON COLUMN cash_register_sessions.is_open IS 'Whether this session is currently open';

-- 5. Habilitar RLS (Row Level Security)
ALTER TABLE cash_register_sessions ENABLE ROW LEVEL SECURITY;

-- 6. Criar políticas RLS (permitir leitura/escrita para usuários autenticados)
DROP POLICY IF EXISTS "Allow authenticated users to read cash register sessions" ON cash_register_sessions;
CREATE POLICY "Allow authenticated users to read cash register sessions"
  ON cash_register_sessions
  FOR SELECT
  USING (true); -- Permitir leitura para todos (necessário para verificar se está aberto)

DROP POLICY IF EXISTS "Allow authenticated users to insert cash register sessions" ON cash_register_sessions;
CREATE POLICY "Allow authenticated users to insert cash register sessions"
  ON cash_register_sessions
  FOR INSERT
  WITH CHECK (true); -- Permitir inserção (o backend valida autenticação)

DROP POLICY IF EXISTS "Allow authenticated users to update cash register sessions" ON cash_register_sessions;
CREATE POLICY "Allow authenticated users to update cash register sessions"
  ON cash_register_sessions
  FOR UPDATE
  USING (true)
  WITH CHECK (true); -- Permitir atualização (o backend valida autenticação)

-- 7. Verificar estrutura da tabela
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'cash_register_sessions'
ORDER BY ordinal_position;

-- ================================================
-- PRONTO! A tabela deve estar criada agora
-- ================================================



