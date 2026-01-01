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

  /**
   * Initialize audio context and nodes
   */
  init(volume: number = 0.4): void {
    if (this.audioContext) return;

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

    this._createLayers();
  }

  /**
   * Create the three audio layers (drone, pad, high)
   */
  private _createLayers(): void {
    if (!this.audioContext || !this.filter) return;

    // Base Drone Layer (60-120 Hz)
    this.baseDroneOsc = this.audioContext.createOscillator();
    this.baseDroneOsc.type = 'sine';
    this.baseDroneOsc.frequency.value = 80;
    
    this.baseDroneGain = this.audioContext.createGain();
    this.baseDroneGain.gain.value = 0;
    
    this.baseDroneOsc.connect(this.baseDroneGain);
    this.baseDroneGain.connect(this.filter);

    // Pad Layer (200-800 Hz)
    this.padOsc = this.audioContext.createOscillator();
    this.padOsc.type = 'triangle';
    this.padOsc.frequency.value = 400;
    
    this.padGain = this.audioContext.createGain();
    this.padGain.gain.value = 0;
    
    this.padOsc.connect(this.padGain);
    this.padGain.connect(this.filter);

    // High Layer (1-4 kHz)
    this.highOsc = this.audioContext.createOscillator();
    this.highOsc.type = 'sine';
    this.highOsc.frequency.value = 2000;
    
    this.highGain = this.audioContext.createGain();
    this.highGain.gain.value = 0;
    
    this.highOsc.connect(this.highGain);
    this.highGain.connect(this.filter);
  }

  /**
   * Start playing ambient soundscape
   */
  start(): void {
    if (this.isPlaying || !this.audioContext) return;

    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    if (this.baseDroneOsc && this.padOsc && this.highOsc) {
      this.baseDroneOsc.start();
      this.padOsc.start();
      this.highOsc.start();
    }

    this.isPlaying = true;
    this._updateParams();
  }

  /**
   * Stop ambient soundscape
   */
  stop(): void {
    if (!this.isPlaying) return;

    // Fade out all layers
    if (this.baseDroneGain) {
      this.baseDroneGain.gain.exponentialRampToValueAtTime(0.001, this.audioContext!.currentTime + 1);
    }
    if (this.padGain) {
      this.padGain.gain.exponentialRampToValueAtTime(0.001, this.audioContext!.currentTime + 1);
    }
    if (this.highGain) {
      this.highGain.gain.exponentialRampToValueAtTime(0.001, this.audioContext!.currentTime + 1);
    }

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
    this._updateParams();
  }

  /**
   * Set master volume
   */
  setVolume(volume: number): void {
    if (this.masterGain) {
      this.masterGain.gain.exponentialRampToValueAtTime(
        Math.max(0.001, volume),
        this.audioContext!.currentTime + 0.1
      );
    }
  }

  /**
   * Update audio parameters based on current mood and state
   */
  private _updateParams(): void {
    if (!this.audioContext || !this.isPlaying) return;

    const params = this._calculateParams();
    const now = this.audioContext.currentTime;
    const rampTime = 2.0; // 2-second transitions

    // Update base drone
    if (this.baseDroneOsc && this.baseDroneGain) {
      this.baseDroneOsc.frequency.exponentialRampToValueAtTime(params.baseDroneFreq, now + rampTime);
      this.baseDroneGain.gain.exponentialRampToValueAtTime(
        Math.max(0.001, params.density * 0.3),
        now + rampTime
      );
    }

    // Update pad layer
    if (this.padOsc && this.padGain) {
      this.padOsc.frequency.exponentialRampToValueAtTime(params.padFreq, now + rampTime);
      this.padGain.gain.exponentialRampToValueAtTime(
        Math.max(0.001, params.density * 0.2),
        now + rampTime
      );
    }

    // Update high layer
    if (this.highOsc && this.highGain) {
      this.highOsc.frequency.exponentialRampToValueAtTime(params.highFreq, now + rampTime);
      this.highGain.gain.exponentialRampToValueAtTime(
        Math.max(0.001, params.density * 0.1),
        now + rampTime
      );
    }

    // Update filter
    if (this.filter) {
      this.filter.frequency.exponentialRampToValueAtTime(params.filterCutoff, now + rampTime);
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

    return params;
  }
}

// Singleton instance
export const ambientGenerator = new AmbientGenerator();
