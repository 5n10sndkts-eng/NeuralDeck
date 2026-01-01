import { useEffect, useState, useCallback } from 'react';
import { GlobalAudio } from '../services/audioEngine';
import { useUI } from '../contexts/UIContext';

export const useSoundscape = () => {
    const { mode, activeAgents } = useUI();
    const [isMuted, setIsMuted] = useState(true);
    const [hasInteracted, setHasInteracted] = useState(false);

    // Initial interaction listener
    useEffect(() => {
        const unlockAudio = () => {
            if (!hasInteracted) {
                setHasInteracted(true);
                GlobalAudio.init().catch(console.error);
            }
        };

        window.addEventListener('click', unlockAudio);
        window.addEventListener('keydown', unlockAudio);

        return () => {
            window.removeEventListener('click', unlockAudio);
            window.removeEventListener('keydown', unlockAudio);
        };
    }, [hasInteracted]);

    // Sync Mode from UI Context
    useEffect(() => {
        if (!hasInteracted) return;

        // Determine Audio Mode from UI State
        // If Agents are active -> CODING (Active)
        // If Explicit Mode is set (e.g. ALERT via Red Alert) -> ALERT
        // Default -> IDLE

        let targetMode: 'IDLE' | 'CODING' | 'ALERT' = 'IDLE';

        if (activeAgents.length > 0) targetMode = 'CODING';
        if (mode === 'ALERT') targetMode = 'ALERT'; // Assuming 'ALERT' is a valid mode string in your app

        // Map app modes to audio modes if needed
        // App modes: 'workspace' | 'orchestrator' etc? No, mode is usually ViewMode.
        // Wait, useUI has 'mode' which might be 'CODING' or 'standard'.
        // Let's stick to safe mapping.

        GlobalAudio.setMode(targetMode);

    }, [mode, activeAgents, hasInteracted]);

    const toggleMute = useCallback(async () => {
        const newState = await GlobalAudio.toggle();
        setIsMuted(newState);
    }, []);

    return {
        isMuted,
        toggleMute
    };
};
