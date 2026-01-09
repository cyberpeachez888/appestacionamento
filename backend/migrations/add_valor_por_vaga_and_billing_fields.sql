-- =====================================================
-- MIGRATION: Add Valor por Vaga and Billing Automation Fields
-- =====================================================
-- Created: 2026-01-09
-- Description: Adds pricing per spot and pós-pago billing cycle fields
-- =====================================================

-- Add valor_por_vaga field
ALTER TABLE convenios_planos 
ADD COLUMN IF NOT EXISTS valor_por_vaga DECIMAL(10,2) CHECK (valor_por_vaga >= 0);

-- Add pós-pago billing cycle fields
ALTER TABLE convenios_planos
ADD COLUMN IF NOT EXISTS dia_fechamento INTEGER CHECK (dia_fechamento BETWEEN 1 AND 28),
ADD COLUMN IF NOT EXISTS dia_vencimento_pos_pago INTEGER CHECK (dia_vencimento_pos_pago BETWEEN 1 AND 28);

-- Add porcentagem_desconto if it doesn't exist (already exists in schema)
ALTER TABLE convenios_planos
ADD COLUMN IF NOT EXISTS porcentagem_desconto DECIMAL(5,2) CHECK (porcentagem_desconto >= 0 AND porcentagem_desconto <= 100);

-- Alterar valor_mensal para aceitar NULL (será calculado para pós-pago)
ALTER TABLE convenios_planos
ALTER COLUMN valor_mensal DROP NOT NULL;

-- Alterar dia_vencimento_pagamento para aceitar NULL (pós-pago usa dia_vencimento_pos_pago)
ALTER TABLE convenios_planos ALTER COLUMN dia_vencimento_pagamento DROP NOT NULL;

-- Comments
COMMENT ON COLUMN convenios_planos.valor_por_vaga IS 'Valor unitário por vaga (R$/vaga). Usado para calcular valor_mensal = valor_por_vaga × num_vagas';
COMMENT ON COLUMN convenios_planos.dia_fechamento IS 'Dia do mês para fechamento automático de fatura (pós-pago). No dia do fechamento, fatura atual é fechada e nova fatura é aberta';
COMMENT ON COLUMN convenios_planos.dia_vencimento_pos_pago IS 'Dia de vencimento da fatura para convênios pós-pago';
COMMENT ON COLUMN convenios_planos.porcentagem_desconto IS 'Desconto percentual (0-100%) aplicado sobre o valor integral. Usado apenas na baixa de pagamento';

-- Index for billing automation job
CREATE INDEX IF NOT EXISTS idx_planos_dia_fechamento ON convenios_planos(dia_fechamento) WHERE ativo = true;
