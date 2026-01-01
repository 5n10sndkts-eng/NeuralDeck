import React, { useEffect, useState, useRef } from 'react';
import { Activity } from 'lucide-react';

interface PerformanceMonitorProps {
  messageCount: number;
  enabled?: boolean;
}

export const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({ 
  messageCount, 
  enabled = true 
}) => {
  const [fps, setFps] = useState(60);
  const [renderTime, setRenderTime] = useState(0);
  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(performance.now());
  const renderStartRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    let animationFrameId: number;

    const measureFps = () => {
      const now = performance.now();
      frameCountRef.current++;

      // Update FPS every second
      if (now >= lastTimeRef.current + 1000) {
        setFps(Math.round((frameCountRef.current * 1000) / (now - lastTimeRef.current)));
        frameCountRef.current = 0;
        lastTimeRef.current = now;
      }

      animationFrameId = requestAnimationFrame(measureFps);
    };

    animationFrameId = requestAnimationFrame(measureFps);

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [enabled]);

  // Measure render time
  useEffect(() => {
    renderStartRef.current = performance.now();
  });

  useEffect(() => {
    const renderEnd = performance.now();
    const duration = renderEnd - renderStartRef.current;
    if (duration > 0) {
      setRenderTime(Math.round(duration * 100) / 100);
    }
  });

  if (!enabled) return null;

  const fpsColor = fps >= 55 ? '#4ade80' : fps >= 30 ? '#ffd000' : '#ff0066';

  return (
    <div 
      className="fixed top-16 right-4 z-50 p-3 font-mono text-xs"
      style={{
        background: 'linear-gradient(135deg, rgba(10, 10, 20, 0.95) 0%, rgba(5, 5, 15, 0.98) 100%)',
        border: '1px solid rgba(0, 240, 255, 0.3)',
        borderRadius: '4px',
        backdropFilter: 'blur(8px)',
        boxShadow: '0 0 20px rgba(0, 240, 255, 0.2)'
      }}
    >
      <div className="flex items-center gap-2 mb-2" style={{ color: '#00f0ff' }}>
        <Activity size={12} />
        <span style={{ fontWeight: 700, letterSpacing: '0.1em' }}>PERFORMANCE</span>
      </div>
      
      <div className="space-y-1" style={{ fontSize: '10px' }}>
        <div className="flex justify-between gap-4">
          <span style={{ color: '#6b7280' }}>FPS:</span>
          <span style={{ 
            color: fpsColor, 
            fontWeight: 700,
            textShadow: `0 0 8px ${fpsColor}40`
          }}>
            {fps}
          </span>
        </div>
        
        <div className="flex justify-between gap-4">
          <span style={{ color: '#6b7280' }}>Messages:</span>
          <span style={{ color: '#bc13fe' }}>{messageCount}</span>
        </div>
        
        <div className="flex justify-between gap-4">
          <span style={{ color: '#6b7280' }}>Render:</span>
          <span style={{ color: '#ffd000' }}>{renderTime}ms</span>
        </div>
      </div>

      {/* Warning indicator */}
      {fps < 30 && (
        <div 
          className="mt-2 pt-2 text-[9px] animate-pulse"
          style={{ 
            borderTop: '1px solid rgba(255, 0, 102, 0.3)',
            color: '#ff0066'
          }}
        >
          ⚠ LOW FPS DETECTED
        </div>
      )}
    </div>
  );
};
