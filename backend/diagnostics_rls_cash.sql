-- DIAGNÓSTICO COMPLETO: Cash Register RLS
-- Execute este script no SQL Editor do Supabase

-- 1. Verificar políticas RLS atuais
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual as "USING expression",
    with_check as "WITH CHECK expression"
FROM pg_policies 
WHERE tablename = 'cash_register_sessions'
ORDER BY cmd, policyname;

-- 2. Verificar se RLS está habilitado
SELECT 
    schemaname,
    tablename,
    rowsecurity as "RLS Enabled"
FROM pg_tables 
WHERE tablename = 'cash_register_sessions';

-- 3. Verificar grants (permissões)
SELECT 
    grantee,
    privilege_type
FROM information_schema.table_privileges 
WHERE table_name = 'cash_register_sessions'
ORDER BY grantee, privilege_type;

-- 4. Testar inserção como authenticated
SET ROLE authenticated;
SELECT current_user, current_setting('request.jwt.claims', true);

-- Tentar inserir (vai falhar se RLS estiver bloqueando)
INSERT INTO cash_register_sessions (
    operator_id,
    opening_amount,
    is_open,
    opened_at
) VALUES (
    'a48b62c2-d9e9-4358-ba8f-f8f2a0d0428f',
    100.00,
    true,
    NOW()
) RETURNING id;

RESET ROLE;
