# Relatório de Arquitetura do Sistema
**TheProParkingApp - Sistema de Gestão de Estacionamento**

---

## 📋 Stack Tecnológica

### Frontend
- **Framework**: React 18.3.1
- **Build Tool**: Vite 7.1.12
- **UI Components**: Radix UI (conjunto completo de componentes acessíveis)
- **Estilização**: TailwindCSS 3.4.17
- **Roteamento**: React Router DOM 6.30.1
- **State Management**: TanStack React Query 5.83.0 (para cache e sincronização de dados)
- **Forms**: React Hook Form 7.61.1 + Zod 3.25.76 (validação)
- **Gráficos**: Recharts 2.15.4
- **Notificações**: Sonner 1.7.4
- **Linguagem**: TypeScript 5.8.3

### Backend
- **Runtime**: Node.js (Express 5.1.0)
- **Linguagem**: JavaScript (ES Modules)
- **Autenticação**: JWT (jsonwebtoken 9.0.2) + bcryptjs 2.4.3
- **Validação**: express-validator 7.3.0
- **Segurança**: 
  - helmet 8.1.0 (headers HTTP seguros)
  - express-rate-limit 7.5.1 (proteção DDoS)
  - dompurify 3.3.0 (sanitização XSS)
- **Geração de PDFs**: PDFKit 0.17.2
- **Background Jobs**: node-cron 4.2.1
- **E-mail**: nodemailer 7.0.10

### Banco de Dados
- **Provedor**: Supabase (PostgreSQL hospedado)
- **Cliente**: @supabase/supabase-js 2.37.0
- **Autenticação**: Supabase Auth + JWT customizado
- **Armazenamento**: Supabase Storage (para backups e documentos)

### Hospedagem
- **Frontend**: Vercel (deploy automático com GitHub)
  - URL de produção: `https://appestacionamento.vercel.app`
  - URLs alternativas configuradas no CORS do backend
- **Backend**: Render
  - URL: `https://theproparking-backend-1rxk.onrender.com`
  - Plano Free (com restart automático após inatividade)
- **Banco de Dados**: Supabase (cloud)

---

## 🔄 Fluxos Principais

### 1. Login
O sistema implementa autenticação JWT customizada com medidas de segurança robustas. O fluxo inicia com validação de credenciais (login/senha ou email/senha) no backend, que verifica tentativas de login falhadas (máx 5), bloqueio de conta e expiração de senha. Após autenticação bem-sucedida, retorna um token JWT assinado com `JWT_SECRET`, que o frontend armazena em localStorage (se "Lembrar" marcado) ou sessionStorage, e envia em todas as requisições subsequentes via header `Authorization: Bearer <token>`.

### 2. Entrada e Saída de Veículos
O fluxo de entrada registra placa do veículo, verifica se é mensalista ou convênio ativo (via endpoints `/api/monthly-customers` e `/api/convenios/veiculos`), e cria ticket em `tickets` com timestamp de entrada. Para saída, busca ticket ativo pela placa, calcula valor via `pricingCalculator.js` (considerando tarifas, horários especiais, feriados, eventos), registra pagamento em `payments` e atualiza o ticket com hora de saída e valor pago. Sistema suporta entrada de veículos de convênio com controle de vagas extras pagas/cortesia.

### 3. Gestão de Convênios (Função principal)
Gerencia contratos empresariais através de uma **modalidade única: Convênio Corporativo**. O sistema permite cadastro de convênio com CNPJ, criação de plano ativo (`convenios_planos`), vinculação de veículos (`convenios_veiculos`), controle de movimentações em tempo real (`convenios_movimentacoes`), geração de faturas mensais (`convenios_faturas`) com cálculo automático de vagas extras (pagas ou cortesia), e geração de PDF de fatura via `faturaPDFGenerator.ts`. Inclui relatórios de ocupação, histórico de alterações de plano e configuração de templates de fatura personalizados.

> **Nota Técnica**: A separação anterior entre modalidades "pré-pago" e "pós-pago" foi **eliminada do código** através de migração unificadora. Atualmente, `tipo_plano` é fixado como `'corporativo'` em todos os formulários. Funções deprecated `gerarPDFPrepago()` e `gerarPDFPosPago()` ainda existem em comentários no código mas foram substituídas por `gerarPDFConvenio()` unificada.

---

## 🌐 APIs Externas Usadas

