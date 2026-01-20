-- =====================================================
-- MIGRAÇÃO: Unificação do Sistema de Convênios
-- =====================================================
-- Data: 2026-01-18
-- Objetivo: Remover modalidade pré-pago e implementar
--           sistema dinâmico de vagas extras
-- =====================================================
-- ATENÇÃO: Esta migração é IRREVERSÍVEL
-- Execute BACKUP antes de prosseguir!
-- =====================================================

-- =====================================================
-- STEP 1: VERIFICAÇÃO PRÉ-MIGRAÇÃO
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'VERIFICAÇÃO PRÉ-MIGRAÇÃO';
    RAISE NOTICE '==========================================';
    
    -- Contar registros existentes
    RAISE NOTICE 'Total de convênios: %', (SELECT COUNT(*) FROM convenios);
    RAISE NOTICE 'Total pré-pago: %', (SELECT COUNT(*) FROM convenios WHERE tipo_convenio = 'pre-pago');
    RAISE NOTICE 'Total pós-pago: %', (SELECT COUNT(*) FROM convenios WHERE tipo_convenio = 'pos-pago');
    RAISE NOTICE 'Total de movimentações: %', (SELECT COUNT(*) FROM convenios_movimentacoes);
    
    RAISE NOTICE '==========================================';
END $$;

-- =====================================================
-- STEP 2: ADICIONAR NOVAS COLUNAS (convenios_movimentacoes)
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE 'Adicionando colunas de vinculação em convenios_movimentacoes...';
END $$;

-- Colunas para vagas extras
ALTER TABLE convenios_movimentacoes 
ADD COLUMN IF NOT EXISTS vinculado_por UUID REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE convenios_movimentacoes 
ADD COLUMN IF NOT EXISTS vinculado_em TIMESTAMP;

ALTER TABLE convenios_movimentacoes 
ADD COLUMN IF NOT EXISTS bloqueado BOOLEAN DEFAULT false;

ALTER TABLE convenios_movimentacoes 
ADD COLUMN IF NOT EXISTS valor_cobrado DECIMAL(10,2) DEFAULT 0 CHECK (valor_cobrado >= 0);

COMMENT ON COLUMN convenios_movimentacoes.vinculado_por IS 'Operador que vinculou o registro ao convênio (para vagas extras)';
COMMENT ON COLUMN convenios_movimentacoes.vinculado_em IS 'Data/hora da vinculação manual';
COMMENT ON COLUMN convenios_movimentacoes.bloqueado IS 'Impede desvincular após confirmação';
COMMENT ON COLUMN convenios_movimentacoes.valor_cobrado IS 'Valor cobrado para esta movimentação (usado em vagas extras)';

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_movimentacoes_vinculado_por 
ON convenios_movimentacoes(vinculado_por);

CREATE INDEX IF NOT EXISTS idx_movimentacoes_bloqueado 
ON convenios_movimentacoes(bloqueado) WHERE bloqueado = true;

CREATE INDEX IF NOT EXISTS idx_movimentacoes_tipo_vaga
ON convenios_movimentacoes(convenio_id, veiculo_id) 
WHERE convenio_id IS NOT NULL;

DO $$
BEGIN
    RAISE NOTICE '✓ Colunas de vinculação adicionadas';
END $$;

-- =====================================================
-- STEP 3: ADICIONAR NOVAS COLUNAS (convenios_planos)
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE 'Adicionando colunas de vagas extras em convenios_planos...';
END $$;

-- Campos já podem existir no schema, mas garantir
ALTER TABLE convenios_planos 
ADD COLUMN IF NOT EXISTS permite_vagas_extras BOOLEAN DEFAULT false;

ALTER TABLE convenios_planos 
ADD COLUMN IF NOT EXISTS valor_vaga_extra DECIMAL(10,2) CHECK (valor_vaga_extra >= 0);

-- Adicionar campo unificado de vencimento se não existir
ALTER TABLE convenios_planos 
ADD COLUMN IF NOT EXISTS dia_vencimento INTEGER CHECK (dia_vencimento BETWEEN 1 AND 31);

-- Adicionar campo de fechamento se não existir
ALTER TABLE convenios_planos 
ADD COLUMN IF NOT EXISTS dia_fechamento INTEGER CHECK (dia_fechamento BETWEEN 1 AND 31);

COMMENT ON COLUMN convenios_planos.permite_vagas_extras IS 'Se permite vinculação manual de visitantes';
COMMENT ON COLUMN convenios_planos.valor_vaga_extra IS 'Valor cobrado por vaga extra (NULL ou 0 = cortesia)';
COMMENT ON COLUMN convenios_planos.dia_vencimento IS 'Dia de vencimento da fatura (unificado)';
COMMENT ON COLUMN convenios_planos.dia_fechamento IS 'Dia de fechamento/corte da fatura';

DO $$
BEGIN
    RAISE NOTICE '✓ Colunas de vagas extras adicionadas';
END $$;

-- =====================================================
-- STEP 4: MIGRAR DADOS EXISTENTES
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE 'Migrando dados de vencimento...';
END $$;

