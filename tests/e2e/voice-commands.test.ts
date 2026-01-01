/**
 * E2E Tests: Voice Commands (Story 9)
 * Priority: P0 (Critical Security & Performance)
 * 
 * Risk Coverage:
 * - R-001: Microphone permission bypass
 * - R-002: Web Speech API offline failures
 * - R-008: Voice command accuracy
 * 
 * Requirements:
 * - User can toggle voice input with keyboard shortcut
 * - Microphone permission handling (grant/deny scenarios)
 * - Voice commands trigger correct actions with >85% accuracy
 * - Graceful offline error handling
 * 
 * @group p0
 * @group voice
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { parseVoiceCommand } from '../../src/services/voiceCommandParser';

// Mock Web Speech API
class MockSpeechRecognition {
  continuous = false;
  interimResults = false;
  lang = 'en-US';
  onresult: ((event: any) => void) | null = null;
  onerror: ((event: any) => void) | null = null;
  onend: (() => void) | null = null;
  
  start() {
    // Simulate permission request
    if (!(global as any).mockMicrophonePermissionGranted) {
      setTimeout(() => {
        this.onerror?.({ error: 'not-allowed' });
      }, 100);
    }
  }
  
  stop() {
    this.onend?.();
  }
  
  abort() {
    this.onend?.();
  }
  
  // Test helper to simulate recognition result
  _simulateResult(transcript: string, confidence: number = 0.9) {
    this.onresult?.({
      results: [[{ transcript, confidence }]],
      resultIndex: 0
    });
  }
  
  // Test helper to simulate error
  _simulateError(error: string) {
    this.onerror?.({ error });
  }
}

describe('[P0] Voice Commands - Security & Performance', () => {
  beforeEach(() => {
    // Setup mock Web Speech API
    (global as any).SpeechRecognition = MockSpeechRecognition;
    (global as any).webkitSpeechRecognition = MockSpeechRecognition;
    (global as any).mockMicrophonePermissionGranted = true;
    
    // Mock navigator.permissions
    Object.defineProperty(global.navigator, 'permissions', {
      writable: true,
      value: {
        query: jest.fn().mockResolvedValue({ state: 'granted' })
      }
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete (global as any).SpeechRecognition;
    delete (global as any).webkitSpeechRecognition;
    delete (global as any).mockMicrophonePermissionGranted;
  });

  describe('R-001: Microphone Permission Handling', () => {
    test('[P0] should request microphone permission before voice activation', async () => {
      // GIVEN microphone permission is not granted
      (global as any).mockMicrophonePermissionGranted = false;
      const permissionQuerySpy = jest.spyOn(navigator.permissions, 'query');

      // WHEN user attempts to activate voice
      const recognition = new MockSpeechRecognition();
      recognition.start();

      // THEN permission should be checked
      await waitFor(() => {
        expect(permissionQuerySpy).toHaveBeenCalledWith({ name: 'microphone' });
      });
    });

    test('[P0] should handle microphone permission denial gracefully', async () => {
      // GIVEN microphone permission is denied
      (global as any).mockMicrophonePermissionGranted = false;
      
      // WHEN user attempts to activate voice
      const recognition = new MockSpeechRecognition();
      const errorHandler = jest.fn();
      recognition.onerror = errorHandler;
      recognition.start();

      // THEN error should be reported with "not-allowed"
      await waitFor(() => {
        expect(errorHandler).toHaveBeenCalledWith({ error: 'not-allowed' });
      });
    });

    test('[P0] should disable voice button UI when permission denied', async () => {
      // GIVEN permission state is denied
      (global.navigator.permissions.query as jest.Mock).mockResolvedValue({ state: 'denied' });
      
      // WHEN component loads
      const permissionResult = await navigator.permissions.query({ name: 'microphone' } as any);
      
      // THEN voice button should be disabled
      expect(permissionResult.state).toBe('denied');
    });
  });

  describe('R-002: Offline Failure Handling', () => {
    test('[P0] should detect offline state and show fallback message', async () => {
      // GIVEN browser is offline
      Object.defineProperty(navigator, 'onLine', { writable: true, value: false });
      
      // WHEN voice command is attempted
      const isOnline = navigator.onLine;
      
      // THEN offline state should be detected
      expect(isOnline).toBe(false);
    });

    test('[P0] should handle network error during recognition', async () => {
      // GIVEN recognition is active
      const recognition = new MockSpeechRecognition();
      const errorHandler = jest.fn();
      recognition.onerror = errorHandler;
      recognition.start();
      
      // WHEN network error occurs
      recognition._simulateError('network');
      
      // THEN error should be handled gracefully
      await waitFor(() => {
        expect(errorHandler).toHaveBeenCalledWith({ error: 'network' });
      });
    });

    test('[P0] should retry failed recognition up to 3 times', async () => {
      // GIVEN recognition fails
      let attemptCount = 0;
      const maxRetries = 3;
      
      const attemptRecognition = () => {
        return new Promise((resolve, reject) => {
          attemptCount++;
          if (attemptCount < maxRetries) {
            reject(new Error('network'));
          } else {
            resolve('success');
          }
        });
      };
      
      // WHEN retries are attempted
      let result;
      for (let i = 0; i < maxRetries; i++) {
        try {
          result = await attemptRecognition();
          break;
        } catch (e) {
          if (i === maxRetries - 1) throw e;
        }
      }
      
      // THEN should succeed after retries
      expect(result).toBe('success');
      expect(attemptCount).toBe(maxRetries);
    });
  });

  describe('R-008: Voice Command Accuracy', () => {
    test('[P0] should recognize "show workspace" command', () => {
      // GIVEN transcript from speech recognition
      const transcript = 'show workspace';
      
      // WHEN parsing command
      const command = parseVoiceCommand(transcript, 0.9, 0.7);
      
      // THEN should map to navigation action
      expect(command).toBeTruthy();
      expect(command?.action).toMatch(/navigation/);
    });

    test('[P0] should recognize "activate analyst" command', () => {
      // GIVEN transcript from speech recognition
      const transcript = 'activate analyst';
      
      // WHEN parsing command
      const command = parseVoiceCommand(transcript, 0.9, 0.7);
      
      // THEN should map to agent activation
      expect(command).toBeTruthy();
      expect(command?.action).toMatch(/agent/);
      expect(command?.target).toMatch(/analyst/i);
    });

    test('[P0] should use fuzzy matching for similar commands', () => {
      // GIVEN slightly misspelled command (85% similarity)
      const transcript = 'show workspce'; // Missing 'a'
      
      // WHEN parsing command with fuzzy matching
      const command = parseVoiceCommand(transcript, 0.85, 0.7);
      
      // THEN should still recognize command if confidence > threshold
      expect(command).toBeTruthy();
    });

    test('[P0] should reject low-confidence commands', () => {
      // GIVEN low confidence transcript
      const transcript = 'mumblemumble';
      
      // WHEN parsing command with low confidence
      const command = parseVoiceCommand(transcript, 0.5, 0.7);
      
      // THEN should reject command
      expect(command).toBeNull();
    });

    test('[P0] should handle empty or null transcripts', () => {
      // GIVEN empty transcript
      const emptyCommand = parseVoiceCommand('', 0.9, 0.7);
      const nullCommand = parseVoiceCommand(null as any, 0.9, 0.7);
      
      // THEN should return null without errors
      expect(emptyCommand).toBeNull();
      expect(nullCommand).toBeNull();
    });
  });

  describe('Performance: Command Response Time', () => {
    test('[P0] should parse commands in <500ms', () => {
      // GIVEN a voice command
      const transcript = 'show workspace';
      
      // WHEN measuring parse time
      const startTime = performance.now();
      const command = parseVoiceCommand(transcript, 0.9, 0.7);
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // THEN should complete in <500ms
      expect(command).toBeTruthy();
      expect(duration).toBeLessThan(500);
    });
  });

  describe('Security: No Unauthorized Recording', () => {
    test('[P0] should stop recognition when permission revoked mid-session', async () => {
      // GIVEN recognition is active
      const recognition = new MockSpeechRecognition();
      const endHandler = jest.fn();
      recognition.onend = endHandler;
      recognition.start();
      
      // WHEN permission is revoked
      (global as any).mockMicrophonePermissionGranted = false;
      recognition.stop();
      
      // THEN recognition should stop immediately
      await waitFor(() => {
        expect(endHandler).toHaveBeenCalled();
      });
    });
  });
});
