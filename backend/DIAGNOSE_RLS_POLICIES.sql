-- ===================================================================
-- DIAGNÓSTICO E CORREÇÃO: RLS Policies para Limpeza de Registros
-- ===================================================================
-- Execute este script no Supabase SQL Editor para diagnosticar e
-- corrigir problemas de Row Level Security que impedem a exclusão
-- de registros operacionais.
-- ===================================================================

-- ===== PARTE 1: DIAGNÓSTICO =====

-- 1. Verificar políticas RLS atuais nas tabelas operacionais
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive,
  roles,
  cmd AS command,
  qual AS using_expression,
  with_check
FROM pg_policies 
WHERE tablename IN ('tickets', 'payments')
ORDER BY tablename, cmd;

-- 2. Verificar se RLS está habilitado nas tabelas
SELECT 
  schemaname, 
  tablename, 
  rowsecurity AS rls_enabled
FROM pg_tables 
WHERE tablename IN ('tickets', 'payments');

-- 3. Verificar constraints de foreign key que podem bloquear DELETE
SELECT
  tc.table_name, 
  kcu.column_name, 
  ccu.table_name AS foreign_table,
  ccu.column_name AS foreign_column,
  rc.delete_rule,
  tc.constraint_name
FROM information_schema.table_constraints tc 
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu
  ON tc.constraint_name = ccu.constraint_name
JOIN information_schema.referential_constraints rc
  ON tc.constraint_name = rc.constraint_name
WHERE tc.table_name IN ('tickets', 'payments')
  AND tc.constraint_type = 'FOREIGN KEY';

-- 4. Verificar se existem triggers que podem interferir
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_table IN ('tickets', 'payments');

-- ===== PARTE 2: CORREÇÃO =====

-- 5. Criar/Atualizar política de DELETE para tickets
-- IMPORTANTE: Ajuste a condição USING conforme suas necessidades de segurança
-- Opção A: Permitir DELETE para todos os usuários autenticados
DROP POLICY IF EXISTS "Allow delete tickets for authenticated users" ON tickets;
CREATE POLICY "Allow delete tickets for authenticated users"
ON tickets
FOR DELETE
TO authenticated
USING (true);

-- Opção B: Permitir DELETE apenas para admins (descomente se preferir)
-- DROP POLICY IF EXISTS "Allow delete tickets for admins" ON tickets;
-- CREATE POLICY "Allow delete tickets for admins"
-- ON tickets
-- FOR DELETE
-- TO authenticated
-- USING (
--   EXISTS (
--     SELECT 1 FROM auth.users
--     WHERE auth.users.id = auth.uid()
--     AND auth.users.raw_user_meta_data->>'role' = 'admin'
--   )
-- );

-- 6. Criar/Atualizar política de DELETE para payments
-- IMPORTANTE: Ajuste a condição USING conforme suas necessidades de segurança
-- Opção A: Permitir DELETE para todos os usuários autenticados
DROP POLICY IF EXISTS "Allow delete payments for authenticated users" ON payments;
CREATE POLICY "Allow delete payments for authenticated users"
ON payments
FOR DELETE
TO authenticated
USING (true);

-- Opção B: Permitir DELETE apenas para admins (descomente se preferir)
-- DROP POLICY IF EXISTS "Allow delete payments for admins" ON payments;
-- CREATE POLICY "Allow delete payments for admins"
-- ON payments
-- FOR DELETE
-- TO authenticated
-- USING (
--   EXISTS (
--     SELECT 1 FROM auth.users
--     WHERE auth.users.id = auth.uid()
--     AND auth.users.raw_user_meta_data->>'role' = 'admin'
--   )
-- );

-- ===== PARTE 3: VERIFICAÇÃO PÓS-CORREÇÃO =====

-- 7. Verificar se as políticas foram criadas corretamente
SELECT 
  tablename, 
  policyname, 
  cmd AS command,
  qual AS using_expression
FROM pg_policies 
WHERE tablename IN ('tickets', 'payments')
  AND cmd = 'DELETE'
ORDER BY tablename;

-- ===== PARTE 4: TESTE MANUAL (OPCIONAL) =====

-- 8. Teste de exclusão (CUIDADO: Isso vai deletar registros reais!)
-- Descomente apenas se quiser testar manualmente
-- DELETE FROM tickets WHERE id = 'ID_DE_TESTE_AQUI';
-- DELETE FROM payments WHERE id = 'ID_DE_TESTE_AQUI';

-- ===== NOTAS IMPORTANTES =====
-- 
-- 1. Se você usar a Opção B (apenas admins), certifique-se de que:
--    - O campo 'role' está armazenado em raw_user_meta_data
--    - O backend está enviando o token de autenticação correto
--
-- 2. Se ainda houver problemas após aplicar as políticas:
--    - Verifique os logs do backend para o erro exato
--    - Confirme que o Supabase client está usando o token correto
--    - Verifique se há outras políticas conflitantes
--
-- 3. Para desabilitar RLS temporariamente (NÃO RECOMENDADO EM PRODUÇÃO):
--    ALTER TABLE tickets DISABLE ROW LEVEL SECURITY;
--    ALTER TABLE payments DISABLE ROW LEVEL SECURITY;
--
-- 4. Para reabilitar RLS:
--    ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
--    ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
