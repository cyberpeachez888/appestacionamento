# CI/CD & Monitoramento – Playbook Rápido

Este guia resume os passos essenciais para manter o projeto funcionando com qualidade em produção.  
Siga as seções na ordem apresentada.

---

## 1. Continuous Integration (CI)

### 1.1. Workflow do GitHub Actions
- Arquivo: `.github/workflows/backend-ci.yml`  
- Inspira a executar `npm test` dentro da pasta `backend` em cada `push` ou `pull_request` nos branches `main` e `develop`.

### 1.2. Variáveis de Ambiente (Secrets)
Crie cada segredo no repositório GitHub (`Settings` → `Secrets and variables` → `Actions` → `New repository secret`):

| Nome do Secret | Exemplo / Observação |
| -------------- | -------------------- |
| `SUPABASE_URL` | URL do projeto Supabase |
| `SUPABASE_KEY` | Chave pública (anon) |
| `SUPABASE_SERVICE_ROLE_KEY` | Opcional; só se algum teste usar operações administrativas |
| `JWT_SECRET` | Ex.: `ci-secret-123` |
| `FRONTEND_URL` | URL do frontend (pode ser `http://localhost:5173` para CI) |
| `SEED_ADMIN_SECRET` | Valor qualquer (ex.: `ci-seed-secret`) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM` | Pode usar valores fictícios para CI |

> **Dica**: se algum secret não existir, o Node cairá em fallback ou os testes usarão mocks — mas é melhor registrar todos para manter o pipeline o mais próximo possível do ambiente real.

### 1.3. Primeira Execução
1. Commit e push das alterações (workflow + testes).
2. Acesse a aba **Actions** no GitHub e verifique se o job **Backend CI** aparece e está verde.
3. Caso algo falhe, abra os logs, ajuste o código ou os secrets e reenvie.

---

## 2. Fluxo de Deploy

### 2.1. Branches Recomendadas
- `main`: produção.
- `develop`: staging.
- Cada nova feature → branch própria → Pull Request para `develop` → merge em `main` após teste.

### 2.2. Backend (ex.: Render ou VPS)
- Configure a plataforma para **deploy automático** do branch `main`.
- Comando de build: `npm install --prefix backend`.
- Comando de start: `npm start` (já inicia `backend/src/server.js`).
- Configure as mesmas variáveis de ambiente do CI **com valores reais**.

### 2.3. Frontend (ex.: Vercel ou Netlify)
- Build: `npm install && npm run build`.
- Apontar a build para o branch `main`.
- Definir `VITE_API_URL` para a URL do backend em produção.

---

## 3. Plano de Rollback

### 3.1. Backend (Render/VPS)
1. Identificar o último deploy estável (no painel da Render ou via tags Git).
2. Clicar em **Rollback** (Render) ou fazer `git checkout` da tag anterior + `pm2 restart` (VPS).
3. Verificar logs após rollback para garantir estabilidade.

### 3.2. Frontend (Vercel/Netlify)
1. Abrir seção de Deploys.
2. Selecionar a build anterior que estava OK.
3. Escolher “Redeploy” ou “Promote to Production”.

> **Sugestão**: marque releases/tags no Git (`git tag prod-aaaa-mm-dd`) para saber rapidamente qual commit representa o estado estável.

---

## 4. Monitoramento

### 4.1. Healthcheck e Uptime
- Endpoint já disponível: `GET /health`.
- Configure um serviço como UptimeRobot, Better Uptime ou Pingdom para checar a cada minuto.
- Se o serviço retornar status ≠ 200, receberá alerta por e‑mail/SMS/Slack.

### 4.2. Logs
- Render/Heroku/VPS: habilite logs persistentes.
- Para VPS, use `pm2 logs` e configure um serviço de centralização (Papertrail, Logtail, Datadog) se precisar de histórico.

### 4.3. Alertas Operacionais
- Falha no envio de notificações: acompanhe a tabela `notification_logs`.
- Backups: conferir diretório `backups` e agendar alertas (cron job pode validar arquivos gerados + enviar e-mail).
- Considere integrar com Slack/Telegram/Webhook para alertas automáticos.

---

## 5. Verificação Manual Pós-Deploy

Sempre que um novo deploy entrar em produção:
1. Validar login e troca de senha.
2. Gerar um backup manual e baixar o arquivo.
3. Criar/fechar ticket de veículo e gerar recibo.
4. Enviar uma notificação (e-mail/SMS) para confirmar credenciais.
5. Conferir painel de logs e serviço de uptime.

Esse ciclo garante que o app está operando corretamente e que o rollback será acionado rapidamente se algo der errado.

