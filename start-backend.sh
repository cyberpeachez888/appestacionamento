#!/bin/bash

echo "🚀 Starting Backend Server..."
echo ""

cd /workspaces/appestacionamento/backend

# Kill any existing backend process
pkill -9 -f "node src/server.js" 2>/dev/null

# Wait a moment
sleep 1

# Start backend in background
nohup npm start > /tmp/backend.log 2>&1 &
BACKEND_PID=$!

echo "Backend started with PID: $BACKEND_PID"
echo ""
echo "Waiting for backend to be ready..."

# Wait up to 10 seconds for backend to start
for i in {1..10}; do
  sleep 1
  if curl -s http://localhost:3000/api/rates > /dev/null 2>&1; then
    echo "✅ Backend is ready!"
    echo ""
    echo "📊 Backend Status:"
    echo "   URL: http://localhost:3000"
    echo "   PID: $BACKEND_PID"
    echo "   Logs: /tmp/backend.log"
    echo ""
    echo "To view logs in real-time:"
    echo "   tail -f /tmp/backend.log"
    exit 0
  fi
  echo -n "."
done

echo ""
echo "⚠️  Backend may still be starting. Check logs:"
echo "   tail -f /tmp/backend.log"
echo ""
echo "Or check if it's running:"
echo "   ps aux | grep 'node src/server.js'"
