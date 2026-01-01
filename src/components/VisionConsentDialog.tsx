/**
 * Vision Consent Dialog
 * 
 * R-006: Privacy consent before processing images with Vision AI
 * Shows warning that images may contain sensitive data
 * Stores consent in localStorage to avoid repeated prompts
 */

import React from 'react';
import { ShieldAlert, Lock, Eye, AlertTriangle } from 'lucide-react';

interface Props {
    onAccept: () => void;
    onDecline: () => void;
}

export const VisionConsentDialog: React.FC<Props> = ({ onAccept, onDecline }) => {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="relative w-full max-w-md bg-cyber-void border-2 border-cyber-cyan/30 rounded-lg shadow-2xl shadow-cyber-cyan/20 p-6 mx-4 animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="flex items-center gap-3 mb-4">
                    <div className="relative">
                        <div className="absolute inset-0 bg-yellow-500 blur-xl opacity-30" />
                        <ShieldAlert size={32} className="text-yellow-500 relative z-10" />
                    </div>
                    <h2 className="text-xl font-display font-bold text-white tracking-wide">
                        VISION AI CONSENT
                    </h2>
                </div>

                {/* Warning Message */}
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded p-4 mb-4">
                    <div className="flex items-start gap-2">
                        <AlertTriangle size={20} className="text-yellow-500 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-yellow-200/90 font-mono leading-relaxed">
                            <p className="mb-2">
                                This feature analyzes your mockup using AI (GPT-4V). 
                                <strong className="text-yellow-300"> Images may contain sensitive data.</strong>
                            </p>
                            <p>
                                By proceeding, you consent to sending your image to our backend for analysis.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Privacy Points */}
                <div className="space-y-2 mb-6">
                    <div className="flex items-center gap-2 text-cyber-cyan/80 text-sm font-mono">
                        <Lock size={14} />
                        <span>Images processed via secure backend proxy</span>
                    </div>
                    <div className="flex items-center gap-2 text-cyber-cyan/80 text-sm font-mono">
                        <Eye size={14} />
                        <span>API keys never exposed to client</span>
                    </div>
                    <div className="flex items-center gap-2 text-cyber-cyan/80 text-sm font-mono">
                        <ShieldAlert size={14} />
                        <span>You can decline and use local-only mode</span>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                    <button
                        onClick={onDecline}
                        className="flex-1 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-300 rounded font-mono text-sm transition-colors"
                    >
                        DECLINE
                    </button>
                    <button
                        onClick={onAccept}
                        className="flex-1 px-4 py-2 bg-cyber-cyan/20 hover:bg-cyber-cyan/30 border border-cyber-cyan text-cyber-cyan rounded font-mono text-sm transition-colors"
                    >
                        PROCEED
                    </button>
                </div>

                {/* Footer */}
                <p className="mt-4 text-xs text-gray-500 text-center font-mono">
                    Your choice will be remembered. Reset in settings if needed.
                </p>

                {/* Decorators */}
                <div className="absolute top-2 left-2 w-3 h-3 border-t border-l border-cyber-cyan/50" />
                <div className="absolute top-2 right-2 w-3 h-3 border-t border-r border-cyber-cyan/50" />
                <div className="absolute bottom-2 left-2 w-3 h-3 border-b border-l border-cyber-cyan/50" />
                <div className="absolute bottom-2 right-2 w-3 h-3 border-b border-r border-cyber-cyan/50" />
            </div>
        </div>
    );
};
