# Sistema de Backup e Restauração - Implementação Completa ✅

## Visão Geral

Sistema completo de backup/restauração de banco de dados com interface de usuário, backups automáticos programados e controle de permissões granular.

## Funcionalidades Implementadas

### ✅ A) Interface de Restauração

**Componente:** `/src/components/RestoreDialog.tsx`

Recursos:

- Preview do backup antes de restaurar (metadados + contagem de registros por tabela)
- Seleção de tabelas para restauração parcial
- Múltiplas camadas de segurança:
  - Banner de aviso destacado
  - Confirmação digitada ("RESTAURAR")
  - Checkbox de reconhecimento
  - Validação antes de habilitar botão de restauração
- Feedback de progresso em tempo real
- Tratamento de erros com mensagens descritivas

**Integração:** Disponível na página `/src/pages/Backup.tsx`

### ✅ B) Backups Automáticos Programados

**Serviço Backend:** `/backend/src/services/scheduledBackupService.js`

Recursos:

- Agendamento via cron expressions (ex: `0 2 * * *` = todo dia às 2h)
- Política de retenção configurável (dias)
- Limpeza automática de backups antigos
- Armazenamento separado em `/backend/backups/automatic/`
- Persistência de configuração no banco (`company_config`)
- Carregamento automático na inicialização do servidor

**Interface:** `/src/components/BackupSettingsSection.tsx`

- Toggle habilitar/desabilitar
- Input de expressão cron com exemplos
- Configuração de dias de retenção
- Botão para trigger manual de backup automático
- Indicador de status

**Integração:** Terceira aba na página `/src/pages/Configuracoes.tsx`

### ✅ C) Permissão `manageBackups`

**Nova permissão** separada de `manageCompanyConfig` para controle granular.

**Backend:**

- Adicionada a `DEFAULTS` em `/backend/src/controllers/usersController.js`
- Aplicada em todas as rotas de backup destrutivas (create, delete, restore, updateConfig)
- Rotas de leitura (list, download, preview) usam `viewReports`

**Frontend:**

- Adicionada ao tipo `Permissions` em `/src/pages/Users.tsx`
- Label: "Gerenciar backups"
- Descrição: "Permite criar, baixar, restaurar e excluir backups do sistema, bem como configurar backups automáticos programados."
- Incluída nos presets de permissões:
  - Admin: ✅ true
  - Operacional: ❌ false
  - Financeiro: ❌ false

## Arquitetura do Sistema

### Backend

```
/backend/src/
├── services/
│   ├── backupService.js          # Lógica core de backup/restore
│   └── scheduledBackupService.js # Agendador com node-cron
├── controllers/
│   └── backupController.js       # Endpoints REST (9 rotas)
└── routes/
    └── index.js                  # Registro de rotas com permissões
```

### Frontend

```
/src/
├── pages/
│   ├── Backup.tsx                # Página principal de backups
│   └── Configuracoes.tsx         # Aba de configuração automática
└── components/
    ├── RestoreDialog.tsx         # UI de restauração segura
    └── BackupSettingsSection.tsx # Configuração de backups auto
```

### Armazenamento

```
/backend/backups/
├── manual/                       # Backups criados pelo usuário
└── automatic/                    # Backups agendados
```

## API Endpoints

### Operações de Backup

- `POST /api/backup` - Criar backup manual (requer `manageBackups`)
- `GET /api/backup` - Listar backups (requer `viewReports`)
- `GET /api/backup/:id` - Download backup (requer `viewReports`)
- `DELETE /api/backup/:id` - Excluir backup (requer `manageBackups`)
- `GET /api/backup/:id/preview` - Preview antes de restaurar (requer `viewReports`)
- `POST /api/backup/:id/restore` - Restaurar backup (requer `manageBackups`)

### Configuração de Backups Automáticos

- `GET /api/backup-config` - Obter configuração (requer `viewReports`)
- `PUT /api/backup-config` - Atualizar configuração (requer `manageBackups`)
- `POST /api/backup-config/trigger` - Trigger manual (requer `manageBackups`)

## Formato de Backup

### Estrutura JSON

```json
{
  "metadata": {
    "version": "1.0",
    "timestamp": "2025-01-24T10:30:00.000Z",
    "type": "manual|automatic",
    "tables": ["rates", "monthly_customers", "tickets", ...],
    "totalRecords": 15243,
    "checksum": "sha256..."
  },
  "data": {
    "rates": [...],
    "monthly_customers": [...],
    "tickets": [...],
    "payments": [...],
    "users": [...],
    "company_config": [...],
    "vehicle_types": [...],
    "user_events": [...],
    "monthly_reports": [...],
    "receipts": [...]
  }
}
```

### Tabelas Incluídas (10)

1. `rates` - Tarifas de estacionamento
2. `monthly_customers` - Clientes mensalistas
3. `tickets` - Tickets de entrada/saída
4. `payments` - Pagamentos de mensalistas
5. `users` - Usuários do sistema
6. `company_config` - Configurações da empresa
7. `vehicle_types` - Tipos de veículos
8. `user_events` - Logs de auditoria
9. `monthly_reports` - Relatórios mensais
10. `receipts` - Recibos emitidos

