/**
 * Sound Effects Library
 * 
 * Cyberpunk-themed sound effects for UI interactions and agent events.
 * All sounds are procedurally generated using Web Audio API.
 */

export type SFXType =
  | 'agent_activate'
  | 'agent_complete'
  | 'file_created'
  | 'file_saved'
  | 'error'
  | 'warning'
  | 'success'
  | 'click'
  | 'typing';

class SoundEffects {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private volume: number = 0.5;

  init(volume: number = 0.5): void {
    if (this.audioContext) return;

    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.masterGain = this.audioContext.createGain();
    this.masterGain.gain.value = volume;
    this.volume = volume;
    this.masterGain.connect(this.audioContext.destination);
  }

  setVolume(volume: number): void {
    this.volume = volume;
    if (this.masterGain) {
      this.masterGain.gain.value = volume;
    }
  }

  play(type: SFXType, pan: number = 0): void {
    if (!this.audioContext || !this.masterGain) {
      this.init();
    }

    switch (type) {
      case 'agent_activate':
        this._playAgentActivate(pan);
        break;
      case 'agent_complete':
        this._playAgentComplete(pan);
        break;
      case 'file_created':
        this._playFileCreated(pan);
        break;
      case 'file_saved':
        this._playFileSaved(pan);
        break;
      case 'error':
        this._playError(pan);
        break;
      case 'warning':
        this._playWarning(pan);
        break;
      case 'success':
        this._playSuccess(pan);
        break;
      case 'click':
        this._playClick(pan);
        break;
      case 'typing':
        this._playTyping(pan);
        break;
    }
  }

  /**
   * Agent Activation - Digital "boot up" chime
   */
  private _playAgentActivate(pan: number): void {
    if (!this.audioContext) return;

    const now = this.audioContext.currentTime;
    
    // Create two-tone rising chime
    const osc1 = this.audioContext.createOscillator();
    const osc2 = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    const panner = this._createPanner(pan);

    osc1.type = 'sine';
    osc2.type = 'sine';
    osc1.frequency.setValueAtTime(400, now);
    osc1.frequency.exponentialRampToValueAtTime(800, now + 0.2);
    osc2.frequency.setValueAtTime(600, now + 0.1);
    osc2.frequency.exponentialRampToValueAtTime(1200, now + 0.3);

    gain.gain.setValueAtTime(this.volume * 0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(panner);
    panner.connect(this.masterGain!);

    osc1.start(now);
    osc2.start(now + 0.1);
    osc1.stop(now + 0.4);
    osc2.stop(now + 0.4);
  }

  /**
   * Agent Complete - Success tone
   */
  private _playAgentComplete(pan: number): void {
    if (!this.audioContext) return;

    const now = this.audioContext.currentTime;
    
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    const panner = this._createPanner(pan);

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(1200, now + 0.1);

    gain.gain.setValueAtTime(this.volume * 0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(gain);
    gain.connect(panner);
    panner.connect(this.masterGain!);

    osc.start(now);
    osc.stop(now + 0.3);
  }

  /**
   * File Created - Satisfying click
   */
  private _playFileCreated(pan: number): void {
    if (!this.audioContext) return;

    const now = this.audioContext.currentTime;
    
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    const panner = this._createPanner(pan);

    osc.type = 'square';
    osc.frequency.setValueAtTime(1000, now);
    osc.frequency.exponentialRampToValueAtTime(500, now + 0.05);

    gain.gain.setValueAtTime(this.volume * 0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(panner);
    panner.connect(this.masterGain!);

    osc.start(now);
    osc.stop(now + 0.08);
  }

  /**
   * File Saved - Confirmation beep
   */
  private _playFileSaved(pan: number): void {
    if (!this.audioContext) return;

    const now = this.audioContext.currentTime;
    
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    const panner = this._createPanner(pan);

    osc.type = 'sine';
    osc.frequency.value = 600;

    gain.gain.setValueAtTime(this.volume * 0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(panner);
    panner.connect(this.masterGain!);

    osc.start(now);
    osc.stop(now + 0.15);
  }

  /**
   * Error - Alert beep
   */
  private _playError(pan: number): void {
    if (!this.audioContext) return;

    const now = this.audioContext.currentTime;
    
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    const panner = this._createPanner(pan);

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.setValueAtTime(150, now + 0.1);
    osc.frequency.setValueAtTime(200, now + 0.2);

    gain.gain.setValueAtTime(this.volume * 0.3, now);
    gain.gain.setValueAtTime(this.volume * 0.3, now + 0.3);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    osc.connect(gain);
    gain.connect(panner);
    panner.connect(this.masterGain!);

    osc.start(now);
    osc.stop(now + 0.4);
  }

  /**
   * Warning - Subtle alert
   */
  private _playWarning(pan: number): void {
    if (!this.audioContext) return;

    const now = this.audioContext.currentTime;
    
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    const panner = this._createPanner(pan);

    osc.type = 'triangle';
    osc.frequency.value = 400;

    gain.gain.setValueAtTime(this.volume * 0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(gain);
    gain.connect(panner);
    panner.connect(this.masterGain!);

    osc.start(now);
    osc.stop(now + 0.2);
  }

  /**
   * Success - Positive feedback
   */
  private _playSuccess(pan: number): void {
    this._playAgentComplete(pan);
  }

  /**
   * Click - UI interaction
   */
  private _playClick(pan: number): void {
    if (!this.audioContext) return;

    const now = this.audioContext.currentTime;
    
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    const panner = this._createPanner(pan);

    osc.type = 'square';
    osc.frequency.value = 800;

    gain.gain.setValueAtTime(this.volume * 0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

    osc.connect(gain);
    gain.connect(panner);
    panner.connect(this.masterGain!);

    osc.start(now);
    osc.stop(now + 0.03);
  }

  /**
   * Typing - Mechanical keyboard sound
   */
  private _playTyping(pan: number): void {
    if (!this.audioContext) return;

    const now = this.audioContext.currentTime;
    
    // White noise burst
    const bufferSize = this.audioContext.sampleRate * 0.02;
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    
    const gain = this.audioContext.createGain();
    const filter = this.audioContext.createBiquadFilter();
    const panner = this._createPanner(pan);
    
    filter.type = 'bandpass';
    filter.frequency.value = 2000;
    filter.Q.value = 10;

    gain.gain.setValueAtTime(this.volume * 0.05, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(panner);
    panner.connect(this.masterGain!);

    source.start(now);
    source.stop(now + 0.02);
  }

  /**
   * Create stereo panner
   */
  private _createPanner(pan: number): StereoPannerNode {
    const panner = this.audioContext!.createStereoPanner();
    panner.pan.value = Math.max(-1, Math.min(1, pan));
    return panner;
  }
}

// Singleton instance
export const soundEffects = new SoundEffects();
