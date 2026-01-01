import React, { useEffect, useRef, useState } from 'react';

declare global {
    interface Window {
        webkitAudioContext: typeof AudioContext;
    }
}

export const VoiceVisualizer: React.FC<{ isActive: boolean }> = ({ isActive }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const animationRef = useRef<number>(0);
    const [micError, setMicError] = useState<string | null>(null);

    useEffect(() => {
        if (!isActive) {
            cancelAnimationFrame(animationRef.current);
            setMicError(null);
            return;
        }

        const initAudio = async () => {
            try {
                setMicError(null);
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
                analyserRef.current = audioContextRef.current.createAnalyser();
                sourceRef.current = audioContextRef.current.createMediaStreamSource(stream);

                sourceRef.current.connect(analyserRef.current);
                analyserRef.current.fftSize = 256;

                draw();
            } catch (err) {
                console.error("Mic Error:", err);
                if (err instanceof Error && err.name === 'NotAllowedError') {
                    setMicError('🚫 MICROPHONE ACCESS DENIED');
                } else if (err instanceof Error && err.name === 'NotFoundError') {
                    setMicError('⚠️ NO MICROPHONE DETECTED');
                } else {
                    setMicError('❌ AUDIO SYSTEM ERROR');
                }
            }
        };

        initAudio();

        return () => {
            audioContextRef.current?.close();
            sourceRef.current?.disconnect();
        };
    }, [isActive]);

    const draw = () => {
        if (!canvasRef.current || !analyserRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const animate = () => {
            analyserRef.current!.getByteFrequencyData(dataArray);

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#00F0FF'; // Cyan
            ctx.beginPath();

            const sliceWidth = canvas.width / bufferLength;
            let x = 0;

            for (let i = 0; i < bufferLength; i++) {
                const v = dataArray[i] / 128.0;
                const y = (v * canvas.height) / 2;

                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);

                x += sliceWidth;
            }

            ctx.lineTo(canvas.width, canvas.height / 2);
            ctx.stroke();

            // Glow effect
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#00F0FF';

            animationRef.current = requestAnimationFrame(animate);
        };

        animate();
    };

    if (!isActive) return null;

    return (
        <div
            role="status"
            aria-label={isActive ? "Voice Input Active" : "Voice Input Inactive"}
            className="absolute bottom-20 left-1/2 -translate-x-1/2 w-64 h-16 bg-black/50 border border-cyan-500/30 rounded backdrop-blur-md overflow-hidden pointer-events-none z-50 animate-in fade-in slide-in-from-bottom-4"
        >
            {micError ? (
                <div className="flex items-center justify-center h-full">
                    <span className="text-xs text-red-400 font-mono animate-pulse">{micError}</span>
                </div>
            ) : (
                <>
                    <canvas ref={canvasRef} width={256} height={64} className="w-full h-full" />
                    <div className="absolute top-1 left-2 text-[10px] text-cyan-500 font-mono tracking-widest">VOICE_INPUT_ACTIVE</div>
                </>
            )}
        </div>
    );
};