### Supabase API
- **Finalidade**: Banco de dados PostgreSQL (todas as tabelas: users, tickets, payments, monthly_customers, convenios, rates, etc.)
- **Autenticação**: Supabase Auth (com RLS - Row Level Security)
- **Storage**: Armazenamento de backups automáticos (.zip) e documentos de convênios
- **Funções**: Triggers e stored procedures para validações complexas

### APIs de Notificação (Configuráveis)
- **E-mail (SMTP)**: Envio de e-mails de recuperação de senha via nodemailer
  - Configurado via variáveis `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`
- **SMS/WhatsApp**: Infraestrutura preparada em `notificationService.js` e `webhookService.js`
  - Configurações armazenadas em `integration_configs` (Supabase)
  - Atualmente não há API externa específica conectada (necessita configuração)

> **Nota**: O sistema não possui integrações externas críticas além do Supabase. Todas as funcionalidades de negócio (cálculo de tarifas, geração de PDFs, relatórios) são processadas internamente.

---

## 🔐 Variáveis de Ambiente Necessárias

### Backend (`/backend/.env`)
```bash
# Supabase (OBRIGATÓRIO)
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_KEY=sua-anon-key                     # ou SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key  # RECOMENDADO para bypass RLS

# Backend (OBRIGATÓRIO)
PORT=3000
JWT_SECRET=sua-chave-secreta-muito-forte-e-aleatoria

# Frontend URL (OBRIGATÓRIO para links de recuperação de senha)
FRONTEND_URL=https://appestacionamento.vercel.app

# Admin Seed (OBRIGATÓRIO para endpoint /maintenance/seed-admin)
SEED_ADMIN_SECRET=token-secreto-para-criar-primeiro-admin

# SMTP - E-mail (OPCIONAL mas recomendado)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=seu-email@gmail.com
SMTP_PASS=sua-senha-de-app

# Debug (OPCIONAL)
DEBUG=true
NODE_ENV=production
```

### Frontend (`/.env`)
```bash
# Backend API URL (OBRIGATÓRIO)
VITE_API_URL=https://theproparking-backend-1rxk.onrender.com

# Debug (OPCIONAL)
VITE_DEBUG=false
```

### Verificação de Variáveis
Execute `npm run verify-env --prefix backend` para validar se todas as variáveis críticas estão configuradas corretamente.

---

## 🚀 Como Rodar Localmente

### Pré-requisitos
- Node.js 20+ instalado
- npm instalado
- Conta no Supabase (free tier) configurada

### Passo a Passo

**1. Clone o repositório e instale dependências:**
```bash
cd /home/gab/appestacionamento

# Instalar dependências do frontend (root)
npm install

# Instalar dependências do backend
cd backend && npm install
cd ..
```

**2. Configure as variáveis de ambiente:**
```bash
# Criar arquivo .env no backend
cp backend/.env.example backend/.env
# Editar backend/.env e preencher SUPABASE_URL, SUPABASE_KEY, JWT_SECRET

# Criar arquivo .env no frontend (root)
cp .env.example .env
# Editar .env e preencher VITE_API_URL=http://localhost:3000
```

**3. Configurar banco de dados Supabase:**
- Criar projeto no Supabase
- Executar SQL schema (`backend/supabase-schema.sql` ou scripts `.sql` da raiz)
- Copiar URL e chaves (anon key e service role key)

**4. Iniciar os servidores:**
```bash
# Opção 1: Manualmente em terminais separados
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend
npm run dev

# Opção 2: Usar script auxiliar (se disponível)
./start-servers.sh
```

**5. Acessar o aplicativo:**
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:3000/health`

**6. Criar primeiro usuário admin:**
```bash
# Via endpoint de seed (ajustar SEED_ADMIN_SECRET no .env)
curl -X POST http://localhost:3000/api/maintenance/seed-admin \
  -H "Content-Type: application/json" \
  -d '{"secret": "seu-SEED_ADMIN_SECRET"}'

