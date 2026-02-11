#!/bin/bash

# ================================================
# NeuralDeck + OpenCode Unified Startup Script
# ================================================
# This script starts all three processes required for NeuralDeck:
# 1. OpenCode Server (port 4096)
# 2. NeuralDeck Backend (Fastify, port 3001)
# 3. NeuralDeck Frontend (Vite, port 5173)

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
CYAN='\033[0;36m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Project directory
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR"

echo -e "${CYAN}================================================${NC}"
echo -e "${CYAN}  NeuralDeck + OpenCode Startup${NC}"
echo -e "${CYAN}================================================${NC}"
echo ""

# ================================================
# 1. Check OpenCode Installation
# ================================================
echo -e "${CYAN}[1/7] Checking OpenCode installation...${NC}"

if ! command -v opencode &> /dev/null; then
    echo -e "${YELLOW}⚠ OpenCode not found. Installing...${NC}"
    curl -fsSL https://opencode.ai/install | bash
    
    # Verify installation
    if ! command -v opencode &> /dev/null; then
        echo -e "${RED}✗ OpenCode installation failed${NC}"
        echo -e "${YELLOW}Please install manually: curl -fsSL https://opencode.ai/install | bash${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}✓ OpenCode installed${NC}"

# ================================================
# 2. Start OpenCode Server
# ================================================
echo -e "${CYAN}[2/7] Starting OpenCode server (port 4096)...${NC}"

# Check if already running
if curl -s http://localhost:4096/health &> /dev/null; then
    echo -e "${GREEN}✓ OpenCode server already running${NC}"
else
    # Start OpenCode server in background
    opencode server start --port 4096 --daemon > /dev/null 2>&1 &
    
    # Wait for server to be ready (max 30 seconds)
    echo -n "  Waiting for OpenCode server..."
    for i in {1..30}; do
        if curl -s http://localhost:4096/health | grep -q "healthy" 2>/dev/null; then
            echo -e " ${GREEN}ready${NC}"
            break
        fi
        sleep 1
        echo -n "."
    done
    
    # Final check
    if curl -s http://localhost:4096/health | grep -q "healthy" 2>/dev/null; then
        echo -e "${GREEN}✓ OpenCode server started${NC}"
    else
        echo -e "${RED}✗ OpenCode server failed to start${NC}"
        echo -e "${YELLOW}Check logs: opencode server logs${NC}"
        exit 1
    fi
fi

# ================================================
# 3. Verify Node Dependencies
# ================================================
echo -e "${CYAN}[3/7] Checking Node dependencies...${NC}"

if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}⚠ Installing dependencies...${NC}"
    npm install
fi

echo -e "${GREEN}✓ Dependencies ready${NC}"

# ================================================
# 4. Start NeuralDeck Backend
# ================================================
echo -e "${CYAN}[4/7] Starting NeuralDeck backend (port 3001)...${NC}"

# Check if already running
if [ -f "server.pid" ] && kill -0 $(cat server.pid) 2>/dev/null; then
    echo -e "${GREEN}✓ Backend already running (PID: $(cat server.pid))${NC}"
else
    # Start backend
    node server.cjs > server.log 2>&1 &
    SERVER_PID=$!
    echo $SERVER_PID > server.pid
    
    # Wait for backend to be ready
    echo -n "  Waiting for backend..."
    for i in {1..15}; do
        if curl -s http://localhost:3001/health &> /dev/null; then
            echo -e " ${GREEN}ready${NC}"
            break
        fi
        sleep 1
        echo -n "."
    done
    
    # Final check
    if curl -s http://localhost:3001/health &> /dev/null; then
        echo -e "${GREEN}✓ Backend started (PID: $SERVER_PID)${NC}"
    else
        echo -e "${RED}✗ Backend failed to start${NC}"
        echo -e "${YELLOW}Check logs: tail -f server.log${NC}"
        kill $SERVER_PID 2>/dev/null || true
        rm server.pid
        exit 1
    fi
fi

# ================================================
# 5. Start NeuralDeck Frontend
# ================================================
echo -e "${CYAN}[5/7] Starting NeuralDeck frontend (port 5173)...${NC}"

# Check if already running
if [ -f "dev.pid" ] && kill -0 $(cat dev.pid) 2>/dev/null; then
    echo -e "${GREEN}✓ Frontend already running (PID: $(cat dev.pid))${NC}"
else
    # Start frontend
    npm run dev > dev.log 2>&1 &
    DEV_PID=$!
    echo $DEV_PID > dev.pid
    
    # Wait for frontend to be ready
    echo -n "  Waiting for frontend..."
    for i in {1..20}; do
        if curl -s http://localhost:5173 &> /dev/null; then
            echo -e " ${GREEN}ready${NC}"
            break
        fi
        sleep 1
        echo -n "."
    done
    
    # Final check
    if curl -s http://localhost:5173 &> /dev/null; then
        echo -e "${GREEN}✓ Frontend started (PID: $DEV_PID)${NC}"
    else
        echo -e "${YELLOW}⚠ Frontend may still be starting${NC}"
        echo -e "${YELLOW}Check logs: tail -f dev.log${NC}"
    fi
fi

# ================================================
# 6. Verify OpenCode Connection
# ================================================
echo -e "${CYAN}[6/7] Testing OpenCode SDK connection...${NC}"

# Create a simple test script
cat > /tmp/test-opencode.cjs << 'EOF'
const { createOpencodeClient } = require('@opencode-ai/sdk');

(async () => {
  try {
    const client = createOpencodeClient({ baseUrl: 'http://localhost:4096' });
    const health = await client.global.health();
    
    if (health.data?.healthy) {
      console.log('✓ OpenCode SDK connection successful');
      process.exit(0);
    } else {
      console.log('✗ OpenCode server unhealthy');
      process.exit(1);
    }
  } catch (error) {
    console.log('✗ Connection failed:', error.message);
    process.exit(1);
  }
})();
EOF

if node /tmp/test-opencode.cjs 2>&1 | grep -q "successful"; then
    echo -e "${GREEN}✓ OpenCode SDK connection verified${NC}"
else
    echo -e "${YELLOW}⚠ OpenCode SDK connection could not be verified${NC}"
    echo -e "${YELLOW}  This may affect agent functionality${NC}"
fi

rm /tmp/test-opencode.cjs

# ================================================
# 7. Final Status Summary
# ================================================
echo ""
echo -e "${CYAN}================================================${NC}"
echo -e "${GREEN}  🚀 NeuralDeck is running!${NC}"
echo -e "${CYAN}================================================${NC}"
echo ""
echo -e "  ${GREEN}Frontend:${NC}  http://localhost:5173"
echo -e "  ${GREEN}Backend:${NC}   http://localhost:3001"
echo -e "  ${GREEN}OpenCode:${NC}  http://localhost:4096"
echo ""
echo -e "${CYAN}Logs:${NC}"
echo -e "  Backend:  tail -f server.log"
echo -e "  Frontend: tail -f dev.log"
echo -e "  OpenCode: opencode server logs"
echo ""
echo -e "${CYAN}Process IDs:${NC}"
if [ -f "server.pid" ]; then
    echo -e "  Backend:  $(cat server.pid)"
fi
if [ -f "dev.pid" ]; then
    echo -e "  Frontend: $(cat dev.pid)"
fi
echo ""
echo -e "${CYAN}To stop all processes:${NC}"
echo -e "  bash scripts/stop-all.sh"
echo ""
echo -e "${GREEN}Ready for development! 🎨${NC}"
