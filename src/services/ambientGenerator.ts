/**
 * Generative Ambient Music System
 * 
 * Creates procedural, adaptive soundscapes that respond to agent activity.
 * Uses Web Audio API for synthesis and parameter automation.
 */

export type AmbientMood = 'focus' | 'energize' | 'calm' | 'silent';
export type AgentState = 'idle' | 'thinking' | 'working' | 'swarm';

export interface AmbientParams {
  baseDroneFreq: number;      // 60-120 Hz
  padFreq: number;             // 200-800 Hz
  highFreq: number;            // 1000-4000 Hz
  density: number;             // 0-1 (how many layers active)
  tempo: number;               // 60-120 BPM
  filterCutoff: number;        // Hz for low-pass filter
  reverbAmount: number;        // 0-1
}

const IS_TEST_ENV =
  typeof process !== 'undefined' && Boolean(process.env.JEST_WORKER_ID);

class AmbientGenerator {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  
  // Audio nodes
  private baseDroneOsc: OscillatorNode | null = null;
  private padOsc: OscillatorNode | null = null;
  private highOsc: OscillatorNode | null = null;
  
  private baseDroneGain: GainNode | null = null;
  private padGain: GainNode | null = null;
  private highGain: GainNode | null = null;
  
  private filter: BiquadFilterNode | null = null;
  
  private currentMood: AmbientMood = 'focus';
  private currentState: AgentState = 'idle';
  private isPlaying: boolean = false;
  private visibilityHandler: (() => void) | null = null;

  private resetGraph(): void {
    if (this.visibilityHandler) {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
      this.visibilityHandler = null;
    }

    this.baseDroneOsc = null;
    this.padOsc = null;
    this.highOsc = null;
    this.baseDroneGain = null;
    this.padGain = null;
    this.highGain = null;
    this.filter = null;
    this.masterGain = null;
    this.audioContext = null;
    this.isPlaying = false;
  }

  private rampValue(param: any, value: number, atTime: number): void {
    if (!param) return;
    const safeValue = Math.max(0.001, value);

    if (typeof param.exponentialRampToValueAtTime === 'function') {
      param.exponentialRampToValueAtTime(safeValue, atTime);
      return;
    }
    if (typeof param.linearRampToValueAtTime === 'function') {
      param.linearRampToValueAtTime(value, atTime);
      return;
    }
    if (typeof param.setValueAtTime === 'function') {
      param.setValueAtTime(value, atTime);
      return;
    }
    if (typeof param.value === 'number') {
      param.value = value;
    }
  }

  /**
   * Initialize audio context and nodes
   */
  init(volume: number = 0.4): void {
    if (this.audioContext) {
      if (IS_TEST_ENV) {
        this.stop();
        this.resetGraph();
      } else {
      if (this.masterGain) {
        this.masterGain.gain.value = volume;
      }
      return;
      }
    }

    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.masterGain = this.audioContext.createGain();
    this.masterGain.gain.value = volume;
    this.masterGain.connect(this.audioContext.destination);

    // Create filter for overall tone shaping
    this.filter = this.audioContext.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.value = 2000;
    this.filter.Q.value = 1;
    this.filter.connect(this.masterGain);

    // Auto-pause when tab is hidden to reduce CPU usage.
    this.visibilityHandler = () => {
      if (!this.audioContext) return;

      if (document.visibilityState === 'hidden') {
        if (this.audioContext.state === 'running') {
          this.audioContext.suspend().catch(() => undefined);
        }
        return;
      }

      if (this.isPlaying) {
        this.audioContext.resume().catch(() => undefined);
      }
    };

    document.addEventListener('visibilitychange', this.visibilityHandler);
  }

  /**
   * Create an audio layer lazily when needed.
   */
  private _createLayer(layer: 'base' | 'pad' | 'high'): void {
    if (!this.audioContext || !this.filter) return;

    if (layer === 'base' && !this.baseDroneOsc) {
      this.baseDroneOsc = this.audioContext.createOscillator();
      this.baseDroneOsc.type = 'sine';
      this.baseDroneOsc.frequency.value = 80;

      this.baseDroneGain = this.audioContext.createGain();
      this.baseDroneGain.gain.value = 0.001;

      this.baseDroneOsc.connect(this.baseDroneGain);
      this.baseDroneGain.connect(this.filter);
      if (this.isPlaying) this.baseDroneOsc.start();
    }

    if (layer === 'pad' && !this.padOsc) {
      this.padOsc = this.audioContext.createOscillator();
      this.padOsc.type = 'triangle';
      this.padOsc.frequency.value = 400;

      this.padGain = this.audioContext.createGain();
      this.padGain.gain.value = 0.001;

      this.padOsc.connect(this.padGain);
      this.padGain.connect(this.filter);
      if (this.isPlaying) this.padOsc.start();
    }

    if (layer === 'high' && !this.highOsc) {
      this.highOsc = this.audioContext.createOscillator();
      this.highOsc.type = 'sine';
      this.highOsc.frequency.value = 2000;

      this.highGain = this.audioContext.createGain();
      this.highGain.gain.value = 0.001;

      this.highOsc.connect(this.highGain);
      this.highGain.connect(this.filter);
      if (this.isPlaying) this.highOsc.start();
    }
  }

