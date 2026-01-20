-- =====================================================
-- SCRIPT: Deletar Todos os Convênios
-- =====================================================
-- ATENÇÃO: Esta operação é IRREVERSÍVEL!
-- Faça backup antes de executar.
-- =====================================================

-- Desabilitar triggers temporariamente (opcional, para performance)
-- SET session_replication_role = 'replica';

-- 1. Deletar movimentações
DELETE FROM convenios_movimentacoes;

-- 2. Deletar veículos cadastrados
DELETE FROM convenios_veiculos;

-- 3. Deletar faturas
DELETE FROM convenios_faturas;

-- 4. Deletar documentos (se existir)
DELETE FROM convenios_documentos;

-- 5. Deletar planos
DELETE FROM convenios_planos;

-- 6. Deletar convênios (tabela principal)
DELETE FROM convenios;

-- Reabilitar triggers
-- SET session_replication_role = 'origin';

-- Verificar se tudo foi deletado
SELECT 'convenios' as tabela, COUNT(*) as total FROM convenios
UNION ALL
SELECT 'convenios_planos', COUNT(*) FROM convenios_planos
UNION ALL
SELECT 'convenios_veiculos', COUNT(*) FROM convenios_veiculos
UNION ALL
SELECT 'convenios_movimentacoes', COUNT(*) FROM convenios_movimentacoes
UNION ALL
SELECT 'convenios_faturas', COUNT(*) FROM convenios_faturas;

-- =====================================================
-- Resultado esperado: todas as tabelas com 0 registros
-- =====================================================
