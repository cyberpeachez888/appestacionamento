#!/bin/bash
# TheProParkingApp Frontend Startup Script

echo "🚀 Starting TheProParkingApp Frontend..."

cd "$(dirname "$0")"

echo "📂 Current directory: $(pwd)"
echo "✅ Starting Vite dev server..."

npm run dev
