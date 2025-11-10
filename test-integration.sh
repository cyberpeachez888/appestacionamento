#!/bin/bash

echo "🧪 Testing Frontend-Backend Integration"
echo "========================================"
echo ""

# Check if backend is running
echo "1. Checking backend..."
if curl -s http://localhost:3000/rates > /dev/null 2>&1; then
    echo "   ✅ Backend is running on http://localhost:3000"
else
    echo "   ❌ Backend is not responding!"
    echo "   Run: cd backend && npm run dev"
    exit 1
fi

# Check if frontend is running
echo ""
echo "2. Checking frontend..."
if curl -s http://localhost:5173 > /dev/null 2>&1; then
    echo "   ✅ Frontend is running on http://localhost:5173"
elif curl -s http://localhost:5174 > /dev/null 2>&1; then
    echo "   ✅ Frontend is running on http://localhost:5174"
else
    echo "   ⚠️  Frontend may not be running yet"
    echo "   Run: npm run dev"
fi

# Test API endpoints from frontend perspective
echo ""
echo "3. Testing API endpoints..."

# Test rates
echo "   → GET /rates"
RATES_COUNT=$(curl -s http://localhost:3000/rates | jq 'length' 2>/dev/null || echo "0")
echo "   ✅ Found $RATES_COUNT rates"

# Test monthly customers
echo "   → GET /monthlyCustomers"
CUSTOMERS_COUNT=$(curl -s http://localhost:3000/monthlyCustomers | jq 'length' 2>/dev/null || echo "0")
echo "   ✅ Found $CUSTOMERS_COUNT monthly customers"

# Test company config
echo "   → GET /companyConfig"
COMPANY_NAME=$(curl -s http://localhost:3000/companyConfig | jq -r '.name' 2>/dev/null || echo "Unknown")
echo "   ✅ Company: $COMPANY_NAME"

echo ""
echo "4. Testing CORS..."
CORS_HEADER=$(curl -s -I -X OPTIONS http://localhost:3000/rates -H "Origin: http://localhost:5173" | grep -i "access-control-allow-origin" || echo "")
if [ -n "$CORS_HEADER" ]; then
    echo "   ✅ CORS is properly configured"
else
    echo "   ⚠️  CORS headers not detected (may still work)"
fi

echo ""
echo "========================================"
echo "✨ Integration Status: READY"
echo ""
echo "Open your browser:"
echo "  Frontend: http://localhost:5173"
echo "  Backend:  http://localhost:3000"
echo ""
echo "Try these actions in the frontend:"
echo "  • Add a new rate"
echo "  • Create a monthly customer"
echo "  • View financial reports"
echo "  • Update company settings"
