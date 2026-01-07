-- 1.1: Remover Política RLS Conflitante
DROP POLICY IF EXISTS "Allow all for authenticated users" ON cash_register_sessions;

-- 1.2: Corrigir Registros com operator_id NULL
-- Preencher operator_id NULL com seu user_id específico fornecido
UPDATE cash_register_sessions 
SET operator_id = 'a48b62c2-d9e9-4358-ba8f-f8f2a0d0428f' 
WHERE operator_id IS NULL;

-- 1.3: Tornar operator_id Obrigatório
ALTER TABLE cash_register_sessions 
ALTER COLUMN operator_id SET NOT NULL;

-- 1.4: Verificar Políticas Restantes (Queries de leitura)
SELECT 
    policyname, 
    cmd, 
    using_expression, 
    with_check_expression
FROM pg_policies 
WHERE tablename = 'cash_register_sessions'
ORDER BY cmd;
