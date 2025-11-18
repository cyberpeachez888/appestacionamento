-- ============================================
-- ATUALIZAR SCHEMA DE RECEITAS MANUAIS
-- ============================================
-- Execute este script no Supabase SQL Editor
-- Este script atualiza a tabela manual_revenues para:
-- - Remover restrição de categoria (campo livre)
-- - Adicionar coluna status (Pago/Não Pago)
-- ============================================

-- Remover constraint de categoria para permitir valores livres
ALTER TABLE manual_revenues 
DROP CONSTRAINT IF EXISTS manual_revenues_category_check;

-- Adicionar coluna status se não existir
ALTER TABLE manual_revenues 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Não Pago';

-- Adicionar constraint para status
ALTER TABLE manual_revenues 
ADD CONSTRAINT manual_revenues_status_check 
CHECK (status IN ('Pago', 'Não Pago'));

-- Atualizar registros existentes para ter status padrão
UPDATE manual_revenues 
SET status = 'Não Pago' 
WHERE status IS NULL;

-- Criar índice para status
CREATE INDEX IF NOT EXISTS idx_manual_revenues_status ON manual_revenues(status);

-- ============================================
-- FIM DO SCRIPT
-- ============================================
-- Após executar, a página Financeiro deve suportar categoria livre e status
-- ============================================

