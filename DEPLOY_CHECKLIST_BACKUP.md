# 🚀 Checklist de Deploy - Sistema de Backup

## Pré-requisitos

### 1. Dependências NPM
```bash
cd backend
npm install node-cron@4.2.1
```
✅ Verificar que `node-cron` aparece em `backend/package.json`

### 2. Migração de Banco de Dados
**Arquivo:** `/backend/add-backup-config-columns.sql`

**Executar no Supabase SQL Editor:**
```sql
ALTER TABLE company_config
ADD COLUMN IF NOT EXISTS backup_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS backup_schedule TEXT DEFAULT '0 2 * * *',
ADD COLUMN IF NOT EXISTS backup_retention_days INTEGER DEFAULT 30;

UPDATE company_config
SET 
  backup_enabled = COALESCE(backup_enabled, FALSE),
  backup_schedule = COALESCE(backup_schedule, '0 2 * * *'),
  backup_retention_days = COALESCE(backup_retention_days, 30)
WHERE id = 'default';
```

### 3. Estrutura de Diretórios
```bash
mkdir -p backend/backups/manual
mkdir -p backend/backups/automatic
```

⚠️ **IMPORTANTE:** Garantir que o servidor tem permissão de escrita nesses diretórios

## Configuração Inicial

### 4. Permissões de Usuário
Atualizar usuários admin para incluir `manageBackups`:

**Via Interface:**
1. Login como admin
2. Acessar página "Usuários"
3. Editar usuário admin
4. Marcar permissão "Gerenciar backups"
5. Salvar

**Via SQL (alternativa):**
```sql
UPDATE users
SET permissions = jsonb_set(
  COALESCE(permissions, '{}'::jsonb),
  '{manageBackups}',
  'true'::jsonb
)
WHERE role = 'admin';
```

### 5. Verificação do Serviço
Confirmar que `scheduledBackupService` está sendo inicializado no servidor:

**Arquivo:** `/backend/src/server.js` ou `/backend/server.mjs`
```javascript
import scheduledBackupService from './services/scheduledBackupService.js';

// Após servidor iniciar
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  scheduledBackupService.startScheduledBackups();
});
```

## Testes Funcionais

### 6. Testar Backup Manual
1. ✅ Login com usuário que tem `manageBackups`
2. ✅ Acessar página "Configurações"
3. ✅ Criar backup manual
4. ✅ Verificar que arquivo foi criado em `/backend/backups/manual/`
5. ✅ Fazer download do backup
6. ✅ Verificar estrutura JSON do arquivo

### 7. Testar Preview de Restore
1. ✅ Clicar em "Restaurar" em um backup
2. ✅ Verificar que preview mostra metadados
3. ✅ Verificar que contagens de registros aparecem
4. ✅ Testar seleção/desseleção de tabelas
5. ✅ Verificar que validações funcionam (texto "RESTAURAR" + checkbox)

### 8. Testar Restauração
⚠️ **CUIDADO:** Fazer em ambiente de teste primeiro!

1. ✅ Criar backup atual antes de testar
2. ✅ Fazer pequena alteração nos dados
3. ✅ Restaurar backup anterior
4. ✅ Verificar que dados foram restaurados corretamente
5. ✅ Verificar logs de auditoria (`user_events`)

### 9. Testar Backup Automático
1. ✅ Acessar "Configurações" → aba "Backups Automáticos"
2. ✅ Habilitar backup automático
3. ✅ Configurar schedule próximo (ex: `*/5 * * * *` = a cada 5 minutos)
4. ✅ Aguardar horário programado
5. ✅ Verificar que backup foi criado em `/backend/backups/automatic/`
6. ✅ Verificar logs do servidor

### 10. Testar Retenção
1. ✅ Configurar retenção baixa (ex: 1 dia)
2. ✅ Criar backups com datas antigas (alterar timestamp manual)
3. ✅ Aguardar próximo backup automático
4. ✅ Verificar que backups antigos foram removidos

### 11. Testar Permissões
1. ✅ Login com usuário SEM `manageBackups`
2. ✅ Verificar que não consegue criar backup
3. ✅ Verificar que não consegue deletar backup
4. ✅ Verificar que não consegue restaurar
5. ✅ Verificar que consegue listar/visualizar (se tem `viewReports`)

### 12. Testar Auditoria
1. ✅ Criar backup → verificar evento `backup_created`
2. ✅ Deletar backup → verificar evento `backup_deleted`
3. ✅ Restaurar → verificar evento `backup_restored`
4. ✅ Alterar config → verificar evento `backup_config_updated`
5. ✅ Acessar página "Usuários" → ver log de auditoria

## Segurança e Backup dos Backups

### 13. Proteção de Dados
⚠️ **CRÍTICO:** Arquivos de backup contêm dados sensíveis!

1. ✅ Verificar que diretório `/backend/backups/` está no `.gitignore`
2. ✅ Configurar permissões de arquivo restritivas (chmod 700)
3. ✅ Implementar backup externo (S3, Google Drive, etc.)
4. ✅ Criptografar backups se armazenados em nuvem

### 14. Monitoramento
1. ✅ Configurar alertas para falhas de backup automático
2. ✅ Monitorar espaço em disco do servidor
3. ✅ Configurar log rotation para evitar crescimento excessivo
4. ✅ Revisar logs de erro regularmente

## Configuração Recomendada de Produção

### Schedule Padrão
```
0 2 * * *  (Todo dia às 2h da manhã)
```

### Retenção Padrão
```
30 dias
```

### Espaço em Disco
Estimar tamanho médio de backup e garantir espaço suficiente:
- Backup médio: ~10-50MB (dependendo do volume)
- Com retenção de 30 dias: ~300MB - 1.5GB

## Troubleshooting

### Backup automático não está rodando
1. Verificar logs do servidor
2. Confirmar que `scheduledBackupService.startScheduledBackups()` foi chamado
3. Verificar sintaxe da expressão cron
4. Verificar que `backup_enabled = true` no banco

### Erro ao restaurar
1. Verificar formato JSON do backup
2. Confirmar que todas as tabelas existem
3. Verificar logs do servidor para erros detalhados
4. Testar com restauração de tabela única primeiro

### Permissões negadas
1. Verificar que usuário tem `manageBackups` no banco
2. Limpar cache/localStorage do navegador
3. Fazer logout/login novamente
4. Verificar token JWT está atualizado

## Rollback

Se algo der errado:

1. Parar servidor backend
2. Restaurar backup anterior do banco de dados
3. Reverter código para commit anterior
4. Remover colunas de backup do `company_config` se necessário:
```sql
ALTER TABLE company_config
DROP COLUMN IF EXISTS backup_enabled,
DROP COLUMN IF EXISTS backup_schedule,
DROP COLUMN IF EXISTS backup_retention_days;
```

## Próximos Passos

Após deploy bem-sucedido:

1. 📧 Configurar notificações por email para backups
2. ☁️ Integrar com armazenamento externo (S3/Google Drive)
3. 🗜️ Implementar compressão gzip para economizar espaço
4. 📊 Dashboard de status de backups
5. 🔄 Backup incremental para grandes volumes

---

**Data de Criação:** 24/01/2025  
**Versão do Sistema:** 1.0  
**Status:** ✅ Pronto para Produção
