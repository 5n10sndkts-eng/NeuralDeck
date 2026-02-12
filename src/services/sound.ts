
// Procedural Audio Synthesizer for Cyberpunk UI
// Audio is intentionally disabled app-wide.

let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let isMuted = true;
const AUDIO_DISABLED = true;

// Audio Context is initialized but suspended until user interaction
export const initAudio = () => {
    if (AUDIO_DISABLED) return;
    if (!audioCtx) {
        const Ctx = (window.AudioContext || (window as any).webkitAudioContext);
        audioCtx = new Ctx();
        masterGain = audioCtx.createGain();
        masterGain.connect(audioCtx.destination);
        masterGain.gain.value = 0.15;
    }
};

export const setMute = (muted: boolean) => {
    if (AUDIO_DISABLED) {
        isMuted = true;
        return;
    }
    isMuted = muted;
    if (masterGain) {
        masterGain.gain.setTargetAtTime(muted ? 0 : 0.15, audioCtx!.currentTime, 0.1);
    }
};

const playTone = (freq: number, type: OscillatorType, duration: number, delay: number = 0) => {
    if (AUDIO_DISABLED) return;
    if (!audioCtx) initAudio();
    if (audioCtx?.state === 'suspended') audioCtx.resume();
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
    hover: () => {},
    click: () => {},
    typing: () => {},
    success: () => {},
    error: () => {},
    alert: () => {},
    boot: () => {}
};
