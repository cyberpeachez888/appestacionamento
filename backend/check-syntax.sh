#!/bin/bash

echo "🔧 Testing backend syntax..."
echo ""

cd /workspaces/appestacionamento/backend

# Test if the file has syntax errors
node --check src/controllers/pricingRulesController.js 2>&1
if [ $? -eq 0 ]; then
    echo "✅ pricingRulesController.js - No syntax errors"
else
    echo "❌ pricingRulesController.js - Syntax errors found"
    exit 1
fi

node --check src/routes/pricingRules.js 2>&1
if [ $? -eq 0 ]; then
    echo "✅ pricingRules.js - No syntax errors"
else
    echo "❌ pricingRules.js - Syntax errors found"
    exit 1
fi

node --check src/services/pricingCalculator.js 2>&1
if [ $? -eq 0 ]; then
    echo "✅ pricingCalculator.js - No syntax errors"
else
    echo "❌ pricingCalculator.js - Syntax errors found"
    exit 1
fi

echo ""
echo "✅ All pricing rules files are valid!"
echo ""
echo "📋 Next step: Start backend with 'npm start' in backend directory"
