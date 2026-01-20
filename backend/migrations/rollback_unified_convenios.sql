-- =====================================================
-- ROLLBACK: Migração de Unificação de Convênios
-- =====================================================
-- ATENÇÃO: Use este script APENAS se precisar reverter
--          a migração de unificação
-- =====================================================
-- REQUISITOS: Backup dos dados antes da migração
-- =====================================================

-- =====================================================
-- STEP 1: RECRIAR COLUNA tipo_convenio
-- =====================================================

RAISE NOTICE 'Recriando coluna tipo_convenio...';

ALTER TABLE convenios 
ADD COLUMN IF NOT EXISTS tipo_convenio TEXT;

-- Definir todos como pós-pago por padrão
UPDATE convenios SET tipo_convenio = 'pos-pago' WHERE tipo_convenio IS NULL;

-- Adicionar constraint
ALTER TABLE convenios 
ALTER COLUMN tipo_convenio SET NOT NULL;

ALTER TABLE convenios
ADD CONSTRAINT check_tipo_convenio 
CHECK (tipo_convenio IN ('pre-pago', 'pos-pago'));

-- Recriar índice
CREATE INDEX IF NOT EXISTS idx_convenios_tipo ON convenios(tipo_convenio);

RAISE NOTICE '✓ Coluna tipo_convenio recriada';

-- =====================================================
-- STEP 2: RECRIAR COLUNAS ANTIGAS DE VENCIMENTO
-- =====================================================

RAISE NOTICE 'Recriando colunas de vencimento...';

ALTER TABLE convenios_planos 
ADD COLUMN IF NOT EXISTS dia_vencimento_pagamento INTEGER CHECK (dia_vencimento_pagamento BETWEEN 1 AND 28);

ALTER TABLE convenios_planos 
ADD COLUMN IF NOT EXISTS dia_vencimento_pos_pago INTEGER CHECK (dia_vencimento_pos_pago BETWEEN 1 AND 28);

-- Copiar dados do campo unificado para os campos antigos
UPDATE convenios_planos 
SET dia_vencimento_pagamento = dia_vencimento,
    dia_vencimento_pos_pago = dia_vencimento
WHERE dia_vencimento IS NOT NULL;

RAISE NOTICE '✓ Colunas de vencimento antigas recriadas';

-- =====================================================
-- STEP 3: REMOVER COLUNAS DE VAGAS EXTRAS
-- =====================================================

RAISE NOTICE 'Removendo colunas de vagas extras...';

ALTER TABLE convenios_movimentacoes DROP COLUMN IF EXISTS vinculado_por;
ALTER TABLE convenios_movimentacoes DROP COLUMN IF EXISTS vinculado_em;
ALTER TABLE convenios_movimentacoes DROP COLUMN IF EXISTS bloqueado;
ALTER TABLE convenios_movimentacoes DROP COLUMN IF EXISTS valor_cobrado;

RAISE NOTICE '✓ Colunas de vinculação removidas';

-- =====================================================
-- STEP 4: REMOVER CAMPO UNIFICADO
-- =====================================================

-- Manter dia_vencimento como backup, mas pode remover se preferir
-- ALTER TABLE convenios_planos DROP COLUMN IF EXISTS dia_vencimento;

RAISE NOTICE '✓ Rollback concluído';

-- =====================================================
-- NOTAS IMPORTANTES
-- =====================================================

DO $$
BEGIN
    RAISE WARNING '';
    RAISE WARNING '╔════════════════════════════════════════════╗';
    RAISE WARNING '║  ATENÇÃO: ROLLBACK PARCIAL                 ║';
    RAISE WARNING '╠════════════════════════════════════════════╣';
    RAISE WARNING '║  - Dados de vagas extras foram PERDIDOS    ║';
    RAISE WARNING '║  - Vinculações manuais foram REMOVIDAS     ║';
    RAISE WARNING '║  - tipo_convenio restaurado como pos-pago  ║';
    RAISE WARNING '║  - Restaure backup se precisar dos dados   ║';
    RAISE WARNING '╚════════════════════════════════════════════╝';
    RAISE WARNING '';
END $$;
