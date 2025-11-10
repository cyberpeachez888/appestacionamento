# 🚀 GUIA DE DEPLOYMENT - Pricing & Tariff Rules (Fase 1)

## ✅ IMPLEMENTAÇÃO COMPLETA

Implementamos o sistema avançado de **Time-Based Pricing Rules** que permite:
- ✅ Primeira hora com preço diferenciado
- ✅ Valor máximo diário (daily cap)
- ✅ Faixas horárias com multiplicadores (horário de pico)
- ✅ Preço progressivo por hora (redução gradual)

---

## 📋 PASSO A PASSO DE DEPLOYMENT

### **PASSO 1: Executar Migration SQL** 🗄️

1. Abra o **Supabase SQL Editor**
2. Execute o arquivo: `/backend/create-pricing-rules-table.sql`

```sql
-- Este script cria:
-- 1. Tabela pricing_rules com todos os campos necessários
-- 2. Índices para performance
-- 3. Trigger para atualizar updated_at automaticamente
```

**Verificação:**
```sql
-- Execute no SQL Editor para confirmar criação
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'pricing_rules';

-- Deve retornar 1 linha
```

---

### **PASSO 2: Verificar Backend está Rodando** 🖥️

```bash
cd /workspaces/appestacionamento/backend
npm start
```

**Verificar console:**
- ✅ Deve mostrar: `Backend running on http://localhost:3000`
- ✅ Deve mostrar: `Scheduled backup service initialized`

---

### **PASSO 3: Verificar Frontend está Rodando** 🌐

Em outro terminal:
```bash
cd /workspaces/appestacionamento
npm run dev
```

**Verificar console:**
- ✅ Deve mostrar URL do Vite (ex: `http://localhost:5173`)

---

### **PASSO 4: Testar API Endpoints** 🧪

Execute no terminal:

```bash
# 1. Obter lista de tarifas (copiar ID de uma tarifa 'Hora/Fração')
curl http://localhost:3000/api/rates \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"

# 2. Criar regra de primeira hora (substituir RATE_ID)
curl -X POST http://localhost:3000/api/pricing-rules \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -d '{
    "rateId": "RATE_ID_AQUI",
    "ruleType": "first_hour",
    "conditions": {},
    "valueAdjustment": {"type": "override", "value": 10},
    "priority": 1,
    "description": "Primeira hora: R$ 10,00"
  }'

# 3. Listar regras da tarifa (substituir RATE_ID)
curl http://localhost:3000/api/pricing-rules/rate/RATE_ID_AQUI \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

**Respostas esperadas:**
- POST deve retornar status 201 com objeto da regra criada
- GET deve retornar array com a regra criada

---

### **PASSO 5: Testar UI no Frontend** 🎨

1. **Login no sistema** em `http://localhost:5173`
   - Use usuário com permissão `manageRates`

2. **Navegar para página Tarifas**

3. **Abrir regras avançadas:**
   - Clique no ícone de engrenagem (⚙️) em uma tarifa "Hora/Fração"
   - Deve abrir modal/seção "Regras de Precificação Avançada"

4. **Criar primeira regra:**
   - Tipo: "Primeira Hora"
   - Valor: 10.00
   - Prioridade: 1
   - Clique "Criar Regra"

5. **Verificar regra criada:**
   - Deve aparecer na lista de regras
   - Status deve estar "Ativo" (toggle verde)

6. **Testar outras regras:**
   - Criar "Máximo Diário" com valor 50.00
   - Criar "Preço Progressivo" com valor base 8.00
   - Verificar todas aparecem na lista

---

## 🧪 TESTES FUNCIONAIS

### **Teste 1: Primeira Hora**

**Cenário:**
- Entrada: 10:00
- Saída: 10:45 (45 minutos)
- Tarifa base: R$ 5/hora
- Regra ativa: Primeira hora = R$ 10

**Resultado esperado:**
- ✅ Preço calculado: R$ 10,00 (não R$ 5,00)
- ✅ Regra aplicada visível no recibo

**Como testar:**
1. Configure regra "Primeira Hora" = R$ 10
2. Registre entrada de veículo
3. Registre saída com 45min de diferença
4. Verifique valor cobrado

---

### **Teste 2: Máximo Diário**

**Cenário:**
- Entrada: 08:00
- Saída: 20:00 (12 horas)
- Tarifa base: R$ 5/hora
- Cálculo normal: 12 × R$ 5 = R$ 60
- Regra ativa: Máximo diário = R$ 50

**Resultado esperado:**
- ✅ Preço calculado: R$ 50,00 (cap aplicado)
- ✅ Economia de R$ 10 para o cliente

