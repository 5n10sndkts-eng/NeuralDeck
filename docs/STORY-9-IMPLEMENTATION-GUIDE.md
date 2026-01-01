---
story: 9
epic: 3
title: "Voice Command Core - Complete Implementation Guide"
status: READY_FOR_DEVELOPMENT
owner: Amelia + Barry
---

# Story 9: Voice Command Core - Implementation Guide

**Epic:** 3 - Omnipresence  
**Priority:** P0  
**Estimated Effort:** 5 days  
**Story Points:** 8

---

## Implementation Overview

This guide provides complete specifications for implementing voice command functionality using the Web Speech API, enabling hands-free control of NeuralDeck.

---

## Technical Architecture

### Component Hierarchy
```
App.tsx
├─ VoiceCommandProvider (Context)
│  └─ useVoiceInput (Hook)
├─ VoiceVisualizer.tsx (UI Component)
└─ voiceCommandParser.ts (Service)
```

### Data Flow
```
User Speech → Web Speech API → Recognition Event → 
Command Parser → Command Executor → App State Update → UI Feedback
```

---

## Step 1: Create Voice Input Hook

**File:** `src/hooks/useVoiceInput.ts`

```typescript
import { useState, useEffect, useCallback } from 'react';

interface VoiceCommand {
  transcript: string;
  confidence: number;
  timestamp: Date;
}

interface UseVoiceInputOptions {
  continuous?: boolean;
  language?: string;
  interimResults?: boolean;
}

export const useVoiceInput = (options: UseVoiceInputOptions = {}) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [confidence, setConfidence] = useState(0);
  const [isSupported, setIsSupported] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);

  useEffect(() => {
    // Check browser support
    const SpeechRecognition = (window as any).SpeechRecognition || 
                              (window as any).webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      setIsSupported(true);
      const recognitionInstance = new SpeechRecognition();
      
      recognitionInstance.continuous = options.continuous ?? true;
      recognitionInstance.interimResults = options.interimResults ?? true;
      recognitionInstance.lang = options.language ?? 'en-US';
      
      recognitionInstance.onresult = (event: any) => {
        const lastResult = event.results[event.results.length - 1];
        const transcriptText = lastResult[0].transcript;
        const confidenceScore = lastResult[0].confidence;
        
        setTranscript(transcriptText);
        setConfidence(confidenceScore);
      };
      
      recognitionInstance.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };
      
      recognitionInstance.onend = () => {
        setIsListening(false);
      };
      
      setRecognition(recognitionInstance);
    }
  }, []);

  const startListening = useCallback(() => {
    if (recognition) {
      recognition.start();
      setIsListening(true);
    }
  }, [recognition]);

  const stopListening = useCallback(() => {
    if (recognition) {
      recognition.stop();
      setIsListening(false);
    }
  }, [recognition]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  return {
    isListening,
    transcript,
    confidence,
    isSupported,
    startListening,
    stopListening,
    toggleListening
  };
};
```

---

## Step 2: Create Command Parser Service

**File:** `src/services/voiceCommandParser.ts`

```typescript
export type CommandType = 'navigation' | 'agent' | 'file' | 'system';

export interface ParsedCommand {
  type: CommandType;
  action: string;
  parameters?: any;
  confidence: number;
}

// Command vocabulary with fuzzy matching
const COMMAND_PATTERNS = {
  navigation: [
    { pattern: /show\s+(workspace|terminal|construct|immerse)/i, action: 'navigate' },
    { pattern: /open\s+(workspace|terminal|construct|immerse)/i, action: 'navigate' },
    { pattern: /switch\s+to\s+(workspace|terminal|construct|immerse)/i, action: 'navigate' }
  ],
  agent: [
    { pattern: /activate\s+(analyst|architect|developer|pm)/i, action: 'activate' },
    { pattern: /run\s+(analyst|architect|developer|pm)/i, action: 'activate' },
    { pattern: /start\s+swarm/i, action: 'startSwarm' },
    { pattern: /stop\s+(agents|swarm)/i, action: 'stopAgents' }
  ],
  file: [
    { pattern: /open\s+file\s+(.+)/i, action: 'openFile' },
    { pattern: /create\s+(new\s+)?file\s+(.+)/i, action: 'createFile' },
    { pattern: /save\s+(all|file)/i, action: 'save' }
  ],
  system: [
    { pattern: /help/i, action: 'showHelp' },
    { pattern: /repeat\s+last/i, action: 'repeatLast' },
    { pattern: /cancel/i, action: 'cancel' }
  ]
};

export const parseVoiceCommand = (
  transcript: string,
  confidence: number
): ParsedCommand | null => {
  const normalizedTranscript = transcript.toLowerCase().trim();
  
  // Minimum confidence threshold
  if (confidence < 0.7) {
    return null;
  }
  
  // Try to match against all patterns
  for (const [type, patterns] of Object.entries(COMMAND_PATTERNS)) {
    for (const { pattern, action } of patterns) {
      const match = normalizedTranscript.match(pattern);
      if (match) {
        return {
          type: type as CommandType,
          action,
          parameters: match.slice(1),
          confidence
        };
      }
    }
  }
  
  return null;
};

// Fuzzy string matching for error tolerance
export const fuzzyMatch = (input: string, target: string): number => {
  const inputLower = input.toLowerCase();
  const targetLower = target.toLowerCase();
  
  if (inputLower === targetLower) return 1.0;
  if (targetLower.includes(inputLower)) return 0.8;
  if (inputLower.includes(targetLower)) return 0.7;
  
  // Levenshtein distance-based matching
  const distance = levenshteinDistance(inputLower, targetLower);
  const maxLength = Math.max(inputLower.length, targetLower.length);
  return 1 - (distance / maxLength);
};

function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2[i - 1] === str1[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}
```