-- Copiar dia_vencimento_pos_pago para dia_vencimento (se coluna antiga existir)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'convenios_planos' 
        AND column_name = 'dia_vencimento_pos_pago'
    ) THEN
        UPDATE convenios_planos 
        SET dia_vencimento = dia_vencimento_pos_pago
        WHERE dia_vencimento IS NULL AND dia_vencimento_pos_pago IS NOT NULL;
        RAISE NOTICE '✓ Dados de vencimento pós-pago migrados';
    END IF;
END $$;

-- Copiar dia_vencimento_pagamento para dia_vencimento (se coluna antiga existir)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'convenios_planos' 
        AND column_name = 'dia_vencimento_pagamento'
    ) THEN
        UPDATE convenios_planos 
        SET dia_vencimento = dia_vencimento_pagamento
        WHERE dia_vencimento IS NULL AND dia_vencimento_pagamento IS NOT NULL;
        RAISE NOTICE '✓ Dados de vencimento pré-pago migrados';
    END IF;
END $$;

-- Migrar movimentações existentes (marcar como vagas regulares)
UPDATE convenios_movimentacoes
SET bloqueado = true,
    vinculado_em = created_at
WHERE convenio_id IS NOT NULL 
  AND veiculo_id IS NOT NULL
  AND bloqueado IS NULL;

DO $$
BEGIN
    RAISE NOTICE '✓ Movimentações existentes marcadas como bloqueadas';
END $$;

-- =====================================================
-- STEP 5: DROPAR VIEWS ANTIGAS (antes de remover colunas)
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE 'Dropando views antigas que dependem de tipo_convenio...';
END $$;

DROP VIEW IF EXISTS convenios_com_plano_ativo CASCADE;
DROP VIEW IF EXISTS convenios_ocupacao CASCADE;

DO $$
BEGIN
    RAISE NOTICE '✓ Views antigas removidas';
END $$;

-- =====================================================
-- STEP 6: CONVERTER CONVÊNIOS PRÉ-PAGO → CORPORATIVO
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE 'Convertendo convênios pré-pago para corporativo...';
END $$;

DO $$
DECLARE
    count_prepago INTEGER;
BEGIN
    -- Verificar se coluna tipo_convenio existe
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'convenios' 
        AND column_name = 'tipo_convenio'
    ) THEN
        -- Contar pré-pago
        SELECT COUNT(*) INTO count_prepago FROM convenios WHERE tipo_convenio = 'pre-pago';
        
        -- Todos os convênios se tornam "corporativo" (pós-pago)
        UPDATE convenios SET tipo_convenio = 'pos-pago' WHERE tipo_convenio = 'pre-pago';
        
        RAISE NOTICE '✓ % convênios pré-pago convertidos para corporativo', count_prepago;
    END IF;
END $$;

-- =====================================================
-- STEP 7: REMOVER COLUNAS ANTIGAS
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE 'Removendo colunas obsoletas...';
END $$;

-- Remover tipo_convenio da tabela convenios (views já foram dropadas)
ALTER TABLE convenios DROP COLUMN IF EXISTS tipo_convenio;

DO $$
BEGIN
    RAISE NOTICE '✓ Coluna tipo_convenio removida de convenios';
END $$;

-- Remover campos de vencimento antigos de convenios_planos
ALTER TABLE convenios_planos DROP COLUMN IF EXISTS dia_vencimento_pagamento;
ALTER TABLE convenios_planos DROP COLUMN IF EXISTS dia_vencimento_pos_pago;

DO $$
BEGIN
    RAISE NOTICE '✓ Colunas de vencimento antigas removidas de convenios_planos';
END $$;

-- Remover índice antigo
DROP INDEX IF EXISTS idx_convenios_tipo;

DO $$
BEGIN
    RAISE NOTICE '✓ Índice idx_convenios_tipo removido';
END $$;

-- =====================================================
-- STEP 8: ATUALIZAR VIEWS (RECREATE)
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE 'Recriando views...';
END $$;

-- Recriar view convenios_com_plano_ativo
CREATE OR REPLACE VIEW convenios_com_plano_ativo AS
SELECT 
  c.*,
  p.num_vagas_contratadas,
  p.num_vagas_reservadas,
  p.valor_mensal,
  p.dia_vencimento,
  p.dia_fechamento,
  p.permite_vagas_extras,
  p.valor_vaga_extra,
  p.porcentagem_desconto
FROM convenios c
LEFT JOIN convenios_planos p ON c.id = p.convenio_id AND p.ativo = true;

DO $$
BEGIN
    RAISE NOTICE '✓ View convenios_com_plano_ativo atualizada';
END $$;

-- Recriar view de ocupação
CREATE OR REPLACE VIEW convenios_ocupacao AS
SELECT 
  c.id,
  c.nome_empresa,
  p.num_vagas_contratadas,
  COUNT(DISTINCT CASE WHEN m.data_saida IS NULL THEN m.id END) as vagas_ocupadas,
  ROUND(
    (COUNT(DISTINCT CASE WHEN m.data_saida IS NULL THEN m.id END)::DECIMAL / 
    NULLIF(p.num_vagas_contratadas, 0)) * 100, 
    2
  ) as taxa_ocupacao_percentual,
  COUNT(DISTINCT CASE WHEN m.veiculo_id IS NULL AND m.convenio_id IS NOT NULL THEN m.id END) as vagas_extras_mes
