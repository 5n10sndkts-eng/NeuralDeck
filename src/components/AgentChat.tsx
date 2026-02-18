import React, { useEffect, useMemo, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Send, AlertTriangle } from 'lucide-react';
import { AgentProfile } from '../types';
import { AGENT_DEFINITIONS, openAgentChat } from '../services/agent';
import { getOpenCodeAgents, sendOpenCodePrompt, sendChat } from '../services/api';
import { logger } from '@/services/logger';

interface AgentChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  meta?: string;
}

interface AgentChatProps {
  isOpen: boolean;
  onClose: () => void;
  defaultAgent?: AgentProfile;
}

export function AgentChat({ isOpen, onClose, defaultAgent = 'architect' }: AgentChatProps) {
  const [agentId, setAgentId] = useState<AgentProfile>(defaultAgent);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState<AgentChatMessage[]>([]);
  const [openCodeAgentList, setOpenCodeAgentList] = useState<string[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    setAgentId(defaultAgent);
  }, [isOpen, defaultAgent]);

  useEffect(() => {
    if (!isOpen) return;
    const loadAgents = async () => {
      try {
        const payload = await getOpenCodeAgents();
        const mapped = Object.entries(payload?.mappings || {})
          .filter(([, value]: [string, unknown]) => (value as { routing?: string })?.routing === 'opencode')
          .map(([id]) => id);
        setOpenCodeAgentList(mapped);
      } catch {
        setOpenCodeAgentList([]);
      }
    };
    loadAgents();
  }, [isOpen]);

  const selectableAgents = useMemo(() => {
    const source = openCodeAgentList.length > 0
      ? openCodeAgentList
      : Object.keys(AGENT_DEFINITIONS);

    return source.filter((id): id is AgentProfile => id in AGENT_DEFINITIONS);
  }, [openCodeAgentList]);

  // Track conversation history for standard chat fallback
  const chatHistoryRef = useRef<{ role: string; content: string }[]>([]);

  const submitPrompt = async () => {
    const prompt = input.trim();
    if (!prompt || isSending) return;

    const userEntry: AgentChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: prompt
    };

    setMessages((prev) => [...prev, userEntry]);
    setInput('');
    setIsSending(true);

    try {
      // Build conversation context
      const context = openAgentChat(agentId, prompt, chatHistoryRef.current.length > 0
        ? chatHistoryRef.current.map(m => ({ ...m, timestamp: Date.now() }))
        : []);

      // Track in history
      chatHistoryRef.current.push({ role: 'user', content: prompt });

      let assistantContent = '';
      let meta: string | undefined;

      // Try OpenCode route first, fall back to standard /api/chat
      try {
        const response = await sendOpenCodePrompt(agentId, context[context.length - 1].content, {
          timeout: 30000
        });

        if (response?.success && response?.result?.content) {
          assistantContent = response.result.content;
          meta = response.result.fallbackUsed ? `via ${response.result.provider || 'opencode'}` : undefined;
        } else {
          throw new Error(response?.result?.content || 'Empty OpenCode response');
        }
      } catch (openCodeErr: unknown) {
        logger.info('[AgentChat] OpenCode route failed, falling back to /api/chat:', openCodeErr instanceof Error ? openCodeErr.message : String(openCodeErr));

        // Fallback: use standard sendChat with agent system prompt
        const chatMessages = context.map(m => ({
          role: m.role as 'system' | 'user' | 'assistant',
          content: m.content,
          timestamp: Date.now(),
        }));

        const chatResponse = await sendChat(chatMessages);
        assistantContent = chatResponse?.content || '[No response from AI provider]';
        meta = 'via standard chat API';
      }

      chatHistoryRef.current.push({ role: 'assistant', content: assistantContent });

      const assistantEntry: AgentChatMessage = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: assistantContent,
        meta
      };

      setMessages((prev) => [...prev, assistantEntry]);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setMessages((prev) => [
        ...prev,
        {
          id: `e-${Date.now()}`,
          role: 'system',
          content: `Chat failed: ${message}. Check System > Connections for AI provider config.`
        }
      ]);
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

  // Use portal to render at document.body level to escape parent overflow:hidden
  return createPortal(
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9998,
      background: 'rgba(2, 4, 10, 0.78)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '920px',
        minHeight: '420px',
        maxHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: '12px',
        overflow: 'hidden',
        border: '1px solid rgba(0,240,255,0.26)',
        background: 'linear-gradient(145deg, rgba(8,12,24,0.96), rgba(4,6,16,0.96))',
        boxShadow: '0 10px 40px rgba(0,0,0,0.45), 0 0 20px rgba(0,240,255,0.12)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.75rem 1rem',
          borderBottom: '1px solid rgba(0,240,255,0.24)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span className="font-mono" style={{ color: '#dcfbff', letterSpacing: '0.12em', fontSize: '12px' }}>
              OPENCODE AGENT CHAT
            </span>
            <select
              value={agentId}
              onChange={(e) => setAgentId(e.target.value as AgentProfile)}
              style={{
                background: 'rgba(0,0,0,0.35)',
                color: '#d4faff',
                border: '1px solid rgba(0,240,255,0.25)',
                borderRadius: '6px',
                padding: '0.3rem 0.5rem'
              }}
            >
              {selectableAgents.map((id) => (
                <option key={id} value={id}>{AGENT_DEFINITIONS[id].name}</option>
              ))}
            </select>
          </div>

          <button
            onClick={onClose}
            style={{
              border: 'none',
              background: 'transparent',
              color: '#b5e9f5',
              cursor: 'pointer'
            }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '0.85rem 1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.65rem'
        }}>
          {messages.length === 0 && (
            <div style={{
              border: '1px dashed rgba(0,240,255,0.22)',
              borderRadius: '8px',
              padding: '0.8rem',
              color: '#8ad1e6',
              fontSize: '12px'
            }}>
              Start a dedicated chat with <strong>{AGENT_DEFINITIONS[agentId].name}</strong>. Responses route via OpenCode.
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              style={{
                alignSelf: message.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '88%',
                borderRadius: '8px',
                border: message.role === 'user'
                  ? '1px solid rgba(0,240,255,0.38)'
                  : '1px solid rgba(255,255,255,0.12)',
                background: message.role === 'user'
                  ? 'rgba(0,240,255,0.08)'
                  : message.role === 'assistant'
                    ? 'rgba(15,20,40,0.75)'
                    : 'rgba(80,30,30,0.45)',
                padding: '0.6rem 0.7rem'
              }}
            >
              <div style={{ color: '#dcfbff', fontSize: '13px', whiteSpace: 'pre-wrap' }}>{message.content}</div>
              {message.meta && (
                <div style={{
                  marginTop: '0.35rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  color: '#f3ca6f',
                  fontSize: '11px'
                }}>
                  <AlertTriangle size={12} />
                  <span>{message.meta}</span>
                </div>
              )}
            </div>
          ))}
        </div>

        <div style={{
          borderTop: '1px solid rgba(0,240,255,0.2)',
          padding: '0.75rem',
          display: 'flex',
          gap: '0.5rem'
        }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                submitPrompt();
              }
            }}
            placeholder={`Message ${AGENT_DEFINITIONS[agentId].name}...`}
            style={{
              flex: 1,
              borderRadius: '8px',
              border: '1px solid rgba(0,240,255,0.28)',
              background: 'rgba(0,0,0,0.24)',
              color: '#e3fbff',
              padding: '0.55rem 0.65rem'
            }}
          />
          <button
            onClick={submitPrompt}
            disabled={isSending || !input.trim()}
            style={{
              border: '1px solid rgba(0,240,255,0.35)',
              borderRadius: '8px',
              background: isSending ? 'rgba(128,128,128,0.2)' : 'rgba(0,240,255,0.12)',
              color: '#dcfbff',
              padding: '0.55rem 0.7rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              cursor: isSending ? 'default' : 'pointer'
            }}
          >
            <Send size={14} />
            <span className="font-mono" style={{ fontSize: '11px' }}>{isSending ? 'SENDING' : 'SEND'}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