---

## Step 3: Create Voice Visualizer Component

**File:** `src/components/VoiceVisualizer.tsx`

```typescript
import React, { useEffect, useRef } from 'react';
import { Mic, MicOff } from 'lucide-react';

interface VoiceVisualizerProps {
  isListening: boolean;
  transcript: string;
  confidence: number;
  onToggle: () => void;
}

export const VoiceVisualizer: React.FC<VoiceVisualizerProps> = ({
  isListening,
  transcript,
  confidence,
  onToggle
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Animated waveform visualization
  useEffect(() => {
    if (!isListening || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    let animationId: number;
    let time = 0;
    
    const drawWaveform = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      
      for (let x = 0; x < canvas.width; x++) {
        const y = canvas.height / 2 + 
                  Math.sin((x + time) * 0.05) * 20 * confidence;
        if (x === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      
      ctx.stroke();
      time += 2;
      animationId = requestAnimationFrame(drawWaveform);
    };
    
    drawWaveform();
    
    return () => cancelAnimationFrame(animationId);
  }, [isListening, confidence]);
  
  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="glass-panel p-4 rounded-lg shadow-neon-cyan">
        {/* Toggle Button */}
        <button
          onClick={onToggle}
          className={`p-3 rounded-full transition-all ${
            isListening 
              ? 'bg-red-500 animate-pulse' 
              : 'bg-cyber-cyan hover:bg-cyan-400'
          }`}
        >
          {isListening ? <Mic size={24} /> : <MicOff size={24} />}
        </button>
        
        {/* Waveform Canvas */}
        {isListening && (
          <canvas
            ref={canvasRef}
            width={200}
            height={50}
            className="mt-2"
          />
        )}
        
        {/* Transcript Display */}
        {transcript && (
          <div className="mt-2 max-w-xs">
            <p className="text-xs text-cyber-cyan font-mono">
              {transcript}
            </p>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-xs text-gray-400">Confidence:</span>
              <div className="flex-1 h-1 bg-gray-700 rounded">
                <div 
                  className="h-full bg-cyber-cyan rounded transition-all"
                  style={{ width: `${confidence * 100}%` }}
                />
              </div>
              <span className="text-xs text-gray-400">
                {(confidence * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        )}
        
        {/* Status */}
        <p className="mt-2 text-xs font-mono text-center">
          {isListening ? (
            <span className="text-green-400">● LISTENING</span>
          ) : (
            <span className="text-gray-400">○ READY</span>
          )}
        </p>
      </div>
    </div>
  );
};
```

---

## Step 4: Integrate with App.tsx

**Modifications to:** `src/App.tsx`

```typescript
// Add imports
import { useVoiceInput } from './hooks/useVoiceInput';
import { parseVoiceCommand } from './services/voiceCommandParser';
import { VoiceVisualizer } from './components/VoiceVisualizer';

// Inside App component
const {
  isListening,
  transcript,
  confidence,
  isSupported,
  toggleListening
} = useVoiceInput();

// Add keyboard shortcut (Cmd/Ctrl + Shift + V)
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'V') {
      e.preventDefault();
      toggleListening();
    }
  };
  
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [toggleListening]);

// Parse and execute voice commands
useEffect(() => {
  if (!transcript) return;
  
  const command = parseVoiceCommand(transcript, confidence);
  if (command) {
    executeVoiceCommand(command);
  }
}, [transcript, confidence]);

// Command executor
const executeVoiceCommand = (command: ParsedCommand) => {
  switch (command.type) {
    case 'navigation':
      if (command.action === 'navigate' && command.parameters?.[0]) {
        setCurrentView(command.parameters[0] as ViewMode);
      }
      break;
    case 'agent':
      if (command.action === 'activate' && command.parameters?.[0]) {
        // Activate specific agent
        activateAgent(command.parameters[0]);
      } else if (command.action === 'startSwarm') {
        // Trigger swarm mode
        startSwarmMode();
      }
      break;
    case 'file':
      if (command.action === 'openFile' && command.parameters?.[1]) {
        handleFileOpen(command.parameters[1]);
      }
      break;
    case 'system':
      if (command.action === 'showHelp') {
        setShowHelp(true);
      }
      break;
  }
};

// Add to JSX
{isSupported && (
  <VoiceVisualizer
    isListening={isListening}
    transcript={transcript}
    confidence={confidence}
    onToggle={toggleListening}
  />
)}
```

