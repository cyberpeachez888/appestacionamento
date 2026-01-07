-- 1.1: Verificar políticas RLS existentes
SELECT 
    policyname,
    cmd,
    qual::text,
    with_check::text
FROM pg_policies 
WHERE tablename = 'cash_register_sessions';

-- 1.2: Verificar estrutura da tabela
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'cash_register_sessions'
ORDER BY ordinal_position;

-- 1.3: Verificar se RLS está ativo
SELECT 
    tablename,
    rowsecurity
FROM pg_tables
WHERE tablename = 'cash_register_sessions';

-- 1.4: Testar autenticação atual (Isso retornará NULL se rodado no SQL Editor puramente, mas é útil se rodado via API)
-- SELECT auth.uid() as current_user_id; 

-- 1.5: Verificar sessões existentes
SELECT * FROM cash_register_sessions LIMIT 5;
