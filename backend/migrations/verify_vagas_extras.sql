-- Verificar registros na tabela convenios_movimentacoes
SELECT 
    id,
    convenio_id,
    placa,
    tipo_veiculo,
    data_entrada,
    hora_entrada,
    tipo_vaga,
    valor_cobrado,
    vinculado_em
FROM convenios_movimentacoes
WHERE convenio_id = '6d29ffd6-4b81-407a-97e2-2309ceadadf9'
ORDER BY vinculado_em DESC
LIMIT 10;

-- Se não aparecer nada, verifique se o INSERT funcionou quando você vinculou:
-- Se aparecer com tipo_vaga = 'regular', rode este UPDATE:

-- UPDATE convenios_movimentacoes
-- SET tipo_vaga = 'extra'
-- WHERE id = 'COLE_O_ID_AQUI';
