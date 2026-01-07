-- CORREÇÃO DEFINITIVA: RLS para Cash Register Sessions
-- Execute este script no SQL Editor do Supabase

-- 1. Desabilitar RLS temporariamente para limpeza
ALTER TABLE cash_register_sessions DISABLE ROW LEVEL SECURITY;

-- 2. Remover TODAS as políticas existentes
DROP POLICY IF EXISTS "Allow all for authenticated users" ON cash_register_sessions;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON cash_register_sessions;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON cash_register_sessions;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON cash_register_sessions;
DROP POLICY IF EXISTS "cash_register_select" ON cash_register_sessions;
DROP POLICY IF EXISTS "cash_register_insert" ON cash_register_sessions;
DROP POLICY IF EXISTS "cash_register_update" ON cash_register_sessions;
DROP POLICY IF EXISTS "cash_register_select_policy" ON cash_register_sessions;
DROP POLICY IF EXISTS "cash_register_insert_policy" ON cash_register_sessions;
DROP POLICY IF EXISTS "cash_register_update_policy" ON cash_register_sessions;

-- 3. Corrigir registros com operator_id NULL
UPDATE cash_register_sessions 
SET operator_id = 'a48b62c2-d9e9-4358-ba8f-f8f2a0d0428f' 
WHERE operator_id IS NULL;

-- 4. Tornar operator_id obrigatório
ALTER TABLE cash_register_sessions 
ALTER COLUMN operator_id SET NOT NULL;

-- 5. Reabilitar RLS
ALTER TABLE cash_register_sessions ENABLE ROW LEVEL SECURITY;

-- 6. Criar políticas PERMISSIVAS (não restritivas)
-- Política de SELECT: todos autenticados podem ver
CREATE POLICY "cash_sessions_select_all" 
ON cash_register_sessions FOR SELECT 
TO authenticated
USING (true);

-- Política de INSERT: todos autenticados podem inserir
CREATE POLICY "cash_sessions_insert_all" 
ON cash_register_sessions FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Política de UPDATE: todos autenticados podem atualizar
CREATE POLICY "cash_sessions_update_all" 
ON cash_register_sessions FOR UPDATE 
TO authenticated
USING (true)
WITH CHECK (true);

-- Política de DELETE: todos autenticados podem deletar
CREATE POLICY "cash_sessions_delete_all" 
ON cash_register_sessions FOR DELETE 
TO authenticated
USING (true);

-- 7. Garantir permissões
GRANT ALL ON cash_register_sessions TO authenticated;
GRANT ALL ON cash_register_sessions TO service_role;

-- 8. Fazer o mesmo para cash_transactions
ALTER TABLE cash_transactions DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for authenticated users" ON cash_transactions;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON cash_transactions;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON cash_transactions;
DROP POLICY IF EXISTS "cash_transactions_select" ON cash_transactions;
DROP POLICY IF EXISTS "cash_transactions_insert" ON cash_transactions;
DROP POLICY IF EXISTS "cash_transactions_update" ON cash_transactions;

ALTER TABLE cash_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cash_transactions_select_all" 
ON cash_transactions FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "cash_transactions_insert_all" 
ON cash_transactions FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "cash_transactions_update_all" 
ON cash_transactions FOR UPDATE 
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "cash_transactions_delete_all" 
ON cash_transactions FOR DELETE 
TO authenticated
USING (true);

GRANT ALL ON cash_transactions TO authenticated;
GRANT ALL ON cash_transactions TO service_role;

-- 9. Verificação final
SELECT 
    tablename,
    policyname,
    cmd,
    qual as "USING",
    with_check as "WITH CHECK"
FROM pg_policies 
WHERE tablename IN ('cash_register_sessions', 'cash_transactions')
ORDER BY tablename, cmd;
