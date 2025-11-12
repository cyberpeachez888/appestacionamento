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

## Project info

**URL**: https://lovable.dev/projects/21c797df-ffb2-41a2-8f2b-0897f99d7ffb

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/21c797df-ffb2-41a2-8f2b-0897f99d7ffb) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

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
```

Alternatively, you can use the `/users` endpoint once you have any admin available.

Frontend integration:

- The frontend stores the token in localStorage (when "Lembrar" checked) or sessionStorage, and automatically attaches it to API requests.
- Use the Login page at `/login`.
- Admin-only Users page: `/users`.

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/21c797df-ffb2-41a2-8f2b-0897f99d7ffb) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
