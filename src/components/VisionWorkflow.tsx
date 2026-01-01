/**
 * Example: VisionWorkflow Component
 * 
 * Demonstrates complete R-007 file conflict workflow:
 * 1. Analyze image with Vision AI
 * 2. Generate component code
 * 3. Check for file conflicts
 * 4. Show FileConflictDialog if needed
 * 5. Save with user's chosen mode (versioned/overwrite/cancel)
 */

import React, { useState } from 'react';
import { VisionDropZone } from './VisionDropZone';
import { FileConflictDialog } from './FileConflictDialog';
import { analyzeUIImage } from '../services/visionAnalyzer';
import { generateComponent, checkComponentExists, saveGeneratedComponent } from '../services/componentGenerator';

export const VisionWorkflow: React.FC = () => {
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [conflictFileName, setConflictFileName] = useState('');
  const [pendingComponent, setPendingComponent] = useState<{ code: string; filePath: string } | null>(null);
  const [status, setStatus] = useState<string>('');

  const handleImageDrop = async (file: File) => {
    try {
      setStatus('Analyzing image...');
      
      // Convert file to data URL
      const reader = new FileReader();
      const dataUrl = await new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });

      // Analyze with Vision AI (backend proxy)
      const analysis = await analyzeUIImage(dataUrl);
      setStatus('Generating component...');

      // Generate component code
      const componentName = 'GeneratedComponent'; // Could be derived from analysis
      const component = generateComponent(componentName, analysis);

      // R-007: Check if file exists
      const exists = await checkComponentExists(component.filePath);

      if (exists) {
        // Show conflict dialog
        setConflictFileName(componentName);
        setPendingComponent({
          code: component.code,
          filePath: component.filePath
        });
        setShowConflictDialog(true);
        setStatus('File conflict detected - waiting for user decision');
      } else {
        // File doesn't exist - save directly with versioned mode
        const result = await saveGeneratedComponent(component, 'versioned');
        setStatus(`✅ Component saved: ${result.path}`);
      }
    } catch (error) {
      console.error('Vision workflow error:', error);
      setStatus(`❌ Error: ${(error as Error).message}`);
    }
  };

  const handleOverwrite = async () => {
    if (!pendingComponent) return;

    try {
      setStatus('Creating backup and overwriting...');
      
      const result = await saveGeneratedComponent(
        { 
          name: conflictFileName, 
          code: pendingComponent.code, 
          filePath: pendingComponent.filePath 
        },
        'overwrite' // Auto-creates backup
      );

      setShowConflictDialog(false);
      setPendingComponent(null);
      setStatus(`✅ Component overwritten: ${result.path} (backup created)`);
    } catch (error) {
      console.error('Overwrite error:', error);
      setStatus(`❌ Overwrite failed: ${(error as Error).message}`);
    }
  };

  const handleCreateVersion = async () => {
    if (!pendingComponent) return;

    try {
      setStatus('Creating versioned copy...');
      
      const result = await saveGeneratedComponent(
        { 
          name: conflictFileName, 
          code: pendingComponent.code, 
          filePath: pendingComponent.filePath 
        },
        'versioned' // Appends timestamp
      );

      setShowConflictDialog(false);
      setPendingComponent(null);
      setStatus(`✅ Versioned component created: ${result.path}`);
    } catch (error) {
      console.error('Versioning error:', error);
      setStatus(`❌ Versioning failed: ${(error as Error).message}`);
    }
  };

  const handleCancel = () => {
    setShowConflictDialog(false);
    setPendingComponent(null);
    setStatus('❌ Component generation cancelled');
  };

  return (
    <div className="relative w-full h-screen">
      <VisionDropZone onDrop={handleImageDrop}>
        <div className="flex flex-col items-center justify-center h-full p-8">
          <h1 className="text-4xl font-display font-bold text-cyber-cyan mb-4">
            VISION AI COMPONENT GENERATOR
          </h1>
          <p className="text-cyber-cyan/70 font-mono text-sm mb-8">
            Drag and drop UI mockup to generate React component
          </p>
          
          {/* Status Display */}
          {status && (
            <div className="bg-black/40 border border-cyber-cyan/30 rounded px-6 py-3 font-mono text-sm text-cyber-cyan">
              {status}
            </div>
          )}
        </div>
      </VisionDropZone>

      {/* R-007: File Conflict Dialog */}
      {showConflictDialog && (
        <FileConflictDialog
          fileName={conflictFileName}
          onOverwrite={handleOverwrite}
          onCreateVersion={handleCreateVersion}
          onCancel={handleCancel}
        />
      )}
    </div>
  );
};
