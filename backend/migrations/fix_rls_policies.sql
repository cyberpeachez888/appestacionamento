-- =====================================================
-- CORREÇÃO DE RLS (Row Level Security)
-- =====================================================
-- O backend precisa ler a tabela company_settings para saber
-- se o setup foi concluído. Atualmente apenas 'service_role' tem acesso,
-- mas a API usa a chave 'anon/public' por padrão.

-- 1. Permitir leitura pública na tabela company_settings
CREATE POLICY "Allow public read access to company_settings"
ON company_settings FOR SELECT
TO anon
USING (true);

-- 2. Permitir que usuários anônimos vejam tipos de veículos (necessário para login/setup)
CREATE POLICY "Allow public read access to vehicle_types"
ON vehicle_types FOR SELECT
TO anon
USING (true);

-- =====================================================
-- INSTRUÇÕES:
-- Execute este script no SQL Editor do Supabase para corrigir
-- o problema de "First Run" aparecendo incorretamente.
-- =====================================================