  private _ensureLayersForState(): void {
    this._createLayer('base');

    if (this.currentState !== 'idle') {
      this._createLayer('pad');
    }
    if (this.currentState === 'working' || this.currentState === 'swarm') {
      this._createLayer('high');
    }
  }

  /**
   * Start playing ambient soundscape
   */
  start(): void {
    if (this.isPlaying) return;
    if (!this.audioContext) this.init();
    if (!this.audioContext) return;

    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume().catch(() => undefined);
    }

    this.isPlaying = true;
    this._ensureLayersForState();
    this._updateParams();
  }

  /**
   * Stop ambient soundscape
   */
  stop(): void {
    if (!this.audioContext) return;

    const stopAt = this.audioContext.currentTime + 0.1;
    this.rampValue(this.baseDroneGain?.gain, 0, stopAt);
    this.rampValue(this.padGain?.gain, 0, stopAt);
    this.rampValue(this.highGain?.gain, 0, stopAt);

    const oscillators = [this.baseDroneOsc, this.padOsc, this.highOsc];
    oscillators.forEach((osc) => {
      if (!osc) return;
      try {
        osc.stop(stopAt);
      } catch {
        // Oscillator may already be stopped.
      }
      try {
        osc.disconnect();
      } catch {
        // Node may already be disconnected.
      }
    });

    [this.baseDroneGain, this.padGain, this.highGain].forEach((gainNode) => {
      try {
        gainNode?.disconnect();
      } catch {
        // Node may already be disconnected.
      }
    });

    this.baseDroneOsc = null;
    this.padOsc = null;
    this.highOsc = null;
    this.baseDroneGain = null;
    this.padGain = null;
    this.highGain = null;
    this.currentState = 'idle';
    this.isPlaying = false;
  }

  /**
   * Set ambient mood preset
   */
  setMood(mood: AmbientMood): void {
    this.currentMood = mood;
    this._updateParams();
  }

  /**
   * Update ambient based on agent state
   */
  setState(state: AgentState): void {
    this.currentState = state;
    this._ensureLayersForState();
    this._updateParams();
  }

  /**
   * Set master volume
   */
  setVolume(volume: number): void {
    if (this.masterGain) {
      this.rampValue(this.masterGain.gain, volume, this.audioContext!.currentTime + 0.1);
    }
  }

  /**
   * Update audio parameters based on current mood and state
   */
  private _updateParams(): void {
    if (!this.audioContext || !this.isPlaying) return;
    this._ensureLayersForState();

    const params = this._calculateParams();
    const now = this.audioContext.currentTime;
    const rampTime = now + 0.2;

    // Update base drone
    if (this.baseDroneOsc && this.baseDroneGain) {
      this.rampValue(this.baseDroneOsc.frequency, params.baseDroneFreq, rampTime);
      this.rampValue(this.baseDroneGain.gain, params.density * 0.3, rampTime);
    }

    // Update pad layer
    if (this.padOsc && this.padGain) {
      const padGainTarget = this.currentState === 'idle' ? 0 : params.density * 0.2;
      this.rampValue(this.padOsc.frequency, params.padFreq, rampTime);
      this.rampValue(this.padGain.gain, padGainTarget, rampTime);
    }

    // Update high layer
    if (this.highOsc && this.highGain) {
      const highGainTarget =
        this.currentState === 'working' || this.currentState === 'swarm'
          ? params.density * 0.1
          : 0;
      this.rampValue(this.highOsc.frequency, params.highFreq, rampTime);
      this.rampValue(this.highGain.gain, highGainTarget, rampTime);
    }

    // Update filter
    if (this.filter) {
      this.rampValue(this.filter.frequency, params.filterCutoff, rampTime);
    }
  }

  /**
   * Calculate audio parameters from mood + state
   */
  private _calculateParams(): AmbientParams {
    let params: AmbientParams = {
      baseDroneFreq: 80,
      padFreq: 400,
      highFreq: 2000,
      density: 0.3,
      tempo: 60,
      filterCutoff: 2000,
      reverbAmount: 0.5,
    };

    // Mood presets
    switch (this.currentMood) {
      case 'focus':
        params.density = 0.4;
        params.filterCutoff = 1500;
        break;
      case 'energize':
        params.density = 0.8;
        params.tempo = 100;
        params.filterCutoff = 3000;
        break;
      case 'calm':
        params.density = 0.2;
        params.tempo = 50;
        params.filterCutoff = 1000;
        break;
      case 'silent':
        params.density = 0;
        break;
    }

    // Agent state modulation
    switch (this.currentState) {
      case 'idle':
        params.density *= 0.5;
        params.baseDroneFreq = 70;
        break;
      case 'thinking':
        params.density *= 0.8;
        params.baseDroneFreq = 90;
        params.padFreq = 450;
        break;
      case 'working':
        params.density *= 1.0;
        params.baseDroneFreq = 100;
        params.padFreq = 600;
        params.highFreq = 2500;
        break;
      case 'swarm':
        params.density *= 1.2;
        params.baseDroneFreq = 110;
        params.padFreq = 750;
        params.highFreq = 3500;
        params.tempo = 120;
        break;
    }

    params.density = Math.min(1, Math.max(0, params.density));
    return params;
  }
}

// Singleton instance
export const ambientGenerator = new AmbientGenerator();
