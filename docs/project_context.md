---
project_name: 'NeuralDeckProjects'
user_name: 'Moe'
date: '2025-12-16'
sections_completed:
  ['technology_stack', 'language_rules', 'framework_rules', 'testing_rules', 'quality_rules', 'workflow_rules', 'anti_patterns']
status: 'complete'
rule_count: 25
optimized_for_llm: true
---

# Project Context for AI Agents

_This file contains critical rules and patterns that AI agents must follow when implementing code in this project. Focus on unobvious details that agents might otherwise miss._

---

## Technology Stack & Versions

- **Frontend:** React `19.2.0`, Vite `6.2.0`, ReactFlow `11.11.4`, Three.js `0.182.0`
- **Backend:** Fastify `5.6.2`, Node.js (Latest LTS)
- **Language:** TypeScript `~5.8.2`
- **Key Dependencies:** `@react-three/fiber`, `@react-three/drei`, `socket.io`, `framer-motion`

### Language-Specific Rules

- **TypeScript Strict Mode:** `strict: true` is enabled. No implicit `any`.
- **Target:** `ES2022`. Use modern features like top-level await and private class fields (`#field`).
- **Module Resolution:** `bundler` mode.
- **Import Aliases:** use `@/*` for src root (e.g. `import { Foo } from '@/components/Foo'`).

### Framework-Specific Rules

**React & Vite:**
- **Components:** Functional Components with Hooks only. No Class Components.
- **Environment:** `import.meta.env.VITE_VAR`.
- **Styling:** Tailwind CSS utility classes preferred.

**Three.js / React-Three-Fiber (R3F):**
- **Declarative:** Use R3F components (`<mesh>`, `<Canvas>`) over imperative Three.js.
- **Optimization:** Use `useFrame` for loops. Use `<InstancedMesh>` for repeating nodes.

**Fastify (Backend):**
- **Async:** All handlers must be `async`.
- **Validation:** Use Fastify schemas for input validation.

### Testing Rules

- **Status:** No automated testing framework (Jest/Vitest) is currently installed.
- **Rule:** **Do not generate test files** (`.test.ts`, `.spec.ts`) or attempt to run tests until the Test Architecture is initialized.

### Code Quality & Style Rules

- **Linting:** Follow standard ESLint/Prettier patterns.
- **File Naming:**
  - Components: `PascalCase.tsx`
  - Hooks: `camelCase.ts`
  - Utilities: `camelCase.ts` or `kebab-case.ts`
- **Directory Structure:**
  - `src/components/`: React components
  - `src/hooks/`: Custom hooks
  - `server/`: Backend Node.js code
  - `docs/`: Documentation

### Development Workflow Rules

- **Git:** Commit often with descriptive messages.
- **Deployment:** Application is a monolithic local-first web app (Client + Server).
- **Environment:** `npm run dev` starts both `vite` (frontend) and `node` (backend) concurrently.
- **Docs:** Keep `docs/` updated with major changes.

### Critical Don't-Miss Rules

- **Anti-Pattern:** Do not hardcode API URLs. Use relative paths `/api/...` (proxy handled by Vite) or env vars.
- **Security:** Never commit API keys.
- **State:** `useNeuralAutonomy` is the central brain. Do not bypass it for agent state.
- **Visuals:** "Cyberpunk" aesthetic is mandatory (Neon, Dark Mode, Glitch effects). **Do not create generic UI.**

---

## Usage Guidelines

**For AI Agents:**

- Read this file before implementing any code
- Follow ALL rules exactly as documented
- When in doubt, prefer the more restrictive option
- Update this file if new patterns emerge

**For Humans:**

- Keep this file lean and focused on agent needs
- Update when technology stack changes
- Review quarterly for outdated rules
- Remove rules that become obvious over time

Last Updated: 2025-12-16
