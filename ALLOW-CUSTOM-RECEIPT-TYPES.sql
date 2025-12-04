-- ================================================
-- PERMITIR TIPOS CUSTOMIZADOS DE RECIBOS
-- Execute este script no Supabase SQL Editor
-- ================================================
-- Este script remove a constraint CHECK que limita
-- os tipos de recibos aos 3 padrões, permitindo
-- que usuários criem tipos customizados.
-- ================================================

-- 1. Remover a constraint CHECK existente
ALTER TABLE receipt_templates 
DROP CONSTRAINT IF EXISTS receipt_templates_template_type_check;

-- 2. Verificar se a constraint foi removida
SELECT 
  conname AS constraint_name,
  contype AS constraint_type
FROM pg_constraint
WHERE conrelid = 'receipt_templates'::regclass
  AND conname LIKE '%template_type%';

-- Se retornar vazio, a constraint foi removida com sucesso

-- 3. Adicionar validação mais flexível (opcional, apenas para garantir formato)
-- Permite qualquer string, mas recomenda usar nomes descritivos
-- Não adicionamos constraint, apenas comentário

COMMENT ON COLUMN receipt_templates.template_type IS 
  'Type of receipt: pode ser um dos tipos padrão (parking_ticket, monthly_payment, general_receipt) ou um tipo customizado criado pelo usuário';

-- ================================================
-- PRONTO! Agora o sistema aceita tipos customizados
-- ================================================
-- Tipos padrão continuam funcionando normalmente
-- Novos tipos podem ser criados via interface
-- ================================================



