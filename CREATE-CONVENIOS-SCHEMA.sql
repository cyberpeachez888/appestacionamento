-- ================================================
-- CONVENIOS MODULE SCHEMA
-- ================================================

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Table: convenios
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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Table: convenios_planos
CREATE TABLE IF NOT EXISTS convenios_planos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  convenio_id UUID REFERENCES convenios(id) ON DELETE CASCADE,
  
  -- Campos para PRÉ-PAGO
  valor_mensal DECIMAL(10,2),
  dia_vencimento_pagamento INTEGER CHECK (dia_vencimento_pagamento BETWEEN 1 AND 28),
  
  -- Campos para PÓS-PAGO
  dia_fechamento INTEGER CHECK (dia_fechamento BETWEEN 1 AND 28),
  dia_vencimento_pos_pago INTEGER CHECK (dia_vencimento_pos_pago BETWEEN 1 AND 28),
  usa_motor_tarifacao_padrao BOOLEAN DEFAULT true,
  percentual_desconto DECIMAL(5,2) DEFAULT 0,
  observacoes_calculo TEXT,
  
  -- Campos comuns
  tipo_plano TEXT DEFAULT 'padrao',
  num_vagas_contratadas INTEGER NOT NULL,
  num_vagas_reservadas INTEGER DEFAULT 0,
  permite_vagas_extras BOOLEAN DEFAULT false,
  valor_vaga_extra DECIMAL(10,2),
  permite_horario_especial BOOLEAN DEFAULT false,
  horarios_permitidos JSONB,
  data_inicio_vigencia DATE NOT NULL,
  data_fim_vigencia DATE,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Table: convenios_veiculos
CREATE TABLE IF NOT EXISTS convenios_veiculos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  convenio_id UUID REFERENCES convenios(id) ON DELETE CASCADE,
  placa TEXT NOT NULL,
  tipo_veiculo TEXT NOT NULL CHECK (tipo_veiculo IN ('carro', 'moto', 'van', 'caminhao', 'outros')),
  modelo TEXT,
  cor TEXT,
  proprietario_nome TEXT,
  proprietario_cpf TEXT,
  ativo BOOLEAN DEFAULT true,
  data_cadastro DATE DEFAULT CURRENT_DATE,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(convenio_id, placa)
);

-- 4. Table: convenios_movimentacoes
CREATE TABLE IF NOT EXISTS convenios_movimentacoes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  convenio_id UUID REFERENCES convenios(id) ON DELETE CASCADE,
  veiculo_id UUID REFERENCES convenios_veiculos(id),
  placa TEXT NOT NULL,
  tipo_veiculo TEXT NOT NULL,
  modelo TEXT,
  data_entrada DATE NOT NULL,
  hora_entrada TIME NOT NULL,
  data_saida DATE,
  hora_saida TIME,
  tempo_permanencia INTERVAL,
  valor_calculado DECIMAL(10,2),
  veiculo_extra BOOLEAN DEFAULT false,
  faturado BOOLEAN DEFAULT false,
  fatura_id UUID, -- Will add foreign key later to avoid circular dependency issues if any
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Table: convenios_faturas
CREATE TABLE IF NOT EXISTS convenios_faturas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  convenio_id UUID REFERENCES convenios(id) ON DELETE CASCADE,
  numero_fatura TEXT UNIQUE NOT NULL,
  periodo_referencia TEXT NOT NULL,
  data_emissao DATE NOT NULL,
  data_vencimento DATE NOT NULL,
  data_pagamento DATE,
  valor_base DECIMAL(10,2) NOT NULL,
  valor_extras DECIMAL(10,2) DEFAULT 0,
  valor_descontos DECIMAL(10,2) DEFAULT 0,
  valor_juros DECIMAL(10,2) DEFAULT 0,
  valor_total DECIMAL(10,2) NOT NULL,
  quantidade_movimentacoes INTEGER DEFAULT 0,
  quantidade_veiculos_extras INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'paga', 'vencida', 'cancelada')),
  forma_pagamento TEXT,
  numero_nfse TEXT,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add Foreign Key for fatura_id in movimentacoes
ALTER TABLE convenios_movimentacoes 
ADD CONSTRAINT fk_movimentacoes_fatura 
FOREIGN KEY (fatura_id) REFERENCES convenios_faturas(id);

