-- =====================================================
-- MÓDULO DE CONVÊNIOS - DATABASE SCHEMA
-- =====================================================
-- Criado em: 2024-12-11
-- Descrição: Schema completo para gestão de convênios
--            empresariais (pré-pago e pós-pago)
-- =====================================================

-- =====================================================
-- 1. TABELA: convenios
-- =====================================================
-- Armazena dados principais dos convênios empresariais
CREATE TABLE IF NOT EXISTS convenios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome_empresa TEXT NOT NULL,
  cnpj TEXT UNIQUE NOT NULL,
  razao_social TEXT NOT NULL,
  tipo_convenio TEXT NOT NULL CHECK (tipo_convenio IN ('pre-pago', 'pos-pago')),
  categoria TEXT NOT NULL CHECK (categoria IN ('funcionarios', 'clientes', 'fornecedores', 'outros')),
  data_inicio DATE NOT NULL,
  data_vencimento_contrato DATE,
  status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'suspenso', 'cancelado', 'inadimplente')),
  contato_nome TEXT NOT NULL,
  contato_email TEXT NOT NULL,
  contato_telefone TEXT NOT NULL,
  endereco_completo TEXT,
  observacoes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices para otimização
CREATE INDEX IF NOT EXISTS idx_convenios_status ON convenios(status);
CREATE INDEX IF NOT EXISTS idx_convenios_cnpj ON convenios(cnpj);
CREATE INDEX IF NOT EXISTS idx_convenios_tipo ON convenios(tipo_convenio);

-- Comentários
COMMENT ON TABLE convenios IS 'Convênios empresariais cadastrados no sistema';
COMMENT ON COLUMN convenios.tipo_convenio IS 'Tipo: pre-pago (mensalidade fixa) ou pos-pago (por uso)';
COMMENT ON COLUMN convenios.categoria IS 'Categoria do convênio: funcionarios, clientes, fornecedores, outros';
COMMENT ON COLUMN convenios.status IS 'Status: ativo, suspenso, cancelado, inadimplente';

-- =====================================================
-- 2. TABELA: convenios_planos
-- =====================================================
-- Armazena planos contratados (pode ter histórico)
CREATE TABLE IF NOT EXISTS convenios_planos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  convenio_id UUID NOT NULL REFERENCES convenios(id) ON DELETE CASCADE,
  tipo_plano TEXT NOT NULL,
  num_vagas_contratadas INTEGER NOT NULL CHECK (num_vagas_contratadas > 0),
  num_vagas_reservadas INTEGER DEFAULT 0 CHECK (num_vagas_reservadas >= 0),
  valor_mensal DECIMAL(10,2) NOT NULL CHECK (valor_mensal >= 0),
  dia_vencimento_pagamento INTEGER NOT NULL CHECK (dia_vencimento_pagamento BETWEEN 1 AND 28),
  permite_vagas_extras BOOLEAN DEFAULT false,
  valor_vaga_extra DECIMAL(10,2) CHECK (valor_vaga_extra >= 0),
  permite_horario_especial BOOLEAN DEFAULT false,
  horarios_permitidos JSONB,
  data_inicio_vigencia DATE NOT NULL,
  data_fim_vigencia DATE,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT check_vagas_reservadas CHECK (num_vagas_reservadas <= num_vagas_contratadas),
  CONSTRAINT check_vigencia CHECK (data_fim_vigencia IS NULL OR data_fim_vigencia >= data_inicio_vigencia)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_planos_convenio ON convenios_planos(convenio_id);
CREATE INDEX IF NOT EXISTS idx_planos_ativo ON convenios_planos(ativo);

-- Comentários
COMMENT ON TABLE convenios_planos IS 'Planos contratados pelos convênios (histórico de alterações)';
COMMENT ON COLUMN convenios_planos.horarios_permitidos IS 'JSON com horários permitidos se houver restrição';

-- =====================================================
-- 3. TABELA: convenios_veiculos
-- =====================================================
-- Veículos autorizados a usar o convênio
CREATE TABLE IF NOT EXISTS convenios_veiculos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  convenio_id UUID NOT NULL REFERENCES convenios(id) ON DELETE CASCADE,
  placa TEXT NOT NULL,
  modelo TEXT,
  cor TEXT,
  proprietario_nome TEXT,
  proprietario_cpf TEXT,
  ativo BOOLEAN DEFAULT true,
  data_cadastro DATE DEFAULT CURRENT_DATE,
  observacoes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(convenio_id, placa)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_veiculos_convenio ON convenios_veiculos(convenio_id);
