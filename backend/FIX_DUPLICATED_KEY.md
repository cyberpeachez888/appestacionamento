# 🔴 CORREÇÃO URGENTE: SERVICE_ROLE_KEY Duplicada

## Problema Identificado

A SERVICE_ROLE_KEY está **duplicada/malformada**. 

**Chave atual (ERRADA - duplicada):**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ucHZhenplb213a2x1Z2F3Y2VnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjQ0ODY0MSwiZXhwIjoyMDc4MDI0NjQxfQ.eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ucHZhenplb213a2x1Z2F3Y2VnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjQ0ODY0MSwiZXhwIjoyMDc4MDI0NjQxfQ.UoyVeQZdLDoTv8Ho_kfoN4UFxsf89zEJIrLV50S55jg
```

**Chave correta (use esta):**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ucHZhenplb213a2x1Z2F3Y2VnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjQ0ODY0MSwiZXhwIjoyMDc4MDI0NjQxfQ.UoyVeQZdLDoTv8Ho_kfoN4UFxsf89zEJIrLV50S55jg
```

## Solução Imediata

### 1. Corrigir no Render (PRIORITÁRIO)

1. Acesse: https://dashboard.render.com/
2. Vá em **Environment**
3. Encontre `SUPABASE_SERVICE_ROLE_KEY`
4. Clique em **Edit**
5. Substitua pelo valor correto acima
6. Salve e aguarde redeploy

### 2. Corrigir no .env local

Vou corrigir automaticamente para você.

## Como isso aconteceu?

Provavelmente você copiou a chave duas vezes acidentalmente, ou copiou com algum caractere extra.

Um JWT válido tem 3 partes separadas por pontos:
```
HEADER.PAYLOAD.SIGNATURE
```

A chave duplicada tinha:
```
HEADER.PAYLOAD.HEADER.PAYLOAD.SIGNATURE
```

## Verificação

Após corrigir, o erro deve mudar de:
- ❌ `Error: No suitable key or wrong key type`

Para:
- ✅ Sem erros, caixa abre normalmente