-- 6. Table: convenios_historico
CREATE TABLE IF NOT EXISTS convenios_historico (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  convenio_id UUID REFERENCES convenios(id) ON DELETE CASCADE,
  data_alteracao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  usuario_id UUID, -- Reference to auth.users or public.users depending on setup
  tipo_alteracao TEXT NOT NULL,
  dados_anteriores JSONB,
  dados_novos JSONB,
  motivo TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Table: convenios_documentos
CREATE TABLE IF NOT EXISTS convenios_documentos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  convenio_id UUID REFERENCES convenios(id) ON DELETE CASCADE,
  tipo_documento TEXT NOT NULL,
  nome_arquivo TEXT NOT NULL,
  caminho_arquivo TEXT NOT NULL,
  tamanho_bytes INTEGER,
  data_upload TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  usuario_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Table: notificacoes
CREATE TABLE IF NOT EXISTS notificacoes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tipo TEXT NOT NULL CHECK (tipo IN (
    'vencimento_contrato',
    'pagamento_pendente',
    'pagamento_vencido',
    'limite_vagas',
    'veiculo_nao_autorizado',
    'fatura_gerada',
    'outros'
  )),
  prioridade TEXT NOT NULL CHECK (prioridade IN ('baixa', 'media', 'alta', 'critica')),
  titulo TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  referencia_id UUID,
  referencia_tipo TEXT,
  lida BOOLEAN DEFAULT false,
  data_criacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  data_leitura TIMESTAMP WITH TIME ZONE,
  usuario_id UUID,
  acao_url TEXT
);

-- 9. View: convenios_ocupacao (For dashboard and reporting)
DROP VIEW IF EXISTS convenios_ocupacao;
CREATE OR REPLACE VIEW convenios_ocupacao AS
SELECT
  c.id as convenio_id,
  c.nome_empresa,
  p.num_vagas_contratadas,
  COUNT(m.id) as vagas_ocupadas,
  CASE
    WHEN p.num_vagas_contratadas > 0 THEN
      ROUND((COUNT(m.id)::numeric / p.num_vagas_contratadas::numeric) * 100, 2)
    ELSE 0
  END as taxa_ocupacao_percentual
FROM convenios c
JOIN convenios_planos p ON c.id = p.convenio_id AND p.ativo = true
LEFT JOIN convenios_movimentacoes m ON c.id = m.convenio_id AND m.data_saida IS NULL
WHERE c.status = 'ativo'
GROUP BY c.id, c.nome_empresa, p.num_vagas_contratadas;


-- ================================================
-- INDEXES
-- ================================================

CREATE INDEX IF NOT EXISTS idx_convenios_status ON convenios(status);
CREATE INDEX IF NOT EXISTS idx_convenios_cnpj ON convenios(cnpj);
CREATE INDEX IF NOT EXISTS idx_convenios_tipo ON convenios(tipo_convenio);

CREATE INDEX IF NOT EXISTS idx_convenios_planos_convenio ON convenios_planos(convenio_id);
CREATE INDEX IF NOT EXISTS idx_convenios_planos_ativo ON convenios_planos(ativo);

CREATE INDEX IF NOT EXISTS idx_faturas_convenio ON convenios_faturas(convenio_id);
CREATE INDEX IF NOT EXISTS idx_faturas_status ON convenios_faturas(status);
CREATE INDEX IF NOT EXISTS idx_faturas_periodo ON convenios_faturas(periodo_referencia);

CREATE INDEX IF NOT EXISTS idx_movimentacoes_convenio ON convenios_movimentacoes(convenio_id);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_faturado ON convenios_movimentacoes(faturado);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_saida ON convenios_movimentacoes(data_saida);

CREATE INDEX IF NOT EXISTS idx_veiculos_placa ON convenios_veiculos(placa);
CREATE INDEX IF NOT EXISTS idx_veiculos_convenio ON convenios_veiculos(convenio_id);

CREATE INDEX IF NOT EXISTS idx_notificacoes_usuario ON notificacoes(usuario_id);
CREATE INDEX IF NOT EXISTS idx_notificacoes_lida ON notificacoes(lida);
CREATE INDEX IF NOT EXISTS idx_notificacoes_prioridade ON notificacoes(prioridade);


-- ================================================
-- POLICIES (Row Level Security) - OPTIONAL
-- Enable if you are using Supabase Auth with RLS
-- ================================================

ALTER TABLE convenios ENABLE ROW LEVEL SECURITY;
ALTER TABLE convenios_planos ENABLE ROW LEVEL SECURITY;
ALTER TABLE convenios_veiculos ENABLE ROW LEVEL SECURITY;
ALTER TABLE convenios_movimentacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE convenios_faturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE convenios_historico ENABLE ROW LEVEL SECURITY;
ALTER TABLE convenios_documentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificacoes ENABLE ROW LEVEL SECURITY;

-- Allow all for now (Adjust based on your auth requirements)
CREATE POLICY "Allow all access to convenios" ON convenios FOR ALL USING (true);
CREATE POLICY "Allow all access to convenios_planos" ON convenios_planos FOR ALL USING (true);
CREATE POLICY "Allow all access to convenios_veiculos" ON convenios_veiculos FOR ALL USING (true);
CREATE POLICY "Allow all access to convenios_movimentacoes" ON convenios_movimentacoes FOR ALL USING (true);
CREATE POLICY "Allow all access to convenios_faturas" ON convenios_faturas FOR ALL USING (true);
CREATE POLICY "Allow all access to convenios_historico" ON convenios_historico FOR ALL USING (true);
CREATE POLICY "Allow all access to convenios_documentos" ON convenios_documentos FOR ALL USING (true);
CREATE POLICY "Allow all access to notificacoes" ON notificacoes FOR ALL USING (true);