CREATE INDEX IF NOT EXISTS idx_veiculos_placa ON convenios_veiculos(placa);
CREATE INDEX IF NOT EXISTS idx_veiculos_ativo ON convenios_veiculos(ativo);

-- Comentários
COMMENT ON TABLE convenios_veiculos IS 'Veículos autorizados a usar cada convênio';
COMMENT ON COLUMN convenios_veiculos.placa IS 'Placa do veículo (uppercase)';

-- =====================================================
-- 4. TABELA: convenios_movimentacoes
-- =====================================================
-- Registros de entrada/saída (principalmente pós-pago)
CREATE TABLE IF NOT EXISTS convenios_movimentacoes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  convenio_id UUID NOT NULL REFERENCES convenios(id) ON DELETE CASCADE,
  veiculo_id UUID REFERENCES convenios_veiculos(id) ON DELETE SET NULL,
  placa TEXT NOT NULL,
  data_entrada DATE NOT NULL,
  hora_entrada TIME NOT NULL,
  data_saida DATE,
  hora_saida TIME,
  tempo_permanencia INTERVAL,
  valor_calculado DECIMAL(10,2),
  faturado BOOLEAN DEFAULT false,
  fatura_id UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT check_saida CHECK (
    (data_saida IS NULL AND hora_saida IS NULL) OR
    (data_saida IS NOT NULL AND hora_saida IS NOT NULL)
  )
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_movimentacoes_convenio ON convenios_movimentacoes(convenio_id);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_veiculo ON convenios_movimentacoes(veiculo_id);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_placa ON convenios_movimentacoes(placa);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_faturado ON convenios_movimentacoes(faturado);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_data_entrada ON convenios_movimentacoes(data_entrada);

-- Comentários
COMMENT ON TABLE convenios_movimentacoes IS 'Registros de entrada/saída de veículos (usado principalmente em convênios pós-pago)';
COMMENT ON COLUMN convenios_movimentacoes.faturado IS 'Indica se a movimentação já foi incluída em alguma fatura';

-- =====================================================
-- 5. TABELA: convenios_faturas
-- =====================================================
-- Faturas geradas (pré-pago e pós-pago)
CREATE TABLE IF NOT EXISTS convenios_faturas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  convenio_id UUID NOT NULL REFERENCES convenios(id) ON DELETE CASCADE,
  numero_fatura TEXT UNIQUE NOT NULL,
  periodo_referencia TEXT NOT NULL,
  data_emissao DATE NOT NULL,
  data_vencimento DATE NOT NULL,
  data_pagamento DATE,
  valor_base DECIMAL(10,2) NOT NULL CHECK (valor_base >= 0),
  valor_extras DECIMAL(10,2) DEFAULT 0 CHECK (valor_extras >= 0),
  valor_descontos DECIMAL(10,2) DEFAULT 0 CHECK (valor_descontos >= 0),
  valor_juros DECIMAL(10,2) DEFAULT 0 CHECK (valor_juros >= 0),
  valor_total DECIMAL(10,2) NOT NULL CHECK (valor_total >= 0),
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'paga', 'vencida', 'cancelada')),
  forma_pagamento TEXT,
  numero_nfse TEXT,
  observacoes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT check_valor_total CHECK (valor_total = valor_base + valor_extras - valor_descontos + valor_juros)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_faturas_convenio ON convenios_faturas(convenio_id);
CREATE INDEX IF NOT EXISTS idx_faturas_status ON convenios_faturas(status);
CREATE INDEX IF NOT EXISTS idx_faturas_numero ON convenios_faturas(numero_fatura);
CREATE INDEX IF NOT EXISTS idx_faturas_vencimento ON convenios_faturas(data_vencimento);
CREATE INDEX IF NOT EXISTS idx_faturas_periodo ON convenios_faturas(periodo_referencia);

-- Comentários
COMMENT ON TABLE convenios_faturas IS 'Faturas geradas para convênios (pré-pago e pós-pago)';
COMMENT ON COLUMN convenios_faturas.numero_fatura IS 'Número único da fatura (ex: FAT-2024-001)';
COMMENT ON COLUMN convenios_faturas.periodo_referencia IS 'Período de referência (ex: 2024-01, Janeiro/2024)';

