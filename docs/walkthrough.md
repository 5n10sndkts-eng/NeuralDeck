# NeuralDeck: Project Launch Walkthrough

## 🚀 System Status
- **Backend:** Online (`http://localhost:3001`)
- **Frontend:** Online (`http://localhost:3002`)
- **Autonomy Engine:** Active
- **RAG Engine:** Integrated (Local/In-Memory)
- **3D Engine:** Online (The Construct)

## 🏗️ Architecture Implemented
### 1. The Core (Backend)
- **Fastify Server:** Replaced Express for performance.
- **Security:** Helmet, CORS, Rate Limiting active.
- **API Gateway:** Proxies requests to Local LLM or OpenAI.
- **Safe Shell:** Whitelisted command execution.

### 2. The Interface (Frontend)
- **Cyberpunk UI:** Custom design system (Neon/Glass).
- **# NeuralDeck v2.0 - Walkthrough & User Guide

## 1. System Overview
**NeuralDeck** is an advanced AI Agent Workstation designed for "Cyberpunk 2099". It features a **"Neon Prime"** glassmorphic interface, a local RAG engine, and a neural autonomy system ("The Swarm").

## 2. Key Features
*   **Cockpit Interface:** A floating dock and HUD layout for immersive control.
*   **Neon Prime Aesthetics:** Dynamic HSL-based lighting, holographic panels, and glitch effects.
*   **Neural Autonomy:** A background state machine that manages agent lifecycles (`useNeuralAutonomy`).
*   **RAG Engine:** Local vector memory for context-aware chat.
*   **The Terminal:** A command-line interface for direct system interaction.
*   **The Construct (3D):** Immersive 3D data visualization (`CyberVerse`).
- **Agent System:** Specialized prompts for Analyst, PM, Architect, and Dev.

## 🕹️ User Guide
1.  **Start the System:**
    ```bash
    npm run dev  # Starts Vite Frontend
    node server.cjs # Starts Fastify Backend
    ```
2.  **Access the Deck:**
    - Go to `http://localhost:3002`.
    - Check the **"Neural Orchestrator"** tab to see the Swarm in action.
    - Click the **Server/Database Icon ("Immerse")** in the Dock to enter **The Construct**.
3.  **Trigger Autonomy:**
    - Click **"Auto-Run"** in the top right to let agents self-drive.
    - Or manually select an agent (e.g., "The Analyst") and chat in the Terminal.

## ✅ Verification
- [x] Backend Health Check (`/health`)
- [x] Frontend Loads without Errors
- [x] Audio System works (after interaction)
- [x] RAG Ingestion & Querying works
- [x] 3D Construct (Immerse View) Renders
