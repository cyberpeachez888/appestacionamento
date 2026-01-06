-- =====================================================
-- RESET DE SENHA ADMIN (CORRIGIDO)
-- Execute este script no SQL Editor do Supabase
-- =====================================================

-- 1. Atualizar a senha do usuário 'admin' para 'admin'
UPDATE users
SET password_hash = '$2a$10$blLjYuLr7HZJfhcjiZ58Oee26jzyOFJunaTiGHvmBAiNHhLIETeLK'
WHERE login = 'admin';

-- 2. Confirmar atualização (usando colunas que sabemos que existem)
SELECT id, login, name, email FROM users WHERE login = 'admin';