-- =====================================================
-- 6. TABELA: convenios_historico
-- =====================================================
-- Auditoria de alterações
CREATE TABLE IF NOT EXISTS convenios_historico (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  convenio_id UUID NOT NULL REFERENCES convenios(id) ON DELETE CASCADE,
  data_alteracao TIMESTAMP DEFAULT NOW(),
  usuario_id UUID,
  tipo_alteracao TEXT NOT NULL,
  dados_anteriores JSONB,
  dados_novos JSONB,
  motivo TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_historico_convenio ON convenios_historico(convenio_id);
CREATE INDEX IF NOT EXISTS idx_historico_data ON convenios_historico(data_alteracao);
CREATE INDEX IF NOT EXISTS idx_historico_tipo ON convenios_historico(tipo_alteracao);

-- Comentários
COMMENT ON TABLE convenios_historico IS 'Histórico de alterações realizadas nos convênios (auditoria)';
COMMENT ON COLUMN convenios_historico.tipo_alteracao IS 'Tipo: criacao, edicao, suspensao, cancelamento, reativacao, etc';

-- =====================================================
-- 7. TABELA: convenios_documentos
-- =====================================================
-- Documentos anexados (armazenamento local)
CREATE TABLE IF NOT EXISTS convenios_documentos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  convenio_id UUID NOT NULL REFERENCES convenios(id) ON DELETE CASCADE,
  tipo_documento TEXT NOT NULL,
  nome_arquivo TEXT NOT NULL,
  caminho_arquivo TEXT NOT NULL,
  data_upload TIMESTAMP DEFAULT NOW(),
  usuario_id UUID,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_documentos_convenio ON convenios_documentos(convenio_id);
CREATE INDEX IF NOT EXISTS idx_documentos_tipo ON convenios_documentos(tipo_documento);

-- Comentários
COMMENT ON TABLE convenios_documentos IS 'Documentos anexados aos convênios (contratos, aditivos, etc)';
COMMENT ON COLUMN convenios_documentos.caminho_arquivo IS 'Caminho local do arquivo no PC';

-- =====================================================
-- 8. TABELA: notificacoes
-- =====================================================
-- Sistema de notificações e alertas
CREATE TABLE IF NOT EXISTS notificacoes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tipo TEXT NOT NULL,
  titulo TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  referencia_id UUID,
  referencia_tipo TEXT,
  prioridade TEXT DEFAULT 'media' CHECK (prioridade IN ('baixa', 'media', 'alta', 'critica')),
  lida BOOLEAN DEFAULT false,
  data_criacao TIMESTAMP DEFAULT NOW(),
  usuario_id UUID
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_notificacoes_usuario ON notificacoes(usuario_id);
CREATE INDEX IF NOT EXISTS idx_notificacoes_lida ON notificacoes(lida);
CREATE INDEX IF NOT EXISTS idx_notificacoes_prioridade ON notificacoes(prioridade);
CREATE INDEX IF NOT EXISTS idx_notificacoes_tipo ON notificacoes(tipo);
CREATE INDEX IF NOT EXISTS idx_notificacoes_data ON notificacoes(data_criacao);

-- Comentários
COMMENT ON TABLE notificacoes IS 'Sistema de notificações e alertas do sistema';
COMMENT ON COLUMN notificacoes.referencia_tipo IS 'Tipo da referência: convenio, fatura, veiculo, etc';

-- =====================================================
-- TRIGGERS E FUNÇÕES
-- =====================================================

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para convenios
DROP TRIGGER IF EXISTS update_convenios_updated_at ON convenios;
CREATE TRIGGER update_convenios_updated_at
    BEFORE UPDATE ON convenios
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- VIEWS ÚTEIS
-- =====================================================

-- View: Convênios com plano ativo
CREATE OR REPLACE VIEW convenios_com_plano_ativo AS
SELECT 
  c.*,
  p.num_vagas_contratadas,
  p.num_vagas_reservadas,
  p.valor_mensal,
  p.dia_vencimento_pagamento,
  p.permite_vagas_extras,
  p.valor_vaga_extra
FROM convenios c
LEFT JOIN convenios_planos p ON c.id = p.convenio_id AND p.ativo = true;

-- View: Estatísticas de ocupação
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
  ) as taxa_ocupacao_percentual
FROM convenios c
LEFT JOIN convenios_planos p ON c.id = p.convenio_id AND p.ativo = true
LEFT JOIN convenios_movimentacoes m ON c.id = m.convenio_id
WHERE c.status = 'ativo'
GROUP BY c.id, c.nome_empresa, p.num_vagas_contratadas;

-- =====================================================
-- DADOS INICIAIS (OPCIONAL)
-- =====================================================

-- Você pode adicionar dados de exemplo aqui se necessário

-- =====================================================
-- FIM DO SCHEMA
-- =====================================================
