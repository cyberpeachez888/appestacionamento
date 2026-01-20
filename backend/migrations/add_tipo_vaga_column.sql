-- Adicionar todas as colunas faltantes em convenios_movimentacoes
-- para suportar vagas extras

-- Adicionar tipo_veiculo (tipo do veículo: Carro, Moto, etc)
ALTER TABLE convenios_movimentacoes
ADD COLUMN IF NOT EXISTS tipo_veiculo VARCHAR(50);

-- Adicionar vinculado_por (ID do usuário que vincul ou)
ALTER TABLE convenios_movimentacoes
ADD COLUMN IF NOT EXISTS vinculado_por UUID REFERENCES users(id);

-- Adicionar vinculado_em (timestamp da vinculação)
ALTER TABLE convenios_movimentacoes
ADD COLUMN IF NOT EXISTS vinculado_em TIMESTAMPTZ;

-- Verificar estrutura da tabela
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'convenios_movimentacoes'
ORDER BY ordinal_position;
