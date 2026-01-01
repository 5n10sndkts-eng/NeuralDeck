import React, { useRef, useEffect, useState } from 'react';
import { ChatMessage, AgentProfile } from '../types';
import { Terminal, Volume2, VolumeX, ArrowRight, Activity, AlertTriangle } from 'lucide-react';
import { SoundEffects } from '../services/sound';
import { CyberInput } from './CyberUI';
import { AGENT_DEFINITIONS } from '../services/agent';

interface Props {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  isThinking: boolean;
  godMode?: boolean;
  isMuted?: boolean;
  onVoiceStateChange?: (isListening: boolean) => void;
  onTransferCode: (code: string) => void;
  activePersona?: AgentProfile; // New Prop
}

import { VisionDropZone } from './VisionDropZone';

// ... (previous imports)

const TheTerminal: React.FC<Props> = ({ messages, onSendMessage, isThinking, isMuted, onTransferCode, activePersona }) => {
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  const handleSend = () => {
    if (!input.trim()) return;
    SoundEffects.typing();
    onSendMessage(input);
    setInput('');
  };

  const handleImageDrop = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      onSendMessage(`[VISUAL_CORTEX] Analyzing Image: ${file.name}...`);
    };
    reader.readAsDataURL(file);
  };

  const personaDef = activePersona ? AGENT_DEFINITIONS[activePersona] : null;

  return (
    <VisionDropZone onDrop={handleImageDrop}>
      <div className="flex flex-col h-full w-full font-mono text-xs relative overflow-hidden" style={{
        backgroundColor: 'var(--color-void)'
      }}>

        {/* Terminal Header - Premium HUD Style */}
        <div className="h-14 flex items-center justify-between px-5 relative z-10" style={{
          background: 'linear-gradient(180deg, rgba(10, 10, 20, 0.98) 0%, rgba(5, 5, 15, 0.95) 100%)',
          borderBottom: '1px solid rgba(0, 240, 255, 0.2)'
        }}>
          {/* Glow Line */}
          <div className="absolute bottom-0 left-0 right-0 h-[1px]" style={{
            background: 'linear-gradient(90deg, transparent 0%, rgba(0, 240, 255, 0.5) 50%, transparent 100%)'
          }} />

          <div className="flex items-center gap-2">
            <Terminal size={12} style={{ color: '#00f0ff' }} />
            <span style={{
              color: '#00f0ff',
              letterSpacing: '0.2em',
              fontWeight: 700,
              fontSize: '11px',
              textShadow: '0 0 10px rgba(0, 240, 255, 0.5)'
            }}>NEURAL_UPLINK</span>
          </div>

          <div className="flex items-center gap-3 text-[10px]">
            <span style={{
              color: isThinking ? '#ffd000' : '#4b5563',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              textShadow: isThinking ? '0 0 8px rgba(255, 208, 0, 0.5)' : 'none'
            }}>
              {isThinking ? 'PROCESSING...' : 'STANDBY'}
            </span>
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: isThinking ? '#ffd000' : '#4ade80',
              boxShadow: isThinking ? '0 0 8px #ffd000' : '0 0 8px #4ade80',
              animation: isThinking ? 'pulse 1.5s infinite' : 'none'
            }} />
          </div>
        </div>

        {/* Log Output Area */}
        <div className="custom-scrollbar flex-1 overflow-y-auto p-4 relative" style={{
          background: 'radial-gradient(ellipse at 50% 0%, rgba(0, 240, 255, 0.03) 0%, transparent 50%)'
        }}>
          {/* Scanline overlay */}
          <div className="absolute inset-0 pointer-events-none opacity-20" style={{
            background: 'repeating-linear-gradient(0deg, transparent 0px, transparent 2px, rgba(0, 240, 255, 0.02) 2px, rgba(0, 240, 255, 0.02) 4px)'
          }} />

          {/* Welcome Message */}
          <div className="mb-6" style={{ opacity: 0.6, color: '#6b7280' }}>
            <div style={{ color: '#00f0ff', textShadow: '0 0 8px rgba(0, 240, 255, 0.3)' }}>{`>>`} SYSTEM READY</div>
            <div>{`>>`} CONNECTION ESTABLISHED TO LOCALHOST:8000</div>
            <div>{`>>`} ENCRYPTION: OFF</div>
          </div>

          {messages.map((msg, idx) => (
            <div key={idx} className="mb-4 animate-fade-in-up" style={{ animationDelay: `${idx * 0.05}s` }}>
              <div className="flex items-baseline gap-2 mb-1" style={{ opacity: 0.7 }}>
                <span style={{ fontSize: '10px', color: '#4b5563' }}>[{new Date(msg.timestamp).toLocaleTimeString()}]</span>
                {msg.role === 'user' ? (
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    letterSpacing: '0.1em',
                    color: '#00f0ff',
                    textShadow: '0 0 8px rgba(0, 240, 255, 0.4)'
                  }}>USER_COMMAND</span>
                ) : (
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    letterSpacing: '0.1em',
                    color: '#bc13fe',
                    textShadow: '0 0 8px rgba(188, 19, 254, 0.4)'
                  }}>
                    {msg.agentId ? `AGENT_${msg.agentId.toUpperCase()}` : 'SYSTEM_RESPONSE'}
                  </span>
                )}
              </div>

              <div style={{
                paddingLeft: '1rem',
                lineHeight: 1.6,
                whiteSpace: 'pre-wrap',
                borderLeft: msg.role === 'user'
                  ? '2px solid rgba(0, 240, 255, 0.3)'
                  : '2px solid rgba(188, 19, 254, 0.3)',
                color: msg.role === 'user' ? '#d1d5db' : '#f3f4f6'
              }}>
                {msg.content.split('```').map((part, i) => {
                  if (i % 2 === 1) {
                    return (
                      <div key={i} className="my-3 p-3 relative group" style={{
                        background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.08) 0%, rgba(0, 240, 255, 0.02) 100%)',
                        border: '1px solid rgba(0, 240, 255, 0.25)',
                        borderRadius: '4px',
                        backdropFilter: 'blur(8px)'
                      }}>
                        <div style={{
                          position: 'absolute',
                          top: 0,
                          right: 0,
                          background: 'rgba(0, 240, 255, 0.1)',
                          fontSize: '9px',
                          padding: '2px 8px',
                          color: '#00f0ff',
                          letterSpacing: '0.1em',
                          borderBottomLeftRadius: '4px'
                        }}>CODE</div>
                        <pre style={{
                          color: '#4ade80',
                          fontSize: '10px',
                          paddingTop: '1rem',
                          overflow: 'auto',
                          textShadow: '0 0 8px rgba(74, 222, 128, 0.3)'
                        }}>{part.trim()}</pre>
                        <button
                          onClick={() => onTransferCode(part)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{
                            position: 'absolute',
                            bottom: '8px',
                            right: '8px',
                            padding: '4px 10px',
                            fontSize: '9px',
                            fontWeight: 600,
                            letterSpacing: '0.1em',
                            color: '#00f0ff',
                            background: 'rgba(0, 240, 255, 0.1)',
                            border: '1px solid rgba(0, 240, 255, 0.4)',
                            borderRadius: '3px',
                            cursor: 'pointer'
                          }}
                        >
                          INJECT
                        </button>
                      </div>
                    );
                  }
                  return <span key={i}>{part}</span>;
                })}
              </div>
            </div>
          ))}

          {isThinking && (
            <div className="flex items-center gap-2" style={{
              paddingLeft: '1rem',
              borderLeft: '2px solid rgba(255, 208, 0, 0.4)',
              color: '#ffd000',
              textShadow: '0 0 8px rgba(255, 208, 0, 0.4)'
            }}>
              <Activity size={12} className="animate-spin" />
              <span>GENERATING SEQUENCE...</span>
              <span className="animate-pulse" style={{
                width: '8px',
                height: '16px',
                backgroundColor: '#ffd000',
                marginLeft: '4px'
              }} />
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input Line - Premium HUD Style */}
        <div className="p-3 relative" style={{
          background: 'linear-gradient(180deg, rgba(5, 5, 15, 0.95) 0%, rgba(10, 10, 20, 0.98) 100%)',
          borderTop: '1px solid rgba(0, 240, 255, 0.2)'
        }}>
          {/* Top glow line */}
          <div className="absolute top-0 left-0 right-0 h-[1px]" style={{
            background: 'linear-gradient(90deg, transparent 0%, rgba(0, 240, 255, 0.3) 50%, transparent 100%)'
          }} />

          {/* Active Persona Indicator */}
          {personaDef && (
            <div className="mb-2 flex items-center gap-2 text-[10px] uppercase font-bold">
              <span style={{ color: '#4b5563' }}>CHANNEL:</span>
              <span style={{
                color: personaDef.color,
                textShadow: `0 0 8px ${personaDef.color}40`
              }}>{personaDef.name}</span>
            </div>
          )}

          <div className="flex items-center gap-3 relative">
            <span style={{
              color: '#00f0ff',
              fontWeight: 700,
              textShadow: '0 0 10px rgba(0, 240, 255, 0.5)'
            }}>{`>>`}</span>
            <input
              autoFocus
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'white',
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
                letterSpacing: '0.02em'
              }}
              placeholder={personaDef ? `COMMAND ${personaDef.name.toUpperCase()}...` : "ENTER_INSTRUCTION..."}
              spellCheck={false}
            />
            {/* Cursor underline effect */}
            <div className="absolute bottom-0 left-8 right-0 h-[1px]" style={{
              background: 'linear-gradient(90deg, rgba(0, 240, 255, 0.4) 0%, transparent 100%)'
            }} />
          </div>
        </div>
      </div>
    </VisionDropZone>
  );
};

export default TheTerminal;
