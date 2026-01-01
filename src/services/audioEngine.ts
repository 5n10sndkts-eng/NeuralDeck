// Neural Deck Audio Engine (The Hum)
// Uses Web Audio API to generate procedural ambience

const CONFIG = {
    FREQ: {
        DRONE_IDLE: 60,
        DRONE_CODING: 65,
        DRONE_ALERT: 45,
        FILTER_IDLE: 200,
        FILTER_CODING: 400,
        FILTER_ALERT: 800,
        LFO_IDLE: 0.1,
        LFO_CODING: 0.2,
        LFO_ALERT: 4.0,
        LFO_GAIN: 50
    },
    TIMING: {
        RAMP_SLOW: 2,
        RAMP_FAST: 0.5,
        FADE: 0.5,
        SUSPEND: 600
    }
};

export class AudioEngine {
    private ctx: AudioContext | null = null;
    private droneOsc: OscillatorNode | null = null;
    private droneGain: GainNode | null = null;
    private lfo: OscillatorNode | null = null;
    private lfoGain: GainNode | null = null;
    private filter: BiquadFilterNode | null = null;

    private isMuted: boolean = true;
    private initPromise: Promise<void> | null = null;

    constructor() {
        // Lazy init
    }

    public async init(volume: number = 0.4, mood: string = 'focus') {
        if (this.ctx) {
            if (this.droneGain) this.droneGain.gain.value = volume * 0.25;
            return;
        }
        if (this.initPromise) return this.initPromise;

        this.initPromise = new Promise((resolve) => {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            this.ctx = new AudioContextClass();
            this.buildSynth();
            if (this.droneGain) this.droneGain.gain.value = volume * 0.25;
            resolve();
        });

        return this.initPromise;
    }

    public setMuted(muted: boolean) {
        this.isMuted = muted;
        if (muted) this.stop();
        else this.start();
    }

    public setAgentState(state: 'idle' | 'working' | 'swarm') {
        if (!this.ctx || !this.droneOsc) return;
        // Adjust frequency slightly based on activity level
        const now = this.ctx.currentTime;
        let targetFreq = CONFIG.FREQ.DRONE_IDLE;
        if (state === 'working') targetFreq = CONFIG.FREQ.DRONE_CODING;
        if (state === 'swarm') targetFreq = CONFIG.FREQ.DRONE_CODING + 5;

        this.droneOsc.frequency.exponentialRampToValueAtTime(targetFreq, now + 1);
    }

    private buildSynth() {
        if (!this.ctx) return;

        // 1. Drone
        this.droneOsc = this.ctx.createOscillator();
        this.droneOsc.type = 'sine';
        this.droneOsc.frequency.value = CONFIG.FREQ.DRONE_IDLE;

        // 2. Filter
        this.filter = this.ctx.createBiquadFilter();
        this.filter.type = 'lowpass';
        this.filter.frequency.value = CONFIG.FREQ.FILTER_IDLE;

        // 3. LFO
        this.lfo = this.ctx.createOscillator();
        this.lfo.type = 'sine';
        this.lfo.frequency.value = CONFIG.FREQ.LFO_IDLE;

        this.lfoGain = this.ctx.createGain();
        this.lfoGain.gain.value = CONFIG.FREQ.LFO_GAIN;

        // 4. Output
        this.droneGain = this.ctx.createGain();
        this.droneGain.gain.value = 0; // Start silent

        // Graph
        this.lfo.connect(this.lfoGain);
        this.lfoGain.connect(this.filter.frequency);

        this.droneOsc.connect(this.filter);
        this.filter.connect(this.droneGain);
        this.droneGain.connect(this.ctx.destination);

        // Start
        this.droneOsc.start();
        this.lfo.start();
    }

    public setMode(mode: 'IDLE' | 'CODING' | 'ALERT') {
        if (!this.ctx || !this.droneOsc || !this.filter || !this.lfo) return;

        const now = this.ctx.currentTime;
        const { FREQ, TIMING } = CONFIG;

        switch (mode) {
            case 'IDLE':
                this.droneOsc.frequency.exponentialRampToValueAtTime(FREQ.DRONE_IDLE, now + TIMING.RAMP_SLOW);
                this.filter.frequency.exponentialRampToValueAtTime(FREQ.FILTER_IDLE, now + TIMING.RAMP_SLOW);
                this.lfo.frequency.exponentialRampToValueAtTime(FREQ.LFO_IDLE, now + TIMING.RAMP_SLOW);
                break;
            case 'CODING':
                this.droneOsc.frequency.exponentialRampToValueAtTime(FREQ.DRONE_CODING, now + TIMING.RAMP_SLOW);
                this.filter.frequency.exponentialRampToValueAtTime(FREQ.FILTER_CODING, now + TIMING.RAMP_SLOW);
                this.lfo.frequency.exponentialRampToValueAtTime(FREQ.LFO_CODING, now + TIMING.RAMP_SLOW);
                break;
            case 'ALERT':
                this.droneOsc.frequency.exponentialRampToValueAtTime(FREQ.DRONE_ALERT, now + TIMING.RAMP_FAST);
                this.filter.frequency.exponentialRampToValueAtTime(FREQ.FILTER_ALERT, now + TIMING.RAMP_FAST);
                this.lfo.frequency.exponentialRampToValueAtTime(FREQ.LFO_ALERT, now + TIMING.RAMP_FAST);
                break;
        }
    }

    public async start() {
        if (!this.ctx) await this.init();

        if (this.ctx && this.droneGain) {
            if (this.ctx.state === 'suspended') await this.ctx.resume();
            this.droneGain.gain.setTargetAtTime(0.1, this.ctx.currentTime, CONFIG.TIMING.FADE);
            this.isMuted = false;
        }
    }

    public stop() {
        if (this.ctx && this.droneGain) {
            this.droneGain.gain.setTargetAtTime(0, this.ctx.currentTime, CONFIG.TIMING.FADE);
            setTimeout(() => this.ctx?.suspend(), CONFIG.TIMING.SUSPEND);
            this.isMuted = true;
        }
    }

    public async toggle() {
        if (this.isMuted) await this.start();
        else this.stop();
        return this.isMuted;
    }
}

export const GlobalAudio = new AudioEngine();
