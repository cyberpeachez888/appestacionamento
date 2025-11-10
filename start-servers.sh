#!/bin/bash
# Script para iniciar backend e frontend
# Execute: bash start-servers.sh

echo "🚀 Iniciando Servidores do Sistema de Estacionamento"
echo "====================================================="
echo ""

# Cores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Limpar processos antigos
echo -e "${YELLOW}🧹 Limpando processos antigos...${NC}"
pkill -f "node.*backend" 2>/dev/null
pkill -f "vite" 2>/dev/null
rm -f frontend.pid 2>/dev/null
sleep 2

# Verificar portas
echo -e "${BLUE}🔍 Verificando portas...${NC}"
BACKEND_PORT=5000
FRONTEND_PORT=8080

if lsof -Pi :$BACKEND_PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Porta $BACKEND_PORT ainda em uso. Aguarde...${NC}"
    sleep 2
fi

if lsof -Pi :$FRONTEND_PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Porta $FRONTEND_PORT ainda em uso. Aguarde...${NC}"
    sleep 2
fi

echo ""
echo -e "${GREEN}✅ Portas liberadas!${NC}"
echo ""

# Iniciar Backend
echo -e "${BLUE}🔧 Iniciando Backend (porta $BACKEND_PORT)...${NC}"
cd backend
npm start > ../backend.log 2>&1 &
BACKEND_PID=$!
cd ..

sleep 3

# Verificar se backend iniciou
if ps -p $BACKEND_PID > /dev/null; then
    echo -e "${GREEN}✅ Backend rodando (PID: $BACKEND_PID)${NC}"
    # Verificar se o scheduled backup service foi inicializado
    if grep -q "Scheduled backup service initialized" backend.log; then
        echo -e "${GREEN}   ✓ Serviço de backup automático inicializado${NC}"
    else
        sleep 2
        if grep -q "Scheduled backup service initialized" backend.log; then
            echo -e "${GREEN}   ✓ Serviço de backup automático inicializado${NC}"
        fi
    fi
else
    echo -e "${RED}❌ Erro ao iniciar backend. Verifique backend.log${NC}"
    exit 1
fi

echo ""

# Iniciar Frontend
echo -e "${BLUE}🎨 Iniciando Frontend (porta $FRONTEND_PORT)...${NC}"
npm run dev > frontend.log 2>&1 &
FRONTEND_PID=$!

sleep 3

# Verificar se frontend iniciou
if ps -p $FRONTEND_PID > /dev/null; then
    echo -e "${GREEN}✅ Frontend rodando (PID: $FRONTEND_PID)${NC}"
else
    echo -e "${RED}❌ Erro ao iniciar frontend. Verifique frontend.log${NC}"
    tail -20 frontend.log
    exit 1
fi

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Servidores iniciados com sucesso!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}📊 Informações:${NC}"
echo -e "   Backend:  http://localhost:$BACKEND_PORT (PID: $BACKEND_PID)"
echo -e "   Frontend: http://localhost:$FRONTEND_PORT (PID: $FRONTEND_PID)"
echo ""
echo -e "${BLUE}📝 Logs:${NC}"
echo -e "   Backend:  tail -f backend.log"
echo -e "   Frontend: tail -f frontend.log"
echo ""
echo -e "${BLUE}🛑 Para parar os servidores:${NC}"
echo -e "   kill $BACKEND_PID $FRONTEND_PID"
echo -e "   Ou: pkill -f 'node.*backend'; pkill -f 'vite'"
echo ""
echo -e "${YELLOW}🧪 Próximo passo:${NC}"
echo -e "   1. Acesse http://localhost:$FRONTEND_PORT"
echo -e "   2. Faça login como admin"
echo -e "   3. Vá em Configurações → Backups Automáticos"
echo -e "   4. Teste criar um backup manual"
echo ""
