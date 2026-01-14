#!/bin/bash

# Start Development Servers for [pyth] ai
# This script starts both the backend and frontend servers concurrently
# Usage: ./start-dev.sh or npm run start:dev

set -e

echo "🚀 Starting [pyth] ai Development Servers..."
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the project root
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root."
    exit 1
fi

# Function to handle cleanup on exit
cleanup() {
    echo ""
    echo "${YELLOW}🛑 Stopping servers...${NC}"
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
    wait $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
    echo "${GREEN}✅ Servers stopped${NC}"
    exit 0
}

# Trap Ctrl+C and call cleanup
trap cleanup INT TERM

# Start backend server
echo "${BLUE}📡 Starting backend server (port 3002)...${NC}"
cd server
node index.js &
BACKEND_PID=$!
cd ..

# Wait a moment for backend to start
sleep 2

# Check if backend started successfully
if ! kill -0 $BACKEND_PID 2>/dev/null; then
    echo "❌ Backend server failed to start"
    exit 1
fi

echo "${GREEN}✅ Backend server running (PID: $BACKEND_PID)${NC}"
echo ""

# Start frontend server
echo "${BLUE}⚡ Starting frontend server (Vite)...${NC}"
npm run dev &
FRONTEND_PID=$!

# Wait a moment for frontend to start
sleep 2

# Check if frontend started successfully
if ! kill -0 $FRONTEND_PID 2>/dev/null; then
    echo "❌ Frontend server failed to start"
    kill $BACKEND_PID 2>/dev/null || true
    exit 1
fi

echo "${GREEN}✅ Frontend server running (PID: $FRONTEND_PID)${NC}"
echo ""
echo "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "${GREEN}✅ All servers running!${NC}"
echo ""
echo "📡 Backend:  http://localhost:3002"
echo "⚡ Frontend: http://localhost:5173 (or check terminal for Vite's port)"
echo ""
echo "${YELLOW}Press Ctrl+C to stop all servers${NC}"
echo "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID
