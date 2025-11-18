# 📋 Guia de Inicialização Diária - TheProParkingApp

## ✅ Verificação: App está pronto para uso?

### Checklist de Prontidão:

- [x] **Setup inicial concluído** (Wizard de configuração executado)
- [x] **Usuário admin criado** (você já fez login)
- [x] **Configurações da empresa** preenchidas
- [x] **Backend rodando** (Render ou local)
- [x] **Frontend acessível** (Vercel ou local)
- [x] **Banco de dados conectado** (Supabase)
- [x] **Tabela de caixa criada** (cash_register_sessions)

**Status:** ✅ **APP PRONTO PARA USO!**

---

## 🌅 Rotina de Inicialização Diária

### Opção 1: App em Produção (Vercel + Render) - RECOMENDADO

Se você está usando o app em produção (Vercel para frontend e Render para backend):

#### Passo 1: Acessar o App (30 segundos)

1. Abra o navegador no computador/tablet
2. Acesse a URL do Vercel (ex: `https://appestacionamento.vercel.app`)
3. Faça login com suas credenciais

#### Passo 2: Abrir o Caixa (1 minuto)

1. Após fazer login, você será redirecionado para a página **Operacional**
2. Se o caixa estiver fechado, aparecerá automaticamente um diálogo: **"Abertura de Caixa"**
3. **Informe o valor inicial do caixa** (ex: R$ 50,00)
4. Clique em **"Abrir Caixa"**
5. ✅ **Caixa aberto!** Agora você pode começar a operar

**O que acontece:**
- O sistema registra a abertura do caixa
- Salva o operador responsável
- Registra o horário de abertura
- Permite registrar entradas/saídas e pagamentos

---

### Opção 2: App Local (localhost)

Se você está rodando o app localmente:

#### Passo 1: Iniciar os Servidores (2 minutos)

**Terminal 1 - Backend:**
```bash
cd /home/gab/appestacionamento/backend
npm start
```

**Terminal 2 - Frontend:**
```bash
cd /home/gab/appestacionamento
npm run dev
```

**Aguarde até ver:**
- Backend: `Backend running on http://localhost:3000`
- Frontend: `Local: http://localhost:8080`

#### Passo 2: Acessar o App (30 segundos)

1. Abra o navegador
2. Acesse: `http://localhost:8080`
3. Faça login

#### Passo 3: Abrir o Caixa (1 minuto)

Siga os mesmos passos da Opção 1 (Passo 2)

---

## 📱 Inicialização em Tablet/Dispositivo Móvel

### Configuração Inicial (Uma vez apenas):

1. **Abra o navegador** no tablet
2. **Acesse a URL do app** (Vercel ou IP local)
3. **Adicione à tela inicial:**
   - **iOS (iPad):** Safari → Compartilhar → Adicionar à Tela Inicial
   - **Android:** Chrome → Menu (⋮) → Adicionar à tela inicial

### Uso Diário:

1. **Toque no ícone do app** na tela inicial
2. **Faça login**
3. **Abra o caixa** (se necessário)
4. **Comece a operar!**

---

## 🔄 Processo Diário Completo

### Manhã (Abertura):

1. ✅ **Acessar o app** (Vercel ou local)
2. ✅ **Fazer login**
3. ✅ **Abrir o caixa** (informar valor inicial)
4. ✅ **Verificar tarifas** (página Tarifas)
5. ✅ **Verificar horário de funcionamento** (se necessário)

### Durante o Dia:

- ✅ **Registrar entradas** de veículos
- ✅ **Registrar saídas** e processar pagamentos
- ✅ **Gerenciar mensalistas** (cadastros, pagamentos)
- ✅ **Consultar relatórios** em tempo real

### Noite (Fechamento):

1. ✅ **Fechar o caixa:**
   - Vá para a página **Operacional** ou **Financeiro**
   - Clique em **"Fechar Caixa"**
   - Informe o **valor final em caixa**
   - Confirme o fechamento

2. ✅ **Gerar relatório do dia** (opcional):
   - Página **Financeiro** → Relatórios
   - Selecione o período (hoje)
   - Visualize ou exporte

3. ✅ **Verificar pendências:**
   - Mensalistas em atraso
   - Tickets pendentes

---

## ⚠️ Importante: Abrir Caixa TODOS OS DIAS

**O caixa DEVE ser aberto todos os dias antes de começar a operar!**

### Por quê?

- ✅ Permite controle financeiro diário
- ✅ Registra o operador responsável
- ✅ Gera relatórios precisos
- ✅ Facilita auditoria e controle

### O que acontece se não abrir?

- ❌ Não poderá registrar pagamentos
- ❌ Relatórios financeiros ficarão incompletos
- ❌ Não haverá controle de caixa

---

## 🚨 Solução de Problemas

### Problema: "Caixa já está aberto"

**Solução:**
- Isso significa que o caixa foi aberto anteriormente e não foi fechado
- **Opção 1:** Fechar o caixa anterior e abrir um novo
- **Opção 2:** Continuar usando o caixa aberto (se for do mesmo dia)

### Problema: "Erro ao abrir caixa"

**Verifique:**
1. ✅ Está logado?
2. ✅ Backend está rodando? (se local)
3. ✅ Conexão com internet estável? (se produção)
4. ✅ Tabela `cash_register_sessions` existe no Supabase?

**Solução:**
- Execute o SQL: `backend/create-cash-register-sessions-table.sql` no Supabase

### Problema: App não carrega

**Se em produção (Vercel):**
- Verifique se o deploy foi concluído
- Limpe o cache do navegador (Ctrl+Shift+R)
- Verifique a URL correta

**Se local:**
- Verifique se backend está rodando: `ps aux | grep "node src/server"`
- Verifique se frontend está rodando: `lsof -i :8080`
- Reinicie os servidores se necessário

---

## 📊 Checklist Rápido Diário

Use este checklist todas as manhãs:

- [ ] Acessei o app
- [ ] Fiz login
- [ ] Abri o caixa (valor inicial informado)
- [ ] Verifiquei tarifas ativas
- [ ] Verifiquei horário de funcionamento
- [ ] Sistema pronto para operar!

---

## 💡 Dicas

1. **Valor inicial do caixa:** Use sempre o mesmo valor (ex: R$ 50,00) ou o valor do fechamento do dia anterior
2. **Operador:** O sistema registra automaticamente quem abriu o caixa
3. **Backup:** Os dados são salvos automaticamente no Supabase
4. **Relatórios:** Gere relatórios diários para controle financeiro

---

## 📞 Precisa de Ajuda?

Se encontrar algum problema:

1. Verifique os logs do backend (Render dashboard ou terminal local)
2. Verifique o console do navegador (F12 → Console)
3. Consulte a documentação em `OPERATIONS_CHECKLIST.md`
4. Verifique se todas as tabelas do banco foram criadas

---

**✅ Seu app está pronto para uso diário!**

Basta seguir a rotina de abertura de caixa todas as manhãs e você estará operando normalmente! 🚀

