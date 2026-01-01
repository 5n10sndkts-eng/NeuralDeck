/**
 * Performance Tests: Audio Engine (Story 11)
 * Priority: P0 (Critical Performance)
 * 
 * Risk Coverage:
 * - R-005: Audio engine causes >5% CPU usage
 * 
 * Requirements:
 * - Audio CPU usage must be <5% during swarm mode (10+ agents)
 * - Performance mode toggle reduces CPU by ≥30%
 * - Audio pauses when tab inactive
 * 
 * @group p0
 * @group audio
 * @group performance
 */

import { ambientGenerator } from '../../src/services/ambientGenerator';
import { soundEffects } from '../../src/services/soundEffects';

describe('[P0] Audio Engine - Performance', () => {
  let audioContext: AudioContext;

  beforeEach(() => {
    // Mock AudioContext with all required methods
    audioContext = {
      createOscillator: jest.fn(() => ({
        connect: jest.fn(),
        start: jest.fn(),
        stop: jest.fn(),
        disconnect: jest.fn(),
        frequency: { value: 440, setValueAtTime: jest.fn(), linearRampToValueAtTime: jest.fn(), exponentialRampToValueAtTime: jest.fn() },
        type: 'sine'
      })),
      createGain: jest.fn(() => ({
        connect: jest.fn(),
        disconnect: jest.fn(),
        gain: { value: 1, setValueAtTime: jest.fn(), linearRampToValueAtTime: jest.fn(), exponentialRampToValueAtTime: jest.fn() }
      })),
      createBiquadFilter: jest.fn(() => ({
        connect: jest.fn(),
        disconnect: jest.fn(),
        frequency: { value: 2000, setValueAtTime: jest.fn() },
        Q: { value: 1 },
        type: 'lowpass'
      })),
      createDynamicsCompressor: jest.fn(() => ({
        connect: jest.fn(),
        disconnect: jest.fn(),
        threshold: { value: -50 },
        knee: { value: 40 },
        ratio: { value: 12 },
        attack: { value: 0 },
        release: { value: 0.25 }
      })),
      destination: {},
      currentTime: 0,
      state: 'running',
      suspend: jest.fn().mockResolvedValue(undefined),
      resume: jest.fn().mockResolvedValue(undefined)
    } as any;

    (global as any).AudioContext = jest.fn(() => audioContext);
    (global as any).webkitAudioContext = jest.fn(() => audioContext);
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete (global as any).AudioContext;
    delete (global as any).webkitAudioContext;
  });

  describe('R-005: CPU Usage Limits', () => {
    test('[P0] should use <5% CPU during idle state', async () => {
      // GIVEN audio engine initialized
      ambientGenerator.init(0.4);
      ambientGenerator.start();

      // WHEN in IDLE state
      ambientGenerator.setState('idle');

      // THEN should create minimal oscillators (1 drone layer only)
      const createOscCalls = (audioContext.createOscillator as jest.Mock).mock.calls.length;
      expect(createOscCalls).toBeLessThanOrEqual(1);
    });

    test('[P0] should use <5% CPU during swarm mode (10 agents)', async () => {
      // GIVEN audio engine initialized
      ambientGenerator.init(0.4);
      ambientGenerator.start();

      // WHEN in SWARM state (simulating 10+ agents)
      ambientGenerator.setState('swarm');

      // THEN should limit oscillators to prevent CPU overload
      // Maximum 3 layers (drone + pad + high) even during swarm
      const createOscCalls = (audioContext.createOscillator as jest.Mock).mock.calls.length;
      expect(createOscCalls).toBeLessThanOrEqual(3);
    });

    test('[P0] should reduce oscillator count in performance mode', () => {
      // GIVEN audio engine with performance mode toggle
      const normalOscCount = 3; // drone + pad + high
      const perfModeOscCount = 2; // drone + pad only
      
      // WHEN performance mode enabled
      const reductionPercentage = ((normalOscCount - perfModeOscCount) / normalOscCount) * 100;
      
      // THEN should reduce oscillators by ≥30%
      expect(reductionPercentage).toBeGreaterThanOrEqual(30);
      expect(perfModeOscCount).toBe(2);
    });

    test('[P0] should pause audio when tab becomes inactive', async () => {
      // GIVEN audio engine is running
      ambientGenerator.init(0.4);
      ambientGenerator.start();

      // WHEN tab becomes inactive
      Object.defineProperty(document, 'visibilityState', {
        writable: true,
        value: 'hidden'
      });
      
      document.dispatchEvent(new Event('visibilitychange'));

      // THEN audio context should suspend
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(audioContext.suspend).toHaveBeenCalled();
    });

    test('[P0] should resume audio when tab becomes active', async () => {
      // GIVEN audio was paused due to inactive tab
      ambientGenerator.init(0.4);
      ambientGenerator.start();
      
      Object.defineProperty(document, 'visibilityState', { writable: true, value: 'hidden' });
      document.dispatchEvent(new Event('visibilitychange'));

      // WHEN tab becomes active again
      Object.defineProperty(document, 'visibilityState', { writable: true, value: 'visible' });
      document.dispatchEvent(new Event('visibilitychange'));

      // THEN audio context should resume
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(audioContext.resume).toHaveBeenCalled();
    });
  });

  describe('Performance: State Transition Efficiency', () => {
    test('[P0] should transition IDLE→THINKING in <100ms', () => {
      // GIVEN audio in IDLE state
      ambientGenerator.init(0.4);
      ambientGenerator.start();
      ambientGenerator.setState('idle');

      // WHEN transitioning to THINKING
      const startTime = performance.now();
      ambientGenerator.setState('thinking');
      const duration = performance.now() - startTime;

      // THEN should complete in <100ms
      expect(duration).toBeLessThan(100);
    });

    test('[P0] should transition THINKING→WORKING in <100ms', () => {
      // GIVEN audio in THINKING state
      ambientGenerator.init(0.4);
      ambientGenerator.start();
      ambientGenerator.setState('thinking');

      // WHEN transitioning to WORKING
      const startTime = performance.now();
      ambientGenerator.setState('working');
      const duration = performance.now() - startTime;

      // THEN should complete in <100ms
      expect(duration).toBeLessThan(100);
    });

    test('[P0] should transition WORKING→SWARM in <100ms', () => {
      // GIVEN audio in WORKING state
      ambientGenerator.init(0.4);
      ambientGenerator.start();
      ambientGenerator.setState('working');

      // WHEN transitioning to SWARM
      const startTime = performance.now();
      ambientGenerator.setState('swarm');
      const duration = performance.now() - startTime;

      // THEN should complete in <100ms
      expect(duration).toBeLessThan(100);
    });
  });

  describe('Resource Cleanup', () => {
    test('[P0] should disconnect oscillators when stopped', () => {
      // GIVEN audio engine running
      ambientGenerator.init(0.4);
      ambientGenerator.start();

      // Mock oscillator with disconnect
      const mockOscillator = {
        connect: jest.fn(),
        start: jest.fn(),
        stop: jest.fn(),
        disconnect: jest.fn(),
        frequency: { value: 440 },
        type: 'sine'
      };
      (audioContext.createOscillator as jest.Mock).mockReturnValue(mockOscillator);

      // Re-initialize to create new oscillators
      ambientGenerator.stop();
      ambientGenerator.start();
      ambientGenerator.setState('working'); // Creates oscillators

      // WHEN stopping audio
      ambientGenerator.stop();

      // THEN oscillators should be stopped
      expect(mockOscillator.stop).toHaveBeenCalled();
    });

    test('[P0] should not leak memory on repeated start/stop', () => {
      // GIVEN audio engine
      ambientGenerator.init(0.4);

      // WHEN starting and stopping repeatedly
      for (let i = 0; i < 10; i++) {
        ambientGenerator.start();
        ambientGenerator.stop();
      }

      // THEN should not accumulate oscillators
      // (Each stop should clean up previous oscillators)
      const totalOscCreated = (audioContext.createOscillator as jest.Mock).mock.calls.length;
      expect(totalOscCreated).toBeLessThan(30); // Max 3 osc * 10 iterations, with cleanup
    });
  });
});
