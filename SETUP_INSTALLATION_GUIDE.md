# 🎯 Instruções de Instalação do Setup de Primeira Execução

## Passo 1: Executar SQL no Supabase

1. Acesse o Supabase Dashboard: https://app.supabase.com/project/nnpvazzeomwklugawceg
2. Vá em **SQL Editor**
3. Copie e execute o conteúdo do arquivo: `backend/sql/create-company-settings-table.sql`

Este SQL irá:

- Criar a tabela `company_settings`
- Adicionar políticas RLS (Row Level Security)
- Inserir registro inicial vazio (setup_completed = false)

## Passo 2: Sincronizar código com GitHub

```bash
cd ~/appestacionamento

# Adicionar todos os arquivos novos
git add .

# Commit
git commit -m "Adiciona wizard de primeira execução com setup profissional"

# Push para GitHub
git push origin main
```

## Passo 3: Atualizar o projeto no Ubuntu

No seu computador Ubuntu:

```bash
cd ~/appestacionamento

# Baixar atualizações
git pull origin main

# Reinstalar dependências (caso tenha mudado)
npm install
cd backend
npm install
cd ..
```

## Passo 4: Reiniciar Backend

```bash
cd ~/appestacionamento/backend
npm start
```

Você deve ver:

```
✅ Connecting to Supabase: https://nnpvazzeomwklugawceg.supabase.co
Backend running on http://localhost:3000
```

## Passo 5: Reiniciar Frontend

Em outro terminal:

```bash
cd ~/appestacionamento
npm run dev
```

## Passo 6: Testar Setup Wizard

1. Abra o navegador: `http://localhost:8080`
2. Você será **automaticamente redirecionado** para `/setup`
3. Complete o wizard:
   - **Passo 1**: Tela de boas-vindas
   - **Passo 2**: Informações da empresa
   - **Passo 3**: Criar usuário administrador
   - **Passo 4**: Configurar tarifas iniciais
   - **Passo 5**: Sucesso! Redirecionamento automático para login

4. Faça login com as credenciais criadas no wizard
5. Sistema estará **limpo**, sem dados de teste!

## O que acontece durante o Setup?

O wizard automaticamente:

- ✅ **Limpa todos os dados de teste** do banco de dados
- ✅ **Deleta o usuário admin antigo** (admin/admin123)
- ✅ **Cria novo usuário admin** com suas credenciais
- ✅ **Salva informações da empresa**
- ✅ **Cria tarifas iniciais** configuradas
- ✅ **Cria tipos de veículos padrão** (Carro, Moto, Caminhão, Van)
- ✅ **Marca setup como concluído** (não aparece mais)

## Arquivos Criados/Modificados

### Backend:

- `backend/sql/create-company-settings-table.sql` - Tabela de configurações
- `backend/sql/cleanup-test-data.sql` - Script de limpeza
- `backend/src/controllers/setupController.js` - Controller de setup
- `backend/src/routes/index.js` - Rotas de setup adicionadas

### Frontend:

- `src/pages/SetupWizard.tsx` - Componente do wizard
- `src/App.tsx` - Guard de setup e rota `/setup`

## Testando Múltiplas Vezes

Para testar o wizard novamente:

1. Acesse Supabase SQL Editor
2. Execute:

```sql
UPDATE company_settings SET setup_completed = false;
```

3. Recarregue a página - wizard aparecerá novamente

## Próximos Passos

Após configurar com sucesso:

1. ✅ Sistema pronto para uso em produção
2. ✅ Todos os dados de teste removidos
3. ✅ Experiência profissional de primeira execução
4. 🎉 Seu TheProParkingApp está oficialmente **estreando**!

---

**Nota**: Depois de completar o setup pela primeira vez, o wizard não aparecerá mais. O sistema redirecionará direto para o login.
