-- =====================================================
-- SCRIPT DE DIAGNÓSTICO
-- Execute este script no SQL Editor do Supabase
-- =====================================================

-- 1. Contar usuários (para confirmar que existem)
SELECT count(*) as total_usuarios FROM users;

-- 2. Verificar configurações da empresa
SELECT * FROM company_settings;

-- 3. Verificar estado do RLS (Row Level Security)
SELECT 
    tablename, 
    rowsecurity as rls_enabled 
FROM pg_tables 
WHERE tablename IN ('users', 'company_settings');

-- 4. Verificar políticas de segurança existentes
SELECT * FROM pg_policies 
WHERE tablename IN ('users', 'company_settings');
