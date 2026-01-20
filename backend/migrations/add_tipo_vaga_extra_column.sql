-- =====================================================
-- MIGRATION: Add tipo_vaga_extra Column
-- =====================================================
-- Purpose: Distinguish between paid and courtesy extra spots
-- Date: 2026-01-19
-- =====================================================

-- Add column to distinguish paid vs courtesy extra spots
ALTER TABLE convenios_movimentacoes
ADD COLUMN IF NOT EXISTS tipo_vaga_extra VARCHAR(20) 
CHECK (tipo_vaga_extra IN ('paga', 'cortesia'));

-- Add index for performance on queries filtering by tipo_vaga_extra
CREATE INDEX IF NOT EXISTS idx_convenios_movimentacoes_tipo_vaga_extra 
ON convenios_movimentacoes(tipo_vaga_extra);

-- Update existing records (if any) to set tipo_vaga_extra based on valor_cobrado
-- This assumes existing vagas extras with valor > 0 are 'paga', otherwise 'cortesia'
UPDATE convenios_movimentacoes
SET tipo_vaga_extra = CASE
    WHEN tipo_vaga = 'extra' AND (valor_cobrado IS NULL OR valor_cobrado = 0) THEN 'cortesia'
    WHEN tipo_vaga = 'extra' AND valor_cobrado > 0 THEN 'paga'
    ELSE NULL
END
WHERE tipo_vaga = 'extra' AND tipo_vaga_extra IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN convenios_movimentacoes.tipo_vaga_extra IS 
'For extra spots only: paga (charged using pricing engine at exit) or cortesia (free)';

-- Verification query
SELECT 
    tipo_vaga,
    tipo_vaga_extra,
    COUNT(*) as total,
    AVG(valor_cobrado) as avg_valor
FROM convenios_movimentacoes
WHERE tipo_vaga = 'extra'
GROUP BY tipo_vaga, tipo_vaga_extra;

-- =====================================================
-- END OF MIGRATION
-- =====================================================