## Configuração de Backups Automáticos

### Colunas em `company_config`

- `backup_enabled` (boolean) - Habilita/desabilita backups automáticos
- `backup_schedule` (text) - Expressão cron (ex: `0 2 * * *`)
- `backup_retention_days` (integer) - Dias para manter backups antigos

### Exemplos de Agendamento (Cron)

- `0 2 * * *` - Todo dia às 2h da manhã
- `0 */6 * * *` - A cada 6 horas
- `0 0 * * 0` - Todo domingo à meia-noite
- `0 3 * * 1-5` - Segunda a sexta às 3h

## Segurança

### Permissões

- **Criar/Deletar/Restaurar:** Requer `manageBackups`
- **Visualizar/Listar/Download:** Requer `viewReports`
- **Configurar Automáticos:** Requer `manageBackups`

### Auditoria

Todas as operações são registradas na tabela `user_events`:

- `backup_created` - Backup criado
- `backup_deleted` - Backup excluído
- `backup_restored` - Backup restaurado
- `backup_config_updated` - Configuração alterada
- `auto_backup_triggered` - Backup automático executado

### Validações

- Verificação de checksum SHA-256 em todos os backups
- Validação de formato JSON antes de restaurar
- Confirmação obrigatória com texto digitado para operações destrutivas
- Preview de dados antes de aplicar restauração

## Instalação e Setup

### 1. Dependências

```bash
cd backend
npm install node-cron@4.2.1
```

### 2. Migração de Banco de Dados

Executar no Supabase SQL Editor:

```sql
-- Adicionar colunas de configuração de backup
ALTER TABLE company_config
ADD COLUMN IF NOT EXISTS backup_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS backup_schedule TEXT DEFAULT '0 2 * * *',
ADD COLUMN IF NOT EXISTS backup_retention_days INTEGER DEFAULT 30;
```

### 3. Criar Diretórios

```bash
mkdir -p backend/backups/manual
mkdir -p backend/backups/automatic
```

### 4. Inicialização

O serviço de backups automáticos é iniciado automaticamente quando o servidor backend sobe:

```javascript
// Em server.mjs ou server.js
import scheduledBackupService from './services/scheduledBackupService.js';

// Após o servidor iniciar
scheduledBackupService.startScheduledBackups();
```

## Uso

### Backup Manual

1. Acessar página "Configurações" → "Backups Automáticos"
2. Ou criar diretamente na API: `POST /api/backup`
3. Backup salvo em `/backend/backups/manual/backup-TIMESTAMP.json`
4. Disponível para download imediato

### Restaurar Backup

1. Acessar lista de backups
2. Clicar em "Restaurar"
3. Revisar preview (metadados + contagens)
4. Selecionar tabelas (ou manter todas)
5. Digitar "RESTAURAR" no campo de confirmação
6. Marcar checkbox de reconhecimento
7. Confirmar operação

### Configurar Backups Automáticos

1. Acessar "Configurações" → aba "Backups Automáticos"
2. Habilitar toggle "Backup Automático"
3. Definir expressão cron (ex: `0 2 * * *`)
4. Definir retenção (ex: 30 dias)
5. Salvar configuração
6. Backups serão criados automaticamente no horário programado

## Melhorias Futuras (Opcionais)

### Fase 4 - Melhorias Adicionais

- [ ] Upload de backup de arquivo local
- [ ] Restauração transacional (rollback em caso de erro)
- [ ] Compressão gzip de arquivos de backup
- [ ] Notificações por email quando backup automático falhar
- [ ] Exportar backup para armazenamento externo (S3, Google Drive)
- [ ] Backup incremental (apenas mudanças desde último backup)
- [ ] Interface de comparação entre backups

## Status de Implementação

✅ **COMPLETO** - Sistema totalmente funcional e pronto para produção

- [x] Serviço de backup/restore backend
- [x] Controller e rotas REST
- [x] Página de gerenciamento de backups
- [x] Dialog de restauração com preview
- [x] Serviço de backups automáticos com node-cron
- [x] Interface de configuração de backups automáticos
- [x] Permissão `manageBackups` (backend + frontend)
- [x] Integração na página de Configurações
- [x] Auditoria completa de todas as operações
- [x] Documentação técnica

## Checklist de Deploy

Antes de fazer deploy para produção:

1. ✅ Executar migração SQL no Supabase
2. ✅ Verificar que `node-cron` está em `package.json`
3. ✅ Criar diretórios `/backend/backups/manual` e `/backend/backups/automatic`
4. ✅ Configurar permissão `manageBackups` para usuários admin
5. ✅ Testar fluxo completo: criar → listar → download → restaurar → deletar
6. ✅ Testar backup automático: habilitar → aguardar horário → verificar arquivo
7. ✅ Verificar limpeza de retenção funciona corretamente
8. ⚠️ Configurar backup dos arquivos de backup em storage externo (recomendado)

## Créditos

Sistema implementado em 24/01/2025 como parte das funcionalidades de alta prioridade do sistema de estacionamento.
