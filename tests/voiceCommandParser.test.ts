import { describe, it, expect } from '@jest/globals';
import { parseVoiceCommand, getAvailableCommands, formatCommand } from '../src/services/voiceCommandParser';

describe('Voice Command Parser', () => {
  describe('parseVoiceCommand', () => {
    it('should parse navigation commands', () => {
      const cmd = parseVoiceCommand('show workspace', 1.0, 0.7);
      expect(cmd).not.toBeNull();
      expect(cmd?.action).toBe('navigation:workspace');
      expect(cmd?.confidence).toBeGreaterThanOrEqual(0.7);
    });

    it('should parse agent activation commands', () => {
      const cmd = parseVoiceCommand('activate analyst', 1.0, 0.7);
      expect(cmd).not.toBeNull();
      expect(cmd?.action).toBe('agent:activate');
      expect(cmd?.target).toBe('analyst');
    });

    it('should parse file operation commands', () => {
      const cmd = parseVoiceCommand('create new file', 1.0, 0.7);
      expect(cmd).not.toBeNull();
      expect(cmd?.action).toBe('file:create');
    });

    it('should parse system commands', () => {
      const cmd = parseVoiceCommand('help', 1.0, 0.7);
      expect(cmd).not.toBeNull();
      expect(cmd?.action).toBe('system:help');
    });

    it('should return null for unrecognized commands', () => {
      const cmd = parseVoiceCommand('xyz random gibberish', 1.0, 0.7);
      expect(cmd).toBeNull();
    });

    it('should match commands within longer phrases', () => {
      // The parser uses substring matching, so "help" matches in this phrase
      const cmd = parseVoiceCommand('something close to help', 0.5, 0.7);
      expect(cmd).not.toBeNull();
      expect(cmd?.action).toBe('system:help');
    });

    it('should recover common typos with fuzzy matching', () => {
      const cmd = parseVoiceCommand('show workspce', 0.9, 0.7); // Missing 'a'
      expect(cmd).not.toBeNull();
      expect(cmd?.action).toBe('navigation:workspace');
    });
  });

  describe('getAvailableCommands', () => {
    it('should return all command categories', () => {
      const commands = getAvailableCommands();
      expect(commands).toHaveProperty('navigation');
      expect(commands).toHaveProperty('agent');
      expect(commands).toHaveProperty('file');
      expect(commands).toHaveProperty('system');
    });

    it('should have commands in each category', () => {
      const commands = getAvailableCommands();
      expect(commands.navigation.length).toBeGreaterThan(0);
      expect(commands.agent.length).toBeGreaterThan(0);
      expect(commands.file.length).toBeGreaterThan(0);
      expect(commands.system.length).toBeGreaterThan(0);
    });
  });

  describe('formatCommand', () => {
    it('should format command with target', () => {
      const formatted = formatCommand({
        action: 'agent:activate',
        target: 'analyst',
        confidence: 0.95,
      });
      expect(formatted).toContain('agent');
      expect(formatted).toContain('activate');
      expect(formatted).toContain('analyst');
      expect(formatted).toContain('95%');
    });

    it('should format command without target', () => {
      const formatted = formatCommand({
        action: 'navigation:workspace',
        confidence: 0.85,
      });
      expect(formatted).toContain('navigation');
      expect(formatted).toContain('workspace');
      expect(formatted).toContain('85%');
    });
  });
});
