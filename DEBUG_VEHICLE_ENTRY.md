# 🐛 DEBUG: Workflow de Entrada de Veículos de Convênio

## Problema Reportado
Placa **QQQ1111** cadastrada no convênio **Novo Mundo** não está sendo identificada automaticamente durante o registro de entrada.

## Diagnóstico Aplicado

### ✅ Verificação do Backend
1. **Endpoint existe**: `/api/convenios/veiculos/verificar/:placa` ✓
2. **Controller implementado**: `conveniosVeiculosController.verificarPlaca` ✓
3. **Rota registrada**: `router.get('/veiculos/verificar/:placa', ...)` ✓

### ✅ Verificação do Frontend
1. **useEffect implementado**: Dispara após 500ms quando `plate.length === 7` ✓
2. **Fetch API configurado**: Usa token de autenticação ✓
3. **Toast notifications**: Preparados para sucesso/erro ✓

### 🔍 Logs de Debug Adicionados

Adicionei logs detalhados em `VehicleDialog.tsx:44-105`:

```typescript
console.log('[VehicleDialog] 🔍 Verificando placa:', plate);
console.log('[VehicleDialog] 📡 API URL:', apiUrl);
console.log('[VehicleDialog] 🔑 Token exists:', !!token);
console.log('[VehicleDialog] 📬 Response status:', response.status);
console.log('[VehicleDialog] 📦 Response data:', data);
```

## 📋 Instruções para Teste

### Passo 1: Abrir Console do Navegador
1. Pressione `F12` no navegador
2. Vá para a aba "Console"
3. Mantenha aberto durante o teste

### Passo 2: Registrar Entrada
1. Vá para página **Operacional**
2. Clique em **"Registrar Entrada"**
3. Digite: `QQQ1111`
4. Aguarde 500ms

### Passo 3: Verificar Logs

**Logs esperados se tudo estiver OK:**
```
[VehicleDialog] 🔍 Verificando placa: QQQ1111
[VehicleDialog] 📡 API URL: http://localhost:3000/api/convenios/veiculos/verificar/QQQ1111
[VehicleDialog] 🔑 Token exists: true
[VehicleDialog] 📬 Response status: 200
[VehicleDialog] 📦 Response data: { autorizado: true, nome_empresa: "Novo Mundo", ... }
[VehicleDialog] ✅ Veículo AUTORIZADO: Novo Mundo
```

**Logs se der erro:**
```
[VehicleDialog] ❌ HTTP Error: 401 {"error":"Unauthorized"}  ← Token inválido
[VehicleDialog] ❌ HTTP Error: 404 ...  ← Endpoint não encontrado
[VehicleDialog] ❌ HTTP Error: 500 ...  ← Erro no backend
```

## 🔎 Possíveis Causas

### 1. Token de Autenticação Inválido
- Usuário não está logado
- Token expirou
- **Solução**: Fazer login novamente

### 2. Veículo Não Cadastrado Corretamente
- Placa digitada incorreta no cadastro
- Veículo marcado como `ativo = false`
- **Verificar**: Banco de dados → tabela `convenios_veiculos`

### 3. Convênio Inativo
- Status do convênio diferente de "ativo"
- **Verificar**: Página de convênios → status do "Novo Mundo"

### 4. URL da API Incorreta
- `VITE_API_URL` pode estar apontando para lugar errado
- **Verificar**: Procurar por `📡 API URL` nos logs

## ⚡ Próximos Passos

**POR FAVOR, FAÇA O TESTE E ME ENVIE:**
1. Screenshot completo do console
2. Todos os logs que aparecerem com `[VehicleDialog]`
3. Status HTTP da requisição
4. Conteúdo do response

Com essas informações, poderei identificar exatamente onde está o problema!
