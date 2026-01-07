# 🚨 CORREÇÃO URGENTE: Problemas de Autenticação e RLS

## Problemas Identificados

1. **Backend usando ANON_KEY** - O backend está usando a chave pública (anon) que está sujeita às políticas RLS
2. **RLS bloqueando operações** - As políticas RLS estão bloqueando inserções na tabela `cash_register_sessions`
3. **Token JWT inválido** - Possível incompatibilidade entre JWT do backend e token do Supabase

## Solução Imediata

### Passo 1: Adicionar SERVICE_ROLE_KEY ao .env

1. Acesse o **Supabase Dashboard**: https://supabase.com/dashboard/project/nnpvazzeomwklugawceg/settings/api
2. Na seção **Project API keys**, copie a chave **service_role** (⚠️ secreta!)
3. Adicione ao arquivo `backend/.env`:

```bash
# Adicione esta linha ao backend/.env
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ucHZhenplb213a2x1Z2F3Y2VnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjQ0ODY0MSwiZXhwIjoyMDc4MDI0NjQxfQ.COLE_A_CHAVE_AQUI
```

### Passo 2: Executar SQL no Supabase

Execute o arquivo `backend/migrations/fix_rls_permissive.sql` no **SQL Editor** do Supabase:

1. Acesse: https://supabase.com/dashboard/project/nnpvazzeomwklugawceg/sql/new
2. Cole o conteúdo do arquivo `fix_rls_permissive.sql`
3. Clique em **Run**

### Passo 3: Reiniciar o Backend

```bash
# Se estiver rodando localmente
cd backend
npm run dev

# Ou se estiver no Render, faça um novo deploy
```

### Passo 4: Atualizar Variáveis de Ambiente no Render

Se o backend está no Render:

1. Acesse: https://dashboard.render.com/
2. Vá em **Environment**
3. Adicione a variável:
   - **Key**: `SUPABASE_SERVICE_ROLE_KEY`
   - **Value**: (cole a chave service_role do Supabase)
4. Salve e aguarde o redeploy automático

## Verificação

Após aplicar as correções, você deve ver no log do backend:

```
✅ Connecting to Supabase: https://nnpvazzeomwklugawceg.supabase.co
🔑 Using SERVICE_ROLE key
```

Se ainda aparecer "Using ANON key", a variável não foi configurada corretamente.

## Arquivos Modificados

- ✅ `backend/src/config/supabase.js` - Atualizado para usar SERVICE_ROLE_KEY
- ✅ `backend/migrations/fix_rls_permissive.sql` - Script SQL para corrigir RLS
- ✅ `backend/diagnostics_rls_cash.sql` - Script de diagnóstico

## Por que isso aconteceu?

O backend estava usando a **ANON_KEY** (chave pública) que é sujeita às políticas RLS do Supabase. 
Quando o RLS está habilitado, o Supabase verifica se o usuário autenticado tem permissão para fazer a operação.

O problema é que o backend usa **JWT próprio** (não o do Supabase), então o Supabase não reconhece 
o usuário e bloqueia a operação.

A solução é usar a **SERVICE_ROLE_KEY** que bypassa completamente o RLS, permitindo que o backend
faça operações administrativas sem restrições.

## Segurança

⚠️ **IMPORTANTE**: A SERVICE_ROLE_KEY é uma chave **administrativa** que bypassa todas as políticas RLS.

- ✅ Use APENAS no backend (nunca no frontend)
- ✅ Nunca commite no Git
- ✅ Mantenha em variáveis de ambiente
- ✅ Use apenas em ambiente servidor (Node.js)
