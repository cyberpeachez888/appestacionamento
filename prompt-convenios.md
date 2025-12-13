OBJETIVO
Criar um módulo completo de CONVÊNIOS integrado ao sistema existente, permitindo gestão de contratos empresariais de estacionamento nos modelos pré-pago e pós-pago.

1. ESTRUTURA DO BANCO DE DADOS (SUPABASE)
Criar as seguintes tabelas no Supabase:

Tabela: convenios

CREATE TABLE convenios (
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

Tabela: convenios_planos

CREATE TABLE convenios_planos (
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
  num_vagas_contratadas INTEGER NOT NULL,
  num_vagas_reservadas INTEGER DEFAULT 0,
  permite_vagas_extras BOOLEAN DEFAULT false,
  valor_vaga_extra DECIMAL(10,2),
  permite_horario_especial BOOLEAN DEFAULT false,
  horarios_permitidos JSONB,
  data_inicio_vigencia DATE NOT NULL,
  data_fim_vigencia DATE,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

Tabela: convenios_veiculos

CREATE TABLE convenios_veiculos (
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
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(convenio_id, placa)
);

Tabela: convenios_movimentacoes

CREATE TABLE convenios_movimentacoes (
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
  fatura_id UUID,
  observacoes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

Tabela: convenios_faturas

CREATE TABLE convenios_faturas (
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
  created_at TIMESTAMP DEFAULT NOW()
);

Tabela: convenios_historico

CREATE TABLE convenios_historico (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  convenio_id UUID REFERENCES convenios(id) ON DELETE CASCADE,
  data_alteracao TIMESTAMP DEFAULT NOW(),
  usuario_id UUID,
  tipo_alteracao TEXT NOT NULL,
  dados_anteriores JSONB,
  dados_novos JSONB,
  motivo TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

Tabela: convenios_documentos

CREATE TABLE convenios_documentos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  convenio_id UUID REFERENCES convenios(id) ON DELETE CASCADE,
  tipo_documento TEXT NOT NULL,
  nome_arquivo TEXT NOT NULL,
  caminho_arquivo TEXT NOT NULL,
  tamanho_bytes INTEGER,
  data_upload TIMESTAMP DEFAULT NOW(),
  usuario_id UUID,
  created_at TIMESTAMP DEFAULT NOW()
);

IMPORTANTE: Criar índices para otimização:

CREATE INDEX idx_convenios_status ON convenios(status);
CREATE INDEX idx_convenios_cnpj ON convenios(cnpj);
CREATE INDEX idx_convenios_tipo ON convenios(tipo_convenio);
CREATE INDEX idx_faturas_convenio ON convenios_faturas(convenio_id);
CREATE INDEX idx_faturas_status ON convenios_faturas(status);
CREATE INDEX idx_faturas_periodo ON convenios_faturas(periodo_referencia);
CREATE INDEX idx_movimentacoes_convenio ON convenios_movimentacoes(convenio_id);
CREATE INDEX idx_movimentacoes_faturado ON convenios_movimentacoes(faturado);
CREATE INDEX idx_veiculos_placa ON convenios_veiculos(placa);
CREATE INDEX idx_veiculos_convenio ON convenios_veiculos(convenio_id);
```

---

## 2. NOVA PÁGINA: CONVÊNIOS

### Localização
Criar em: `/app/convenios/page.tsx`

### Layout da Página

#### 2.1 Header com Estatísticas (Cards no topo)
Exibir 4 cards com:
- **Total de Convênios Ativos** (número + ícone)
- **Receita Mensal Prevista** (soma dos valores de todos convênios ativos: pré-pago = valor fixo, pós-pago = média dos últimos 3 meses)
- **Taxa de Ocupação** (vagas ocupadas no momento / vagas totais contratadas)
- **Inadimplência** (% de convênios com status 'inadimplente' ou faturas vencidas)

**Estilo:** Usar mesma identidade visual dos cards/estatísticas já existentes no app.

#### 2.2 Barra de Filtros e Ações
- **Filtros:**
  - Status (Todos, Ativo, Suspenso, Cancelado, Inadimplente)
  - Tipo (Todos, Pré-pago, Pós-pago)
  - Categoria (Todos, Funcionários, Clientes, Fornecedores, Outros)
  - Campo de busca (por nome da empresa ou CNPJ)

- **Botões de Ação:**
  - "Novo Convênio" (principal, destaque)
  - "Gerar Faturas em Lote"
  - "Relatórios" (dropdown com opções)
  - "Exportar Lista" (CSV/PDF)

#### 2.3 Tabela de Convênios
Usar o **mesmo estilo e comportamento da tabela da página Operacional**:
- Linhas selecionáveis (clique para selecionar)
- Deseleção com tecla ESC
- Colunas:
  - **Status** (badge colorido: verde=ativo, amarelo=vence em breve, vermelho=inadimplente/vencido)
  - **Empresa** (nome_empresa)
  - **CNPJ** (formatado: XX.XXX.XXX/XXXX-XX)
  - **Tipo** (Badge: "PRÉ-PAGO" verde / "PÓS-PAGO" azul)
  - **Vagas** (contratadas / ocupadas no momento)
  - **Valor Mensal** (para pré-pago: valor fixo / para pós-pago: "Sob demanda" ou média)
  - **Vencimento** (dia do mês)
  - **Status Pagamento** (badge: verde=em dia, vermelho=atrasado)
  - **Ações** (ícones: editar, suspender, ver detalhes)

**Indicadores Visuais de Status:**
- 🟢 Verde: Pagamento em dia e contrato ativo
- 🟡 Amarelo: Vencimento próximo (7 dias) ou suspenso temporariamente
- 🔴 Vermelho: Inadimplente ou pagamento vencido

#### 2.4 Painel de Detalhes (abaixo da tabela, quando linha selecionada)
Ao clicar em uma linha, expandir painel detalhado com **abas**:

**Aba 1: Dados Gerais**
- Informações completas do convênio
- Dados de contato
- Datas de início e vencimento de contrato
- Botão "Editar Dados"
- Botão "Suspender/Reativar Convênio"
- Botão "Cancelar Convênio" (com confirmação)

**Aba 2: Plano Contratado**
- Tipo de convênio (Pré-pago / Pós-pago)
- Detalhes do plano atual (valores, vagas, datas)
- Histórico de alterações de plano
- Botão "Alterar Plano"

**Aba 3: Veículos Autorizados**
- Tabela com lista de veículos cadastrados (placa, tipo, modelo, cor, proprietário, status)
- Indicador visual: veículo ativo/inativo
- Estatística: "X veículos cadastrados de Y vagas contratadas"
- Alerta se houver veículos extras identificados (apenas para pós-pago)
- Botão "Adicionar Veículo"
- Botão "Editar" e "Desativar" por linha
- Campo de busca rápida por placa

**Aba 4: Financeiro**
- Lista de faturas (todas) ordenadas por data decrescente
- Para cada fatura: número, período, valor, vencimento, status
- Badges coloridos de status (verde=paga, amarelo=pendente, vermelho=vencida)
- Botão "Gerar Nova Fatura" (manual)
- Botão "Registrar Pagamento" (por fatura pendente/vencida)
- Botão "Ver Detalhes" (abre modal com breakdown da fatura)
- Estatísticas: Total pago no ano, Total pendente, Média mensal
- Histórico de pagamentos completo

**Aba 5: Movimentações** (apenas para pós-pago)
- Tabela com todas as entradas/saídas registradas
- Colunas: Data, Placa, Tipo Veículo, Modelo, Entrada, Saída, Tempo, Valor, Faturado
- Badge "EXTRA" em vermelho para veículos não cadastrados
- Filtro por período (data inicial e final)
- Filtro por status (Todos, Faturados, Não Faturados, Apenas Extras)
- Estatísticas do período selecionado:
  - Total de movimentações
  - Total de horas utilizadas
  - Total de veículos extras
  - Valor total calculado
- Botão "Registrar Entrada/Saída Manual" (caso necessário corrigir algo)
- Botão "Exportar Movimentações" (CSV/Excel)

**Aba 6: Documentos**
- Lista de documentos anexados (nome, tipo, data upload, tamanho)
- Botão "Fazer Upload"
- Botão "Download" e "Excluir" por documento
- Tipos sugeridos: Contrato, CNPJ, Comprovante de Pagamento, Outros
- Armazenar localmente no PC (path sugerido: `/documentos/convenios/{convenio_id}/`)
- Validação de tamanho máximo (ex: 10MB por arquivo)

**Aba 7: Histórico**
- Timeline de todas alterações realizadas no convênio
- Para cada registro: Data/Hora, Usuário, Tipo de Alteração, Descrição
- Tipos de alteração: Criação, Edição de Dados, Alteração de Plano, Suspensão, Reativação, Geração de Fatura, Pagamento, etc.
- Possibilidade de expandir para ver detalhes (o que mudou: antes → depois)
- Filtro por tipo de alteração
- Filtro por período

---

## 3. DIÁLOGOS E MODAIS

### 3.1 Diálogo: Novo Convênio
**Estilo:** Usar o mesmo padrão do diálogo de cadastro da página Mensalistas (multi-step wizard).

**Estrutura em 4 passos:**

**PASSO 1: Dados da Empresa**
```
┌─────────────────────────────────────────────┐
│  Novo Convênio - Dados da Empresa (1/4)    │
├─────────────────────────────────────────────┤
│                                             │
│  Nome da Empresa*                           │
│  [_________________________________]        │
│                                             │
│  Razão Social*                              │
│  [_________________________________]        │
│                                             │
│  CNPJ*                                      │
│  [__.___.___/____-__]                       │
│                                             │
│  Categoria*                                 │
│  [▼ Selecione                           ]   │
│     - Funcionários                          │
│     - Clientes                              │
│     - Fornecedores                          │
│     - Outros                                │
│                                             │
│  Endereço Completo                          │
│  [_________________________________]        │
│                                             │
│  Observações                                │
│  [_________________________________]        │
│  [_________________________________]        │
│                                             │
│              [Cancelar]  [Próximo →]        │
└─────────────────────────────────────────────┘
```

**PASSO 2: Contato**
```
┌─────────────────────────────────────────────┐
│  Novo Convênio - Contato (2/4)             │
├─────────────────────────────────────────────┤
│                                             │
│  Nome do Contato*                           │
│  [_________________________________]        │
│                                             │
│  Email*                                     │
│  [_________________________________]        │
│                                             │
│  Telefone*                                  │
│  [(__)_____-____]                           │
│                                             │
│                                             │
│         [← Voltar]  [Cancelar]  [Próximo →]│
└─────────────────────────────────────────────┘
```

**PASSO 3: Configuração do Plano**
```
┌─────────────────────────────────────────────┐
│  Novo Convênio - Plano (3/4)               │
├─────────────────────────────────────────────┤
│                                             │
│  Tipo de Convênio*                          │
│  ○ Pré-pago    ○ Pós-pago                   │
│                                             │
│ ─────────────────────────────────────────── │
│                                             │
│  [CONTEÚDO DINÂMICO CONFORME SELEÇÃO]      │
│                                             │
│ ─────────────────────────────────────────── │
│                                             │
│         [← Voltar]  [Cancelar]  [Próximo →]│
└─────────────────────────────────────────────┘
```

**SE PRÉ-PAGO SELECIONADO (conteúdo dinâmico):**
```
│  Valor Mensal*                              │
│  R$ [__________]                            │
│                                             │
│  Número de Vagas Contratadas*              │
│  [___]                                      │
│                                             │
│  Número de Vagas Reservadas                │
│  [___] (opcional)                           │
│                                             │
│  Dia de Vencimento do Pagamento*           │
│  [▼ Selecione (1-28)                    ]   │
│                                             │
│  □ Permite vagas extras                     │
│    └─ Valor por vaga extra: R$ [_____]     │
│                                             │
│  □ Horário especial de acesso               │
│    └─ Das [__:__] às [__:__]               │
```

**SE PÓS-PAGO SELECIONADO (conteúdo dinâmico):**
```
│  ℹ️ Valor calculado mensalmente baseado     │
│     no uso real seguindo o motor de        │
│     tarifação do sistema                   │
│                                             │
│  Motor de Tarifação                         │
│  ☑ Usar tabela padrão do sistema           │
│                                             │
│  Número de Vagas Estimadas*                │
│  [___]                                      │
│  (apenas para controle, não limita uso)     │
│                                             │
│  Número de Vagas Reservadas                │
│  [___] (opcional)                           │
│                                             │
│  Dia de Fechamento Mensal*                 │
│  [▼ Selecione (1-28)                    ]   │
│  (dia em que a relação será gerada)         │
│                                             │
│  Dia de Vencimento do Pagamento*           │
│  [▼ Selecione (1-28)                    ]   │
│  (prazo para pagamento após fechamento)     │
│                                             │
│  □ Aplicar desconto corporativo             │
│    └─ Percentual: [__]%                    │
│                                             │
│  Observações sobre o cálculo                │
│  [_________________________________]        │
│  [_________________________________]        │
```

**PASSO 4: Datas e Contrato**
```
┌─────────────────────────────────────────────┐
│  Novo Convênio - Contrato (4/4)           │
├─────────────────────────────────────────────┤
│                                             │
│  Data de Início*                            │
│  [__/__/____]                               │
│                                             │
│  Data de Vencimento do Contrato            │
│  [__/__/____] (opcional - renovação auto)   │
│                                             │
│  Upload do Contrato (PDF)                  │
│  [Selecionar arquivo...]                    │
│  └─ Nenhum arquivo selecionado             │
│                                             │
│                                             │
│         [← Voltar]  [Cancelar]  [Salvar]   │
└─────────────────────────────────────────────┘
```

**Validações:**
- CNPJ deve ser único e válido
- Email formato válido
- Telefone formato válido
- Para pré-pago: valor mensal > 0
- Para ambos: número de vagas > 0
- Dia de vencimento entre 1 e 28
- Data de início não pode ser no passado
- Se permite vagas extras, valor deve ser informado (pré-pago)
- Se percentual de desconto > 0, deve ser entre 1 e 100

### 3.2 Diálogo: Adicionar Veículo
```
┌─────────────────────────────────────────────┐
│  Adicionar Veículo                         │
├─────────────────────────────────────────────┤
│  Convênio: Tech Solutions Informática       │
│                                             │
│  Placa* (somente letras e números)         │
│  [_______] (será convertido para maiúsculo) │
│                                             │
│  Tipo de Veículo*                           │
│  [▼ Carro                               ]   │
│     - Carro                                 │
│     - Moto                                  │
│     - Van                                   │
│     - Caminhão                              │
│     - Outros                                │
│                                             │
│  Modelo                                     │
│  [_________________________________]        │
│                                             │
│  Cor                                        │
│  [_________________________________]        │
│                                             │
│  Proprietário                               │
│  [_________________________________]        │
│                                             │
│  CPF do Proprietário                        │
│  [___.___.___-__]                           │
│                                             │
│  Observações                                │
│  [_________________________________]        │
│                                             │
│              [Cancelar]  [Salvar]           │
└─────────────────────────────────────────────┘
```

**Validações:**
- Placa não pode estar duplicada neste convênio
- Tipo de veículo obrigatório
- CPF válido se informado
- Alertar se número de veículos cadastrados exceder vagas contratadas

### 3.3 Diálogo: Registrar Movimentação Manual (Pós-pago)
```
┌─────────────────────────────────────────────┐
│  Registrar Movimentação Manual             │
├─────────────────────────────────────────────┤
│  Convênio: Tech Solutions Informática       │
│                                             │
│  Veículo*                                   │
│  [▼ Selecione ou digite a placa         ]   │
│                                             │
│  Tipo de Movimentação*                     │
│  ○ Entrada    ○ Saída                       │
│                                             │
│  Data*                                      │
│  [__/__/____]                               │
│                                             │
│  Hora*                                      │
│  [__:__]                                    │
│                                             │
│  Observações                                │
│  [_________________________________]        │
│                                             │
│              [Cancelar]  [Registrar]        │
└─────────────────────────────────────────────┘
```

**Lógica:** 
- Se entrada: criar novo registro
- Se saída: buscar entrada correspondente, calcular tempo e valor usando motor de tarifação
- Alertar se veículo não estiver cadastrado (marcar como extra)

### 3.4 Diálogo: Gerar Fatura
```
┌─────────────────────────────────────────────┐
│  Gerar Fatura                              │
├─────────────────────────────────────────────┤
│  Convênio: Tech Solutions Informática       │
│  Tipo: Pós-pago                             │
│                                             │
│  Período de Referência*                    │
│  [▼ Outubro/2024                        ]   │
│                                             │
│  Data de Emissão*                          │
│  [__/__/____] (padrão: hoje)               │
│                                             │
│  Data de Vencimento*                       │
│  [__/__/____] (calculado automaticamente)   │
│                                             │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  CÁLCULO AUTOMÁTICO:                        │
│                                             │
│  Total de movimentações: 87                 │
│  Total de horas: 756h 30min                │
│  Veículos extras: 3 (12 movimentações)     │
│                                             │
│  Valor base calculado:    R$ 3.450,00      │
│  Desconto (10%):          - R$ 345,00      │
│  ───────────────────────────────────────   │
│  VALOR TOTAL:             R$ 3.105,00      │
│                                             │
│  Valor de descontos (editável):             │
│  R$ [345,00]                                │
│                                             │
│  Observações                                │
│  [_________________________________]        │
│                                             │
│              [Cancelar]  [Gerar Fatura]     │
└─────────────────────────────────────────────┘
```

**Para Pré-pago:**
- Valor base = valor do plano
- Buscar se houve vagas extras usadas no período

**Para Pós-pago:**
- Buscar todas movimentações do período não faturadas
- Calcular valor total usando motor de tarifação
- Aplicar desconto se configurado
- Identificar e destacar veículos extras
- Marcar todas movimentações como faturadas após gerar

**Campos calculados automaticamente:**
- Valor Base
- Valor Extras (veículos não cadastrados)
- Valor Descontos (editável pelo usuário)
- Valor Total

**Após gerar:**
- Salvar fatura no banco
- Opção: "Enviar por Email" (usar serviço já implementado)

### 3.5 Diálogo: Registrar Pagamento
```
┌─────────────────────────────────────────────┐
│  Registrar Pagamento                       │
├─────────────────────────────────────────────┤
│  Fatura: #2024-10-001                       │
│  Empresa: Tech Solutions Informática        │
│  Valor: R$ 3.105,00                         │
│  Vencimento: 10/11/2024                     │
│                                             │
│  Data do Pagamento*                        │
│  [__/__/____]                               │
│                                             │
│  Forma de Pagamento*                       │
│  [▼ Selecione                           ]   │
│     - Dinheiro                              │
│     - PIX                                   │
│     - Cartão de Crédito                     │
│     - Cartão de Débito                      │
│     - Transferência Bancária                │
│     - Boleto                                │
│                                             │
│  Número da NFSe                            │
│  [_________________________________]        │
│                                             │
│  Observações                                │
│  [_________________________________]        │
│                                             │
│              [Cancelar]  [Confirmar]        │
└─────────────────────────────────────────────┘

Lógica:

Se pagamento após vencimento: calcular juros automaticamente (1% ao mês)
Atualizar status da fatura para "paga"
Atualizar data_pagamento
Se convênio estava inadimplente, mudar status para ativo
Registrar no histórico

4. INTEGRAÇÃO COM PÁGINA OPERACIONAL
4.1 Modificações no Diálogo "Registrar Entrada"
Implementar um sistema híbrido de identificação automática com fallback manual:
COMPORTAMENTO:

Quando o diálogo "Registrar Entrada" for aberto, manter a estrutura existente mas adicionar:
Busca automática por placa:

Ao usuário digitar a placa (campo existente), executar busca em tempo real em convenios_veiculos

Query: SELECT * FROM convenios_veiculos WHERE placa = 'ABC1234' AND ativo = true


Se veículo for encontrado (conveniado cadastrado):

Exibir card de identificação abaixo do campo placa:

   ┌─────────────────────────────────────────┐
   │ ✅ VEÍCULO CONVENIADO IDENTIFICADO      │
   ├─────────────────────────────────────────┤
   │ Empresa: Tech Solutions Informática     │
   │ Tipo: 🔵 Pós-pago                       │
   │ Veículo: Civic - Prata                  │
   │ Proprietário: João Silva                │
   │                                         │
   │ Status: ✓ Autorizado                    │
   │ Vagas ocupadas: 8/10 contratadas        │
   └─────────────────────────────────────────┘

Preencher automaticamente: tipo de veículo, modelo, cor (se cadastrados)
Ao confirmar entrada:

Se Pós-pago: Registrar em convenios_movimentacoes com veiculo_extra = false
Se Pré-pago: Registrar em convenios_movimentacoes para controle
Não cobrar nada (ambos já têm regras próprias)
Exibir badge visual na tabela operacional




4. Se veículo NÃO for encontrado:

Exibir card de alerta:
   ┌─────────────────────────────────────────┐
   │ ⚠️ Veículo não cadastrado                │
   │                                         │
   │ Este veículo pertence a algum convênio? │
   │                                         │
   │ [Não, é avulso]  [Sim, vincular]       │
   └─────────────────────────────────────────┘

5. Se usuário clicar "Sim, vincular":

Expandir formulário de vinculação rápida:

   ┌─────────────────────────────────────────┐
   │ Vincular Veículo a Convênio             │
   ├─────────────────────────────────────────┤
   │ Selecione o Convênio*                   │
   │ [▼ Buscar por nome ou CNPJ...        ]  │
   │                                         │
   │ Tipo de Veículo* (já preenchido se      │
   │ selecionado anteriormente)              │
   │ [▼ Carro                             ]  │
   │                                         │
   │ Modelo: [__________]                    │
   │ Cor: [__________]                       │
   │ Proprietário: [__________]              │
   │                                         │
   │ [Cancelar] [Cadastrar e Registrar]      │
   └─────────────────────────────────────────┘

Ao confirmar: cadastrar veículo em convenios_veiculos e prosseguir com entrada


6. Se usuário clicar "Não, é avulso":

Prosseguir com fluxo normal de entrada avulsa


7. Tratamento de veículos extras (Pós-pago):

Se veículo não cadastrado pertencer a um convênio (após vinculação manual) OU se for permitido entrar sem cadastro:

Registrar em convenios_movimentacoes com veiculo_extra = true
Exibir badge "EXTRA" em vermelho no painel
Será cobrado normalmente e aparecerá destacado na relação mensal

4.2 Indicadores Visuais na Tabela Operacional
Adicionar coluna ou badge de identificação:

┌──────┬──────────┬─────────┬─────────┬──────────────────────┬────────┐
│ Vaga │  Placa   │  Modelo │ Entrada │ Status               │ Ações  │
├──────┼──────────┼─────────┼─────────┼──────────────────────┼────────┤
│ A-12 │ ABC1234  │ Civic   │ 08:30   │ 🔵 CONVÊNIO PÓS      │ [...]  │
│ B-05 │ XYZ9876  │ HB20    │ 09:15   │ 🟢 CONVÊNIO PRÉ      │ [...]  │
│ C-08 │ DEF5678  │ Gol     │ 10:00   │ ⚪ AVULSO             │ [...]  │
│ D-03 │ GHI1234  │ Onix    │ 10:30   │ 🔴 PÓS-PAGO EXTRA    │ [...]  │
└──────┴──────────┴─────────┴─────────┴──────────────────────┴────────┘

Legenda de badges:
🟢 = Convênio Pré-pago (já pago mensalmente)
🔵 = Convênio Pós-pago (será faturado depois)
🔴 = Convênio Pós-pago EXTRA (veículo não cadastrado - cobrar mais)
⚪ = Avulso (cobra na saída normalmente)

4.3 Controle de Vagas em Dashboard/Estatísticas
Se houver dashboard ou cards de estatísticas, separar ocupação:

Vagas Avulso: X ocupadas
Vagas Convênio: Y ocupadas (Z contratadas)
Total: X + Y

5. INTEGRAÇÃO COM PÁGINA FINANÇAS
5.1 Nova Seção: "Receitas de Convênios"
Adicionar uma seção dedicada na página Finanças com:
Card/Painel Superior:

┌────────────────────────────────────────────────────────────┐
│  💼 RECEITAS DE CONVÊNIOS                                  │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  A receber (mês atual):     R$ 45.300,00                  │
│  Recebido (mês atual):      R$ 38.500,00   (85%)         │
│  Inadimplência:             R$ 6.800,00    (15%)         │
│                                                            │
│  Convênios ativos: 28     Inad implentes: 4               │
│                                                            │
└────────────────────────────────────────────────────────────┘

Tabela: Dívidas Ativas e Status de Pagamento
Colunas:

Empresa (nome + CNPJ resumido)
Tipo (badge: PRÉ/PÓS)
Nº Fatura
Período Ref.
Valor da Fatura (R$)
Vencimento (data)
Status (badge colorido)
Dias em Atraso (apenas se vencido, em vermelho)
Ações (Registrar Pagamento, Enviar Cobrança, Ver Detalhes)

Status possíveis:

🟢 Pago
🟡 Pendente (ainda não venceu)
🔴 Vencido

Filtros:

Status (Todos, Pendente, Pago, Vencido)
Tipo (Todos, Pré-pago, Pós-pago)
Período (mês/ano)
Campo de busca por empresa

Ordenação padrão: Faturas vencidas primeiro, depois pendentes, depois pagas.
5.2 Relatórios de Convênios
Adicionar botão "Relatórios de Convênios" na página Finanças com dropdown de opções:
Relatório 1: Receita por Convênio
Conteúdo:

Listar todos os convênios ativos
Para cada um: nome, tipo, valor mensal (pré) ou média (pós), total faturado no período
Total geral
Gráfico de pizza mostrando participação percentual de cada convênio
Filtro por período (mês/ano ou range)

Exportação: PDF e CSV
Relatório 2: Inadimplência
Conteúdo:

Listar apenas convênios inadimplentes ou com faturas vencidas
Colunas: Empresa, Tipo, Valor em atraso, Data de vencimento, Dias em atraso, Último contato
Total em atraso
Gráfico de barras: valor em atraso por empresa
Histórico de contatos/tentativas de cobrança (se implementado)

Exportação: PDF e CSV
Relatório 3: Movimentações Detalhadas (Pós-pago)
Conteúdo:

Filtros: Convênio específico ou todos, Período
Listar todas as movimentações (entradas/saídas) do período
Colunas: Data, Hora Entrada, Hora Saída, Placa, Tipo Veículo, Modelo, Tempo, Valor, Extra (S/N), Faturado (S/N)
Estatísticas do período:

Total de movimentações
Total de horas utilizadas
Total de veículos extras
Valor total calculado
Comparação com faturas geradas (validação)


Breakdown por convênio se "todos" selecionado

Exportação: PDF, CSV e Excel
Relatório 4: Relação Mensal para Acerto (Pós-pago) ⭐
IMPORTANTE: Este é o relatório oficial para envio ao cliente para fechamento/pagamento mensal.
Filtros:

Convênio* (obrigatório - um por vez)
Período* (mês/ano)

Estrutura do Documento:

╔═══════════════════════════════════════════════════════════╗
║         RELAÇÃO DE MOVIMENTAÇÕES - OUTUBRO/2024           ║
╚═══════════════════════════════════════════════════════════╝

─────────────────────────────────────────────────────────────
DADOS DO ESTACIONAMENTO:
─────────────────────────────────────────────────────────────
Nome:     Estacionamento Central Park
CNPJ:     12.345.678/0001-90
Endereço: Rua das Flores, 123 - Centro
Telefone: (11) 3456-7890
Email:    contato@centralpark.com.br

─────────────────────────────────────────────────────────────
DADOS DO CLIENTE CONVENIADO:
─────────────────────────────────────────────────────────────
Empresa:  Tech Solutions Informática Ltda.
CNPJ:     98.765.432/0001-10
Contato:  João Silva - (11) 98765-4321
Email:    financeiro@techsolutions.com.br
Período:  01/10/2024 a 31/10/2024
Tipo:     Pós-pago (cobrança por uso real)

─────────────────────────────────────────────────────────────
MOVIMENTAÇÕES REGISTRADAS:
─────────────────────────────────────────────────────────────
┌──────────┬──────────┬────────┬─────────┬─────────┬──────────┬───────────┐
│   Data   │  Placa   │ Modelo │ Entrada │  Saída  │  Tempo   │   Valor   │
├──────────┼──────────┼────────┼─────────┼─────────┼──────────┼───────────┤
│ 01/10/24 │ ABC-1234 │ Civic  │  08:00  │  18:30  │ 10h 30min│  R$ 45,00 │
│ 01/10/24 │ XYZ-5678 │ HB20   │  09:15  │  17:45  │  8h 30min│  R$ 35,00 │
│ 02/10/24 │ ABC-1234 │ Civic  │  07:45  │  19:00  │ 11h 15min│  R$ 50,00 │
│ 02/10/24 │ DEF-9012 │ Onix*  │  10:00  │  16:30  │  6h 30min│  R$ 30,00 │
│ 03/10/24 │ XYZ-5678 │ HB20   │  08:30  │  18:00  │  9h 30min│  R$ 40,00 │
│   ...    │   ...    │  ...   │   ...   │   ...   │   ...    │    ...    │
│ 31/10/24 │ ABC-1234 │ Civic  │  08:15  │  17:45  │  9h 30min│  R$ 40,00 │
└──────────┴──────────┴────────┴─────────┴─────────┴──────────┴───────────┘

* Veículos marcados são EXTRAS (não cadastrados previamente)

─────────────────────────────────────────────────────────────
VEÍCULOS EXTRAS IDENTIFICADOS:
─────────────────────────────────────────────────────────────
- DEF-9012 (Onix): 3 movimentações - R$ 95,00
- GHI-3456 (Corolla): 2 movimentações - R$ 80,00
  
  ⚠️ Sugerimos cadastrar estes veículos para próximos períodos

─────────────────────────────────────────────────────────────
RESUMO DO PERÍODO:
─────────────────────────────────────────────────────────────
Total de entradas:              87
Total de horas utilizadas:      756h 30min
Total de veículos extras:       2 veículos (5 movimentações)

Valor base calculado:           R$ 3.450,00
Valor de veículos extras:       R$ 175,00
Subtotal:                       R$ 3.625,00
Desconto corporativo (10%):   - R$ 362,50
─────────────────────────────────────────────────────────────
VALOR TOTAL A PAGAR:            R$ 3.262,50
═════════════════════════════════════════════════════════════

Data de vencimento: 10/11/2024

─────────────────────────────────────────────────────────────
FORMAS DE PAGAMENTO:
─────────────────────────────────────────────────────────────
PIX: 12.345.678/0001-90
Transferência: Banco do Brasil - Ag: 1234-5 - CC: 67890-1
Boleto: [código de barras se gerado]

─────────────────────────────────────────────────────────────
Documento gerado em: 01/11/2024 às 10:30
Usuário: Maria Santos

Este documento possui validade legal para fins de cobrança.
Em caso de dúvidas, entre em contato através dos canais acima.

Funcionalidades:

Botão "Gerar PDF" (formatado, com logo do estacionamento)
Botão "Gerar Excel" (planilha editável)
Botão "Enviar por Email" (anexar PDF, usar serviço de email implementado)
Botão "Enviar por WhatsApp" (link ou PDF, usar serviço implementado)
Botão "Imprimir"

Observações Importantes:

Destacar veículos extras visualmente (asterisco ou cor diferente)
Incluir alerta sobre veículos extras para incentivar cadastro
Mostrar desconto claramente se aplicável
Incluir todas as formas de pagamento disponíveis
Data de vencimento calculada automaticamente baseada no dia configurado

Relatório 5: Ocupação e Utilização por Convênio
Conteúdo:

Para cada convênio: nome, vagas contratadas, ocupação média, pico de utilização
Taxa de uso: (horas utilizadas / horas disponíveis) x 100
Identificar convênios sub-utilizados (usar < 50% das vagas)
Identificar convênios sobre-utilizados (sempre no limite)
Sugestões automáticas:

"Cliente X usa apenas 30% - sugerir redução de vagas"
"Cliente Y sempre excede - sugerir aumento de vagas"


Horários de pico por convênio
Dias da semana com maior uso

Exportação: PDF e CSV
Utilidade: Ferramenta para renegociação de contratos e otimização de vagas.

6. SISTEMA DE NOTIFICAÇÕES E ALERTAS
6.1 Criar Módulo de Notificações
Nova tabela:

CREATE TABLE notificacoes (
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
  data_criacao TIMESTAMP DEFAULT NOW(),
  data_leitura TIMESTAMP,
  usuario_id UUID,
  acao_url TEXT
);

CREATE INDEX idx_notificacoes_usuario ON notificacoes(usuario_id);
CREATE INDEX idx_notificacoes_lida ON notificacoes(lida);
CREATE INDEX idx_notificacoes_prioridade ON notificacoes(prioridade);
```

### 6.2 Alertas Automáticos

Implementar jobs/crons ou triggers que disparem os seguintes alertas:

**1. Vencimento de Contrato**
- **Quando:** 30, 15 e 7 dias antes do `data_vencimento_contrato`
- **Ação:**
  - Criar notificação no sistema (prioridade: média → alta → crítica)
  - Enviar email ao cliente
  - Alertar usuário admin no dashboard
- **Mensagem exemplo:** "Contrato com Tech Solutions vence em 7 dias. Renove ou renegocie."

**2. Pagamento Pendente (lembretes)**
- **Quando:**
  - 5 dias antes do vencimento: enviar lembrete amigável
  - No dia do vencimento (se não pago): enviar lembrete
  - 3 dias após vencimento: alerta crítico
- **Ação:**
  - Email automático
  - WhatsApp (opcional)
  - Notificação no sistema
  - Se 3+ dias vencido: mudar status do convênio para "inadimplente"
- **Mensagem exemplo:** "Fatura #2024-10-001 vence amanhã. Valor: R$ 3.105,00"

**3. Limite de Vagas Atingido**
- **Quando:** Ocupação atingir 100% das vagas contratadas
- **Ação:**
  - Notificar operador em tempo real
  - Opcionalmente notificar cliente (configurável)
  - Sugerir contratação de vagas extras
- **Mensagem exemplo:** "Tech Solutions atingiu limite (10/10 vagas). Próxima entrada será vaga extra."

**4. Veículo Não Autorizado**
- **Quando:** Placa não está em `convenios_veiculos` mas tenta usar convênio (vinculação manual)
- **Ação:**
  - Alerta imediato ao operador
  - Registrar como "extra" se permitido entrar
  - Notificar no final do mês na relação
- **Mensagem exemplo:** "Veículo DEF-9012 não cadastrado entrou como vaga extra de Tech Solutions."

**5. Geração Automática de Faturas (Pré-pago)**
- **Quando:** Dia = `dia_vencimento_pagamento` para convênios pré-pago
- **Ação:**
  - Job diário verifica quais convênios devem ter fatura gerada hoje
  - Gera fatura automaticamente
  - Envia por email
  - Cria notificação
- **Mensagem exemplo:** "Fatura automática gerada para Tech Solutions. Valor: R$ 2.500,00"

### 6.3 Centro de Notificações (Componente Global)

Adicionar no header da aplicação:
```
┌────────────────────────────────────┐
│  [Logo] [Menu]    🔔(3)  [Usuário] │
└────────────────────────────────────┘
                       │
                       ▼
       ┌───────────────────────────────┐
       │ 🔔 Notificações               │
       ├───────────────────────────────┤
       │ 🔴 Tech Solutions - Pag. venc │
       │    Há 3 dias                  │
       ├───────────────────────────────┤
       │ 🟡 Auto Peças - Contrato vence│
       │    Em 7 dias                  │
       ├───────────────────────────────┤
       │ 🔵 Fatura gerada - InfoTech   │
       │    2 horas atrás              │
       ├───────────────────────────────┤
       │        [Ver todas (12)]       │
       │        [Marcar todas lidas]   │
       └───────────────────────────────┘


Funcionalidades:

Contador de não lidas no ícone de sino
Dropdown com últimas 5 notificações
Click em notificação → redireciona para página relevante
Botão "Ver todas" → página completa de notificações
Botão "Marcar como lida" por notificação
Cores por prioridade (vermelho=crítica, amarelo=alta, azul=média)
Auto-refresh a cada 30 segundos


7. PERMISSÕES E CONTROLES DE ACESSO
Adicionar as seguintes permissões ao sistema de autenticação existente:
Novas Permissões:

// Visualização
'convenios.visualizar'              // Ver lista e detalhes básicos
'convenios.visualizar_financeiro'   // Ver dados financeiros sensíveis

// Gestão de Convênios
'convenios.criar'                   // Criar novos convênios
'convenios.editar'                  // Editar dados de convênios
'convenios.excluir'                 // Excluir convênios
'convenios.suspender'               // Suspender/reativar
'convenios.alterar_plano'           // Alterar plano contratado

// Veículos
'convenios.veiculos.visualizar'     // Ver lista de veículos
'convenios.veiculos.gerenciar'      // Adicionar/remover/editar veículos

// Movimentações
'convenios.movimentacoes.registrar' // Registrar entrada/saída (pós-pago)
'convenios.movimentacoes.editar'    // Editar movimentações
'convenios.movimentacoes.visualizar'// Ver histórico de movimentações

// Financeiro
'convenios.faturas.gerar'           // Gerar faturas
'convenios.faturas.visualizar'      // Ver faturas
'convenios.faturas.editar'          // Editar faturas
'convenios.pagamentos.registrar'    // Registrar pagamentos

// Relatórios
'convenios.relatorios.receita'      // Relatório de receita
'convenios.relatorios.inadimplencia'// Relatório de inadimplência
'convenios.relatorios.movimentacoes'// Relatório de movimentações
'convenios.relatorios.relacao_mensal' // Gerar relação mensal (pós-pago)
'convenios.relatorios.ocupacao'     // Relatório de ocupação
'convenios.relatorios.exportar'     // Exportar qualquer relatório

// Documentos
'convenios.documentos.upload'       // Fazer upload
'convenios.documentos.visualizar'   // Ver e baixar
'convenios.documentos.excluir'      // Excluir documentos
```

### Perfis Sugeridos:

**Admin (todas as permissões)**
```
✓ Todas as permissões de convênios
```

**Gerente**
```
✓ Visualizar, criar, editar, suspender
✓ Gerenciar veículos
✓ Gerar faturas e registrar pagamentos
✓ Todos os relatórios
✓ Upload de documentos
✗ Excluir convênios (apenas admin)
```

**Financeiro**
```
✓ Visualizar (todos os dados)
✓ Faturas (todas as ações)
✓ Pagamentos (todas as ações)
✓ Relatórios financeiros
✗ Criar/editar convênios
✗ Gerenciar veículos
✗ Movimentações operacionais
```

**Operador**
```
✓ Visualizar lista de convênios
✓ Visualizar veículos
✓ Registrar movimentações (entrada/saída)
✓ Vincular veículos novos (se necessário)
✗ Ver dados financeiros sensíveis
✗ Gerar faturas
✗ Relatórios financeiros

Implementação:

Verificar permissões antes de exibir botões/opções
Validar permissões no backend antes de executar ações
Mostrar mensagem amigável se usuário não tiver permissão

8. VALIDAÇÕES E REGRAS DE NEGÓCIO
8.1 Validações de Cadastro:

CNPJ:

Formato válido (XX.XXX.XXX/XXXX-XX)
Deve ser único no sistema
Validação de dígitos verificadores


Email:

Formato válido
Verificar se domínio existe (opcional)


Telefone:

Formato válido com DDD


Valores:

Valor mensal (pré-pago) > 0
Percentual de desconto entre 0 e 100
Número de vagas > 0


Datas:

Data de início não pode ser no passado (ou permitir com aviso)
Data de vencimento de contrato deve ser posterior à data de início
Dia de vencimento entre 1 e 28


Vagas extras:

Se permite vagas extras (pré-pago), valor deve ser informado



8.2 Validações de Movimentação:

Entrada:

Não permitir entrada duplicada (veículo já está dentro)
Verificar se convênio está ativo
Alertar se limite de vagas atingido
Verificar horário permitido (se houver restrição)


Saída:

Deve existir entrada correspondente para o veículo
Calcular automaticamente tempo de permanência
Para pós-pago: calcular valor usando motor de tarifação
Marcar como movimentação concluída



8.3 Validações de Faturamento:

Gerar Fatura:

Convênio deve estar ativo
Não permitir fatura duplicada para mesmo período
Para pré-pago: período não pode estar no futuro
Para pós-pago: deve haver pelo menos 1 movimentação não faturada
Calcular juros automaticamente se fatura vencida for reaberta


Cálculo de Valores:

Juros: 1% ao mês sobre o valor total (padrão, configurável)
Multa: 2% sobre o valor total (padrão, configurável)
Descontos: não podem exceder valor base



8.4 Validações de Pagamento:

Registrar Pagamento:

Apenas faturas pendentes ou vencidas podem receber pagamento
Data de pagamento não pode ser futura
Forma de pagamento deve ser selecionada
Ao confirmar pagamento:

Atualizar status da fatura para "paga"
Atualizar data_pagamento
Se convênio estava inadimplente, verificar outras faturas:

Se todas pagas → mudar status para "ativo"
Se ainda há pendências → manter "inadimplente"




Registrar no histórico



8.5 Regras de Negócio Especiais:

Vagas Reservadas:

Vagas reservadas NÃO contam para limite de ocupação
São vagas garantidas mesmo com estacionamento cheio


Veículos Extras (Pós-pago):

SEMPRE permitir entrada
Marcar como "extra" e destacar na relação
Cobrar normalmente conforme tarifação


Suspensão de Convênio:

Ao suspender: veículos não podem entrar
Faturas pendentes permanecem pendentes
Não gerar novas faturas automáticas enquanto suspenso
Ao reativar: voltar à operação normal


Cancelamento de Convênio:

Solicitar confirmação
Verificar se há faturas pendentes
Alertar sobre débitos em aberto
Mover para status "cancelado" (não excluir dados - manter histórico)
Desativar todos os veículos vinculados

9. FUNCIONALIDADES ESPECIAIS
9.1 Renovação de Contratos
Verificação Automática:

Job diário verifica contratos com data_vencimento_contrato próximo
Se ≤ 30 dias: criar notificação "Contrato vencendo"
Se ≤ 15 dias: aumentar prioridade, enviar email
Se ≤ 7 dias: prioridade crítica

Opções:

Renovação Automática: Se campo renovacao_automatica = true, renovar por mais 12 meses automaticamente

Renovação Manual: Botão "Renovar Contrato" no painel de detalhes

Abre diálogo com nova data de vencimento
Opção de renegociar valores/vagas
Registra no histórico



9.2 Análise de Utilização (Dashboard Inteligente)
Para cada convênio, calcular e exibir em dashboard:
Métricas:

Taxa de ocupação média mensal: (vagas usadas / contratadas) x 100
Horários de pico: faixas com maior uso
Dias da semana preferidos
Tempo médio de permanência por veículo
Frequência média: quantas vezes por semana usam

Insights Automáticos:
Cliente usa apenas 40% das vagas contratadas
💡 Sugestão: Reduzir de 10 para 5 vagas
   Economia para o cliente: R$ 1.250,00/mês

Cliente sempre está no limite (98% ocupação)
💡 Sugestão: Aumentar de 10 para 15 vagas
   Receita adicional: R$ 1.250,00/mês

Cliente prefere período: 08h-10h e 17h-19h
💡 Info: Considerar desconto para horários alternativos

Objetivo: Ferramenta para renegociação win-win.
9.3 Integração com Serviços de Comunicação
Usar os serviços de email e WhatsApp já implementados para:
Email:

Envio de faturas (PDF anexado)
Lembretes de pagamento
Relações mensais (pós-pago)
Alertas de vencimento de contrato
Confirmação de cadastro
Confirmação de pagamento recebido

WhatsApp:

Lembretes urgentes (pagamento vencido)
Relações mensais (link ou PDF)
Alertas críticos

Templates a Criar:

1. Email: Boas-vindas


Assunto: Bem-vindo ao [Nome do Estacionamento]!

Olá, [Nome do Contato]!

Seu convênio foi cadastrado com sucesso. Confira os detalhes:
- Tipo: [Pré/Pós-pago]
- Vagas: [X]
- Início: [data]
...

2. Email: Fatura Gerada
Assunto: Fatura [Número] - Vencimento em [dias] dias

Prezado [Nome],

A fatura do período [mês/ano] foi gerada.
Valor: R$ [valor]
Vencimento: [data]

[Botão: Ver Fatura]
[PDF em anexo]

3. Email/WhatsApp: Lembrete de Pagamento

⚠️ Lembrete: Fatura vence amanhã

[Empresa]
Valor: R$ [valor]
Venc.: [data]

[Link para pagamento]

4. Email: Relação Mensal (Pós-pago)
Assunto: Relação Mensal - [Mês/Ano]

Prezado [Nome],

Segue em anexo a relação de movimentações do período.
Total: R$ [valor]
Vencimento: [data]

[PDF detalhado em anexo]

5. Email: Pagamento Confirmado

Assunto: ✓ Pagamento Recebido

Prezado [Nome],

Confirmamos o recebimento do pagamento da fatura [número].
Data: [data]
Valor: R$ [valor]

Obrigado!

9.4 Exportação de Dados
Implementar exportação robusta para:
Formatos:

PDF: Formatado profissionalmente, com logo, cabeçalho, rodapé
CSV: Para análise em Excel/Sheets
Excel (XLSX): Com formatação rica, múltiplas planilhas, gráficos (opcional mas recomendado)

Dados Exportáveis:

Lista de convênios
Movimentações por período
Faturas
Relação mensal completa
Todos os relatórios

Recursos:

Logo do estacionamento no cabeçalho (PDF)
Dados do estacionamento (CNPJ, endereço, contato)
Data e hora de geração
Usuário que gerou
Numeração de páginas
Totalizadores e resumos

10. ASPECTOS TÉCNICOS E ARQUITETURA
10.1 Estrutura de Pastas Sugerida:

/app
  /convenios
    page.tsx                           # Página principal
    layout.tsx                         # Layout específico (se necessário)
    
    /components
      # Tabelas e Listas
      ConveniosTable.tsx
      ConvenioDetalhesPanel.tsx
      ConveniosList.tsx
      
      # Diálogos Principais
      DialogNovoConvenio.tsx
      DialogEditarConvenio.tsx
      DialogAdicionarVeiculo.tsx
      DialogEditarVeiculo.tsx
      DialogGerarFatura.tsx
      DialogRegistrarPagamento.tsx
      DialogRegistrarMovimentacao.tsx
      
      # Abas do Painel de Detalhes
      TabDadosGerais.tsx
      TabPlano.tsx
      TabVeiculos.tsx
      TabFinanceiro.tsx
      TabMovimentacoes.tsx
      TabDocumentos.tsx
      TabHistorico.tsx
      
      # Cards e Estatísticas
      CardEstatisticas.tsx
      CardResumoFinanceiro.tsx
      
      # Outros Componentes
      BadgeStatusConvenio.tsx
      BadgeStatusPagamento.tsx
      BadgeTipoConvenio.tsx
      FiltroBarra.tsx
      BotoesAcoes.tsx
    
    /utils
      convenioHelpers.ts                # Funções auxiliares
      validations.ts                    # Validações
      calculations.ts                   # Cálculos (valores, juros, tempo)
      formatters.ts                     # Formatação (CNPJ, dinheiro, datas)
    
    /hooks
      useConvenios.ts                   # Hook para buscar convenios
      useFaturas.ts                     # Hook para faturas
      useMovimentacoes.ts               # Hook para movimentações
      
  /financas
    # Adicionar componentes de convênios aqui
    /components
      SecaoConvenios.tsx                # Nova seção
      TabelaDividasConvenios.tsx
      CardReceitasConvenios.tsx

/lib
  /api
    /convenios
      index.ts                          # Funções principais
      veiculos.ts                       # Operações com veículos
      movimentacoes.ts                  # Movimentações
      faturas.ts                        # Faturas
      relatorios.ts                     # Relatórios
      
  /email
    /templates
      conveniosTemplates.ts             # Templates de email
      
  /whatsapp
    conveniosMessages.ts                # Mensagens WhatsApp
    
  /pdf
    conveniosPDF.ts                     # Geração de PDFs
    relatoriosPDF.ts                    # PDFs de relatórios
    
  /utils
    cnpjValidator.ts                    # Validador de CNPJ
    motorTarifacao.ts                   # Motor de cálculo (integrar com existente)

/components
  /shared
    Notificacoes.tsx                    # Centro de notificações global
    NotificacaoItem.tsx
    
/types
  convenios.ts                          # Types/Interfaces TypeScript

/hooks
  useNotificacoes.ts                    # Hook para notificações globais


10.2 Funções Utilitárias Importantes:
calculations.ts:

/**
 * Calcula valor de fatura pós-pago baseado em movimentações
 */
export function calcularValorPosPago(
  movimentacoes: Movimentacao[],
  motorTarifacao: MotorTarifacao,
  percentualDesconto: number = 0
): number

/**
 * Calcula juros de atraso
 */
export function calcularJurosAtraso(
  valorBase: number,
  diasAtraso: number,
  taxaMensal: number = 0.01
): number

/**
 * Calcula multa
 */
export function calcularMulta(
  valorBase: number,
  percentualMulta: number = 0.02
): number

/**
 * Calcula taxa de ocupação
 */
export function calcularTaxaOcupacao(
  vagasOcupadas: number,
  vagasContratadas: number
): number

/**
 * Calcula tempo de permanência entre duas datas/horas
 */
export function calcularTempoPermanencia(
  entrada: { data: Date, hora: string },
  saida: { data: Date, hora: string }
): { horas: number, minutos: number, total: string }

/**
 * Converte intervalo PostgreSQL em formato legível
 */
export function formatarIntervalo(interval: string): string

/**
 * Calcula total de horas de um array de movimentações
 */
export function calcularTotalHoras(movimentacoes: Movimentacao[]): number

validations.ts:

/**
 * Valida CNPJ (formato e dígitos)
 */
export function validarCNPJ(cnpj: string): boolean

/**
 * Valida CPF
 */
export function validarCPF(cpf: string): boolean

/**
 * Valida email
 */
export function validarEmail(email: string): boolean

/**
 * Valida se veículo pode entrar
 */
export function validarEntradaVeiculo(
  placa: string,
  convenio: Convenio
): { valido: boolean, motivo?: string }

/**
 * Valida se fatura pode ser gerada
 */
export function validarGeracaoFatura(
  convenio: Convenio,
  periodo: string
): { valido: boolean, motivo?: string }

/**
 * Valida se placa é válida (formato brasileiro)
 */
export function validarPlaca(placa: string): boolean

formatters.ts:

/**
 * Formata CNPJ: 12345678000190 → 12.345.678/0001-90
 */
export function formatarCNPJ(cnpj: string): string

/**
 * Formata CPF: 12345678900 → 123.456.789-00
 */
export function formatarCPF(cpf: string): string

/**
 * Formata telefone: 11987654321 → (11) 98765-4321
 */
export function formatarTelefone(telefone: string): string

/**
 * Formata valor monetário: 1234.56 → R$ 1.234,56
 */
export function formatarMoeda(valor: number): string

/**
 * Formata data: Date → DD/MM/YYYY
 */
export function formatarData(data: Date): string

/**
 * Formata hora: Date → HH:MM
 */
export function formatarHora(data: Date): string

/**
 * Formata placa: abc1234 → ABC-1234
 */
export function formatarPlaca(placa: string): string
```

### 10.3 API Routes Necessárias:
```
/api/convenios
  GET     /                      # Listar todos (com filtros query params)
  POST    /                      # Criar novo
  GET     /:id                   # Buscar um específico
  PATCH   /:id                   # Atualizar dados
  DELETE  /:id                   # Excluir (soft delete)
  PATCH   /:id/suspender         # Suspender/reativar
  PATCH   /:id/status            # Alterar status
  POST    /:id/renovar           # Renovar contrato

/api/convenios/:id/plano
  GET     /                      # Buscar plano atual
  PATCH   /                      # Alterar plano
  GET     /historico             # Histórico de planos

/api/convenios/:id/veiculos
  GET     /                      # Listar veículos
  POST    /                      # Adicionar veículo
  PATCH   /:veiculoId            # Editar veículo
  DELETE  /:veiculoId            # Remover (desativar)
  GET     /buscar-placa/:placa   # Buscar por placa específica

/api/convenios/:id/movimentacoes
  GET     /                      # Listar movimentações (com filtros)
  POST    /                      # Registrar movimentação
  PATCH   /:movId                # Editar movimentação
  GET     /nao-faturadas         # Buscar não faturadas
  GET     /periodo               # Buscar por período (query params)

/api/convenios/:id/faturas
  GET     /                      # Listar faturas
  POST    /                      # Gerar fatura
  GET     /:faturaId             # Buscar uma fatura específica
  PATCH   /:faturaId             # Editar fatura
  DELETE  /:faturaId             # Cancelar fatura
  POST    /:faturaId/pagar       # Registrar pagamento
  POST    /:faturaId/enviar      # Enviar por email
  GET     /:faturaId/pdf         # Gerar PDF

/api/convenios/:id/documentos
  GET     /                      # Listar documentos
  POST    /upload                # Upload de documento
  GET     /:docId/download       # Download
  DELETE  /:docId                # Excluir

/api/convenios/:id/historico
  GET     /                      # Listar histórico completo

/api/convenios/estatisticas
  GET     /dashboard             # Estatísticas para cards do topo
  GET     /ocupacao              # Ocupação em tempo real

/api/convenios/relatorios
  POST    /receita               # Relatório de receita
  POST    /inadimplencia         # Relatório de inadimplência
  POST    /movimentacoes         # Relatório de movimentações
  POST    /relacao-mensal        # Relação mensal (pós-pago)
  POST    /ocupacao              # Relatório de ocupação
  POST    /exportar              # Exportar qualquer relatório

/api/convenios/jobs
  POST    /gerar-faturas-auto    # Job para gerar faturas (pré-pago)
  POST    /verificar-vencimentos # Job para alertas de vencimento
  POST    /verificar-pagamentos  # Job para checar pagamentos pendentes

/api/convenios/buscar
  GET     /placa/:placa          # Buscar convênio por placa
  GET     /cnpj/:cnpj            # Buscar por CNPJ

/api/notificacoes
  GET     /                      # Listar notificações do usuário
  PATCH   /:id/ler               # Marcar como lida
  PATCH   /ler-todas             # Marcar todas como lidas
  GET     /nao-lidas             # Contar não lidas

10.4 Hooks Personalizados:

// useConvenios.ts
export function useConvenios(filtros?: FiltrosConvenios) {
  // Busca lista de convênios com filtros
  // Retorna: { convenios, loading, error, refetch }
}

// useFaturas.ts
export function useFaturas(convenioId: string, filtros?: FiltrosFaturas) {
  // Busca faturas de um convênio
  // Retorna: { faturas, loading, error, refetch }
}

// useMovimentacoes.ts
export function useMovimentacoes(convenioId: string, periodo?: Periodo) {
  // Busca movimentações de um convênio
  // Retorna: { movimentacoes, loading, error, refetch }
}

// useNotificacoes.ts
export function useNotificacoes() {
  // Hook global para notificações
  // Retorna: { notificacoes, naoLidas, marcarLida, refetch }
}

// useEstatisticas.ts
export function useEstatisticasConvenios() {
  // Busca estatísticas para dashboard
  // Retorna: { stats, loading, error }
}

11. TESTES E VALIDAÇÃO
Antes de considerar o módulo completo, testar todos os fluxos:
11.1 Fluxos Principais:

✅ Criar convênio pré-pago completo

Preencher todos os campos
Salvar
Verificar se aparece na tabela
Verificar dados no painel


✅ Criar convênio pós-pago completo

Idem ao anterior
Verificar campos específicos de pós-pago


✅ Adicionar veículos a convênio

Adicionar 3-5 veículos
Verificar listagem na aba
Testar validação de placa duplicada


✅ Registrar movimentações (pós-pago)

Registrar entrada
Registrar saída correspondente
Verificar cálculo de tempo e valor


✅ Validar entrada automática (Operacional)

Digitar placa cadastrada
Verificar identificação automática
Confirmar entrada
Verificar badge na tabela operacional


✅ Testar veículo extra

Placa não cadastrada de convênio pós-pago
Vincular manualmente
Verificar marcação como "extra"


✅ Gerar fatura automática (pré-pago)

Configurar job ou executar manualmente
Verificar criação da fatura
Verificar envio de email


✅ Gerar fatura manual (pós-pago)

Selecionar período com movimentações
Gerar fatura
Verificar cálculos
Verificar movimentações marcadas como faturadas


✅ Registrar pagamento de fatura

Fatura pendente
Registrar pagamento
Verificar mudança de status
Verificar atualização do convênio (se estava inadimplente)


✅ Gerar relação mensal (pós-pago)

Selecionar convênio e período
Gerar PDF
Verificar formatação
Verificar destaque de veículos extras
Testar envio por email


✅ Exportar relatórios

Testar cada tipo de relatório
Exportar em PDF e CSV
Verificar conteúdo e formatação


✅ Testar notificações

Criar situações que disparam alertas
Verificar criação de notificações
Testar centro de notificações
Marcar como lida


✅ Testar permissões

Logar com diferentes perfis
Verificar visibilidade de botões/ações
Tentar ações não permitidas



11.2 Casos de Borda:

❌ Convênio pós-pago sem movimentações tentando gerar fatura

Deve alertar "Nenhuma movimentação no período"


❌ Veículo não autorizado tentando entrar

Deve exibir alerta e opção de vincular


❌ Limite de vagas atingido

Deve alertar mas permitir entrada (vaga extra)


❌ Fatura com pagamento atrasado

Deve calcular juros automaticamente


❌ Upload de documento muito grande (>10MB)

Deve rejeitar e exibir mensagem


❌ CNPJ duplicado

Deve impedir cadastro


❌ Data de início no passado

Deve alertar mas permitir (para migração de dados)


❌ Tentativa de excluir convênio com faturas pendentes

Deve impedir e alertar sobre débitos


❌ Registrar saída sem entrada correspondente

Deve impedir e sugerir registrar entrada primeiro


❌ Veículo já dentro tentando entrar novamente

Deve alertar "Veículo já registrado como dentro"



11.3 Performance:

Testar com grande volume de dados:

100+ convênios
1000+ movimentações
500+ veículos


Verificar tempo de resposta das queries
Testar paginação das tabelas
Verificar uso de índices

11.4 Responsividade:

Testar em diferentes resoluções
Desktop: 1920x1080, 1366x768
Tablet: 768x1024
Mobile: 375x667
Verificar usabilidade dos diálogos
Testar tabelas com scroll horizontal se necessário


12. CHECKLIST DE IMPLEMENTAÇÃO
Banco de Dados:

 Criar tabela convenios
 Criar tabela convenios_planos
 Criar tabela convenios_veiculos
 Criar tabela convenios_movimentacoes
 Criar tabela convenios_faturas
 Criar tabela convenios_historico
 Criar tabela convenios_documentos
 Criar tabela notificacoes
 Criar todos os índices necessários
 Testar integridade referencial

Página Convênios:

 Criar estrutura da página /convenios
 Implementar header com 4 cards de estatísticas
 Criar barra de filtros e ações
 Implementar tabela de convênios
 Implementar seleção de linha (click + ESC)
 Criar painel de detalhes expansível
 Implementar 7 abas do painel:

 Dados Gerais
 Plano
 Veículos
 Financeiro
 Movimentações
 Documentos
 Histórico



Diálogos:

 Criar diálogo "Novo Convênio" (4 passos)
 Criar diálogo "Adicionar Veículo"
 Criar diálogo "Registrar Movimentação Manual"
 Criar diálogo "Gerar Fatura"
 Criar diálogo "Registrar Pagamento"
 Implementar validações em todos os formulários

Integração Operacional:

 Modificar diálogo "Registrar Entrada"
 Implementar busca automática por placa
 Criar card de identificação de convênio
 Implementar vinculação manual de veículos
 Adicionar badges visuais na tabela operacional
 Testar fluxo completo de entrada/saída

Integração Finanças:

 Criar seção "Receitas de Convênios"
 Implementar card de resumo financeiro
 Criar tabela de dívidas ativas
 Adicionar botão "Relatórios de Convênios"
 Implementar 5 tipos de relatórios:

 Receita por Convênio
 Inadimplência
 Movimentações Detalhadas
 Relação Mensal (pós-pago) ⭐
 Ocupação e Utilização



Sistema de Notificações:

 Criar tabela e estrutura de notificações
 Implementar centro de notificações no header
 Criar dropdown de notificações
 Implementar 5 tipos de alertas automáticos
 Criar jobs/crons para verificações diárias
 Integrar com email e WhatsApp

Comunicação:

 Criar templates de email (6 tipos)
 Integrar envio de faturas por email
 Integrar envio de relação mensal
 Implementar envio por WhatsApp
 Testar todos os fluxos de comunicação

Documentos:

 Implementar upload de arquivos localmente
 Criar estrutura de pastas /documentos/convenios/
 Implementar download de documentos
 Adicionar preview (opcional)
 Validar tamanhos e formatos

Relatórios e PDFs:

 Criar templates de PDF profissionais
 Implementar geração de faturas em PDF
 Implementar relação mensal em PDF
 Implementar exportação CSV
 Implementar exportação Excel (opcional)
 Adicionar logo e formatação

Permissões:

 Adicionar 20+ permissões ao sistema
 Configurar perfis (Admin, Gerente, Financeiro, Operador)
 Implementar validações de permissão no frontend
 Implementar validações de permissão no backend

Utilidades:

 Criar funções de cálculo (valores, juros, tempo)
 Criar funções de validação (CNPJ, CPF, placa)
 Criar funções de formatação (CNPJ, dinheiro, datas)
 Implementar motor de tarifação (integrar com existente)

API:

 Implementar todas as 40+ rotas necessárias
 Adicionar tratamento de erros
 Implementar logs
 Otimizar queries com joins e includes
 Adicionar paginação onde necessário

Testes:

 Testar todos os fluxos principais (13 itens)
 Testar todos os casos de borda (10 itens)
 Testar performance com volume
 Testar responsividade (4 resoluções)
 Testar acessibilidade
 Fazer testes de carga

Documentação:

 Documentar APIs
 Criar guia de uso para operadores
 Documentar permissões
 Criar changelog


13. OBSERVAÇÕES FINAIS IMPORTANTES
13.1 Identidade Visual

CRÍTICO: Manter 100% consistente com o design existente
Usar mesma paleta de cores
Mesmos espaçamentos e bordas
Mesma tipografia
Mesmos componentes de UI (botões, inputs, cards)
Mesmos ícones (usar a biblioteca já em uso)

13.2 Padrões de Código

Seguir nomenclatura existente (camelCase, PascalCase)
Manter estrutura de pastas consistente
Usar mesmos hooks e utils já criados quando aplicável
Comentar código complexo
TypeScript strict mode

13.3 Performance

Usar React.memo() para componentes pesados
Implementar debounce em buscas
Lazy loading de imagens/documentos
Paginação server-side para tabelas grandes
Cache de queries frequentes (React Query recomendado)

13.4 Armazenamento Local

Documentos: Salvar em /documentos/convenios/{convenio_id}/
Criar estrutura de pastas automaticamente
Apenas caminhos no banco de dados
Validar permissões de escrita

13.5 Acessibilidade

ARIA labels em todos os componentes interativos
Navegação completa por teclado
Contraste adequado (WCAG AA)
Focus visível em todos os elementos
Screen reader friendly

13.6 Segurança

Validar TODOS os inputs (frontend E backend)
Sanitizar dados antes de salvar
Verificar permissões em TODAS as rotas
Proteger contra SQL injection (usar prepared statements)
Rate limiting em APIs públicas

13.7 Feedback ao Usuário

Loading states: Sempre mostrar quando carregando
Mensagens de sucesso: Toast/Snackbar verde
Mensagens de erro: Toast/Snackbar vermelho com descrição clara
Confirmações: Para ações destrutivas (excluir, cancelar)
Validações em tempo real: Enquanto usuário digita

13.8 Logs e Auditoria

Registrar TODAS as ações importantes em convenios_historico
Incluir: usuário, data/hora, o que mudou, valores antes/depois
Manter logs do sistema (erros, warnings)
Facilitar troubleshooting

13.9 Escalabilidade

Pensar em crescimento: 1000+ convênios no futuro
Queries otimizadas desde o início
Índices nos campos mais buscados
Considerar cache (Redis opcional)

13.10 Manutenibilidade

Código limpo e legível
Funções pequenas e focadas (Single Responsibility)
Componentes reutilizáveis
Documentação inline quando necessário
Evitar código duplicado (DRY principle)


RESULTADO ESPERADO
Ao final da implementação completa, o sistema deverá:
✅ Gerenciar convênios pré-pagos e pós-pagos de forma profissional e completa
✅ Automatizar processos (geração de faturas, alertas, cálculos)
✅ Integrar perfeitamente com módulos Operacional e Finanças existentes
✅ Fornecer relatórios detalhados e relações mensais impressionantes
✅ Alertar proativamente sobre vencimentos, inadimplências e situações críticas
✅ Manter histórico completo e auditável de todas as operações
✅ Facilitar tomada de decisão com dashboards e indicadores inteligentes
✅ Comunicar-se automaticamente com clientes (email/WhatsApp)
✅ Ser intuitivo, responsivo e acessível
✅ Escalar para centenas de convênios sem perder performance
Prioridade: Este é um módulo crítico e estratégico para o negócio. A implementação deve ser feita com máxima qualidade, atenção aos detalhes e testes rigorosos.