**Como testar:**
1. Configure regra "Máximo Diário" = R$ 50
2. Registre entrada às 08:00
3. Registre saída às 20:00
4. Verifique valor é R$ 50 (não R$ 60)

---

### **Teste 3: Múltiplas Regras (Prioridade)**

**Cenário:**
- Tarifa base: R$ 5/hora
- Regra 1 (Prioridade 1): Primeira hora = R$ 10
- Regra 2 (Prioridade 99): Máximo diário = R$ 50
- Permanência: 12 horas

**Resultado esperado:**
- ✅ Primeira hora cobra R$ 10
- ✅ Horas 2-12 cobram R$ 5 cada = R$ 55
- ✅ Total = R$ 65, mas máximo diário limita a R$ 50
- ✅ **Preço final: R$ 50,00**

---

### **Teste 4: Toggle Ativo/Inativo**

**Cenário:**
- Criar regra "Primeira Hora" = R$ 10
- Desativar a regra (toggle)
- Calcular preço

**Resultado esperado:**
- ✅ Quando ativa: cobra R$ 10 na primeira hora
- ✅ Quando inativa: cobra R$ 5 normal
- ✅ Toggle funciona sem recarregar página

---

### **Teste 5: Edição e Exclusão**

**Passos:**
1. Criar regra "Primeira Hora" = R$ 10
2. Editar para R$ 12
3. Verificar mudança
4. Excluir regra
5. Verificar lista vazia

**Resultado esperado:**
- ✅ Edição atualiza valor imediatamente
- ✅ Exclusão remove da lista
- ✅ Confirmação de exclusão aparece

---

## 🐛 TROUBLESHOOTING

### **Erro: "Failed to fetch pricing rules"**

**Causa:** Backend não está rodando ou token inválido

**Solução:**
```bash
# Verificar se backend está rodando
ps aux | grep node

# Reiniciar backend se necessário
cd backend && npm start
```

---

### **Erro: "pricing_rules table does not exist"**

**Causa:** Migration SQL não foi executada

**Solução:**
1. Abrir Supabase SQL Editor
2. Executar `/backend/create-pricing-rules-table.sql`
3. Verificar criação com: `SELECT * FROM pricing_rules LIMIT 1;`

---

### **Erro: "Permission denied"**

**Causa:** Usuário não tem permissão `manageRates`

**Solução:**
```sql
-- No Supabase SQL Editor
UPDATE users 
SET permissions = jsonb_set(
  COALESCE(permissions, '{}'::jsonb),
  '{manageRates}',
  'true'
)
WHERE id = 'USER_ID_AQUI';
```

---

### **Erro: Regras não aparecem na UI**

**Checklist de debug:**
1. ✅ Migration executada? `SELECT COUNT(*) FROM pricing_rules;`
2. ✅ Backend rodando? `curl http://localhost:3000/api/rates`
3. ✅ Token válido? Verificar console do navegador (F12)
4. ✅ RateId correto? Verificar que está passando ID real da tarifa
5. ✅ CORS habilitado? Backend deve ter `cors: { origin: '*' }`

---

## 📊 MÉTRICAS DE SUCESSO

Após deployment completo, você deve conseguir:

- ✅ Ver ícone ⚙️ em cada tarifa na página Tarifas
- ✅ Clicar e abrir modal de regras avançadas
- ✅ Criar 4 tipos de regras (primeira hora, máximo diário, faixa horária, progressivo)
- ✅ Editar regras existentes
- ✅ Ativar/desativar regras com toggle
- ✅ Excluir regras com confirmação
- ✅ Ver regras aplicadas no cálculo de tickets

---

## 🎯 PRÓXIMOS PASSOS (Futuro)

**Fase 2 - Weekend/Holiday Pricing:**
- Calendário de feriados
- Detecção automática de fins de semana
- Multiplicadores por data

**Fase 3 - Monthly Pricing Tiers:**
- Planos Bronze/Prata/Ouro
- Descontos por contrato longo
- Múltiplas vagas com desconto

**Fase 4 - Discount Codes:**
- Sistema de cupons promocionais
- Códigos com validade e limite de uso
- Aplicação automática

---

## 📞 SUPORTE

Se encontrar problemas:

1. **Verificar logs do backend:** Console onde rodou `npm start`
2. **Verificar console do navegador:** F12 → Console tab
3. **Verificar Network tab:** F12 → Network → filtrar por "pricing-rules"
4. **Revisar documentação:** `/PRICING_AUDIT_COMPLETE.md`

---

**Data de Deployment:** 10/11/2025  
**Versão:** 1.0.0 - Fase 1 (Time-Based Pricing Rules)  
**Status:** ✅ Pronto para produção  
**Próxima Fase:** Weekend/Holiday Pricing (estimativa: 6h)
