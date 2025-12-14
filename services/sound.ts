
// Procedural Audio Synthesizer for Cyberpunk UI
// Uses Web Audio API to generate sounds without external assets

let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let isMuted = false;

export const initAudio = () => {
    if (!audioCtx) {
        const Ctx = (window.AudioContext || (window as any).webkitAudioContext);
        audioCtx = new Ctx();
        masterGain = audioCtx.createGain();
        masterGain.connect(audioCtx.destination);
        masterGain.gain.value = 0.15; // Master volume
    }
    if (audioCtx?.state === 'suspended') {
        audioCtx.resume();
    }
};

export const setMute = (muted: boolean) => {
    isMuted = muted;
    if (masterGain) {
        masterGain.gain.setTargetAtTime(muted ? 0 : 0.15, audioCtx!.currentTime, 0.1);
    }
};

const playTone = (freq: number, type: OscillatorType, duration: number, delay: number = 0) => {
    if (!audioCtx || isMuted) return;
    
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime + delay);
    
    gain.gain.setValueAtTime(0.1, audioCtx.currentTime + delay);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + delay + duration);
    
    osc.connect(gain);
    gain.connect(masterGain!);
    
    osc.start(audioCtx.currentTime + delay);
    osc.stop(audioCtx.currentTime + delay + duration);
};

export const SoundEffects = {
    hover: () => {
        // High pitched chirp
        playTone(800, 'sine', 0.05);
    },
    click: () => {
        // Mechanical click
        playTone(300, 'square', 0.05);
        playTone(150, 'sawtooth', 0.05, 0.02);
    },
    typing: () => {
        // Soft varied click
        const freq = 400 + Math.random() * 200;
        playTone(freq, 'triangle', 0.03);
    },
    success: () => {
        // Ascending triad
        playTone(440, 'sine', 0.1);
        playTone(554, 'sine', 0.1, 0.1);
        playTone(659, 'sine', 0.2, 0.2);
    },
    error: () => {
        // Low buzz
        playTone(150, 'sawtooth', 0.3);
        playTone(145, 'sawtooth', 0.3);
    },
    boot: () => {
        // Power up sweep
        if (!audioCtx || isMuted) return;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.frequency.setValueAtTime(100, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(2000, audioCtx.currentTime + 1);
        gain.gain.setValueAtTime(0, audioCtx.currentTime);
        gain.gain.linearRampToValueAtTime(0.2, audioCtx.currentTime + 0.5);
        gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 1.5);
        osc.connect(gain);
        gain.connect(masterGain!);
        osc.start();
        osc.stop(audioCtx.currentTime + 1.5);
    }
};