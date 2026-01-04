# TheProParkingApp

**Sistema completo de gestão de estacionamento para uso local**

## Sobre o Projeto

TheProParkingApp é um sistema profissional de gestão de estacionamento desenvolvido para controle de entrada/saída de veículos, gestão de mensalistas, controle financeiro e relatórios detalhados.

### Funcionalidades Principais:

- ✅ Controle de entrada e saída de veículos
- ✅ Gestão de mensalistas
- ✅ Cálculo automático de tarifas
- ✅ Controle de caixa
- ✅ Relatórios financeiros
- ✅ Configuração de horários e feriados
- ✅ Dashboard analítico

---

## Estrutura do projeto

- `src/` – aplicativo React/Vite (frontend)
- `backend/` – API Express + Supabase
- `backend/tests/` – suíte Jest (controllers, serviços e rotas críticas)
- `scripts/` – utilitários de automação (verificação de ambiente, checklist pós-deploy)
- Documentação operacional em arquivos `.md` na raiz (`CI_CD_PLAYBOOK.md`, `OPERATIONS_CHECKLIST.md`, etc.)

---

## Como rodar localmente

### Pré-requisitos

- Node.js 20+
- npm

### Passo-a-passo

- Instale dependências do frontend (root) e backend:

```bash
npm install         # frontend + scripts
cd backend && npm install
```

- Crie o arquivo `backend/.env` usando como referência `backend/scripts/check-env.js`.
- Inicie os servidores:
  - Frontend: `npm run dev`
  - Backend: `npm start --prefix backend`
- Abra `http://localhost:5173`.

> **Dica:** use `npm run verify-env --prefix backend` antes de subir o backend para checar variáveis obrigatórias.

---

## Scripts úteis

| Comando                                 | Descrição                                                 |
| --------------------------------------- | --------------------------------------------------------- |
| `npm run dev`                           | Inicia o frontend em modo desenvolvimento                 |
| `npm run lint`                          | Executa ESLint em todo o código (frontend)                |
| `npm run lint --prefix backend`         | Executa ESLint no backend                                 |
| `npm run format` / `npm run format:fix` | Verifica/aplica formatação Prettier (front + back + docs) |
| `npm test --prefix backend`             | Roda a suíte Jest do backend                              |
| `npm run verify-env --prefix backend`   | Garante que variáveis críticas estão definidas            |
| `npm run postdeploy-checklist`          | Lembra o checklist rápido pós-deploy                      |
| `npm run build` / `npm run preview`     | Build e preview do frontend                               |
| `npm start --prefix backend`            | Sobe a API em produção                                    |

---

## Variáveis de ambiente (backend)

Use o script `npm run verify-env --prefix backend` para garantir que itens abaixo estão presentes:

| Variável                       | Descrição                                                    |
| ------------------------------ | ------------------------------------------------------------ |
| `SUPABASE_URL`, `SUPABASE_KEY` | Projeto Supabase                                             |
| `JWT_SECRET`                   | Chave para assinar tokens                                    |
| `FRONTEND_URL`                 | URL do frontend (para links de recuperação)                  |
| `SEED_ADMIN_SECRET`            | Token para seed protegido (`maintenance/seed-admin`)         |
| `SMTP_*`                       | Credenciais para envio de e-mail (opcional, mas recomendado) |

Outros parâmetros (SMS/WhatsApp, backups automáticos) também são lidos do Supabase (`integration_configs`).

---

## Testes

- `npm test --prefix backend` – cobre autenticação, backup, fila de notificações e health.
- Expanda criando novos testes em `backend/tests/`.
- Planeje testes end-to-end para o frontend conforme necessidade (ex.: Playwright ou Cypress).

---

## CI/CD e Deploy

- GitHub Actions (`.github/workflows/backend-ci.yml`) roda `npm ci`, `npm run lint` e `npm test --prefix backend` a cada push/PR nos branches `main`/`develop`.
- Defina os secrets do workflow (Supabase, JWT, SMTP, etc.) para que o pipeline execute sem falhas.
- Deploy automático sugerido:
  - **Backend**: Render (Node 20) – Start `npm start --prefix backend`.
  - **Frontend**: Vercel – Build `npm run build`.
- Consulte `CI_CD_PLAYBOOK.md` para configurar pipeline, secrets, deploy e rollback.

---

## Operação e monitoramento

- Execute `npm run postdeploy-checklist` após cada deploy para lembrar validações essenciais.
- Checklist detalhado em `OPERATIONS_CHECKLIST.md`.
- Configure monitoramento/uptime: endpoint `/health`.
- Mantenha logs do backend (Render/PM2) e métricas de notificações/backups.

---

## Referências adicionais

- `PRODUCTION_DEPLOYMENT_GUIDE.md` – passo-a-passo completo de implantação.
- `CI_CD_PLAYBOOK.md` – integrações GitHub Actions, Render, Vercel.
- `OPERATIONS_CHECKLIST.md` – rotina pós-deploy.
- `SECURITY_*`, `PRICING_*`, `BACKUP_*` – históricos de ajustes e playbooks específicos.

---

## Integração com Lovable (opcional)

O projeto foi originalmente criado no Lovable. Você ainda pode:

- Abrir o [Lovable Project](https://lovable.dev/projects/21c797df-ffb2-41a2-8f2b-0897f99d7ffb) e trabalhar por prompts.
- Editar arquivos diretamente no GitHub ou em qualquer IDE local.

Commits feitos em qualquer uma das plataformas serão refletidos no repositório principal.

````

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

### Authentication & RBAC

This project uses JWT-based authentication for the backend API with role-based access control (admin/operator).

- Endpoints:
  - `POST /auth/login` → returns `{ token, user }`
  - `GET /auth/me` → returns `{ user }` (requires Bearer token)
  - `GET /users` (admin)
  - `POST /users` (admin)
  - `PUT /users/:id` (admin)
  - `PUT /users/:id/password` (self or admin)
  - `DELETE /users/:id` (admin)

Environment variables:

- `JWT_SECRET` → secret used to sign tokens (set in backend environment before starting the server)

Initial admin user:

1. Apply the SQL schema in `backend/supabase-schema.sql` to your database (includes the `users` table).
2. Create an initial admin user either via SQL insert or by temporarily exposing a seeding route. Example SQL (replace values):

```sql
INSERT INTO users (id, name, email, login, password_hash, role, permissions)
VALUES (
	gen_random_uuid(),
	'Admin',
	'admin@example.com',
	'admin',
	crypt('admin123', gen_salt('bf')),
	'admin',
	'{}'::jsonb
);
````

Alternatively, you can use the `/users` endpoint once you have any admin available.

Frontend integration:

- The frontend stores the token in localStorage (when "Lembrar" checked) or sessionStorage, and automatically attaches it to API requests.
- Use the Login page at `/login`.
- Admin-only Users page: `/users`.