# Ou via SQL direto no Supabase
# (ver README.md linhas 177-188)
```

---

## ⚠️ Áreas que Precisam Atenção

### 🔴 Críticas

1. **Render Free Tier - Cold Starts**
   - Backend no Render (plano free) hiberna após 15min de inatividade
   - Primeira requisição após hibernação demora 30-60 segundos
   - **Impacto**: Usuários reportam lentidão ao abrir o app pela primeira vez no dia
   - **Solução temporária**: Script de "ping" a cada 10min (pode violar ToS do Render)
   - **Solução permanente**: Upgrade para plano pago ou migrar para Railway/Fly.io

2. **Sincronização de Vagas Extras de Convênios**
   - Bugs recentes corrigidos em `conveniosMovimentacoesController.js` e `VagasExtrasTab.tsx`
   - Registros de vagas extras (cortesia/pagas) às vezes não aparecem na aba "Vagas Extras"
   - **Causa**: Problemas na criação/atualização de `convenios_movimentacoes` durante saída de veículos
   - **Status**: Correções aplicadas mas necessita testes extensivos em produção

3. **Autenticação Token - localStorage vs sessionStorage**
   - Problemas intermitentes de perda de token após reload da página
   - **Causa**: Código frontend alterna entre `localStorage.getItem('token')` e `localStorage.getItem('auth_token')`
   - **Impacto**: Usuários são deslogados inesperadamente
   - **Fix aplicado**: Padronizado para `auth_token` mas precisa verificar todos os componentes

### 🟡 Importantes

4. **Schema Mismatch - Backend vs Database**
   - Campos do banco nem sempre coincidem com os campos usados nos controllers
   - **Exemplo**: `tipo_convenio` vs `tipo_plano`, `plano_ativo_id` vs `plano_id`
   - **Impacto**: Erros 500 em algumas operações de convênios
   - **Necessário**: Auditoria completa do schema e normalização de nomes

5. **PDFs de Faturas - Geração Lenta**
   - `invoicePDFGenerator.js` usa PDFKit e pode demorar 5-10s para faturas grandes
   - Não há feedback visual durante geração (usuário clica e nada acontece)
   - **Sugestão**: Implementar loading spinner ou processar em background

6. **Relatórios Mensais - Falta de Cache**
   - Queries pesadas em `monthlyReportsController.js` refazem cálculos toda vez
   - **Impacto**: Dashboard de administrador demora 3-5s para carregar
   - **Sugestão**: Implementar cache Redis ou calcular relatórios via cron job noturno

### 🟢 Melhorias Futuras

7. **Backup Automático - Configuração Manual**
   - Sistema de backup (`scheduledBackupService.js`) está implementado
   - Configuração é feita via tabela `integration_configs` (não há UI amigável)
   - **Sugestão**: Criar página de configuração de backups no painel admin

8. **Testes Automatizados - Cobertura Baixa**
   - Apenas `backend/tests/` tem alguns testes Jest
   - Frontend não possui testes (nem unitários nem E2E)
   - **Sugestão**: Implementar Vitest para frontend e Playwright para E2E

9. **Monitoramento e Logs**
   - Logs apenas via `console.log` (não persistidos)
   - Sem monitoramento de uptime ou alertas de error
   - **Sugestão**: Integrar Sentry (erros) e UptimeRobot (disponibilidade)

10. **Documentação de API**
    - Endpoints do backend não possuem documentação formal (Swagger/OpenAPI)
    - Desenvolvedores precisam ler código fonte para entender contratos
    - **Sugestão**: Implementar Swagger UI ou documentar em `API.md`

11. **Horário de Funcionamento - Lógica Complexa**
    - `businessHoursController.js` contém lógica rebuscada que já causou bugs
    - Cálculos de tarifas por período (madrugada, diurno, noturno) são confusos
    - **Necessário**: Refatoração com testes unitários abrangentes

12. **Templates de Recibos - Validação Fraca**
    - `receiptTemplatesController.js` permite inputs null que causam warnings no React
    - Sanitização implementada no frontend mas deveria estar no backend também
    - **Fix parcial aplicado**: Inputs sanitizados mas validação de schema Zod está faltando

---

## 📊 Estrutura de Diretórios (Resumo)

```
/home/gab/appestacionamento/
├── src/                          # Frontend React
│   ├── components/               # 95 componentes UI
│   ├── pages/                    # 20 páginas (Dashboard, Vehicles, Convenios, etc.)
│   ├── lib/                      # Utilidades e configurações
│   └── App.tsx                   # Roteamento principal
├── backend/
│   └── src/
│       ├── controllers/          # 40 controllers (auth, vehicles, convenios, etc.)
│       ├── services/             # 11 serviços (pricing, PDF, notifications, etc.)
│       ├── middleware/           # 5 middlewares (auth, security, validation, etc.)
│       ├── routes/               # Definições de rotas
│       └── server.js             # Servidor Express principal
├── package.json                  # Frontend dependencies
├── backend/package.json          # Backend dependencies
└── *.md                          # 60+ arquivos de documentação e playbooks
```

---

## 📁 Arquivos Mortos e Duplicados Identificados

Durante a investigação da arquitetura, foram detectados diversos **arquivos mortos e código deprecated** que podem confundir desenvolvedores e dificultar manutenção:

### 🔴 Código Deprecated em Produção

1. **PDF Generators - Funções não utilizadas**
   - Localização: `/src/utils/faturaPDFGenerator.ts:364`
   - Problema: Comentário `@deprecated gerarPDFPrepago e gerarPDFPosPago - use gerarPDFConvenio`
   - **Ação recomendada**: Remover completamente funções antigas (já foram migradas para unificadas)

2. **Comentários de código sobre modalidades antigas**
   - Localização: `/backend/src/controllers/conveniosFaturasController.js:3`
   - Problema: Comentário ainda menciona "pré-pago e pós-pago" na linha 3
   - **Ação recomendada**: Atualizar toda documentação inline para refletir modalidade única

### 🟡 Arquivos de Migração Mantidos (Histórico)

3. **Migrations SQL - Arquivos de rollback e histórico**
   - `/backend/migrations/rollback_unified_convenios.sql`
   - `/backend/migrations/migrate_convenios_to_unified.sql`
   - `/backend/migrations/expand_billing_days_range.sql`
   - **Status**: Podem ser mantidos para histórico mas devem estar em pasta separada `migrations/archive/`

4. **Schema SQL - Múltiplas versões**
   - `CREATE-CONVENIOS-SCHEMA.sql` (raiz do projeto)
   - `backend/SUPABASE-SECURITY-FIXES.sql`
   - **Problema**: Não está claro qual é o schema "oficial" em produção
   - **Ação recomendada**: Consolidar em um único arquivo `schema/current.sql` e mover antigos para `schema/archive/`

### 🟢 Backups de Controllers (Temporários?)

5. **businessHoursController.js.backup**
   - Localização: `/backend/src/controllers/businessHoursController.js.backup` (17KB)
   - **Problema**: Arquivo `.backup` em diretório de produção
   - **Ação recomendada**: Mover para pasta `/docs/backups/` ou deletar se já não é necessário

### 📝 Documentação Redundante

6. **Múltiplos arquivos MD sobre mesmo assunto**
   - `BACKUP_SYSTEM_COMPLETE.md`, `DEPLOY_CHECKLIST_BACKUP.md`, `BACKUP_RESTORE_ANALYSIS.md`
   - `SECURITY_AUDIT_COMPLETE.md`, `SECURITY_IMPLEMENTATION_SUMMARY.md`, `RESUMO_SEGURANCA.md`, `GUIA_SEGURANCA_COMPLETO.md`
   - **Problema**: Informações duplicadas confundem qual é o documento "oficial"
   - **Ação recomendada**: Consolidar em um único documento por assunto e criar índice `docs/README.md`

---

## 🎯 Conclusões e Próximos Passos


O sistema **TheProParkingApp** é uma aplicação full-stack **produção-ready** com stack moderna (React + Express + Supabase), autenticação robusta, gestão financeira completa e funcionalidades avançadas de convênios empresariais.

**Pontos Fortes:**
- ✅ Arquitetura bem estruturada (separação frontend/backend)
- ✅ Segurança implementada (JWT, rate limiting, helmet, sanitização)
- ✅ Funcionalidades completas de negócio (tarifas dinâmicas, convênios, relatórios)
- ✅ Deploy automatizado (Vercel + Render)

**Próximas Melhorias Prioritárias:**
1. Resolver cold starts do Render (mudar para plano pago ou Railway)
2. Testes automatizados abrangentes (frontend + backend + E2E)
3. Monitoramento e alertas (Sentry + UptimeRobot)
4. Documentação de API (Swagger)
5. Refatoração de `businessHoursController` e `pricingCalculator`

**Manutenção Recomendada:**
- Revisar logs semanalmente
- Testar fluxos críticos após cada deploy
- Manter backups configurados e testá-los mensalmente
- Atualizar dependências críticas (security patches)
