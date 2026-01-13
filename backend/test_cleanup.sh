#!/bin/bash

# Script de Teste: Diagnóstico de Limpeza Operacional
# Execute: bash test_cleanup.sh

echo "🧪 ===== TESTE DE LIMPEZA OPERACIONAL ====="
echo ""

# Configuração
API_URL="http://localhost:3000/api"
TOKEN=""

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Verificar se o backend está rodando
echo "🔍 Verificando se o backend está rodando..."
if ! curl -s -f "$API_URL/health" > /dev/null; then
    echo -e "${RED}❌ Backend não está rodando!${NC}"
    echo "Execute: cd backend && npm run dev"
    exit 1
fi
echo -e "${GREEN}✅ Backend está rodando${NC}"
echo ""

# Solicitar credenciais se token não estiver definido
if [ -z "$TOKEN" ]; then
    echo "🔑 Fazendo login..."
    read -p "Login: " LOGIN
    read -sp "Senha: " PASSWORD
    echo ""
    
    # Fazer login
    LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
        -H "Content-Type: application/json" \
        -d "{\"login\":\"$LOGIN\",\"password\":\"$PASSWORD\"}")
    
    TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)
    
    if [ -z "$TOKEN" ]; then
        echo -e "${RED}❌ Falha no login!${NC}"
        echo "Resposta: $LOGIN_RESPONSE"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Login realizado com sucesso${NC}"
    echo ""
fi

# PASSO 1: Obter IDs de exemplo
echo "📋 PASSO 1: Obtendo IDs de exemplo..."
SAMPLE_RESPONSE=$(curl -s -X GET "$API_URL/test/cleanup/sample-ids" \
    -H "Authorization: Bearer $TOKEN")

echo "$SAMPLE_RESPONSE" | jq '.' 2>/dev/null || echo "$SAMPLE_RESPONSE"
echo ""

# Extrair IDs (se jq estiver disponível)
if command -v jq &> /dev/null; then
    TICKET_IDS=$(echo "$SAMPLE_RESPONSE" | jq -r '.ticketIds | @json')
    PAYMENT_IDS=$(echo "$SAMPLE_RESPONSE" | jq -r '.paymentIds | @json')
    
    echo -e "${YELLOW}IDs encontrados:${NC}"
    echo "Tickets: $TICKET_IDS"
    echo "Payments: $PAYMENT_IDS"
    echo ""
    
    # PASSO 2: Teste em DRY RUN
    echo "🧪 PASSO 2: Executando teste em modo DRY RUN (seguro)..."
    echo ""
    
    TEST_RESPONSE=$(curl -s -X POST "$API_URL/test/cleanup" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d "{\"ticketIds\":$TICKET_IDS,\"paymentIds\":$PAYMENT_IDS,\"dryRun\":true}")
    
    echo "$TEST_RESPONSE" | jq '.' 2>/dev/null || echo "$TEST_RESPONSE"
    echo ""
    
    # Analisar resultado
    HAS_RLS_ISSUE=$(echo "$TEST_RESPONSE" | jq -r '.results.rlsDiagnosis.ticketsBlocked // false')
    
    if [ "$HAS_RLS_ISSUE" = "true" ]; then
        echo -e "${RED}⚠️  PROBLEMA DE RLS DETECTADO!${NC}"
        echo ""
        echo "Execute o script SQL para corrigir:"
        echo "  1. Acesse Supabase Dashboard"
        echo "  2. Vá em SQL Editor"
        echo "  3. Execute: backend/DIAGNOSE_RLS_POLICIES.sql"
    else
        echo -e "${GREEN}✅ Nenhum problema de RLS detectado${NC}"
        echo ""
        echo "Deseja executar teste REAL (vai deletar registros)? [s/N]"
        read -r CONFIRM
        
        if [ "$CONFIRM" = "s" ] || [ "$CONFIRM" = "S" ]; then
            echo "🔥 Executando teste REAL..."
            REAL_RESPONSE=$(curl -s -X POST "$API_URL/test/cleanup" \
                -H "Authorization: Bearer $TOKEN" \
                -H "Content-Type: application/json" \
                -d "{\"ticketIds\":$TICKET_IDS,\"paymentIds\":$PAYMENT_IDS,\"dryRun\":false}")
            
            echo "$REAL_RESPONSE" | jq '.' 2>/dev/null || echo "$REAL_RESPONSE"
        else
            echo "Teste real cancelado."
        fi
    fi
else
    echo -e "${YELLOW}⚠️  jq não está instalado - mostrando resposta bruta${NC}"
    echo ""
    echo "Para melhor visualização, instale jq:"
    echo "  sudo apt install jq"
    echo ""
    echo "Ou copie os IDs manualmente e execute:"
    echo "curl -X POST $API_URL/test/cleanup \\"
    echo "  -H 'Authorization: Bearer $TOKEN' \\"
    echo "  -H 'Content-Type: application/json' \\"
    echo "  -d '{\"ticketIds\":[\"ID1\",\"ID2\"],\"paymentIds\":[\"ID3\"],\"dryRun\":true}'"
fi

echo ""
echo "🧪 ===== TESTE CONCLUÍDO ====="
