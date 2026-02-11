import React, { useEffect, useMemo, useState } from 'react';
import { Bot, Circle, Loader2, MessageSquare, RefreshCw } from 'lucide-react';
import { getOpenCodeHealth, getOpenCodeSessions, OpenCodeHealth } from '../services/api';

interface OpenCodeStatusProps {
  onOpenChat: () => void;
}

export function OpenCodeStatus({ onOpenChat }: OpenCodeStatusProps) {
  const [health, setHealth] = useState<OpenCodeHealth | null>(null);
  const [sessionCount, setSessionCount] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  const loadStatus = async () => {
    setLoading(true);
    try {
      const [healthData, sessionsData] = await Promise.all([
        getOpenCodeHealth(),
        getOpenCodeSessions()
      ]);
      setHealth(healthData);
      const cliSessions = Array.isArray(sessionsData?.sessions) ? sessionsData.sessions.length : 0;
      const cachedSessions = Object.keys(sessionsData?.cache?.sessions || {}).length;
      setSessionCount(Math.max(cliSessions, cachedSessions));
    } catch {
      setHealth({ success: false, healthy: false, error: 'OpenCode unavailable' });
      setSessionCount(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
    const id = window.setInterval(loadStatus, 15000);
    return () => window.clearInterval(id);
  }, []);

  const statusLabel = useMemo(() => {
    if (!health) return 'Checking';
    return health.healthy ? 'Online' : 'Offline';
  }, [health]);

  const statusColor = health?.healthy ? '#00ff88' : '#ff4466';

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      padding: '0.35rem 0.6rem',
      border: '1px solid rgba(0, 240, 255, 0.2)',
      borderRadius: '8px',
      background: 'rgba(6, 9, 20, 0.88)',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05), 0 0 12px rgba(0,240,255,0.08)'
    }}>
      <Bot size={14} style={{ color: 'var(--color-cyan)' }} />
      <Circle size={10} fill={statusColor} style={{ color: statusColor }} />
      <span className="font-mono" style={{ fontSize: '11px', color: '#d4faff', letterSpacing: '0.08em' }}>
        OPENCODE {statusLabel.toUpperCase()}
      </span>
      <span className="font-mono" style={{ fontSize: '10px', color: '#7ad8f1' }}>
        SESSIONS:{sessionCount}
      </span>

      <button
        onClick={loadStatus}
        title="Refresh OpenCode status"
        style={{
          border: 'none',
          background: 'transparent',
          color: '#7ad8f1',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center'
        }}
      >
        {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
      </button>

      <button
        onClick={onOpenChat}
        style={{
          border: '1px solid rgba(0,240,255,0.35)',
          borderRadius: '6px',
          background: 'rgba(0,240,255,0.08)',
          color: '#dcfbff',
          padding: '0.2rem 0.45rem',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.3rem',
          cursor: 'pointer'
        }}
      >
        <MessageSquare size={12} />
        <span className="font-mono" style={{ fontSize: '10px' }}>AGENT CHAT</span>
      </button>
    </div>
  );
}
