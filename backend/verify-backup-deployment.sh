#!/bin/bash
# Script de verificação do deploy de backup
# Execute: bash backend/verify-backup-deployment.sh

echo "🔍 Verificando Deploy do Sistema de Backup"
echo "=========================================="
echo ""

# Cores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Contador de testes
PASS=0
FAIL=0

# Função de teste
test_step() {
    local description=$1
    local command=$2
    
    echo -n "Testando: $description... "
    if eval "$command" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ PASS${NC}"
        ((PASS++))
    else
        echo -e "${RED}✗ FAIL${NC}"
        ((FAIL++))
    fi
}

echo "📁 Passo 3: Verificando Diretórios"
echo "-----------------------------------"
test_step "Diretório manual existe" "[ -d 'backend/backups/manual' ]"
test_step "Diretório automatic existe" "[ -d 'backend/backups/automatic' ]"
test_step "Diretório manual tem permissão de escrita" "[ -w 'backend/backups/manual' ]"
test_step "Diretório automatic tem permissão de escrita" "[ -w 'backend/backups/automatic' ]"
echo ""

echo "📦 Dependências Node.js"
echo "----------------------"
test_step "node-cron instalado" "grep -q 'node-cron' backend/package.json"
test_step "node_modules existe" "[ -d 'backend/node_modules' ]"
echo ""

echo "🗄️  Arquivos de Configuração"
echo "---------------------------"
test_step "Migration SQL existe" "[ -f 'backend/add-backup-config-columns.sql' ]"
test_step "Permission SQL existe" "[ -f 'backend/add-manageBackups-permission.sql' ]"
test_step "BackupService existe" "[ -f 'backend/src/services/backupService.js' ]"
test_step "ScheduledBackupService existe" "[ -f 'backend/src/services/scheduledBackupService.js' ]"
test_step "BackupController existe" "[ -f 'backend/src/controllers/backupController.js' ]"
echo ""

echo "🎨 Frontend Components"
echo "---------------------"
test_step "Backup.tsx existe" "[ -f 'src/pages/Backup.tsx' ]"
test_step "RestoreDialog.tsx existe" "[ -f 'src/components/RestoreDialog.tsx' ]"
test_step "BackupSettingsSection.tsx existe" "[ -f 'src/components/BackupSettingsSection.tsx' ]"
echo ""

echo "🔧 Integração no Server"
echo "----------------------"
if grep -q "scheduledBackupService" "backend/src/server.js" 2>/dev/null; then
    echo -e "${GREEN}✓ PASS${NC} scheduledBackupService importado no server.js"
    ((PASS++))
elif grep -q "scheduledBackupService" "backend/server.mjs" 2>/dev/null; then
    echo -e "${GREEN}✓ PASS${NC} scheduledBackupService importado no server.mjs"
    ((PASS++))
else
    echo -e "${RED}✗ FAIL${NC} scheduledBackupService não encontrado em server"
    ((FAIL++))
fi
echo ""

echo "📊 Resumo dos Testes"
echo "==================="
echo -e "Testes passados: ${GREEN}$PASS${NC}"
echo -e "Testes falhados: ${RED}$FAIL${NC}"
echo ""

if [ $FAIL -eq 0 ]; then
    echo -e "${GREEN}✅ Todos os testes passaram!${NC}"
    echo ""
    echo "Próximos passos:"
    echo "1. Execute o SQL no Supabase: backend/add-manageBackups-permission.sql"
    echo "2. Inicie o backend: cd backend && npm start"
    echo "3. Inicie o frontend: npm run dev"
    echo "4. Faça login e teste criar um backup manual"
    echo ""
    echo "📖 Consulte PASSOS_3-5_DEPLOY.md para instruções detalhadas"
else
    echo -e "${RED}⚠️  Alguns testes falharam. Verifique os erros acima.${NC}"
    exit 1
fi
