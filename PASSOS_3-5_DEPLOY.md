# ✅ Passos 3-5 do Deploy - GUIA PRÁTICO

## ✅ Passo 3: Diretórios Criados ✓

Os diretórios já foram criados:

```
backend/backups/manual/
backend/backups/automatic/
```

Verificar com:

```bash
ls -la backend/backups/
```

---

## 🔧 Passo 4: Configurar Permissões

### Opção A: Via SQL (Recomendado - Mais Rápido)

Execute o arquivo no **Supabase SQL Editor**:

```sql
-- Arquivo: backend/add-manageBackups-permission.sql

UPDATE users
SET permissions = jsonb_set(
  COALESCE(permissions, '{}'::jsonb),
  '{manageBackups}',
  'true'::jsonb
)
WHERE role = 'admin';

-- Verificar
SELECT id, name, email, role, permissions
FROM users
WHERE role = 'admin';
```

✅ **Confirme** que todos os admins agora têm `"manageBackups": true` nas permissões.

### Opção B: Via Interface (Manual)

1. Inicie o servidor backend:

   ```bash
   cd backend
   npm start
   ```

2. Inicie o frontend:

   ```bash
   npm run dev
   ```

3. Acesse a aplicação e faça login como admin

4. Vá para página **"Usuários"**

5. Para cada usuário admin:
   - Clique em "Editar"
   - Role até a seção de permissões
   - Marque ✅ **"Gerenciar backups"**
   - Clique em "Salvar Alterações"

---

## 🧪 Passo 5: Testar o Sistema

### 5.1 Iniciar os Servidores

**Terminal 1 - Backend:**

```bash
cd backend
npm start
```

Aguarde ver: `✓ Scheduled backup service initialized`

**Terminal 2 - Frontend:**

```bash
npm run dev
```

### 5.2 Teste de Backup Manual

1. **Login** como admin
2. Vá para **"Configurações"**
3. Você verá 3 abas. Clique na terceira: **"Backups Automáticos"**
4. Na seção superior, clique em **"Criar Backup Manual"**
5. ✅ Verifique que aparece mensagem de sucesso
6. ✅ Verifique que o backup aparece na lista

**Verificar arquivo criado:**

```bash
ls -lh backend/backups/manual/
```

### 5.3 Teste de Download

1. Na lista de backups, clique no ícone de **download** (↓)
2. ✅ Arquivo JSON deve ser baixado para seu PC
3. Abra o arquivo e verifique a estrutura:
   ```json
   {
     "metadata": {
       "version": "1.0",
       "timestamp": "...",
       "type": "manual",
       "tables": [...]
     },
     "data": {
       "rates": [...],
       "users": [...],
       ...
     }
   }
   ```

### 5.4 Teste de Preview de Restauração

1. Clique no botão **"Restaurar"** de um backup
2. ✅ Deve abrir um dialog com:
   - Informações do backup (data, tipo, total de registros)
   - Lista de tabelas com contagem de registros
   - Checkboxes para selecionar tabelas
   - Banner de aviso vermelho
   - Campo de confirmação
   - Checkbox de reconhecimento

3. **NÃO confirme a restauração ainda!** (apenas teste o preview)
4. Clique em "Cancelar"

### 5.5 Teste de Backups Automáticos

1. Na aba **"Backups Automáticos"**, configure:
   - ✅ Habilitar: **ON**
   - Schedule: `*/2 * * * *` (a cada 2 minutos - para teste)
   - Retenção: `7 dias`

2. Clique em **"Salvar Configuração"**

3. ✅ Aguarde 2 minutos e verifique:

   ```bash
   ls -lh backend/backups/automatic/
   ```

   Deve aparecer um novo arquivo!

4. ✅ Verifique os logs do backend:

   ```
   [Scheduled Backup] Starting automatic backup...
   [Scheduled Backup] Success! File: backup-TIMESTAMP.json
   ```

5. **Após confirmar que funciona**, volte e configure o schedule real:
   - Schedule: `0 2 * * *` (todo dia às 2h)
   - Salvar

### 5.6 Teste de Permissões (Opcional)

Se você tiver outro usuário **não-admin**:

1. Faça logout
2. Login com usuário operador
3. Tente acessar "Configurações" → "Backups Automáticos"
4. Tente clicar em "Criar Backup Manual"
5. ✅ Deve receber erro: **"Você não tem permissão para criar backups"**

### 5.7 Teste de Auditoria

1. Login como admin
2. Vá para página **"Usuários"**
3. Clique no ícone de **log** (📋) de qualquer usuário admin
4. ✅ Verifique que aparecem eventos como:
   - `backup_created` - quando criou backup
   - `backup_config_updated` - quando alterou configuração
   - `backup_downloaded` - quando baixou backup

---

## 📊 Checklist Final

- [x] Passo 1: Dependências instaladas (`node-cron`)
- [x] Passo 2: Migração SQL executada (`add-backup-config-columns.sql`)
- [x] Passo 3: Diretórios criados
- [ ] Passo 4: Permissões configuradas (executar SQL acima)
- [ ] Passo 5: Testes executados

### Testes do Passo 5:

- [ ] 5.1 - Servidores iniciando sem erros
- [ ] 5.2 - Criar backup manual funciona
- [ ] 5.3 - Download de backup funciona
- [ ] 5.4 - Preview de restauração funciona
- [ ] 5.5 - Backup automático cria arquivo
- [ ] 5.6 - Permissões bloqueiam não-admins (opcional)
- [ ] 5.7 - Auditoria registra eventos

---

## 🎯 Teste Completo de Restauração (Fazer em Ambiente de Teste!)

⚠️ **ATENÇÃO:** Só faça isso se tiver certeza!

1. **Criar backup atual:**
   - Criar backup manual
   - Baixar para segurança

2. **Fazer pequena alteração:**
   - Criar uma tarifa de teste
   - Ou adicionar um mensalista de teste

3. **Restaurar backup anterior:**
   - Clicar em "Restaurar"
   - Revisar preview
   - Selecionar todas as tabelas (ou só `rates` para teste menor)
   - Digitar `RESTAURAR`
   - Marcar checkbox
   - Confirmar

4. **Verificar:**
   - Alteração foi desfeita?
   - Sistema continua funcionando?
   - Log de auditoria registrou `backup_restored`?

---

## 🚨 Troubleshooting

### "Scheduled backup service initialized" não aparece

```bash
# Verificar se a migração foi executada
# No Supabase SQL Editor:
SELECT backup_enabled, backup_schedule, backup_retention_days
FROM company_config
WHERE id = 'default';
```

### Erro "Permission denied" ao criar backup

```bash
# Verificar permissões do diretório
chmod -R 755 backend/backups
```

### Backup automático não está rodando

```bash
# Verificar configuração no banco
SELECT backup_enabled FROM company_config;
# Deve retornar: true

# Verificar schedule
SELECT backup_schedule FROM company_config;
# Deve retornar algo como: "0 2 * * *"
```

---

## ✅ Próximo Passo Após Testes

Quando tudo estiver funcionando perfeitamente:

1. Configurar backup externo (S3, Google Drive) para redundância
2. Documentar procedimento de recuperação de desastres
3. Treinar equipe sobre uso do sistema de backup
4. Estabelecer rotina de teste mensal de restauração

---

**Criado:** 10/11/2025  
**Status:** Pronto para execução  
**Tempo estimado:** 15-20 minutos
