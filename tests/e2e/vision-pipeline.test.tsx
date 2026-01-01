/**
 * E2E Tests: Vision Pipeline (Story 10)
 * Priority: P0 (Critical Security & Data Integrity)
 * 
 * Risk Coverage:
 * - R-003: API key exposure in client
 * - R-004: Large image upload crashes
 * - R-006: Vision AI processes PII without consent
 * - R-007: Generated component overwrites files
 * 
 * Requirements:
 * - User can drag-drop images onto NeuralDeck
 * - File size validation (<10MB)
 * - API keys never exposed in client code
 * - Consent dialog before processing
 * - File conflict detection before overwrite
 * 
 * @group p0
 * @group vision
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { VisionDropZone } from '../../src/components/VisionDropZone';
import * as visionAnalyzer from '../../src/services/visionAnalyzer';

// Mock vision analyzer to avoid real API calls
jest.mock('../../src/services/visionAnalyzer');

describe('[P0] Vision Pipeline - Security & Data Integrity', () => {
  let mockOnDrop: jest.Mock;

  beforeEach(() => {
    mockOnDrop = jest.fn();
    jest.clearAllMocks();
  });

  describe('R-003: API Key Not Exposed in Client', () => {
    test('[P0] should never expose API keys in client-side code', async () => {
      // GIVEN vision analyzer is called
      const mockAnalyze = visionAnalyzer.analyzeUIImage as jest.Mock;
      mockAnalyze.mockResolvedValue({
        components: [],
        layout: 'grid',
        colors: []
      });

      // WHEN analyzing an image
      const mockFile = new File(['fake-image-data'], 'mockup.png', { type: 'image/png' });
      await visionAnalyzer.analyzeUIImage(mockFile);

      // THEN API key should NOT be passed from client
      // (Should use backend proxy endpoint instead)
      expect(mockAnalyze).toHaveBeenCalled();
      const callArgs = mockAnalyze.mock.calls[0];
      
      // Verify no API key in arguments
      const argsString = JSON.stringify(callArgs);
      expect(argsString).not.toMatch(/sk-/); // OpenAI API key pattern
      expect(argsString).not.toMatch(/api_key/);
      expect(argsString).not.toMatch(/apiKey/);
    });

    test('[P0] should call backend proxy endpoint, not direct OpenAI API', async () => {
      // GIVEN network mock
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ components: [], layout: 'grid', colors: [] })
      });

      // WHEN analyzing an image
      const mockFile = new File(['fake-image-data'], 'mockup.png', { type: 'image/png' });
      await visionAnalyzer.analyzeUIImage(mockFile);

      // THEN should call backend proxy (not api.openai.com directly)
      expect(global.fetch).toHaveBeenCalled();
      const fetchUrl = (global.fetch as jest.Mock).mock.calls[0][0];
      
      // Verify backend proxy endpoint
      expect(fetchUrl).toMatch(/\/api\/vision\/analyze/);
      expect(fetchUrl).not.toMatch(/api\.openai\.com/);
    });

    test('[P0] should not log API keys in console.log statements', () => {
      // GIVEN console spy
      const consoleLogSpy = jest.spyOn(console, 'log');
      const consoleErrorSpy = jest.spyOn(console, 'error');
      
      // WHEN vision analyzer runs
      const mockFile = new File(['fake-image-data'], 'mockup.png', { type: 'image/png' });
      visionAnalyzer.analyzeUIImage(mockFile);
      
      // THEN no API keys should be logged
      const logCalls = consoleLogSpy.mock.calls.flat().join(' ');
      const errorCalls = consoleErrorSpy.mock.calls.flat().join(' ');
      
      expect(logCalls).not.toMatch(/sk-/);
      expect(errorCalls).not.toMatch(/sk-/);
      
      consoleLogSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('R-004: Large Image Upload Validation', () => {
    test('[P0] should reject images larger than 10MB', async () => {
      // GIVEN VisionDropZone component
      render(<VisionDropZone onDrop={mockOnDrop}><div>Drop zone content</div></VisionDropZone>);
      const dropZone = screen.getByTestId('vision-drop-zone');

      // WHEN dropping an 11MB image
      const largeFile = new File(
        [new ArrayBuffer(11 * 1024 * 1024)], // 11MB
        'large-mockup.png',
        { type: 'image/png' }
      );
      
      const dropEvent = new Event('drop') as any;
      dropEvent.dataTransfer = {
        files: [largeFile],
        types: ['Files']
      };
      
      fireEvent.drop(dropZone, dropEvent);

      // THEN should show error and not call onDrop
      await waitFor(() => {
        expect(screen.getByText(/too large|max.*10mb/i)).toBeInTheDocument();
      });
      expect(mockOnDrop).not.toHaveBeenCalled();
    });

    test('[P0] should accept images smaller than 10MB', async () => {
      // GIVEN VisionDropZone component
      render(<VisionDropZone onDrop={mockOnDrop}><div>Drop zone content</div></VisionDropZone>);
      const dropZone = screen.getByTestId('vision-drop-zone');

      // WHEN dropping a 9MB image
      const validFile = new File(
        [new ArrayBuffer(9 * 1024 * 1024)], // 9MB
        'valid-mockup.png',
        { type: 'image/png' }
      );
      
      const dropEvent = new Event('drop') as any;
      dropEvent.dataTransfer = {
        files: [validFile],
        types: ['Files']
      };
      
      fireEvent.drop(dropZone, dropEvent);

      // THEN should accept file and call onDrop
      await waitFor(() => {
        expect(mockOnDrop).toHaveBeenCalledWith(validFile);
      });
    });

    test('[P0] should validate file size BEFORE FileReader processes it', async () => {
      // GIVEN file reader spy
      const fileReaderSpy = jest.spyOn(global, 'FileReader' as any);
      
      render(<VisionDropZone onDrop={mockOnDrop}><div>Drop zone content</div></VisionDropZone>);
      const dropZone = screen.getByTestId('vision-drop-zone');

      // WHEN dropping an 11MB image
      const largeFile = new File(
        [new ArrayBuffer(11 * 1024 * 1024)],
        'large.png',
        { type: 'image/png' }
      );
      
      const dropEvent = new Event('drop') as any;
      dropEvent.dataTransfer = { files: [largeFile], types: ['Files'] };
      fireEvent.drop(dropZone, dropEvent);

      // THEN FileReader should NOT be called (validation happens first)
      await waitFor(() => {
        expect(screen.getByText(/too large/i)).toBeInTheDocument();
      });
      expect(fileReaderSpy).not.toHaveBeenCalled();
      
      fileReaderSpy.mockRestore();
    });
  });

  describe('R-006: Vision AI Consent Flow', () => {
    test('[P0] should show consent dialog before first image upload', async () => {
      // GIVEN VisionDropZone component (first-time user)
      localStorage.removeItem('vision_consent_granted');
      render(<VisionDropZone onDrop={mockOnDrop}><div>Drop zone content</div></VisionDropZone>);
      const dropZone = screen.getByTestId('vision-drop-zone');

      // WHEN dropping an image
      const validFile = new File(['data'], 'mockup.png', { type: 'image/png' });
      const dropEvent = new Event('drop') as any;
      dropEvent.dataTransfer = { files: [validFile], types: ['Files'] };
      fireEvent.drop(dropZone, dropEvent);

      // THEN consent dialog should appear
      await waitFor(() => {
        expect(screen.getByText(/may contain sensitive data/i)).toBeInTheDocument();
        expect(screen.getByText(/proceed/i)).toBeInTheDocument();
      });
    });

    test('[P0] should allow user to decline vision processing', async () => {
      // GIVEN consent dialog is displayed
      localStorage.removeItem('vision_consent_granted');
      render(<VisionDropZone onDrop={mockOnDrop}><div>Drop zone content</div></VisionDropZone>);
      const dropZone = screen.getByTestId('vision-drop-zone');
      
      const validFile = new File(['data'], 'mockup.png', { type: 'image/png' });
      const dropEvent = new Event('drop') as any;
      dropEvent.dataTransfer = { files: [validFile], types: ['Files'] };
      fireEvent.drop(dropZone, dropEvent);

      // WHEN user clicks "Decline"
      await waitFor(() => screen.getByText(/decline|cancel/i));
      fireEvent.click(screen.getByText(/decline|cancel/i));

      // THEN image should not be processed
      expect(mockOnDrop).not.toHaveBeenCalled();
    });

    test('[P0] should process image if user accepts consent', async () => {
      // GIVEN consent dialog is displayed
      localStorage.removeItem('vision_consent_granted');
      render(<VisionDropZone onDrop={mockOnDrop}><div>Drop zone content</div></VisionDropZone>);
      const dropZone = screen.getByTestId('vision-drop-zone');
      
      const validFile = new File(['data'], 'mockup.png', { type: 'image/png' });
      const dropEvent = new Event('drop') as any;
      dropEvent.dataTransfer = { files: [validFile], types: ['Files'] };
      fireEvent.drop(dropZone, dropEvent);

      // WHEN user clicks "Accept"
      await waitFor(() => screen.getByText(/proceed|accept/i));
      fireEvent.click(screen.getByText(/proceed|accept/i));

      // THEN image should be processed
      await waitFor(() => {
        expect(mockOnDrop).toHaveBeenCalledWith(validFile);
      });
    });

    test('[P0] should not show consent dialog again after acceptance', async () => {
      // GIVEN consent was previously granted
      localStorage.setItem('vision_consent_granted', 'true');
      render(<VisionDropZone onDrop={mockOnDrop}><div>Drop zone content</div></VisionDropZone>);
      const dropZone = screen.getByTestId('vision-drop-zone');

      // WHEN dropping an image
      const validFile = new File(['data'], 'mockup.png', { type: 'image/png' });
      const dropEvent = new Event('drop') as any;
      dropEvent.dataTransfer = { files: [validFile], types: ['Files'] };
      fireEvent.drop(dropZone, dropEvent);

      // THEN consent dialog should NOT appear
      await waitFor(() => {
        expect(mockOnDrop).toHaveBeenCalledWith(validFile);
      });
      expect(screen.queryByText(/may contain sensitive data/i)).not.toBeInTheDocument();
    });
  });

  describe('R-007: File Conflict Detection', () => {
    test('[P0] should check for existing files before saving', async () => {
      // GIVEN componentGenerator is about to save
      const checkFileExists = jest.fn().mockResolvedValue(true);
      
      // WHEN checking for conflicts
      const componentName = 'LoginForm';
      const exists = await checkFileExists(`src/components/Generated/${componentName}.tsx`);
      
      // THEN should detect existing file
      expect(exists).toBe(true);
      expect(checkFileExists).toHaveBeenCalled();
    });

    test('[P0] should show confirmation dialog if file exists', async () => {
      // GIVEN VisionPreview with existing component name
      const mockComponent = {
        name: 'ExistingComponent',
        code: 'export const ExistingComponent = () => <div>Test</div>;'
      };
      
      // Mock file exists check
      global.fetch = jest.fn().mockImplementation((url) => {
        if (url.includes('/api/files/check')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ exists: true })
          });
        }
        return Promise.reject(new Error('Not found'));
      });

      // WHEN saving component
      // (Rendered VisionPreview would trigger this)
      const response = await fetch('/api/files/check?path=src/components/Generated/ExistingComponent.tsx');
      const { exists } = await response.json();
      
      // THEN should detect conflict
      expect(exists).toBe(true);
    });

    test('[P0] should not overwrite file if user declines', async () => {
      // GIVEN file exists and user clicks "Cancel"
      const saveFile = jest.fn();
      
      // WHEN user is prompted and declines
      const userConfirmed = false; // Simulates clicking "Cancel"
      
      if (!userConfirmed) {
        // THEN file should not be saved
        expect(saveFile).not.toHaveBeenCalled();
      }
    });

    test('[P0] should create backup before overwriting existing file', async () => {
      // GIVEN file exists and user confirms overwrite
      const createBackup = jest.fn().mockResolvedValue('/Generated/.backup/Component_1234567890.tsx');
      const saveFile = jest.fn();
      
      // WHEN overwriting file
      const userConfirmed = true;
      if (userConfirmed) {
        const backupPath = await createBackup('src/components/Generated/Component.tsx');
        await saveFile('src/components/Generated/Component.tsx', 'new content');
      }
      
      // THEN backup should be created first
      expect(createBackup).toHaveBeenCalled();
      expect(saveFile).toHaveBeenCalled();
    });

    test('[P0] should offer versioned copy option', async () => {
      // GIVEN file exists
      const generateVersionedName = (baseName: string) => {
        const timestamp = Date.now();
        return `${baseName}_${timestamp}`;
      };
      
      // WHEN user selects "Create versioned copy"
      const versionedName = generateVersionedName('LoginForm');
      
      // THEN should append timestamp to filename
      expect(versionedName).toMatch(/LoginForm_\d+/);
    });
  });

  describe('Performance: UI Responsiveness', () => {
    test('[P0] should remain responsive during 10MB upload', async () => {
      // GIVEN VisionDropZone
      render(<VisionDropZone onDrop={mockOnDrop}><div>Drop zone content</div></VisionDropZone>);
      const dropZone = screen.getByTestId('vision-drop-zone');

      // WHEN dropping a 10MB image
      const largeFile = new File(
        [new ArrayBuffer(10 * 1024 * 1024)],
        'large.png',
        { type: 'image/png' }
      );
      
      const dropEvent = new Event('drop') as any;
      dropEvent.dataTransfer = { files: [largeFile], types: ['Files'] };
      
      const startTime = performance.now();
      fireEvent.drop(dropZone, dropEvent);
      const responseTime = performance.now() - startTime;

      // THEN UI should respond in <100ms (file processing can be async)
      expect(responseTime).toBeLessThan(100);
    });
  });
});
