-- CRITICAL: Delete all convenios except Pilates
-- This script will clean up incorrect/corrupted data

-- First, get the Pilates convenio ID
-- From the screenshot: CNPJ 76.057.672/0001-03

-- Step 1: Find Pilates ID
SELECT id, nome_empresa, cnpj 
FROM convenios 
WHERE nome_empresa ILIKE '%pilates%' OR cnpj = '76057672000103';

-- Step 2: Delete all OTHER convenios (UNCOMMENT TO EXECUTE)
-- WARNING: This will permanently delete data!

/*
DELETE FROM convenios_historico 
WHERE convenio_id NOT IN (
    SELECT id FROM convenios WHERE nome_empresa ILIKE '%pilates%'
);

DELETE FROM convenios_movimentacoes 
WHERE convenio_id NOT IN (
    SELECT id FROM convenios WHERE nome_empresa ILIKE '%pilates%'
);

DELETE FROM convenios_faturas 
WHERE convenio_id NOT IN (
    SELECT id FROM convenios WHERE nome_empresa ILIKE '%pilates%'
);

DELETE FROM convenios_veiculos 
WHERE convenio_id NOT IN (
    SELECT id FROM convenios WHERE nome_empresa ILIKE '%pilates%'
);

DELETE FROM convenios_planos 
WHERE convenio_id NOT IN (
    SELECT id FROM convenios WHERE nome_empresa ILIKE '%pilates%'
);

DELETE FROM convenios 
WHERE nome_empresa NOT ILIKE '%pilates%';
*/

-- Step 3: Verify only Pilates remains
SELECT COUNT(*) as total_convenios FROM convenios;
SELECT * FROM convenios;
