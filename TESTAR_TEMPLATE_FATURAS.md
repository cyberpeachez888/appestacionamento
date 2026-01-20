# 🧪 Guia de Teste - Sistema de Templates de Fatura

## 📋 Pré-requisitos

- [ ] Backend rodando (`npm run dev`)
- [ ] Frontend rodando (`npm run dev`)
- [ ] Migração de faturas aplicada (`add_invoice_pdf_fields.sql`)

---

## Fase 1: Aplicar Migração do Template

### Passo 1: Aplicar via Supabase SQL Editor

1. Acesse https://app.supabase.com
2. SQL Editor → New query
3. Cole o conteúdo completo de:
   ```
   /home/gab/appestacionamento/backend/migrations/create_template_fatura.sql
   ```
4. Execute (Run ou Ctrl+Enter)
5. Aguarde confirmação: "Template de fatura instalado com sucesso!"

### Passo 2: Verificar Instalação

Execute esta query para confirmar:

```sql
-- Verificar que tabela foi criada
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'configuracoes_template_fatura';

-- Ver template padrão
SELECT 
  id,
  nome_empresa,
  cnpj,
  ativo,
  created_at
FROM configuracoes_template_fatura
WHERE ativo = true;
```

**Resultado esperado**:
- Tabela existe ✅
- 1 registro com nome "Parking System" ✅

---

## Fase 2: Testar Correções do PDF

### Teste 1: Período Sem "undefined"

**Cenário**: Gerar fatura com vagas extras

1. Abra um convênio com vagas extras finalizadas
2. Aba Financeiro → "Gerar Nova Fatura"
3. Preview deve carregar
4. **VERIFICAR**: Período exibe "Janeiro/2026" (ou intervalo de datas)
5. ❌ ANTES: "undefined/Janeiro/2026"
6. ✅ AGORA: "Janeiro/2026" 

### Teste 2: Tempo de Permanência Calculado

**Cenário**: PDF com vagas extras

1. Gere a fatura
2. Baixe o PDF
3. **VERIFICAR**: Coluna "Tempo" nas vagas extras
4. ❌ ANTES: "-" (vazio)
5. ✅ AGORA: "5h30" ou "1d 3h15"

###Teste 3: Valores Exibidos

**Cenário**: Vagas pagas e cortesia

1. No PDF gerado
2. **VERIFICAR**: Coluna "Valor"
3. ❌ ANTES: "-" (vazio)
4. ✅ AGORA:
   - Vagas pagas: "R$ 45,80"
   - Vagas cortesia: "CORTESIA"

**Screenshot esperado**:
```
Placa      Entrada         Saída         Tempo    Valor
TES1111    19/01 10:00    19/01 15:30   5h30     R$ 45,80    ← ✅
ABC9999    20/01 08:00    20/01 12:00   4h00     CORTESIA    ← ✅
```

---

## Fase 3: Testar API de Template

### Teste 1: Obter Template Ativo

```bash
curl -X GET "http://localhost:3000/api/configuracoes/template-fatura" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json"
```

**Resposta esperada**:
```json
{
  "success": true,
  "data": {
    "template": {
      "id": "uuid",
      "nome_empresa": "Parking System",
      "cnpj": "00.000.000/0001-00",
      "ativo": true,
      // ... outros campos
    }
  }
}
```

### Teste 2: Atualizar Template

```bash
curl -X PUT "http://localhost:3000/api/configuracoes/template-fatura" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "nome_empresa": "Meu Estacionamento Premium",
    "cnpj": "12.345.678/0001-90",
    "telefone": "(11) 9999-8888",
    "banco_nome": "Itaú",
    "banco_agencia": "1234",
    "banco_conta": "56789-0"
  }'
```

**Resposta esperada**:
```json
{
  "success": true,
  "message": "Template atualizado com sucesso",
  "data": {
    "template": {
      "nome_empresa": "Meu Estacionamento Premium",
      // ...
    }
  }
}
```

### Teste 3: Restaurar Padrão

```bash
curl -X POST "http://localhost:3000/api/configuracoes/template-fatura/restaurar-padrao" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json"
```

**Resposta esperada**:
```json
{
  "success": true,
  "message": "Template restaurado para padrão de fábrica",
  "data": {
    "template": {
      "nome_empresa": "Parking System",
      // ...
    }
  }
}
```

---

## Fase 4: Testar Validações

### Teste 1: CNPJ Inválido

```bash
curl -X PUT "http://localhost:3000/api/configuracoes/template-fatura" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"nome_empresa": "Teste", "cnpj": "123"}'
```

**Resposta esperada**:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "CNPJ inválido",
    "details": {
      "cnpj": "CNPJ deve ter 14 dígitos"
    }
  }
}
```

### Teste 2: Email Inválido

```bash
curl -X PUT "http://localhost:3000/api/configuracoes/template-fatura" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "nome_empresa": "Teste",
    "cnpj": "00.000.000/0001-00",
    "email": "email-invalido"
  }'
```

**Resposta esperada**:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Email inválido",
    "details": {
      "email": "Formato de email inválido"
    }
  }
}
```

---

## ✅ Checklist Final

### Correções do PDF
- [ ] Período sem "undefined"
- [ ] Tempo de permanência calculado
- [ ] Valores exibidos (pagas e cortesia)

### API de Template
- [ ] GET retorna template ativo
- [ ] PUT atualiza template
- [ ] POST restaura padrão
- [ ] Validações funcionam

### Banco de Dados
- [ ] Tabela criada
- [ ] Template padrão inserido
- [ ] Índices criados

---

## 🐛 Troubleshooting

### Erro: "Template não configurado"

**Causa**: Migração não foi aplicada

**Solução**:
1. Aplicar `create_template_fatura.sql`
2. Verificar com: `SELECT * FROM configuracoes_template_fatura`

### Erro: "Cannot read property 'tipo_vaga_extra'"

**Causa**: Vagas extras sem tipo definido

**Solução**:
```sql
UPDATE convenios_movimentacoes 
SET tipo_vaga_extra = 'paga' 
WHERE tipo_vaga = 'extra' AND tipo_vaga_extra IS NULL;
```

### PDF ainda com "undefined"

**Causa**: Backend não foi reiniciado

**Solução**:
1. Parar backend (Ctrl+C)
2. `npm run dev`
3. Gerar nova fatura

---

## 📊 Status da Implementação

| Componente | Status | Progresso |
|------------|--------|-----------|
| Correções PDF | ✅ Completo | 100% |
| Database Schema | ✅ Completo | 100% |
| Backend API | ✅ Completo | 100% |
| Frontend UI | ⏳ Pendente | 0% |

**Próximo**: Implementar interface frontend (Dialog + Botão)
