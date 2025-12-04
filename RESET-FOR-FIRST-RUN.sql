-- ================================================
-- RESET COMPLETO PARA FIRST RUN
-- Execute este script no Supabase SQL Editor
-- ================================================
-- Este script:
-- 1. Garante que setup_completed = false
-- 2. Limpa TODOS os dados de teste
-- 3. Remove usuário admin de teste
-- ================================================

-- ================================================
-- 1. GARANTIR QUE SETUP ESTÁ COMO FALSE
-- ================================================

-- Deletar qualquer registro existente
DELETE FROM company_settings;

-- Inserir novo registro com setup_completed = false
INSERT INTO company_settings (setup_completed)
VALUES (false);

-- Verificar
SELECT 
  id, 
  company_name, 
  setup_completed, 
  created_at 
FROM company_settings;
-- Deve retornar: setup_completed = false

-- ================================================
-- 2. LIMPAR TODOS OS DADOS DE TESTE
-- ================================================
-- Usa DO blocks para evitar erros se tabelas não existirem

-- Função auxiliar para deletar apenas se a tabela existir
DO $$
BEGIN
    -- Ordem importante devido a foreign keys
    -- Tabelas que devem existir
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_events') THEN
        DELETE FROM user_events WHERE id IS NOT NULL;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'monthly_reports') THEN
        DELETE FROM monthly_reports WHERE id IS NOT NULL;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'receipts') THEN
        DELETE FROM receipts WHERE id IS NOT NULL;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'payments') THEN
        DELETE FROM payments WHERE id IS NOT NULL;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'tickets') THEN
        DELETE FROM tickets WHERE id IS NOT NULL;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'monthly_customers') THEN
        DELETE FROM monthly_customers WHERE id IS NOT NULL;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'rates') THEN
        DELETE FROM rates WHERE id IS NOT NULL;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'vehicle_types') THEN
        DELETE FROM vehicle_types WHERE id IS NOT NULL;
    END IF;
    
    -- Tabelas opcionais (podem não existir)
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'rate_time_windows') THEN
        DELETE FROM rate_time_windows WHERE id IS NOT NULL;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'rate_thresholds') THEN
        DELETE FROM rate_thresholds WHERE id IS NOT NULL;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'pricing_rules') THEN
        DELETE FROM pricing_rules WHERE id IS NOT NULL;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'archived_tickets') THEN
        DELETE FROM archived_tickets WHERE id IS NOT NULL;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'expenses') THEN
        DELETE FROM expenses WHERE id IS NOT NULL;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'manual_revenues') THEN
        DELETE FROM manual_revenues WHERE id IS NOT NULL;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'cash_register_sessions') THEN
        DELETE FROM cash_register_sessions WHERE id IS NOT NULL;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'printer_jobs') THEN
        DELETE FROM printer_jobs WHERE id IS NOT NULL;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'receipt_templates') THEN
        DELETE FROM receipt_templates WHERE id IS NOT NULL;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'business_hours') THEN
        DELETE FROM business_hours WHERE id IS NOT NULL;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'holidays') THEN
        DELETE FROM holidays WHERE id IS NOT NULL;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'special_events') THEN
        DELETE FROM special_events WHERE id IS NOT NULL;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'ticket_coupons') THEN
        DELETE FROM ticket_coupons WHERE id IS NOT NULL;
    END IF;
END $$;

-- ================================================
-- 3. REMOVER USUÁRIO ADMIN DE TESTE
-- ================================================

-- Remover usuário admin de teste (se existir)
DELETE FROM users WHERE login = 'admin';

-- Verificar se foi removido
SELECT login, name, role FROM users;
-- Não deve ter nenhum usuário 'admin'

-- ================================================
-- 4. VERIFICAÇÃO FINAL
-- ================================================

-- Verificar setup
SELECT 
  'Setup Status' as check_type,
  setup_completed as value
FROM company_settings;

-- Contar registros restantes (devem ser 0 ou muito poucos)
-- Usa verificação de existência para evitar erros
SELECT 
  'Tickets' as table_name,
  CASE 
    WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'tickets') 
    THEN (SELECT COUNT(*) FROM tickets)::text
    ELSE 'Tabela não existe'
  END as count
UNION ALL
SELECT 
  'Monthly Customers',
  CASE 
    WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'monthly_customers') 
    THEN (SELECT COUNT(*) FROM monthly_customers)::text
    ELSE 'Tabela não existe'
  END
UNION ALL
SELECT 
  'Payments',
  CASE 
    WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'payments') 
    THEN (SELECT COUNT(*) FROM payments)::text
    ELSE 'Tabela não existe'
  END
UNION ALL
SELECT 
  'Rates',
  CASE 
    WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'rates') 
    THEN (SELECT COUNT(*) FROM rates)::text
    ELSE 'Tabela não existe'
  END
UNION ALL
SELECT 
  'Vehicle Types',
  CASE 
    WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'vehicle_types') 
    THEN (SELECT COUNT(*) FROM vehicle_types)::text
    ELSE 'Tabela não existe'
  END
UNION ALL
SELECT 
  'Users',
  CASE 
    WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users') 
    THEN (SELECT COUNT(*) FROM users)::text
    ELSE 'Tabela não existe'
  END;

-- ================================================
-- PRONTO! Agora acesse o Vercel e o wizard deve aparecer
-- ================================================

