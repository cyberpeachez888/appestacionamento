-- Script para criar veículo de teste para vincular a convênio
-- Execute este script no Supabase SQL Editor

-- 1. Inserir veículo de teste
INSERT INTO vehicles (
    id,
    plate,
    "vehicleType",
    "entryDate",
    "entryTime",
    status,
    metadata,
    created_at
) VALUES (
    gen_random_uuid(),
    'TEST123',
    'Carro',
    CURRENT_DATE::TEXT,
    TO_CHAR(CURRENT_TIME, 'HH24:MI'),
    'Em andamento',
    '{"isConvenio": false, "tipoVaga": "avulso"}'::jsonb,
    NOW()
)
ON CONFLICT DO NOTHING;

-- 2. Verificar veículos "Em andamento"
SELECT 
    id,
    plate,
    "vehicleType",
    "entryDate",
    status,
    metadata
FROM vehicles
WHERE status = 'Em andamento'
ORDER BY created_at DESC
LIMIT 10;
