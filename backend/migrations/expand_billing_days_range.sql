-- Migration: Expand Date Range for Billing Days (1-31)
-- Created: 2026-01-16
-- Description: Allows convenio plans to use any valid day of the month (1-31)
--              for due dates and closing dates, instead of being limited to 1-28.
--              The system will intelligently normalize dates for months with fewer days.

-- Alter constraints to accept days 1-31 instead of 1-28

-- 1. dia_vencimento_pagamento (for pre-paid)
ALTER TABLE convenios_planos 
DROP CONSTRAINT IF EXISTS convenios_planos_dia_vencimento_pagamento_check;

ALTER TABLE convenios_planos 
ADD CONSTRAINT convenios_planos_dia_vencimento_pagamento_check 
CHECK (dia_vencimento_pagamento BETWEEN 1 AND 31);

-- 2. dia_vencimento_pos_pago (for post-paid)
ALTER TABLE convenios_planos 
DROP CONSTRAINT IF EXISTS convenios_planos_dia_vencimento_pos_pago_check;

ALTER TABLE convenios_planos 
ADD CONSTRAINT convenios_planos_dia_vencimento_pos_pago_check 
CHECK (dia_vencimento_pos_pago BETWEEN 1 AND 31);

-- 3. dia_fechamento (for post-paid closing day)
ALTER TABLE convenios_planos 
DROP CONSTRAINT IF EXISTS convenios_planos_dia_fechamento_check;

ALTER TABLE convenios_planos 
ADD CONSTRAINT convenios_planos_dia_fechamento_check 
CHECK (dia_fechamento BETWEEN 1 AND 31);

-- Update comments
COMMENT ON COLUMN convenios_planos.dia_vencimento_pagamento IS 
'Dia de vencimento da fatura para convênios pré-pago (1-31). Será ajustado para o último dia válido em meses com menos dias.';

COMMENT ON COLUMN convenios_planos.dia_vencimento_pos_pago IS 
'Dia de vencimento da fatura para convênios pós-pago (1-31). Será ajustado para o último dia válido em meses com menos dias.';

COMMENT ON COLUMN convenios_planos.dia_fechamento IS 
'Dia de fechamento do período para convênios pós-pago (1-31). Será ajustado para o último dia válido em meses com menos dias.';
