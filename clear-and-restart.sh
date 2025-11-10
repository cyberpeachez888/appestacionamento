#!/bin/bash
# Script para limpar cache e reiniciar servidores
# Execute: bash clear-and-restart.sh

echo "🧹 Limpando cache e reiniciando sistema..."
echo "=========================================="
echo ""

# Parar processos
echo "⏹️  Parando servidores..."
pkill -f "node.*server.js" 2>/dev/null
pkill -f "vite" 2>/dev/null
sleep 2

# Limpar arquivos de PID
rm -f frontend.pid 2>/dev/null
rm -f backend.log 2>/dev/null
rm -f frontend.log 2>/dev/null

echo ""
echo "✅ Cache limpo!"
echo ""
echo "📝 INSTRUÇÕES:"
echo ""
echo "1. Abra o navegador e acesse: http://localhost:8080"
echo "2. Abra o DevTools (F12)"
echo "3. Vá em Application > Storage > Clear site data"
echo "   OU execute no Console:"
echo "   localStorage.clear(); sessionStorage.clear(); location.reload();"
echo ""
echo "4. Depois execute para iniciar os servidores:"
echo "   Terminal 1: cd backend && npm start"
echo "   Terminal 2: npm run dev"
echo ""
echo "5. Faça login novamente"
echo ""
