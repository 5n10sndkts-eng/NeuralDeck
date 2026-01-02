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
      className="fixed top-16 right-4 z-50 p-3 font-mono text-xs transition-all duration-300"
      style={{
        background: 'linear-gradient(135deg, rgba(10, 10, 20, 0.92) 0%, rgba(5, 5, 15, 0.96) 100%)',
        border: `1px solid ${fps < 30 ? 'rgba(255, 0, 102, 0.4)' : 'rgba(0, 240, 255, 0.2)'}`,
        borderRadius: '6px',
        backdropFilter: 'blur(16px)',
        boxShadow: fps < 30 
          ? '0 0 20px rgba(255, 0, 102, 0.2), 0 4px 12px rgba(0, 0, 0, 0.4)' 
          : '0 0 15px rgba(0, 240, 255, 0.15), 0 4px 12px rgba(0, 0, 0, 0.3)',
        minWidth: '140px'
      }}
    >
      <div className="flex items-center gap-2 mb-2.5" style={{ 
        color: fps < 30 ? '#ff6690' : '#00f0ff',
        transition: 'color 0.3s ease'
      }}>
        <Activity size={12} className={fps < 30 ? 'animate-pulse' : ''} />
        <span style={{ fontWeight: 700, letterSpacing: '0.12em', fontSize: '9px' }}>PERFORMANCE</span>
      </div>
      
      <div className="space-y-1.5" style={{ fontSize: '10px' }}>
        <div className="flex justify-between gap-4">
          <span style={{ color: '#6b7280' }}>FPS:</span>
          <span style={{ 
            color: fpsColor, 
            fontWeight: 700,
            textShadow: `0 0 8px ${fpsColor}60`,
            transition: 'all 0.3s ease'
          }}>
            {fps}
          </span>
        </div>
        
        <div className="flex justify-between gap-4">
          <span style={{ color: '#6b7280' }}>Messages:</span>
          <span style={{ color: '#a855f7', fontWeight: 600 }}>{messageCount}</span>
        </div>
        
        <div className="flex justify-between gap-4">
          <span style={{ color: '#6b7280' }}>Render:</span>
          <span style={{ 
            color: renderTime > 16 ? '#fbbf24' : '#4ade80',
            fontWeight: 600
          }}>{renderTime}ms</span>
        </div>
      </div>

      {/* Subtle warning indicator */}
      {fps < 30 && (
        <div 
          className="mt-2.5 pt-2 text-[9px] flex items-center gap-1.5"
          style={{ 
            borderTop: '1px solid rgba(255, 0, 102, 0.25)',
            color: '#ff6690',
            animation: 'pulse 2s ease-in-out infinite'
          }}
        >
          <span style={{ fontSize: '10px' }}>⚠</span>
          <span style={{ letterSpacing: '0.05em' }}>Low FPS</span>
        </div>
      )}
    </div>
  );
};
