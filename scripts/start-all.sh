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

ensure_opencode() {
    if command -v opencode >/dev/null 2>&1; then
        command -v opencode
        return 0
    fi

    for candidate in "$HOME/.opencode/bin/opencode" "$HOME/.local/bin/opencode"; do
        if [ -x "$candidate" ]; then
            export PATH="$(dirname "$candidate"):$PATH"
            echo "$candidate"
            return 0
        fi
    done

    return 1
}

is_modern_opencode_cli() {
    "$1" serve --help >/dev/null 2>&1
}

echo -e "${CYAN}================================================${NC}"
echo -e "${CYAN}  NeuralDeck + OpenCode Startup${NC}"
echo -e "${CYAN}================================================${NC}"
echo ""

# ================================================
# 1. Check OpenCode Installation
# ================================================
echo -e "${CYAN}[1/7] Checking OpenCode installation...${NC}"

OPENCODE_BIN="$(ensure_opencode || true)"
if [ -z "$OPENCODE_BIN" ]; then
    echo -e "${YELLOW}⚠ OpenCode not found. Installing...${NC}"
    curl -fsSL https://opencode.ai/install | bash
    
    # Verify installation
    OPENCODE_BIN="$(ensure_opencode || true)"
    if [ -z "$OPENCODE_BIN" ]; then
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
OPENCODE_LOG_HINT="$OPENCODE_BIN server logs"

# Check if already running
if curl -fsS http://127.0.0.1:4096 > /dev/null 2>&1; then
    OPENCODE_RUNNING_PID="$(lsof -ti:4096 -sTCP:LISTEN | head -n 1)"
    if [ -n "$OPENCODE_RUNNING_PID" ]; then
        echo "$OPENCODE_RUNNING_PID" > opencode.pid
    fi
    echo -e "${GREEN}✓ OpenCode server already running${NC}"
else
    if is_modern_opencode_cli "$OPENCODE_BIN"; then
        # Start modern OpenCode server in background (no daemon flag in current CLI)
        nohup "$OPENCODE_BIN" serve --hostname 127.0.0.1 --port 4096 > opencode-server.log 2>&1 &
        OPENCODE_PID=$!
        echo "$OPENCODE_PID" > opencode.pid
        OPENCODE_LOG_HINT="tail -f opencode-server.log"
    else
        # Legacy CLI fallback
        "$OPENCODE_BIN" server start --port 4096 --daemon > /dev/null 2>&1 &
    fi
    
    # Wait for server to be ready (max 30 seconds)
    echo -n "  Waiting for OpenCode server..."
    for i in {1..30}; do
        if curl -fsS http://127.0.0.1:4096 > /dev/null 2>&1; then
            echo -e " ${GREEN}ready${NC}"
            break
        fi
        sleep 1
        echo -n "."
    done
    
    # Final check
    if curl -fsS http://127.0.0.1:4096 > /dev/null 2>&1; then
        OPENCODE_RUNNING_PID="$(lsof -ti:4096 -sTCP:LISTEN | head -n 1)"
        if [ -n "$OPENCODE_RUNNING_PID" ]; then
            echo "$OPENCODE_RUNNING_PID" > opencode.pid
        fi
        echo -e "${GREEN}✓ OpenCode server started${NC}"
    else
        echo -e "${RED}✗ OpenCode server failed to start${NC}"
        echo -e "${YELLOW}Check logs: $OPENCODE_LOG_HINT${NC}"
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
if curl -s http://localhost:3001/health &> /dev/null; then
    ACTIVE_BACKEND_PID="$(lsof -ti:3001 -sTCP:LISTEN | head -n 1)"
    if [ -n "$ACTIVE_BACKEND_PID" ]; then
        echo "$ACTIVE_BACKEND_PID" > server.pid
    fi
    echo -e "${GREEN}✓ Backend already running (PID: ${ACTIVE_BACKEND_PID:-unknown})${NC}"