FROM convenios c
LEFT JOIN convenios_planos p ON c.id = p.convenio_id AND p.ativo = true
LEFT JOIN convenios_movimentacoes m ON c.id = m.convenio_id
WHERE c.status = 'ativo'
GROUP BY c.id, c.nome_empresa, p.num_vagas_contratadas;

DO $$
BEGIN
    RAISE NOTICE '✓ View convenios_ocupacao atualizada';
END $$;

-- =====================================================
-- STEP 9: CRIAR FUNÇÃO HELPER PARA IDENTIFICAR TIPO DE VAGA
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE 'Criando funções helper...';
END $$;

CREATE OR REPLACE FUNCTION identificar_tipo_vaga(p_convenio_id UUID, p_veiculo_id UUID)
RETURNS TEXT AS $$
BEGIN
    IF p_convenio_id IS NULL THEN
        RETURN 'avulso';
    ELSIF p_convenio_id IS NOT NULL AND p_veiculo_id IS NOT NULL THEN
        RETURN 'regular';
    ELSIF p_convenio_id IS NOT NULL AND p_veiculo_id IS NULL THEN
        RETURN 'extra';
    ELSE
        RETURN 'desconhecido';
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION identificar_tipo_vaga IS 'Retorna tipo da vaga: avulso, regular ou extra';

DO $$
BEGIN
    RAISE NOTICE '✓ Função identificar_tipo_vaga criada';
END $$;

-- =====================================================
-- STEP 10: ATUALIZAR COMENTÁRIOS
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE 'Atualizando comentários da documentação...';
END $$;

COMMENT ON TABLE convenios IS 'Convênios corporativos cadastrados no sistema (modalidade unificada)';
COMMENT ON TABLE convenios_planos IS 'Planos dos convênios corporativos com suporte a vagas extras';
COMMENT ON TABLE convenios_movimentacoes IS 'Registros de entrada/saída - vagas regulares e extras';

-- =====================================================
-- STEP 11: VERIFICAÇÃO PÓS-MIGRAÇÃO
-- =====================================================

DO $$
DECLARE
    v_convenios INTEGER;
    v_planos INTEGER;
    v_movimentacoes INTEGER;
    v_veiculo_null INTEGER;
BEGIN
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'VERIFICAÇÃO PÓS-MIGRAÇÃO';
    RAISE NOTICE '==========================================';
    
    SELECT COUNT(*) INTO v_convenios FROM convenios;
    SELECT COUNT(*) INTO v_planos FROM convenios_planos;
    SELECT COUNT(*) INTO v_movimentacoes FROM convenios_movimentacoes;
    SELECT COUNT(*) INTO v_veiculo_null 
    FROM convenios_movimentacoes 
    WHERE convenio_id IS NOT NULL AND veiculo_id IS NULL;
    
    RAISE NOTICE 'Total de convênios: %', v_convenios;
    RAISE NOTICE 'Total de planos: %', v_planos;
    RAISE NOTICE 'Total de movimentações: %', v_movimentacoes;
    RAISE NOTICE 'Vagas extras (veiculo_id NULL): %', v_veiculo_null;
    
    -- Verificar se tipo_convenio foi removido
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'convenios' 
        AND column_name = 'tipo_convenio'
    ) THEN
        RAISE NOTICE '✓ Coluna tipo_convenio removida com sucesso';
    ELSE
        RAISE WARNING '⚠ Coluna tipo_convenio ainda existe!';
    END IF;
    
    -- Verificar novas colunas
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'convenios_movimentacoes' 
        AND column_name = 'vinculado_por'
    ) THEN
        RAISE NOTICE '✓ Coluna vinculado_por criada com sucesso';
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'convenios_planos' 
        AND column_name = 'permite_vagas_extras'
    ) THEN
        RAISE NOTICE '✓ Coluna permite_vagas_extras criada com sucesso';
    END IF;
    
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'MIGRAÇÃO CONCLUÍDA!';
    RAISE NOTICE '==========================================';
END $$;

-- =====================================================
-- STEP 12: RECOMENDAÇÕES PÓS-MIGRAÇÃO
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '╔════════════════════════════════════════════╗';
    RAISE NOTICE '║  PRÓXIMOS PASSOS:                          ║';
    RAISE NOTICE '╠════════════════════════════════════════════╣';
    RAISE NOTICE '║  1. Atualizar código backend               ║';
    RAISE NOTICE '║  2. Atualizar componentes frontend         ║';
    RAISE NOTICE '║  3. Testar vinculação de vagas extras      ║';
    RAISE NOTICE '║  4. Testar geração de faturas              ║';
    RAISE NOTICE '║  5. Validar relatórios e exportações       ║';
    RAISE NOTICE '╚════════════════════════════════════════════╝';
    RAISE NOTICE '';
END $$;

-- =====================================================
-- FIM DA MIGRAÇÃO
-- =====================================================
