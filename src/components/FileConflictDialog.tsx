/**
 * File Conflict Dialog
 * 
 * R-007: Prevents accidental file overwrites
 * Shows when generated component would overwrite existing file
 * Offers: Overwrite, Create Version, or Cancel
 */

import React from 'react';
import { AlertTriangle, FileWarning, Save, Copy, X } from 'lucide-react';

interface Props {
    fileName: string;
    onOverwrite: () => void;
    onCreateVersion: () => void;
    onCancel: () => void;
}

export const FileConflictDialog: React.FC<Props> = ({ 
    fileName, 
    onOverwrite, 
    onCreateVersion, 
    onCancel 
}) => {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="relative w-full max-w-lg bg-cyber-void border-2 border-yellow-500/50 rounded-lg shadow-2xl shadow-yellow-500/20 p-6 mx-4 animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="flex items-center gap-3 mb-4">
                    <div className="relative">
                        <div className="absolute inset-0 bg-yellow-500 blur-xl opacity-30" />
                        <FileWarning size={32} className="text-yellow-500 relative z-10" />
                    </div>
                    <h2 className="text-xl font-display font-bold text-white tracking-wide">
                        FILE CONFLICT DETECTED
                    </h2>
                </div>

                {/* Warning Message */}
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded p-4 mb-6">
                    <div className="flex items-start gap-2">
                        <AlertTriangle size={20} className="text-yellow-500 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-yellow-200/90 font-mono leading-relaxed">
                            <p className="mb-2">
                                The file <strong className="text-yellow-300">{fileName}</strong> already exists.
                            </p>
                            <p>
                                Choose an action below to prevent data loss.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Options */}
                <div className="space-y-3 mb-6">
                    {/* Option 1: Overwrite (with backup) */}
                    <button
                        onClick={onOverwrite}
                        className="w-full flex items-center gap-3 px-4 py-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded transition-colors group"
                    >
                        <Save size={20} className="text-red-400" />
                        <div className="flex-1 text-left">
                            <div className="text-red-300 font-mono text-sm font-bold">
                                Overwrite Existing File
                            </div>
                            <div className="text-red-400/70 font-mono text-xs mt-0.5">
                                Backup will be created before overwriting
                            </div>
                        </div>
                    </button>

                    {/* Option 2: Create Versioned Copy */}
                    <button
                        onClick={onCreateVersion}
                        className="w-full flex items-center gap-3 px-4 py-3 bg-cyber-cyan/10 hover:bg-cyber-cyan/20 border border-cyber-cyan/30 rounded transition-colors group"
                    >
                        <Copy size={20} className="text-cyber-cyan" />
                        <div className="flex-1 text-left">
                            <div className="text-cyber-cyan font-mono text-sm font-bold">
                                Create Versioned Copy
                            </div>
                            <div className="text-cyber-cyan/70 font-mono text-xs mt-0.5">
                                Save as {fileName.replace('.tsx', '_' + Date.now() + '.tsx')}
                            </div>
                        </div>
                    </button>

                    {/* Option 3: Cancel */}
                    <button
                        onClick={onCancel}
                        className="w-full flex items-center gap-3 px-4 py-3 bg-gray-500/10 hover:bg-gray-500/20 border border-gray-500/30 rounded transition-colors group"
                    >
                        <X size={20} className="text-gray-400" />
                        <div className="flex-1 text-left">
                            <div className="text-gray-300 font-mono text-sm font-bold">
                                Cancel
                            </div>
                            <div className="text-gray-400/70 font-mono text-xs mt-0.5">
                                Discard generated component
                            </div>
                        </div>
                    </button>
                </div>

                {/* Footer */}
                <p className="text-xs text-gray-500 text-center font-mono">
                    Recommended: Create versioned copy to preserve both versions
                </p>

                {/* Decorators */}
                <div className="absolute top-2 left-2 w-3 h-3 border-t border-l border-yellow-500/50" />
                <div className="absolute top-2 right-2 w-3 h-3 border-t border-r border-yellow-500/50" />
                <div className="absolute bottom-2 left-2 w-3 h-3 border-b border-l border-yellow-500/50" />
                <div className="absolute bottom-2 right-2 w-3 h-3 border-b border-r border-yellow-500/50" />
            </div>
        </div>
    );
};