else
    # Start backend
    nohup env OPENCODE_URL="http://127.0.0.1:4096" OPENCODE_PORT="4096" node server.cjs > server.log 2>&1 &
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
        ACTIVE_BACKEND_PID="$(lsof -ti:3001 -sTCP:LISTEN | head -n 1)"
        if [ -n "$ACTIVE_BACKEND_PID" ]; then
            echo "$ACTIVE_BACKEND_PID" > server.pid
        fi
        echo -e "${GREEN}✓ Backend started (PID: ${ACTIVE_BACKEND_PID:-$SERVER_PID})${NC}"
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
if curl -s http://localhost:5173 &> /dev/null; then
    ACTIVE_FRONTEND_PID="$(lsof -ti:5173 -sTCP:LISTEN | head -n 1)"
    if [ -n "$ACTIVE_FRONTEND_PID" ]; then
        echo "$ACTIVE_FRONTEND_PID" > dev.pid
    fi
    echo -e "${GREEN}✓ Frontend already running (PID: ${ACTIVE_FRONTEND_PID:-unknown})${NC}"
else
    # Start frontend
    nohup env VITE_OPENCODE_URL="http://127.0.0.1:4096" npm run dev > dev.log 2>&1 &
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
        ACTIVE_FRONTEND_PID="$(lsof -ti:5173 -sTCP:LISTEN | head -n 1)"
        if [ -n "$ACTIVE_FRONTEND_PID" ]; then
            echo "$ACTIVE_FRONTEND_PID" > dev.pid
        fi
        echo -e "${GREEN}✓ Frontend started (PID: ${ACTIVE_FRONTEND_PID:-$DEV_PID})${NC}"
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
TEST_OPENCODE_SCRIPT="$PROJECT_DIR/.test-opencode.cjs"
TEST_OPENCODE_LOG="$PROJECT_DIR/.test-opencode.log"

cat > "$TEST_OPENCODE_SCRIPT" << 'EOF'
(async () => {
  try {
    const { createOpencodeClient } = await import('@opencode-ai/sdk');
    const candidateUrls = ['http://127.0.0.1:4096', 'http://localhost:4096'];

    for (const baseUrl of candidateUrls) {
      try {
        const client = createOpencodeClient({ baseUrl, throwOnError: false });
        const pathResult = await client.path.get();

        if (pathResult && pathResult.data) {
          console.log(`✓ OpenCode SDK connection successful (${baseUrl})`);
          process.exit(0);
        }
      } catch {
        // Continue trying fallback URLs.
      }
    }

    console.log('✗ OpenCode SDK connection failed');
    process.exit(1);
  } catch (error) {
    console.log('✗ Connection failed:', error.message);
    process.exit(1);
  }
})();
EOF

SDK_VERIFIED=false
for i in {1..5}; do
    if node "$TEST_OPENCODE_SCRIPT" > "$TEST_OPENCODE_LOG" 2>&1; then
        SDK_VERIFIED=true
        break
    fi
    sleep 1
done

if [ "$SDK_VERIFIED" = true ]; then
    echo -e "${GREEN}✓ OpenCode SDK connection verified${NC}"
else
    echo -e "${YELLOW}⚠ OpenCode SDK connection could not be verified${NC}"
    echo -e "${YELLOW}  This may affect agent functionality${NC}"
    echo -e "${YELLOW}  Last error: $(tail -n 1 "$TEST_OPENCODE_LOG" 2>/dev/null)${NC}"
fi

rm -f "$TEST_OPENCODE_SCRIPT" "$TEST_OPENCODE_LOG"

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
echo -e "  OpenCode: $OPENCODE_LOG_HINT"
echo ""
echo -e "${CYAN}Process IDs:${NC}"
if [ -f "server.pid" ]; then
    echo -e "  Backend:  $(cat server.pid)"
fi
if [ -f "dev.pid" ]; then
    echo -e "  Frontend: $(cat dev.pid)"
fi
if [ -f "opencode.pid" ]; then
    echo -e "  OpenCode: $(cat opencode.pid)"
fi
echo ""
echo -e "${CYAN}To stop all processes:${NC}"
echo -e "  bash scripts/stop-all.sh"
echo ""
echo -e "${GREEN}Ready for development! 🎨${NC}"
