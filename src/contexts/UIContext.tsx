import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

import { SoundEffects } from '../services/sound';

export type UIStateMode = 'IDLE' | 'CODING' | 'ALERT' | 'POLLING';
export type SoundType = 'hover' | 'click' | 'boot' | 'alert' | 'typing' | 'success' | 'error';
export type ThemeMode = 'default' | 'war-room';
import { AgentProfile } from '../types';

const THEME_STORAGE_KEY = 'neuraldeck-theme';

interface UIContextType {
    mode: UIStateMode;
    setMode: (mode: UIStateMode) => void;
    isAlert: boolean;
    toggleAlert: () => void;
    playSound: (sound: SoundType) => void;
    activeAgents: AgentProfile[];
    setActiveAgents: (agents: AgentProfile[]) => void;
    // Story 5-1: War Room Theme
    themeMode: ThemeMode;
    isWarRoomActive: boolean;
    toggleWarRoomMode: () => void;
    setThemeMode: (theme: ThemeMode) => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export const UIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [mode, setMode] = useState<UIStateMode>('IDLE');
    const [isAlert, setIsAlert] = useState(false);
    const [activeAgents, setActiveAgents] = useState<AgentProfile[]>([]);

    // Story 5-1: War Room Theme State
    const [themeMode, setThemeModeState] = useState<ThemeMode>(() => {
        // Load persisted theme preference
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem(THEME_STORAGE_KEY);
            if (saved === 'war-room' || saved === 'default') {
                return saved;
            }
        }
        return 'default';
    });

    const toggleAlert = () => setIsAlert(prev => !prev);

    // Connected to Sound Engine
    const playSound = (sound: SoundType) => {
        if (SoundEffects[sound]) {
            SoundEffects[sound]();
        }
    };

    // Story 5-1: Theme Mode Management
    const setThemeMode = useCallback((theme: ThemeMode) => {
        setThemeModeState(theme);
        localStorage.setItem(THEME_STORAGE_KEY, theme);
        console.log('[Theme] Mode changed to:', theme);
    }, []);

    const toggleWarRoomMode = useCallback(() => {
        const newTheme = themeMode === 'war-room' ? 'default' : 'war-room';
        setThemeMode(newTheme);
        // Play alert sound when entering war room
        if (newTheme === 'war-room' && SoundEffects.alert) {
            SoundEffects.alert();
        }
    }, [themeMode, setThemeMode]);

    const isWarRoomActive = themeMode === 'war-room';

    // Apply theme data attribute to document root
    useEffect(() => {
        const root = document.documentElement;
        if (themeMode === 'war-room') {
            root.setAttribute('data-theme', 'war-room');
        } else {
            root.removeAttribute('data-theme');
        }
    }, [themeMode]);

    // Effect: When in ALERT mode, override everything
    useEffect(() => {
        if (isAlert) {
            setMode('ALERT');
        } else if (mode === 'ALERT') {
            setMode('IDLE');
        }
    }, [isAlert]);

    return (
        <UIContext.Provider value={{
            mode,
            setMode,
            isAlert,
            toggleAlert,
            playSound,
            activeAgents,
            setActiveAgents,
            // Story 5-1: War Room Theme
            themeMode,
            isWarRoomActive,
            toggleWarRoomMode,
            setThemeMode,
        }}>
            {children}
        </UIContext.Provider>
    );
};

export const useUI = () => {
    const context = useContext(UIContext);
    if (!context) {
        throw new Error('useUI must be used within a UIProvider');
    }
    return context;
};
