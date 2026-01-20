-- =====================================================
-- MIGRATION: Add tipo_vaga Column
-- =====================================================
-- Purpose: Add missing tipo_vaga column to distinguish
--          between regular and extra parking spots
-- Date: 2026-01-19
-- =====================================================

-- Add tipo_vaga column with validation
ALTER TABLE convenios_movimentacoes
ADD COLUMN IF NOT EXISTS tipo_vaga VARCHAR(20)
CHECK (tipo_vaga IN ('regular', 'extra'));

-- Back-fill existing records based on veiculo_id
-- NULL veiculo_id = extra spot (visitor/guest)
-- NOT NULL veiculo_id = regular spot (registered vehicle)
UPDATE convenios_movimentacoes
SET tipo_vaga = CASE
    WHEN veiculo_id IS NULL AND convenio_id IS NOT NULL THEN 'extra'
    WHEN veiculo_id IS NOT NULL AND convenio_id IS NOT NULL THEN 'regular'
    ELSE NULL
END
WHERE tipo_vaga IS NULL AND convenio_id IS NOT NULL;

-- Create index for query performance
CREATE INDEX IF NOT EXISTS idx_convenios_movimentacoes_tipo_vaga
ON convenios_movimentacoes(tipo_vaga)
WHERE tipo_vaga IS NOT NULL;

-- Add documentation
COMMENT ON COLUMN convenios_movimentacoes.tipo_vaga IS 
'Type of parking spot: regular (registered vehicle) or extra (visitor/guest)';

-- Verification query
SELECT 
    tipo_vaga,
    COUNT(*) as total_records,
    COUNT(CASE WHEN veiculo_id IS NULL THEN 1 END) as veiculo_null,
    COUNT(CASE WHEN veiculo_id IS NOT NULL THEN 1 END) as veiculo_not_null
FROM convenios_movimentacoes
WHERE convenio_id IS NOT NULL
GROUP BY tipo_vaga
ORDER BY tipo_vaga;

-- Display results
DO $$
DECLARE
    v_total_regular INTEGER;
    v_total_extra INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_total_regular 
    FROM convenios_movimentacoes 
    WHERE tipo_vaga = 'regular';
    
    SELECT COUNT(*) INTO v_total_extra 
    FROM convenios_movimentacoes 
    WHERE tipo_vaga = 'extra';
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'MIGRATION COMPLETED SUCCESSFULLY';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Regular spots: %', COALESCE(v_total_regular, 0);
    RAISE NOTICE 'Extra spots: %', COALESCE(v_total_extra, 0);
    RAISE NOTICE '========================================';
END $$;

-- =====================================================
-- END OF MIGRATION
-- =====================================================
