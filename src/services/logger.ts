/**
 * NeuralDeck Logger — structured logging with level control.
 *
 * Replaces raw `console.log` with environment-aware logging:
 *   - development: all levels visible
 *   - production: only warn + error
 *   - test: silent unless LOG_LEVEL is set
 *
 * Usage:
 *   import { logger } from '@/src/services/logger';
 *   logger.info('[Socket] Connected');
 *   logger.debug('[Swarm] Phase transition', { phase: 2 });
 *   logger.warn('[Auth] Token expiring soon');
 *   logger.error('[Gateway] Request failed', error);
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  silent: 4,
};

function getEnvVar(key: string): string | undefined {
  try {
    // Vite exposes env vars through import.meta.env
    return import.meta.env?.[key] as string | undefined;
  } catch {
    return undefined;
  }
}

function resolveLevel(): LogLevel {
  // Allow explicit override via env or global
  const explicit =
    getEnvVar('VITE_LOG_LEVEL') ??
    ((typeof globalThis !== 'undefined'
      ? (globalThis as Record<string, unknown>).__NEURALDECK_LOG_LEVEL__
      : undefined) as string | undefined);

  if (explicit && explicit in LEVEL_PRIORITY) return explicit as LogLevel;

  // Infer from environment
  const mode = getEnvVar('MODE');
  if (mode === 'test') return 'silent';
  if (mode === 'production') return 'warn';
  return 'debug'; // development default: show everything
}

let currentLevel: LogLevel = resolveLevel();

function shouldLog(level: LogLevel): boolean {
  return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[currentLevel];
}

function formatPrefix(level: LogLevel): string {
  const ts = new Date().toISOString().slice(11, 23); // HH:mm:ss.SSS
  return `[${ts}] [${level.toUpperCase()}]`;
}

export const logger = {
  debug(message: string, ...args: unknown[]): void {
    if (shouldLog('debug')) console.debug(formatPrefix('debug'), message, ...args);
  },

  info(message: string, ...args: unknown[]): void {
    if (shouldLog('info')) console.info(formatPrefix('info'), message, ...args);
  },

  warn(message: string, ...args: unknown[]): void {
    if (shouldLog('warn')) console.warn(formatPrefix('warn'), message, ...args);
  },

  error(message: string, ...args: unknown[]): void {
    if (shouldLog('error')) console.error(formatPrefix('error'), message, ...args);
  },

  /** Change level at runtime (useful for debugging) */
  setLevel(level: LogLevel): void {
    currentLevel = level;
  },

  getLevel(): LogLevel {
    return currentLevel;
  },
};

export default logger;
