/**
 * Centralized constants for NeuralDeck.
 */

import type { LlmProvider } from './types';

/** Maximum number of developer nodes to spawn in the Neural Grid (performance cap). */
export const MAX_DEVELOPER_NODES = 20;

/** CLI providers that require a command template instead of a standard HTTP URL. */
export const CLI_PROVIDERS: LlmProvider[] = [
    'cli',
    'claude-cli',
    'gemini-cli',
    'codex-cli',
    'ollama-cli',
    'copilot-cli',
    'cursor-cli'
];

/** Default command templates for CLI providers ({{prompt}} placeholder is required). */
export const CLI_COMMAND_TEMPLATES: Partial<Record<LlmProvider, string>> = {
    'cli': 'ollama run llama3 "{{prompt}}"',
    'claude-cli': 'claude -p "{{prompt}}"',
    'gemini-cli': 'gemini "{{prompt}}"',
    'codex-cli': 'codex "{{prompt}}"',
    'ollama-cli': 'ollama run llama3 "{{prompt}}"',
    'copilot-cli': 'gh copilot suggest "{{prompt}}"',
    'cursor-cli': 'cursor --prompt "{{prompt}}"'
};
