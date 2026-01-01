import React, { useEffect, useState } from 'react';
import { X, Scan, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { HoloPanel } from './HoloPanel';

interface VisionPreviewProps {
    file: File | null;
    onClose: () => void;
    analysisLog: string[];
}

export const VisionPreview: React.FC<VisionPreviewProps> = ({ file, onClose, analysisLog }) => {
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    useEffect(() => {
        if (file) {
            const url = URL.createObjectURL(file);
            setPreviewUrl(url);
            return () => URL.revokeObjectURL(url);
        } else {
            setPreviewUrl(null);
        }
    }, [file]);

    if (!file) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="fixed inset-0 z-[100] flex items-center justify-center p-8 pointer-events-none"
            >
                <div className="pointer-events-auto w-full max-w-4xl">
                    <HoloPanel variant="glass" title="VISUAL CORTEX ANALYSIS" className="relative">
                        {/* Close Button */}
                        <button
                            onClick={onClose}
                            className="absolute top-2 right-2 z-10 p-2 text-cyber-cyan hover:text-cyan-400 transition-colors"
                            aria-label="Close preview"
                        >
                            <X size={20} />
                        </button>

                        <div className="p-6 space-y-4">
                            {/* Image Preview */}
                            {previewUrl && (
                                <div className="relative w-full aspect-video bg-black/50 rounded border border-cyber-cyan/30 overflow-hidden">
                                    <img
                                        src={previewUrl}
                                        alt="Vision analysis preview"
                                        className="w-full h-full object-contain"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                                    
                                    {/* Scan Overlay Effect */}
                                    <div className="absolute inset-0 pointer-events-none">
                                        <motion.div
                                            className="absolute top-0 left-0 right-0 h-1 bg-cyber-cyan/50"
                                            initial={{ y: 0 }}
                                            animate={{ y: '100%' }}
                                            transition={{
                                                duration: 2,
                                                repeat: Infinity,
                                                ease: 'linear'
                                            }}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Analysis Log */}
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-cyber-cyan/70 font-mono text-xs uppercase tracking-widest">
                                    <Scan size={14} />
                                    <span>ANALYSIS LOG</span>
                                </div>
                                <div className="bg-black/40 rounded border border-cyber-cyan/20 p-4 font-mono text-xs text-cyber-cyan/90 max-h-48 overflow-y-auto space-y-1">
                                    {analysisLog.length === 0 ? (
                                        <div className="text-cyber-cyan/50 italic">Waiting for analysis...</div>
                                    ) : (
                                        analysisLog.map((log, idx) => (
                                            <motion.div
                                                key={idx}
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                className="flex items-start gap-2"
                                            >
                                                <span className="text-cyber-cyan/50">[{idx + 1}]</span>
                                                <span>{log}</span>
                                            </motion.div>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* File Info */}
                            <div className="flex items-center justify-between text-xs text-cyber-cyan/70 font-mono">
                                <div className="flex items-center gap-2">
                                    <Eye size={14} />
                                    <span>{file.name}</span>
                                </div>
                                <span>{(file.size / 1024).toFixed(1)} KB</span>
                            </div>
                        </div>
                    </HoloPanel>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