---

## Step 5: Add Voice Command Help Modal

**File:** `src/components/VoiceCommandHelp.tsx`

```typescript
import React from 'react';
import { X } from 'lucide-react';

interface VoiceCommandHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VoiceCommandHelp: React.FC<VoiceCommandHelpProps> = ({
  isOpen,
  onClose
}) => {
  if (!isOpen) return null;
  
  const commandCategories = [
    {
      category: 'Navigation',
      commands: [
        { phrase: 'Show workspace', description: 'Navigate to workspace view' },
        { phrase: 'Open construct', description: 'Open 3D construct view' },
        { phrase: 'Show terminal', description: 'Open terminal view' }
      ]
    },
    {
      category: 'Agents',
      commands: [
        { phrase: 'Activate analyst', description: 'Start analyst agent' },
        { phrase: 'Run architect', description: 'Start architect agent' },
        { phrase: 'Start swarm', description: 'Trigger parallel swarm mode' },
        { phrase: 'Stop agents', description: 'Halt all active agents' }
      ]
    },
    {
      category: 'System',
      commands: [
        { phrase: 'Help', description: 'Show this help dialog' },
        { phrase: 'Cancel', description: 'Cancel current operation' }
      ]
    }
  ];
  
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80">
      <div className="glass-panel w-full max-w-2xl p-6 rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-display text-cyber-cyan">
            Voice Commands
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={24} />
          </button>
        </div>
        
        <p className="text-sm text-gray-400 mb-6">
          Press <kbd className="px-2 py-1 bg-gray-800 rounded">Cmd/Ctrl + Shift + V</kbd> to toggle voice input
        </p>
        
        {commandCategories.map(({ category, commands }) => (
          <div key={category} className="mb-6">
            <h3 className="text-lg font-display text-cyber-purple mb-2">
              {category}
            </h3>
            <div className="space-y-2">
              {commands.map(({ phrase, description }) => (
                <div key={phrase} className="flex items-start gap-4">
                  <code className="text-cyber-cyan font-mono text-sm flex-shrink-0 w-40">
                    "{phrase}"
                  </code>
                  <span className="text-gray-300 text-sm">{description}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
```

---

## Acceptance Criteria Validation

- [ ] User can toggle voice mode with Cmd/Ctrl + Shift + V
- [ ] Microphone permission requested on first use
- [ ] Voice commands trigger actions with >90% accuracy
- [ ] Visual waveform shows when listening
- [ ] Confidence bar displays recognition quality
- [ ] All navigation commands work
- [ ] All agent commands work
- [ ] Graceful error handling for unsupported browsers
- [ ] Works in Chrome, Safari, Edge, Firefox
- [ ] No console errors during voice interaction

---

## Testing Checklist

1. **Browser Support:**
   - [ ] Chrome (Web Speech API native)
   - [ ] Safari (WebKit prefix)
   - [ ] Firefox (may require flag)
   - [ ] Edge (Chromium-based)

2. **Command Recognition:**
   - [ ] Test all navigation commands
   - [ ] Test all agent commands
   - [ ] Test file commands
   - [ ] Test system commands

3. **Error Handling:**
   - [ ] Microphone permission denied
   - [ ] No microphone available
   - [ ] Low confidence threshold
   - [ ] Unrecognized commands

4. **Performance:**
   - [ ] No memory leaks during extended use
   - [ ] Waveform animation smooth (60fps)
   - [ ] Minimal impact on app performance

---

## Implementation Notes

- Web Speech API is **free** and browser-native
- **Privacy:** All processing happens locally (no cloud)
- **Limitations:** Browser support varies (Chrome best)
- **Fallback:** Graceful degradation when not supported

---

**Implementation Time Estimate:** 5 days  
**Dependencies:** None (browser native API)  
**Ready for Development:** ✅ YES
