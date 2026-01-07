#!/bin/bash
# Script de teste para verificar se o backend está usando SERVICE_ROLE_KEY

echo "🔍 Testando configuração do backend..."
echo ""

# Teste 1: Verificar logs do backend
echo "1️⃣ Verificando qual chave está sendo usada..."
echo "   Procure por '🔑 Using SERVICE_ROLE key' ou '🔑 Using ANON key'"
echo ""

# Teste 2: Testar endpoint de saúde
echo "2️⃣ Testando endpoint de saúde..."
curl -s https://theproparking-backend-1rxk.onrender.com/api/health | jq '.'
echo ""

# Teste 3: Verificar se consegue fazer login
echo "3️⃣ Para testar autenticação, você precisa:"
echo "   - Fazer login no app"
echo "   - Tentar abrir o caixa"
echo "   - Verificar se não há mais erros de RLS"
echo ""

echo "✅ Próximos passos:"
echo "   1. Verifique os logs do Render para ver se aparece '🔑 Using SERVICE_ROLE key'"
echo "   2. Execute o SQL fix_rls_permissive.sql no Supabase"
echo "   3. Teste abrir o caixa novamente"
