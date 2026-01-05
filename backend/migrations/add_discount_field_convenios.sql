-- =====================================================
-- MIGRATION: Adicionar Campo de Desconto Percentual
-- =====================================================
-- Data: 2026-01-05
-- Descrição: Adiciona campo opcional de desconto percentual
--            na tabela convenios_planos
-- =====================================================

-- Adicionar coluna porcentagem_desconto
ALTER TABLE convenios_planos
ADD COLUMN IF NOT EXISTS porcentagem_desconto DECIMAL(5,2) DEFAULT NULL
CHECK (porcentagem_desconto IS NULL OR (porcentagem_desconto >= 0 AND porcentagem_desconto <= 100));

-- Comentário explicativo
COMMENT ON COLUMN convenios_planos.porcentagem_desconto IS 'Desconto percentual aplicado sobre o valor base da fatura (0-100%). Campo opcional.';

-- =====================================================
-- ROLLBACK (se necessário)
-- =====================================================
-- Para reverter esta migration, execute:
-- ALTER TABLE convenios_planos DROP COLUMN IF EXISTS porcentagem_desconto;
-- =====================================================
