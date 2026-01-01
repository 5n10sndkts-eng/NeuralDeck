import { useState, useEffect, useRef, useCallback } from 'react';

// Web Speech API Type Definitions
interface SpeechRecognitionEvent extends Event {
    results: SpeechRecognitionResultList;
    resultIndex: number;
    interpretation?: unknown;
}

interface SpeechRecognitionResultList {
    length: number;
    item(index: number): SpeechRecognitionResult;
    [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
    length: number;
    item(index: number): SpeechRecognitionAlternative;
    [index: number]: SpeechRecognitionAlternative;
    isFinal: boolean;
}

interface SpeechRecognitionAlternative {
    transcript: string;
    confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
    error: 'no-speech' | 'aborted' | 'audio-capture' | 'network' | 'not-allowed' | 'service-not-allowed' | 'bad-grammar' | 'language-not-supported';
    message: string;
}

interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    start(): void;
    stop(): void;
    abort(): void;
    onstart: (event: Event) => void;
    onend: (event: Event) => void;
    onerror: (event: SpeechRecognitionErrorEvent) => void;
    onresult: (event: SpeechRecognitionEvent) => void;
}

// Extend Window interface globally for this file scope
declare global {
    interface Window {
        webkitSpeechRecognition: {
            new(): SpeechRecognition;
        };
        SpeechRecognition: {
            new(): SpeechRecognition;
        };
    }
}

interface UseVoiceInputReturn {
    isListening: boolean;
    transcript: string;
    error: string | null;
    startListening: () => void;
    stopListening: () => void;
    resetTranscript: () => void;
    supported: boolean;
}

export const useVoice = (): UseVoiceInputReturn => {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [error, setError] = useState<string | null>(null);

    const recognitionRef = useRef<SpeechRecognition | null>(null);

    useEffect(() => {
        // Browser support check
        const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;

        if (!SpeechRecognition) {
            setError('Browser does not support Web Speech API');
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = true; // Keep listening until stopped
        recognition.interimResults = true; // Show results as they are spoken
        recognition.lang = 'en-US';

        recognition.onstart = () => {
            setIsListening(true);
            setError(null);
        };

        recognition.onend = () => {
            setIsListening(false);
        };

        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
            console.error('Speech recognition error:', event.error);

            // Cyber-themed error messages
            switch (event.error) {
                case 'not-allowed':
                    setError('NEURAL LINK SEVERED: Microphone Access Denied');
                    break;
                case 'no-speech':
                    setError('NO DATA DETECTED: Speak clearly into receiver');
                    break;
                case 'network':
                    setError('NETWORK ANOMALY: Speech service unreachable');
                    break;
                default:
                    setError(`SYSTEM ERROR: ${event.error}`);
            }
            setIsListening(false);
        };

        recognition.onresult = (event: SpeechRecognitionEvent) => {
            let finalTranscript = '';
            let interimTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }

            const currentTranscript = finalTranscript || interimTranscript;
            setTranscript(currentTranscript);
        };

        recognitionRef.current = recognition;

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.abort();
            }
        };
    }, []);

    const startListening = useCallback(() => {
        if (recognitionRef.current && !isListening) {
            try {
                recognitionRef.current.start();
                setError(null);
            } catch (err) {
                console.error('Failed to start recognition:', err);
            }
        }
    }, [isListening]);

    const stopListening = useCallback(() => {
        if (recognitionRef.current && isListening) {
            recognitionRef.current.stop();
        }
    }, [isListening]);

    const resetTranscript = useCallback(() => {
        setTranscript('');
    }, []);

    const supported = typeof window !== 'undefined' && !!(window.webkitSpeechRecognition || window.SpeechRecognition);

    return {
        isListening,
        transcript,
        error,
        startListening,
        stopListening,
        resetTranscript,
        supported
    };
};
