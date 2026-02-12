#!/bin/bash

# stop-all.sh
# Unified shutdown script for NeuralDeck + OpenCode integration
# Stops all 3 processes: Frontend (Vite), Backend (Fastify), OpenCode Server

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Project root directory
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

echo -e "${CYAN}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                  NeuralDeck Shutdown                       ║"
echo "║         Stopping Frontend + Backend + OpenCode             ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}\n"

# Track shutdown status
FRONTEND_STOPPED=false
BACKEND_STOPPED=false
OPENCODE_STOPPED=false

# ============================================
# Step 1: Stop Frontend (Vite Dev Server)
# ============================================
echo -e "${YELLOW}[1/3] Stopping Frontend (Vite)...${NC}"

if [ -f "dev.pid" ]; then
    FRONTEND_PID=$(cat dev.pid)
    
    # Check if process is still running
    if kill -0 "$FRONTEND_PID" 2>/dev/null; then
        kill "$FRONTEND_PID" 2>/dev/null || true
        
        # Wait up to 5 seconds for graceful shutdown
        for i in {1..5}; do
            if ! kill -0 "$FRONTEND_PID" 2>/dev/null; then
                break
            fi
            sleep 1
        done
        
        # Force kill if still running
        if kill -0 "$FRONTEND_PID" 2>/dev/null; then
            kill -9 "$FRONTEND_PID" 2>/dev/null || true
            echo -e "${YELLOW}  ⚠ Frontend force-stopped${NC}"
        else
            echo -e "${GREEN}  ✓ Frontend stopped gracefully (PID $FRONTEND_PID)${NC}"
        fi
        FRONTEND_STOPPED=true
    else
        echo -e "${YELLOW}  ⚠ Frontend process not running (stale PID)${NC}"
    fi
    
    rm dev.pid
else
    echo -e "${YELLOW}  ⚠ No dev.pid file found (frontend may not be running)${NC}"
fi

# Verify port 5173 is released
if lsof -ti:5173 >/dev/null 2>&1; then
    echo -e "${RED}  ✗ Port 5173 still in use, forcing cleanup...${NC}"
    kill -9 $(lsof -ti:5173) 2>/dev/null || true
fi

echo ""

# ============================================
# Step 2: Stop Backend (Fastify Server)
# ============================================
echo -e "${YELLOW}[2/3] Stopping Backend (Fastify)...${NC}"

if [ -f "server.pid" ]; then
    BACKEND_PID=$(cat server.pid)
    
    # Check if process is still running
    if kill -0 "$BACKEND_PID" 2>/dev/null; then
        kill "$BACKEND_PID" 2>/dev/null || true
        
        # Wait up to 5 seconds for graceful shutdown
        for i in {1..5}; do
            if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
                break
            fi
            sleep 1
        done
        
        # Force kill if still running
        if kill -0 "$BACKEND_PID" 2>/dev/null; then
            kill -9 "$BACKEND_PID" 2>/dev/null || true
            echo -e "${YELLOW}  ⚠ Backend force-stopped${NC}"
        else
            echo -e "${GREEN}  ✓ Backend stopped gracefully (PID $BACKEND_PID)${NC}"
        fi
        BACKEND_STOPPED=true
    else
        echo -e "${YELLOW}  ⚠ Backend process not running (stale PID)${NC}"
    fi
    
    rm server.pid
else
    echo -e "${YELLOW}  ⚠ No server.pid file found (backend may not be running)${NC}"
fi

# Verify port 3001 is released
if lsof -ti:3001 >/dev/null 2>&1; then
    echo -e "${RED}  ✗ Port 3001 still in use, forcing cleanup...${NC}"
    kill -9 $(lsof -ti:3001) 2>/dev/null || true
fi

echo ""

# ============================================
# Step 3: Stop OpenCode Server
# ============================================
echo -e "${YELLOW}[3/3] Stopping OpenCode Server...${NC}"

# Check if OpenCode CLI is installed
OPENCODE_BIN="$(ensure_opencode || true)"
if [ -n "$OPENCODE_BIN" ]; then
    if [ -f "opencode.pid" ]; then
        OPENCODE_PID="$(cat opencode.pid)"
        if kill -0 "$OPENCODE_PID" 2>/dev/null; then
            kill "$OPENCODE_PID" 2>/dev/null || true

            for i in {1..5}; do
                if ! kill -0 "$OPENCODE_PID" 2>/dev/null; then
                    break
                fi
                sleep 1
            done

            if kill -0 "$OPENCODE_PID" 2>/dev/null; then
                kill -9 "$OPENCODE_PID" 2>/dev/null || true
                echo -e "${YELLOW}  ⚠ OpenCode force-stopped${NC}"
            else
                echo -e "${GREEN}  ✓ OpenCode server stopped (PID $OPENCODE_PID)${NC}"
            fi
            OPENCODE_STOPPED=true
        else
            echo -e "${YELLOW}  ⚠ OpenCode process not running (stale PID)${NC}"
        fi
        rm -f opencode.pid
    elif "$OPENCODE_BIN" server stop >/dev/null 2>&1; then
        # Legacy CLI fallback
        echo -e "${GREEN}  ✓ OpenCode server stopped${NC}"
        OPENCODE_STOPPED=true
    else
        echo -e "${YELLOW}  ⚠ OpenCode server not running or already stopped${NC}"
    fi
else
    echo -e "${YELLOW}  ⚠ OpenCode CLI not installed (skipping)${NC}"
fi

# Verify port 4096 is released
if lsof -ti:4096 >/dev/null 2>&1; then
    echo -e "${RED}  ✗ Port 4096 still in use, forcing cleanup...${NC}"
    kill -9 $(lsof -ti:4096) 2>/dev/null || true
    OPENCODE_STOPPED=true
fi

echo ""

# ============================================
# Final Status Summary
# ============================================
echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}                    Shutdown Complete                       ${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}\n"

# Display status
if [ "$FRONTEND_STOPPED" = true ]; then
    echo -e "${GREEN}✓ Frontend (Vite):     STOPPED${NC}"
else
    echo -e "${YELLOW}⚠ Frontend (Vite):     WAS NOT RUNNING${NC}"
fi

if [ "$BACKEND_STOPPED" = true ]; then
    echo -e "${GREEN}✓ Backend (Fastify):   STOPPED${NC}"
else
    echo -e "${YELLOW}⚠ Backend (Fastify):   WAS NOT RUNNING${NC}"
fi

if [ "$OPENCODE_STOPPED" = true ]; then
    echo -e "${GREEN}✓ OpenCode Server:     STOPPED${NC}"
else
    echo -e "${YELLOW}⚠ OpenCode Server:     WAS NOT RUNNING${NC}"
fi

echo ""

# Verify all ports are clear
ALL_CLEAR=true
for port in 5173 3001 4096; do
    if lsof -ti:$port >/dev/null 2>&1; then
        echo -e "${RED}✗ Port $port is still in use!${NC}"
        ALL_CLEAR=false
    fi
done

if [ "$ALL_CLEAR" = true ]; then
    echo -e "${GREEN}✓ All ports cleared (5173, 3001, 4096)${NC}"
fi

echo ""
echo -e "${CYAN}To restart all services, run:${NC}"
echo -e "${GREEN}  npm run dev:full${NC}"
echo -e "${CYAN}Or:${NC}"
echo -e "${GREEN}  bash scripts/start-all.sh${NC}"
echo ""
