
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

const TheTerminal: React.FC<Props> = ({ messages, onSendMessage, isThinking, isMuted, onTransferCode, activePersona }) => {
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logic
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  const handleSend = () => {
    if (!input.trim()) return;
    SoundEffects.typing();
    onSendMessage(input);
    setInput('');
  };

  const personaDef = activePersona ? AGENT_DEFINITIONS[activePersona] : null;

  return (
    <div className="flex flex-col h-full w-full font-mono text-xs bg-[#050505] relative overflow-hidden">

      {/* Terminal Header */}
      <div className="h-8 border-b border-white/10 flex items-center justify-between px-4 bg-[#080808] select-none">
        <div className="flex items-center gap-2 text-cyber-cyan/70">
          <Terminal size={12} />
          <span className="tracking-[0.2em] font-bold">NEURAL_UPLINK_V7</span>
        </div>
        <div className="flex items-center gap-4 text-[10px] text-gray-600">
          <span className={isThinking ? "text-yellow-400 animate-pulse" : "text-gray-600"}>
            {isThinking ? 'PROCESSING...' : 'IDLE'}
          </span>
          <div className="w-1.5 h-1.5 bg-current rounded-full" />
        </div>
      </div>

      {/* Log Output Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-scanlines relative">

        {/* Welcome Message */}
        <div className="text-gray-500 mb-6">
          <div className="text-cyber-cyan">{`>>`} SYSTEM READY</div>
          <div>{`>>`} CONNECTION ESTABLISHED TO LOCALHOST:8000</div>
          <div>{`>>`} ENCRYPTION: OFF</div>
        </div>

        {messages.map((msg, idx) => (
          <div key={idx} className="animate-in fade-in duration-200">
            <div className="flex items-baseline gap-2 mb-1 opacity-60">
              <span className="text-[10px] text-gray-600">[{new Date(msg.timestamp).toLocaleTimeString()}]</span>
              {msg.role === 'user' ? (
                <span className="text-cyber-cyan font-bold tracking-widest">USER_COMMAND</span>
              ) : (
                <span className="text-cyber-purple font-bold tracking-widest">
                  {msg.agentId ? `AGENT_${msg.agentId.toUpperCase()}` : 'SYSTEM_RESPONSE'}
                </span>
              )}
            </div>

            <div className={`pl-4 border-l ${msg.role === 'user' ? 'border-cyber-cyan/20 text-gray-300' : 'border-cyber-purple/20 text-gray-100'} leading-relaxed whitespace-pre-wrap`}>
              {msg.content.split('```').map((part, i) => {
                if (i % 2 === 1) {
                  // Code Block
                  return (
                    <div key={i} className="my-2 border border-white/10 bg-[#0a0a0a] p-2 relative group">
                      <div className="absolute top-0 right-0 bg-white/10 text-[9px] px-2 py-0.5 text-gray-400 uppercase">Code Fragment</div>
                      <pre className="text-green-400 overflow-x-auto custom-scrollbar text-[10px] font-mono-tight pt-4">{part.trim()}</pre>
                      <button
                        onClick={() => onTransferCode(part)}
                        className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-cyber-cyan/20 text-cyber-cyan border border-cyber-cyan/50 px-2 py-1 text-[9px] uppercase hover:bg-cyber-cyan/40"
                      >
                        Inject Patch
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
          <div className="pl-4 border-l border-yellow-500/20 text-yellow-500 animate-pulse flex items-center gap-2">
            <Activity size={12} className="animate-spin" /> GENERATING SEQUENCE...
            <span className="inline-block w-2 h-4 bg-yellow-500 animate-pulse ml-1" />
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input Line */}
      <div className="p-3 bg-[#050505] border-t border-white/10">
        {/* Active Persona Indicator */}
        {personaDef && (
          <div className="mb-2 flex items-center gap-2 text-[10px] uppercase font-mono font-bold animate-in slide-in-from-bottom-1">
            <span className="text-gray-600">Talking to:</span>
            <span className={personaDef.color}>{personaDef.name}</span>
          </div>
        )}

        <div className="flex items-center gap-2 relative group">
          <span className="text-cyber-cyan font-bold animate-pulse">{`>>`}</span>
          <input
            autoFocus
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            className="flex-1 bg-transparent border-none focus:outline-none text-white font-mono text-xs placeholder-gray-800"
            placeholder={personaDef ? `SEND COMMAND TO ${personaDef.name.toUpperCase()}...` : "ENTER_INSTRUCTION..."}
            spellCheck={false}
          />
          <div className="absolute bottom-0 left-6 right-0 h-[1px] bg-white/10 group-focus-within:bg-cyber-cyan transition-colors" />
        </div>
      </div>
    </div>
  );
};

export default TheTerminal;
