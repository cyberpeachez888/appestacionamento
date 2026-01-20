-- ===================================================================
-- MIGRAÇÃO: Template Configurável de Faturas
-- ===================================================================
-- 
-- OBJETIVO:
-- Criar tabela para armazenar configurações do template de fatura,
-- permitindo personalização dos dados do emitente sem alterar código.
--
-- CRIADO EM: 2026-01-19
-- ===================================================================

-- Criar tabela de configuração
CREATE TABLE IF NOT  EXISTS configuracoes_template_fatura (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- ===================================================================
  -- DADOS DA EMPRESA (Emitente da Fatura)
  -- ===================================================================
  
  logo_url TEXT,
  nome_empresa TEXT NOT NULL,
  razao_social TEXT,
  cnpj TEXT NOT NULL,
  endereco TEXT,
  cidade TEXT,
  estado TEXT,
  cep TEXT,
  telefone TEXT,
  email TEXT,
  website TEXT,
  
  -- ===================================================================
  -- DADOS BANCÁRIOS
  -- ===================================================================
  
  banco_nome TEXT,
  banco_agencia TEXT,
  banco_conta TEXT,
  pix_chave TEXT,
  pix_tipo TEXT CHECK (pix_tipo IN ('email', 'telefone', 'cpf', 'cnpj', 'aleatoria')),
  
  -- ===================================================================
  -- RÓTULOS CUSTOMIZÁVEIS
  -- ===================================================================
  
  titulo_fatura TEXT DEFAULT 'FATURA',
  label_numero TEXT DEFAULT 'Nº Fatura',
  label_periodo TEXT DEFAULT 'Período',
  label_emissao TEXT DEFAULT 'Emissão',
  label_vencimento TEXT DEFAULT 'Vencimento',
  label_dados_cliente TEXT DEFAULT 'DADOS DO CLIENTE',
  label_modalidade TEXT DEFAULT 'MODALIDADE',
  label_movimentacoes TEXT DEFAULT 'MOVIMENTAÇÕES DO PERÍODO',
  label_discriminacao TEXT DEFAULT 'DISCRIMINAÇÃO DE VALORES',
  label_observacoes TEXT DEFAULT 'OBSERVAÇÕES',
  label_pagamento TEXT DEFAULT 'INSTRUÇÕES DE PAGAMENTO',
  texto_rodape TEXT,
  
  --===================================================================
  -- PERSONALIZAÇÃO VISUAL (Cores)
  -- ===================================================================
  
  cor_cabecalho TEXT DEFAULT '#3B82F6',
  cor_destaque TEXT DEFAULT '#10B981',
  cor_texto_primario TEXT DEFAULT '#000000',
  cor_texto_secundario TEXT DEFAULT '#6B7280',
  
  -- ===================================================================
  -- CONTROLE
  -- ===================================================================
  
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ===================================================================
-- ÍNDICES
-- ===================================================================

-- Busca rápida do template ativo
CREATE INDEX idx_template_ativo 
  ON configuracoes_template_fatura(ativo) 
  WHERE ativo = true;

-- ===================================================================
-- COMENTÁRIOS EXPLICATIVOS
-- ===================================================================

COMMENT ON TABLE configuracoes_template_fatura IS 
  'Template configurável para geração de faturas de convênios. Armazena dados do emitente e personalização visual.';

COMMENT ON COLUMN configuracoes_template_fatura.ativo IS 
  'Sempre deve existir apenas UM template ativo por vez. Usado para gerar novas faturas.';

COMMENT ON COLUMN configuracoes_template_fatura.logo_url IS 
  'Caminho relativo ao storage da logo (ex: /storage/logos/logo.png)';

COMMENT ON COLUMN configuracoes_template_fatura.pix_tipo IS 
  'Tipo da chave PIX: email, telefone, cpf, cnpj ou aleatoria';

COMMENT ON COLUMN configuracoes_template_fatura.texto_rodape IS 
  'Texto livre exibido no rodapé da fatura (ex: instruções adicionais de pagamento)';

-- ===================================================================
-- INSERIR TEMPLATE PADRÃO DE FÁBRICA
-- ===================================================================

INSERT INTO configuracoes_template_fatura (
  nome_empresa,
  razao_social,
  cnpj,
  endereco,
  cidade,
  estado,
  cep,
  telefone,
  email,
  banco_nome,
  banco_agencia,
  banco_conta,
  texto_rodape,
  ativo
) VALUES (
  'Parking System',
  'Parking System Ltda',
  '00.000.000/0001-00',
  'Rua Exemplo, 123 - Centro',
  'São Paulo',
  'SP',
  '00000-000',
  '(00) 0000-0000',
  'contato@parkingsystem.com.br',
  'Banco Exemplo',
  '0000',
  '00000-0',
  'Pagamento também pode ser realizado via PIX, cartão ou dinheiro no local.',
  true
) ON CONFLICT DO NOTHING;

-- ===================================================================
-- VERIFICAÇÃO
-- ===================================================================

-- Verificar que template foi criado
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM configuracoes_template_fatura WHERE ativo = true) THEN
    RAISE EXCEPTION 'ERRO: Template padrão não foi criado!';
  END IF;
  
  RAISE NOTICE 'Template de fatura instalado com sucesso!';
END $$;

-- ===================================================================
-- FIM DA MIGRAÇÃO
-- ===================================================================
