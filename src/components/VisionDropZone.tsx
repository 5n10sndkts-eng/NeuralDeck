import React, { useState, useCallback } from 'react';
import { Eye, UploadCloud, Scan, AlertTriangle } from 'lucide-react';
import { useUI } from '../contexts/UIContext';
import { VisionConsentDialog } from './VisionConsentDialog';

interface Props {
    onDrop: (file: File) => void;
    children: React.ReactNode;
}

export const VisionDropZone: React.FC<Props> = ({ onDrop, children }) => {
    const [isDragActive, setIsDragActive] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showConsentDialog, setShowConsentDialog] = useState(false);
    const [pendingFile, setPendingFile] = useState<File | null>(null);
    const { playSound } = useUI();

    const handleDragEnter = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragActive(true);
        setError(null); // Clear any previous errors
        playSound('hover');
    }, [playSound]);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragActive(false);
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const file = e.dataTransfer.files[0];
            
            // Validate file type
            if (!file.type.startsWith('image/')) {
                playSound('error');
                setError('Vision Cortex only accepts image files.');
                return;
            }

            // R-004: Validate file size BEFORE processing (10MB limit)
            const MAX_SIZE = 10 * 1024 * 1024; // 10MB
            if (file.size > MAX_SIZE) {
                playSound('error');
                setError(`Image too large. Max size: 10MB (${(file.size / 1024 / 1024).toFixed(1)}MB provided)`);
                return;
            }

            // R-006: Check for consent before processing
            const consentGranted = localStorage.getItem('vision_consent_granted');
            if (!consentGranted) {
                // First time - show consent dialog
                setPendingFile(file);
                setShowConsentDialog(true);
                return;
            }

            // File is valid and consent granted - proceed
            playSound('success');
            setError(null);
            onDrop(file);
        }
    }, [onDrop, playSound]);

    const handleConsentAccept = useCallback(() => {
        // Store consent in localStorage
        localStorage.setItem('vision_consent_granted', 'true');
        setShowConsentDialog(false);
        
        // Process the pending file
        if (pendingFile) {
            playSound('success');
            onDrop(pendingFile);
            setPendingFile(null);
        }
    }, [pendingFile, onDrop, playSound]);

    const handleConsentDecline = useCallback(() => {
        // User declined - do not process
        setShowConsentDialog(false);
        setPendingFile(null);
        playSound('error');
        setError('Vision processing declined. Use local-only mode if needed.');
    }, [playSound]);

    return (
        <div
            data-testid="vision-drop-zone"
            className="relative w-full h-full"
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            {children}

            {/* Error Toast */}
            {error && (
                <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[60] bg-red-500/90 backdrop-blur-sm border border-red-400 px-4 py-2 rounded flex items-center gap-2 animate-in slide-in-from-top duration-300">
                    <AlertTriangle size={16} className="text-white" />
                    <span className="text-white font-mono text-sm">{error}</span>
                </div>
            )}

            {/* Overlay */}
            {isDragActive && (
                <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm border-2 border-dashed border-cyber-cyan flex flex-col items-center justify-center animate-in fade-in duration-200">
                    <div className="relative group">
                        <div className="absolute inset-0 bg-cyber-cyan blur-2xl opacity-20 group-hover:opacity-40 transition-opacity" />
                        <Scan size={64} className="text-cyber-cyan animate-pulse relative z-10" />
                    </div>
                    <h2 className="mt-4 text-2xl font-display font-bold text-white tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
                        VISUAL CORTEX UPLINK
                    </h2>
                    <p className="mt-2 text-cyber-cyan/70 font-mono text-xs tracking-widest uppercase">
                        Drop Image for Analysis (Max 10MB)
                    </p>

                    {/* Decorators */}
                    <div className="absolute top-4 left-4 w-4 h-4 border-t-2 border-l-2 border-cyber-cyan" />
                    <div className="absolute top-4 right-4 w-4 h-4 border-t-2 border-r-2 border-cyber-cyan" />
                    <div className="absolute bottom-4 left-4 w-4 h-4 border-b-2 border-l-2 border-cyber-cyan" />
                    <div className="absolute bottom-4 right-4 w-4 h-4 border-b-2 border-r-2 border-cyber-cyan" />
                </div>
            )}
            
            {/* R-006: Vision Consent Dialog */}
            {showConsentDialog && (
                <VisionConsentDialog
                    onAccept={handleConsentAccept}
                    onDecline={handleConsentDecline}
                />
            )}
        </div>
    );
};
