import React, { useRef, useEffect, useState, useMemo } from 'react';
import { ChatMessage, AgentProfile } from '../types';
import { Terminal, Volume2, VolumeX, ArrowRight, Activity, AlertTriangle, History, Plus, ArrowDown } from 'lucide-react';
import { SoundEffects } from '../services/sound';
import { CyberInput } from './CyberUI';
import { AGENT_DEFINITIONS } from '../services/agent';
import { useConversation } from '../contexts/ConversationContext';
import { ConversationHistory } from './ConversationHistory';
import { useVirtualizer } from '@tanstack/react-virtual';
import { PerformanceMonitor } from './PerformanceMonitor';

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
  const [showHistory, setShowHistory] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const { newSession, currentSessionId, sessions } = useConversation();
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const lastMessageCountRef = useRef(messages.length);

  // Welcome message + actual messages
  const allItems = useMemo(() => {
    return ['welcome', ...messages.map((_, idx) => `msg-${idx}`)];
  }, [messages]);

  // Virtualizer setup
  const virtualizer = useVirtualizer({
    count: allItems.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: (index) => {
      // Welcome message is smaller
      if (index === 0) return 100;
      // Estimate message height (will be measured dynamically)
      return 120;
    },
    overscan: 5,
    measureElement:
      typeof window !== 'undefined' && navigator.userAgent.indexOf('Firefox') === -1
        ? (element) => element?.getBoundingClientRect().height
        : undefined,
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > lastMessageCountRef.current) {
      // New message arrived - scroll to bottom
      const scrollElement = scrollContainerRef.current;
      if (scrollElement) {
        const isNearBottom = scrollElement.scrollHeight - scrollElement.scrollTop - scrollElement.clientHeight < 200;
        if (isNearBottom || lastMessageCountRef.current === 0) {
          virtualizer.scrollToIndex(allItems.length - 1, { align: 'end', behavior: 'smooth' });
        }
      }
    }
    lastMessageCountRef.current = messages.length;
  }, [messages.length, allItems.length, virtualizer]);

  // Detect if user scrolled up
  useEffect(() => {
    const scrollElement = scrollContainerRef.current;
    if (!scrollElement) return;

    const handleScroll = () => {
      const isAtBottom = scrollElement.scrollHeight - scrollElement.scrollTop - scrollElement.clientHeight < 100;
      setShowScrollButton(!isAtBottom && messages.length > 0);
    };

    scrollElement.addEventListener('scroll', handleScroll);
    return () => scrollElement.removeEventListener('scroll', handleScroll);
  }, [messages.length]);

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

  const handleNewSession = async () => {
    if (messages.length > 0) {
      if (confirm('Start a new session? Current conversation will be saved.')) {
        await newSession();
        SoundEffects.success();
      }
    } else {
      await newSession();
      SoundEffects.success();
    }
  };

  const scrollToBottom = () => {
    virtualizer.scrollToIndex(allItems.length - 1, { align: 'end', behavior: 'smooth' });
  };

  const currentSession = sessions.find(s => s.id === currentSessionId);
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

          <div className="flex items-center gap-3">
            <Terminal size={12} style={{ color: '#00f0ff' }} />
            <span style={{
              color: '#00f0ff',
              letterSpacing: '0.2em',
              fontWeight: 700,
              fontSize: '11px',
              textShadow: '0 0 10px rgba(0, 240, 255, 0.5)'
            }}>NEURAL_UPLINK</span>
            
            {/* Session Info */}
            {currentSession && (
              <span className="text-[9px] text-gray-500 ml-2 max-w-[150px] truncate">
                {currentSession.title}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Session Controls */}
            <button
              onClick={() => setShowHistory(true)}
              className="p-1.5 hover:bg-cyan-500/10 rounded transition-colors"
              title="Session History"
            >
              <History size={12} className="text-cyan-400" />
            </button>
            <button
              onClick={handleNewSession}
              className="p-1.5 hover:bg-purple-500/10 rounded transition-colors"
              title="New Session"
            >
              <Plus size={12} className="text-purple-400" />
            </button>

            {/* Status Indicator */}
            <div className="flex items-center gap-2 text-[10px]">
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
        </div>

        {/* Log Output Area - Virtualized */}
        <div 
          ref={scrollContainerRef}
          className="custom-scrollbar flex-1 overflow-y-auto relative" 
          style={{
            background: 'radial-gradient(ellipse at 50% 0%, rgba(0, 240, 255, 0.03) 0%, transparent 50%)'
          }}
        >
          {/* Scanline overlay */}
          <div className="absolute inset-0 pointer-events-none opacity-20 z-10" style={{
            background: 'repeating-linear-gradient(0deg, transparent 0px, transparent 2px, rgba(0, 240, 255, 0.02) 2px, rgba(0, 240, 255, 0.02) 4px)'
          }} />

          {/* Virtualized list container */}
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {virtualizer.getVirtualItems().map((virtualItem) => {
              const isWelcome = virtualItem.index === 0;
              const msgIndex = virtualItem.index - 1;
              const msg = messages[msgIndex];

              return (
                <div
                  key={virtualItem.key}
                  data-index={virtualItem.index}
                  ref={virtualizer.measureElement}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${virtualItem.start}px)`,
                  }}
                >
                  <div className="px-4 py-2">
                    {isWelcome ? (
                      // Welcome Message
                      <div className="mb-6" style={{ opacity: 0.6, color: '#6b7280' }}>
                        <div style={{ color: '#00f0ff', textShadow: '0 0 8px rgba(0, 240, 255, 0.3)' }}>{`>>`} SYSTEM READY</div>
                        <div>{`>>`} CONNECTION ESTABLISHED TO LOCALHOST:8000</div>
                        <div>{`>>`} ENCRYPTION: OFF</div>
                      </div>
                    ) : msg ? (
                      // Message
                      <div className="mb-4">
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
                    ) : null}
                  </div>
                </div>
              );
            })}

            {/* Thinking indicator at the end */}
            {isThinking && (
              <div 
                style={{
                  position: 'absolute',
                  top: `${virtualizer.getTotalSize()}px`,
                  left: 0,
                  width: '100%',
                  padding: '1rem',
                }}
              >
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
              </div>
            )}
          </div>

          {/* Scroll to bottom button */}
          {showScrollButton && (
            <button
              onClick={scrollToBottom}
              className="fixed bottom-24 right-8 z-20 p-3 rounded-full animate-fade-in-up"
              style={{
                background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.2) 0%, rgba(0, 240, 255, 0.1) 100%)',
                border: '1px solid rgba(0, 240, 255, 0.5)',
                backdropFilter: 'blur(8px)',
                boxShadow: '0 0 20px rgba(0, 240, 255, 0.4)',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.1)';
                e.currentTarget.style.boxShadow = '0 0 30px rgba(0, 240, 255, 0.6)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = '0 0 20px rgba(0, 240, 255, 0.4)';
              }}
            >
              <ArrowDown size={16} style={{ color: '#00f0ff' }} />
            </button>
          )}
        </div>

        {/* Performance Monitor */}
        <PerformanceMonitor messageCount={messages.length} enabled={true} />

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

        {/* Conversation History Modal */}
        <ConversationHistory isOpen={showHistory} onClose={() => setShowHistory(false)} />
      </div>
    </VisionDropZone>
  );
};

export default TheTerminal;
