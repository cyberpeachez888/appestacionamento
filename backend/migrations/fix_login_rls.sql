-- =====================================================
-- CORREÇÃO CRÍTICA DE LOGIN (RLS)
-- =====================================================
-- O backend não está conseguindo ler o usuário para verificar a senha
-- porque o RLS (Row Level Security) está bloqueando.

-- 1. Permitir que o backend (anon) leia a tabela de usuários para fazer login
CREATE POLICY "Allow anon read access to users"
ON users FOR SELECT
TO anon
USING (true);

-- =====================================================
-- Execute este script no SQL Editor do Supabase IMEDIATAMENTE.
-- Isso deve resolver o erro de "Credenciais inválidas".
-- =====================================================
