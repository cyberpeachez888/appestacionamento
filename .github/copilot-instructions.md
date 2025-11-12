# Copilot Instructions for AppEstacionamento

## Project Overview
- **AppEstacionamento** is a full-stack parking management system.
- **Frontend:** React + Vite (see `src/`)
- **Backend:** Node.js + Express, integrated with Supabase (see `backend/`)
- **Authentication:** JWT-based, with role-based access (admin/operator)

## Architecture & Data Flow
- **Frontend** communicates with backend via REST API (`/api/*` and `/*` routes).
- **Backend** uses Supabase for persistent storage, but supports in-memory fallback for local development/testing.
- **Database migrations** are managed via SQL files in `backend/` (e.g., `supabase-schema.sql`, `COMPLETE-MIGRATION.sql`).
- **Frontend stores JWT tokens** in localStorage/sessionStorage and attaches them to API requests.

## Developer Workflows
- **Install dependencies:** `npm install` (root and backend folders)
- **Start frontend:** `npm run dev` (root)
- **Start backend:** `npm run dev` or `npm start` (backend)
- **Run backend smoke tests:** `bash tests/smoke-test.sh` (backend)
- **Database setup:**
  1. Copy `.env.example` to `.env` in `backend/`
  2. Configure Supabase credentials
  3. Run SQL migrations in Supabase SQL Editor

## Key Conventions & Patterns
- **API endpoints** are defined in `backend/src/routes/` and handled by controllers in `backend/src/controllers/`.
- **In-memory fallback**: If Supabase is not configured, backend uses in-memory storage for rapid prototyping.
- **Role-based access**: Most admin actions (user management, reports) require an admin JWT.
- **Frontend pages**: Auth flows at `/login`, admin-only at `/users`.
- **Environment variables**:
  - Backend: `JWT_SECRET`, `SUPABASE_URL`, `SUPABASE_KEY`, `PORT`
  - Frontend: `VITE_API_URL`

## Integration Points
- **Supabase**: Used for user, ticket, payment, and monthly customer data.
- **Lovable.dev**: Project can be edited and deployed via Lovable (see README for details).
- **Custom domain**: Supported via Lovable project settings.

## Troubleshooting
- **Missing DB columns**: Run `COMPLETE-MIGRATION.sql` in Supabase SQL Editor.
- **Token issues**: Ensure frontend is sending JWT in Authorization header.
- **Dev mode**: Backend will use in-memory storage if Supabase is not configured.

## Example Files
- `src/components/ExitConfirmationDialog.tsx`: Example React component.
- `backend/src/controllers/`: Backend business logic.
- `backend/supabase-schema.sql`: Database schema.

---

For more details, see `README.md` (root and backend folders).

> Update this file as project conventions evolve. If anything is unclear, ask for clarification or check the referenced files.
