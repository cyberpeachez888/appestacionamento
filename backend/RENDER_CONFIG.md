# ⚠️ AÇÃO URGENTE: Adicionar SERVICE_ROLE_KEY no Render

## Situação Atual

✅ **Local (.env)**: SERVICE_ROLE_KEY configurada  
❌ **Render (produção)**: SERVICE_ROLE_KEY NÃO configurada

Os logs do Render mostram apenas:
```
✅ Connecting to Supabase: https://nnpvazzeomwklugawceg.supabase.co
```

Mas **NÃO mostra** qual chave está sendo usada, o que significa que o código antigo ainda está rodando.

## Passo a Passo para Corrigir no Render

### 1. Acessar o Dashboard do Render

Acesse: https://dashboard.render.com/

### 2. Selecionar o Serviço Backend

Procure pelo serviço: **theproparking-backend-1rxk**

### 3. Ir em Environment

Clique na aba **"Environment"** no menu lateral

### 4. Adicionar Nova Variável

Clique em **"Add Environment Variable"**

- **Key**: `SUPABASE_SERVICE_ROLE_KEY`
- **Value**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ucHZhenplb213a2x1Z2F3Y2VnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjQ0ODY0MSwiZXhwIjoyMDc4MDI0NjQxfQ.UoyVeQZdLDoTv8Ho_kfoN4UFxsf89zEJIrLV50S55jg`

### 5. Salvar

Clique em **"Save Changes"**

O Render vai fazer um **redeploy automático** (leva ~2-3 minutos)

### 6. Verificar os Logs

Após o redeploy, você deve ver nos logs:

```
✅ Connecting to Supabase: https://nnpvazzeomwklugawceg.supabase.co
🔑 Using SERVICE_ROLE key
```

Se aparecer `🔑 Using ANON key`, a variável não foi configurada corretamente.

## Próximo Passo: Executar SQL no Supabase

Depois de configurar a SERVICE_ROLE_KEY no Render, você precisa executar o SQL:

1. Acesse: https://supabase.com/dashboard/project/nnpvazzeomwklugawceg/sql/new
2. Cole o conteúdo do arquivo `backend/migrations/fix_rls_permissive.sql`
3. Clique em **"Run"**

## Teste Final

Após ambos os passos:

1. Faça login no app
2. Tente abrir o caixa
3. Não deve mais aparecer erro de RLS

---

## Resumo Rápido

1. ✅ Adicionar `SUPABASE_SERVICE_ROLE_KEY` no Render
2. ⏳ Aguardar redeploy (~2-3 min)
3. ✅ Executar `fix_rls_permissive.sql` no Supabase
4. ✅ Testar abrir caixa

**Tempo estimado**: 5 minutos
