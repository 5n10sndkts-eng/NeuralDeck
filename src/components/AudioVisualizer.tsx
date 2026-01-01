import React, { useRef, useEffect, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import type { AmbientMood } from '../services/ambientGenerator';

interface AudioVisualizerProps {
  isPlaying: boolean;
  volume: number;
  mood: AmbientMood;
  onVolumeChange: (volume: number) => void;
  onMoodChange: (mood: AmbientMood) => void;
  onToggleMute: () => void;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  isPlaying,
  volume,
  mood,
  onVolumeChange,
  onMoodChange,
  onToggleMute,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showControls, setShowControls] = useState(false);

  useEffect(() => {
    if (!canvasRef.current || !isPlaying) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;

    const draw = () => {
      const width = canvas.width;
      const height = canvas.height;

      // Clear canvas
      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.fillRect(0, 0, width, height);

      // Draw frequency bars (simulated since we don't have analyser node exposed)
      const barCount = 32;
      const barWidth = width / barCount;

      for (let i = 0; i < barCount; i++) {
        // Simulate frequency data with some randomness
        const amplitude = Math.random() * height * volume;
        const x = i * barWidth;
        const barHeight = amplitude;

        // Cyberpunk gradient
        const gradient = ctx.createLinearGradient(0, height - barHeight, 0, height);
        gradient.addColorStop(0, 'rgba(0, 240, 255, 0.8)'); // Cyan
        gradient.addColorStop(1, 'rgba(139, 92, 246, 0.8)'); // Purple

        ctx.fillStyle = gradient;
        ctx.fillRect(x, height - barHeight, barWidth - 2, barHeight);
      }

      animationId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [isPlaying, volume]);

  const moods: AmbientMood[] = ['focus', 'energize', 'calm', 'silent'];

  return (
    <div
      className="fixed bottom-4 right-4 bg-gray-900/90 border border-cyan-500/30 rounded-lg backdrop-blur-sm"
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      {/* Collapsed View */}
      {!showControls && (
        <div className="p-3 flex items-center gap-2">
          <button
            onClick={onToggleMute}
            className="text-cyan-400 hover:text-cyan-300 transition-colors"
            aria-label={volume > 0 ? 'Mute' : 'Unmute'}
          >
            {volume > 0 ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </button>
          <canvas
            ref={canvasRef}
            width={100}
            height={30}
            className="rounded"
          />
        </div>
      )}

      {/* Expanded Controls */}
      {showControls && (
        <div className="p-4 w-64 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h3 className="text-cyan-400 font-semibold text-sm">
              Audio Ambience
            </h3>
            <button
              onClick={onToggleMute}
              className="text-cyan-400 hover:text-cyan-300 transition-colors"
              aria-label={volume > 0 ? 'Mute' : 'Unmute'}
            >
              {volume > 0 ? <Volume2 size={20} /> : <VolumeX size={20} />}
            </button>
          </div>

          {/* Visualizer Canvas */}
          <canvas
            ref={canvasRef}
            width={240}
            height={60}
            className="w-full rounded border border-cyan-500/20"
          />

          {/* Volume Slider */}
          <div className="space-y-2">
            <label className="text-xs text-gray-400">
              Volume: {Math.round(volume * 100)}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={volume * 100}
              onChange={(e) => onVolumeChange(parseInt(e.target.value) / 100)}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            />
          </div>

          {/* Mood Presets */}
          <div className="space-y-2">
            <label className="text-xs text-gray-400">Mood</label>
            <div className="grid grid-cols-2 gap-2">
              {moods.map((m) => (
                <button
                  key={m}
                  onClick={() => onMoodChange(m)}
                  className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                    mood === m
                      ? 'bg-cyan-500 text-gray-900'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  {m.charAt(0).toUpperCase() + m.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Keyboard Shortcut Hint */}
          <div className="text-xs text-gray-500 text-center pt-2 border-t border-cyan-500/10">
            Press{' '}
            <kbd className="px-1 py-0.5 bg-gray-800 border border-cyan-500/30 rounded">
              M
            </kbd>{' '}
            to mute/unmute
          </div>
        </div>
      )}
    </div>
  );
};
