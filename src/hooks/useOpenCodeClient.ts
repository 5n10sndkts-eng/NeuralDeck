/**
 * useOpenCodeClient Hook
 * 
 * React hook for connecting to OpenCode server from the frontend.
 * Provides session management, message sending, and real-time updates.
 * 
 * Usage:
 *   const { client, isConnected, sessions, createSession, sendMessage } = useOpenCodeClient();
 */

import { useState, useEffect, useCallback } from 'react';
import { logger } from '@/services/logger';

// Type definitions (matching @opencode-ai/sdk types)
interface Session {
  id: string;
  title: string;
  createdAt?: string;
  updatedAt?: string;
  metadata?: {
    agent?: string;
    neuraldeck?: boolean;
    timestamp?: number;
  };
}

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt?: string;
}

interface Part {
  type: 'text' | 'image';
  text?: string;
  image?: string;
}

interface UseOpenCodeClientReturn {
  client: any | null;
  isConnected: boolean;
  sessions: Session[];
  createSession: (title: string, agent?: string) => Promise<Session>;
  sendMessage: (sessionId: string, message: string, agent?: string) => Promise<any>;
  getSessionMessages: (sessionId: string) => Promise<Message[]>;
  deleteSession: (sessionId: string) => Promise<boolean>;
  refreshSessions: () => Promise<void>;
  error: string | null;
}

export function useOpenCodeClient(): UseOpenCodeClientReturn {
  const [client, setClient] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Initialize client on mount
  useEffect(() => {
    const initClient = async () => {
      try {
        // Import SDK dynamically to avoid SSR issues
        const { createOpencodeClient } = await import('@opencode-ai/sdk');
        
        const configuredBaseUrl = import.meta.env.VITE_OPENCODE_URL || 'http://localhost:4096';
        const candidateBaseUrls = Array.from(
          new Set([configuredBaseUrl, 'http://127.0.0.1:4096', 'http://localhost:4096'])
        );

        let connectedClient: any | null = null;
        let connectedBaseUrl: string | null = null;

        for (const baseUrl of candidateBaseUrls) {
          try {
            const opencodeClient = createOpencodeClient({
              baseUrl,
              throwOnError: false
            });
            const pathResult = await opencodeClient.path.get();
            if (pathResult?.data) {
              connectedClient = opencodeClient;
              connectedBaseUrl = baseUrl;
              break;
            }
          } catch {
            // Continue trying fallback URLs.
          }
        }

        if (!connectedClient || !connectedBaseUrl) {
          setError(`OpenCode server is not reachable (tried: ${candidateBaseUrls.join(', ')})`);
          setIsConnected(false);
          setClient(null);
          return;
        }

        setIsConnected(true);
        setClient(connectedClient);
        setError(null);
        logger.info('✓ OpenCode connected:', connectedBaseUrl);

        // Load existing sessions
        const sessionsList = await connectedClient.session.list();
        setSessions(sessionsList.data || []);
      } catch (err: any) {
        logger.error('OpenCode connection failed:', err.message);
        setError(err.message);
        setIsConnected(false);
      }
    };

    initClient();
  }, []);

  /**
   * Create a new session
   */
  const createSession = useCallback(async (title: string, agent?: string): Promise<Session> => {
    if (!client) {
      throw new Error('Client not initialized');
    }

    try {
      const result = await client.session.create({ 
        body: { 
          title,
          metadata: {
            agent,
            neuraldeck: true,
            timestamp: Date.now()
          }
        } 
      });
      
      const newSession = result.data;
      setSessions(prev => [...prev, newSession]);
      
      return newSession;
    } catch (err: any) {
      logger.error('Failed to create session:', err.message);
      throw err;
    }
  }, [client]);

  /**
   * Send a message to a session
   */
  const sendMessage = useCallback(async (
    sessionId: string, 
    message: string, 
    agent?: string
  ): Promise<any> => {
    if (!client) {
      throw new Error('Client not initialized');
    }

    try {
      const parts: Part[] = [{ type: 'text', text: message }];
      
      const result = await client.session.prompt({
        path: { id: sessionId },
        body: {
          parts,
          metadata: { agent }
        }
      });
      
      return result.data;
    } catch (err: any) {
      logger.error('Failed to send message:', err.message);
      throw err;
    }
  }, [client]);

  /**
   * Get messages from a session
   */
  const getSessionMessages = useCallback(async (sessionId: string): Promise<Message[]> => {
    if (!client) {
      throw new Error('Client not initialized');
    }

    try {
      const result = await client.session.messages({ path: { id: sessionId } });
      return result.data || [];
    } catch (err: any) {
      logger.error(`Failed to get messages for session ${sessionId}:`, err.message);
      return [];
    }
  }, [client]);

  /**
   * Delete a session
   */
  const deleteSession = useCallback(async (sessionId: string): Promise<boolean> => {
    if (!client) {
      throw new Error('Client not initialized');
    }

    try {
      await client.session.delete({ path: { id: sessionId } });
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      return true;
    } catch (err: any) {
      logger.error(`Failed to delete session ${sessionId}:`, err.message);
      return false;
    }
  }, [client]);

  /**
   * Refresh sessions list
   */
  const refreshSessions = useCallback(async (): Promise<void> => {
    if (!client) return;

    try {
      const result = await client.session.list();
      setSessions(result.data || []);
    } catch (err: any) {
      logger.error('Failed to refresh sessions:', err.message);
    }
  }, [client]);

  return { 
    client, 
    isConnected, 
    sessions, 
    createSession, 
    sendMessage,
    getSessionMessages,
    deleteSession,
    refreshSessions,
    error
  };
}

/**
 * Type exports for consumers
 */
export type { Session, Message, Part, UseOpenCodeClientReturn };
