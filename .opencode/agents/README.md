# NeuralDeck Custom OpenCode Agents

This directory contains custom agent definitions for OpenCode integration with NeuralDeck.

## Overview

NeuralDeck uses a hybrid approach with **16 total agents**:
- **7 Built-in OpenCode Agents**: plan, explore, build, compaction, summary, general, title
- **9 Custom Agents** (defined here): Specialized roles for NeuralDeck workflows

## Custom Agents

| Agent File | Role | Primary Use Case |
|------------|------|------------------|
| `ux-designer.md` | UI/UX Lead | Design systems, component hierarchies, visual branding |
| `qa-engineer.md` | QA Engineer | Test planning, validation, quality assurance |
| `security-auditor.md` | Security Auditor | Security audits, vulnerability assessment |
| `devops-engineer.md` | DevOps Engineer | Infrastructure, deployment, containerization |
| `red-team.md` | Red Team Operator | Adversarial testing, attack simulation |
| `merge-resolver.md` | Conflict Resolver | Git merge conflict resolution |
| `penetration-tester.md` | Penetration Tester | Exploit discovery, attack path analysis |
| `vuln-scanner.md` | Vulnerability Scanner | Automated security scanning (OWASP Top 10) |
| `code-auditor.md` | Security Code Auditor | Deep code review for security anti-patterns |

## Agent Format

Each agent definition follows OpenCode's format:

```markdown
# Agent Name

<prompt>
System prompt defining the agent's behavior, goals, and tools.
</prompt>

## Description
Brief description of the agent's role.

## Usage
- Use case 1
- Use case 2
```

## Using Custom Agents

### Via OpenCode CLI
```bash
# List all agents (includes custom)
opencode agent list

# Use a custom agent in a session
opencode session create --agent ux-designer
opencode session prompt <session-id> "Create a design system for the dashboard"
```

### Via NeuralDeck Backend
Custom agents are automatically discovered by NeuralDeck's routing system via `.neuraldeck/agent-mappings.json`.

## Agent Mappings

See `.neuraldeck/agent-mappings.json` for the complete mapping between:
- NeuralDeck agent IDs (e.g., `ux_designer`)
- OpenCode agent names (e.g., `ux-designer`)
- Routing strategy (OpenCode vs Local LLM)

## Maintenance

**Adding New Agents:**
1. Create new `.md` file in this directory
2. Update `.neuraldeck/agent-mappings.json`
3. Update `.neuraldeck/routing-config.json` (if routing to OpenCode)
4. Restart NeuralDeck backend to reload configurations

**Modifying Agents:**
- Edit the `<prompt>` section to update system prompts
- Changes take effect immediately (OpenCode reloads definitions automatically)

## Related Files

- `.neuraldeck/agent-mappings.json` - Maps NeuralDeck agents to OpenCode agents
- `.neuraldeck/routing-config.json` - Routing rules (OpenCode vs Local LLM)
- `.neuraldeck/session-cache.json` - Cached OpenCode session IDs
- `src/services/agent.ts` - Original NeuralDeck agent definitions

## Version

**Created:** February 11, 2026  
**NeuralDeck Version:** 2.0.0-CYBER-FASTIFY  
**OpenCode Version:** 1.1.56
