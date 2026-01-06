-- =====================================================
-- VERIFICAÇÃO DE INTEGRIDADE DOS DADOS
-- =====================================================
-- Este script conta quantos registros existem em cada tabela
-- para sabermos se os dados sumiram ou se estão apenas escondidos.

SELECT 'tickets' as tabela, count(*) as total FROM tickets
UNION ALL
SELECT 'convenios', count(*) FROM convenios
UNION ALL
SELECT 'convenios_movimentacoes', count(*) FROM convenios_movimentacoes
UNION ALL
SELECT 'payments', count(*) FROM payments
UNION ALL
SELECT 'users', count(*) FROM users;

-- Se os números forem maiores que 0, seus dados ESTÃO AÍ.
-- O problema é apenas que o aplicativo não consegue vê-los.
