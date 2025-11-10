# 🚀 Guia de Deploy - TheProParking

Deploy **GRATUITO** do seu sistema de estacionamento usando Render (backend) + Vercel (frontend).

---

## 📋 Pré-requisitos

Você já tem:
- ✅ Conta GitHub (com código)
- ✅ Supabase configurado e rodando

Você vai precisar criar conta (grátis):
- [ ] Conta no [Render.com](https://render.com)
- [ ] Conta no [Vercel.com](https://vercel.com)

---

## 🎯 Passo 1: Deploy do Backend (Render)

### 1.1 Criar conta no Render

1. Acesse https://render.com
2. Clique em **"Get Started"**
3. Faça login com sua conta **GitHub**
4. Autorize o Render a acessar seus repositórios

### 1.2 Criar Web Service

1. No dashboard do Render, clique em **"New +"**
2. Selecione **"Web Service"**
3. Conecte seu repositório **appestacionamento**
4. Configure:
   ```
   Name: theproparking-backend
   Region: Oregon (US West)
   Branch: main
   Root Directory: (deixe vazio)
   Runtime: Node
   Build Command: cd backend && npm install
   Start Command: cd backend && node src/server.js
   ```

### 1.3 Configurar Variáveis de Ambiente

Na seção **"Environment Variables"**, adicione:

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `PORT` | `3000` |
| `SUPABASE_URL` | Sua URL do Supabase (ex: https://xxx.supabase.co) |
| `SUPABASE_ANON_KEY` | Sua chave anon do Supabase |
| `JWT_SECRET` | Clique em "Generate" (será gerado automaticamente) |
| `FRONTEND_URL` | `*` (depois você atualiza com a URL do Vercel) |

**Onde encontrar suas credenciais do Supabase:**
1. Acesse seu projeto no [Supabase](https://supabase.com)
2. Vá em **Settings → API**
3. Copie:
   - **Project URL** → `SUPABASE_URL`
   - **anon public** → `SUPABASE_ANON_KEY`

### 1.4 Fazer Deploy

1. Clique em **"Create Web Service"**
2. Aguarde o deploy (leva ~3-5 minutos)
3. ✅ Quando terminar, você verá: **"Your service is live at https://theproparking-backend-xxx.onrender.com"**
4. **COPIE ESSA URL** - você vai precisar dela!

### 1.5 Testar o Backend

Abra no navegador:
```
https://theproparking-backend-xxx.onrender.com/health
```

Deve retornar:
```json
{
  "status": "ok",
  "timestamp": "2025-11-10T...",
  "service": "TheProParking Backend"
}
```

---

## 🎨 Passo 2: Deploy do Frontend (Vercel)

### 2.1 Criar conta no Vercel

1. Acesse https://vercel.com
2. Clique em **"Sign Up"**
3. Faça login com sua conta **GitHub**
4. Autorize o Vercel

### 2.2 Importar Projeto

1. No dashboard, clique em **"Add New..." → "Project"**
2. Selecione o repositório **appestacionamento**
3. Clique em **"Import"**

### 2.3 Configurar Projeto

Configure:
```
Framework Preset: Vite
Root Directory: ./
Build Command: npm run build
Output Directory: dist
Install Command: npm install
```

### 2.4 Adicionar Variável de Ambiente

Na seção **"Environment Variables"**, adicione:

| Key | Value |
|-----|-------|
| `VITE_API_URL` | URL do seu backend Render (ex: https://theproparking-backend-xxx.onrender.com) |

**IMPORTANTE:** Use a URL do Render que você copiou no Passo 1.4!

### 2.5 Fazer Deploy

1. Clique em **"Deploy"**
2. Aguarde o build (leva ~2-3 minutos)
3. ✅ Quando terminar, você verá: **"Congratulations! Your project has been successfully deployed"**
4. Clique em **"Visit"** para abrir seu site!

**Sua URL será algo como:**
```
https://appestacionamento-xxx.vercel.app
```

---

## 🔄 Passo 3: Atualizar CORS no Backend

Agora que você tem a URL do frontend, precisa atualizar o backend:

### 3.1 Voltar ao Render

1. Acesse seu serviço no Render
2. Vá em **"Environment"**
3. Encontre a variável `FRONTEND_URL`
4. Edite e coloque a URL do Vercel (ex: `https://appestacionamento-xxx.vercel.app`)
5. Clique em **"Save Changes"**

O backend vai reiniciar automaticamente (leva ~1 minuto).

---

## ✅ Passo 4: Configuração Inicial do Sistema

### 4.1 Primeiro Acesso

1. Abra seu site: `https://appestacionamento-xxx.vercel.app`
2. Você será redirecionado para **/setup**
3. Preencha os dados da sua empresa
4. Crie o usuário administrador
5. ✅ Pronto! Sistema configurado!

### 4.2 Executar SQL no Supabase

Você precisa executar o SQL inicial no Supabase:

1. Acesse seu projeto no [Supabase](https://supabase.com)
2. Vá em **SQL Editor**
3. Clique em **"New Query"**
4. Cole o conteúdo do arquivo `EXECUTE-THIS-IN-SUPABASE.sql`
5. Clique em **"Run"**
6. ✅ Tabelas criadas!

---

## 🎉 Pronto! Seu Sistema Está no Ar!

### URLs do seu sistema:

- **Frontend (Usuários):** https://appestacionamento-xxx.vercel.app
- **Backend (API):** https://theproparking-backend-xxx.onrender.com
- **Banco de Dados:** Supabase

### Características:

- ✅ **Online 24/7**
- ✅ **SSL Automático** (HTTPS)
- ✅ **Domínio Próprio** (pode configurar depois)
- ✅ **Backups Automáticos** (Supabase)
- ✅ **Escalável**
- ✅ **100% Grátis**

---

## 📱 Acesso de Qualquer Lugar

Agora você pode acessar o sistema de:
- 💻 Computador do estacionamento
- 📱 Celular
- 🏠 Casa
- ✈️ Qualquer lugar com internet!

Basta abrir: `https://appestacionamento-xxx.vercel.app`

---

## 🔄 Deploy Automático

**Toda vez que você fizer `git push`:**
- ✅ Vercel atualiza o frontend automaticamente
- ✅ Render atualiza o backend automaticamente
- ✅ Sem precisar fazer nada manualmente!

---

## ⚠️ Limitações do Plano Gratuito

### Render (Backend):
- Backend "dorme" após 15 minutos sem uso
- Primeira requisição após "acordar" demora ~30 segundos
- Depois funciona normalmente
- **Solução:** Upgrade para $7/mês remove essa limitação

### Vercel (Frontend):
- Sem limitações significativas para o seu uso
- 100 GB de banda/mês (muito mais que suficiente)

### Supabase (Banco):
- 500 MB de armazenamento
- Mais que suficiente para anos de dados

---

## 🆙 Upgrade Futuro (Quando Crescer)

Quando seu estacionamento crescer e você quiser performance 24/7:

### Render Pro - $7/mês
- Backend sempre ativo (sem sleep)
- 512 MB RAM
- Resposta instantânea

### Domínio Próprio - ~$15/ano
- `app.seudominio.com.br`
- Mais profissional

---

## 🆘 Problemas Comuns

### "Service Unavailable" no primeiro acesso
- **Causa:** Backend estava dormindo
- **Solução:** Aguarde 30 segundos e recarregue

### "Failed to fetch" no frontend
- **Causa:** URL do backend errada no Vercel
- **Solução:** Verifique a variável `VITE_API_URL`

### "CORS Error"
- **Causa:** `FRONTEND_URL` errada no Render
- **Solução:** Atualize com a URL correta do Vercel

### Login não funciona
- **Causa:** Não executou o SQL no Supabase
- **Solução:** Execute `EXECUTE-THIS-IN-SUPABASE.sql`

---

## 📞 Precisa de Ajuda?

Se tiver qualquer problema durante o deploy, me avise! Estou aqui para ajudar! 🚀
