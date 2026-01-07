-- Diagnóstico: Políticas RLS para DELETE em tickets e payments

-- 1. Verificar políticas RLS em tickets
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd,
    qual as "USING",
    with_check as "WITH CHECK"
FROM pg_policies 
WHERE tablename = 'tickets'
AND cmd = 'DELETE'
ORDER BY policyname;

-- 2. Verificar políticas RLS em payments
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd,
    qual as "USING",
    with_check as "WITH CHECK"
FROM pg_policies 
WHERE tablename = 'payments'
AND cmd = 'DELETE'
ORDER BY policyname;

-- 3. Verificar se RLS está habilitado
SELECT 
    schemaname,
    tablename,
    rowsecurity as "RLS Enabled"
FROM pg_tables 
WHERE tablename IN ('tickets', 'payments');

-- 4. Testar DELETE como service_role (deve funcionar)
-- Este teste NÃO deve ser executado em produção!
-- SELECT COUNT(*) FROM tickets WHERE status = 'closed';
-- SELECT COUNT(*) FROM payments WHERE target_type = 'ticket';
