import { useState, useEffect } from 'react';
import { GlobalAudio } from '../services/audioEngine';
import type { AmbientMood } from '../services/ambientGenerator';

interface UseAudioSystemOptions {
    uiMode: string;
    activeAgentCount: number;
}

export function useAudioSystem({ uiMode, activeAgentCount }: UseAudioSystemOptions) {
    const [isMuted, setIsMuted] = useState(false);
    const [audioVolume, setAudioVolume] = useState(() => {
        const saved = localStorage.getItem('audio_volume');
        return saved ? parseFloat(saved) : 0.4;
    });
    const [audioMood, setAudioMood] = useState<AmbientMood>(() => {
        const saved = localStorage.getItem('audio_mood');
        return (saved as AmbientMood) || 'focus';
    });

    // Persist volume and mood
    useEffect(() => { localStorage.setItem('audio_volume', audioVolume.toString()); }, [audioVolume]);
    useEffect(() => { localStorage.setItem('audio_mood', audioMood); }, [audioMood]);

    // Initialize GlobalAudio and sync initial state
    useEffect(() => {
        GlobalAudio.init(audioVolume, audioMood);
        GlobalAudio.setMuted(isMuted);
        GlobalAudio.setMode(uiMode === 'ALERT' ? 'ALERT' : (uiMode === 'CODING' ? 'CODING' : 'IDLE'));

        if (activeAgentCount === 0) {
            GlobalAudio.setAgentState('idle');
        } else if (activeAgentCount === 1) {
            GlobalAudio.setAgentState('working');
        } else {
            GlobalAudio.setAgentState('swarm');
        }
    }, []);

    // Auto-update GlobalAudio mode based on UI phase
    useEffect(() => {
        GlobalAudio.setMode(uiMode === 'ALERT' ? 'ALERT' : (uiMode === 'CODING' ? 'CODING' : 'IDLE'));
    }, [uiMode]);

    // Update GlobalAudio based on agent state
    useEffect(() => {
        if (activeAgentCount === 0) {
            GlobalAudio.setAgentState('idle');
        } else if (activeAgentCount === 1) {
            GlobalAudio.setAgentState('working');
        } else {
            GlobalAudio.setAgentState('swarm');
        }
    }, [activeAgentCount]);

    // Handle mute/volume changes
    useEffect(() => {
        GlobalAudio.init(audioVolume, audioMood);
    }, [isMuted, audioVolume]);

    // Keyboard shortcut for mute (M key)
    useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent) => {
            if (e.key === 'm' && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
                const target = e.target as HTMLElement;
                if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
                    setIsMuted(prev => !prev);
                }
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, []);

    const toggleAudio = async () => {
        const muted = await GlobalAudio.toggle();
        setIsMuted(muted);
    };

    return {
        isMuted,
        setIsMuted,
        audioVolume,
        setAudioVolume,
        audioMood,
        setAudioMood,
        toggleAudio,
    };
}
