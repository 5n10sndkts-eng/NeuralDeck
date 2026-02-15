import { useState, useEffect } from 'react';
import { useVoice } from './useVoiceInput';
import { parseVoiceCommand } from '../services/voiceCommandParser';
import { AGENT_DEFINITIONS } from '../services/agent';
import type { ViewMode, AgentProfile } from '../types';

interface UseVoiceCommandsOptions {
    onViewChange: (view: ViewMode) => void;
    onAgentSelect: (agent: AgentProfile) => void;
}

export function useVoiceCommands({ onViewChange, onAgentSelect }: UseVoiceCommandsOptions) {
    const voice = useVoice();
    const [showVoiceHelp, setShowVoiceHelp] = useState(false);

    // Process voice transcript into commands
    useEffect(() => {
        if (voice.transcript) {
            const command = parseVoiceCommand(voice.transcript, 1.0, 0.7);
            if (command) {
                const [category, action] = command.action.split(':');

                if (category === 'navigation') {
                    const viewMap: Record<string, ViewMode> = {
                        workspace: 'workspace',
                        construct: 'construct',
                        terminal: 'terminal',
                        dashboard: 'workspace',
                    };
                    if (viewMap[action]) {
                        onViewChange(viewMap[action]);
                    }
                    const agentName = command.target.toLowerCase();
                    const agentEntry = Object.entries(AGENT_DEFINITIONS).find(([_, d]) => d.name.toLowerCase() === agentName);
                    if (agentEntry) {
                        onAgentSelect(agentEntry[0] as AgentProfile);
                    }
                } else if (category === 'system' && action === 'help') {
                    setShowVoiceHelp(true);
                }

                voice.resetTranscript();
            }
        }
    }, [voice.transcript]);

    // Keyboard shortcut for voice toggle (Cmd/Ctrl + Shift + V)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'v') {
                e.preventDefault();
                if (voice.isListening) {
                    voice.stopListening();
                } else {
                    voice.startListening();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [voice]);

    return {
        voice,
        showVoiceHelp,
        setShowVoiceHelp,
    };
}
