-- Query to check current table structure
SELECT column_name, data_type, character_maximum_length, is_nullable
FROM information_schema.columns
WHERE table_name = 'convenios_movimentacoes'
ORDER BY ordinal_position;
