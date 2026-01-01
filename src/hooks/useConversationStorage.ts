import { useEffect, useState, useCallback } from 'react';
import Dexie, { Table } from 'dexie';
import { ChatMessage } from '../types';

// Session metadata interface
export interface Session {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messageCount: number;
}

// IndexedDB schema
class ConversationDatabase extends Dexie {
  sessions!: Table<Session>;
  messages!: Table<ChatMessage & { id?: number; sessionId: string }>;

  constructor() {
    super('neuraldeck-conversations');
    this.version(1).stores({
      sessions: 'id, title, createdAt, updatedAt',
      messages: '++id, sessionId, timestamp, role'
    });
  }
}

// Singleton database instance
let db: ConversationDatabase | null = null;

const getDB = (): ConversationDatabase => {
  if (!db) {
    db = new ConversationDatabase();
  }
  return db;
};

// LocalStorage fallback keys
const STORAGE_PREFIX = 'neuraldeck_';
const SESSIONS_KEY = `${STORAGE_PREFIX}sessions`;
const MESSAGES_PREFIX = `${STORAGE_PREFIX}messages_`;

export type StorageType = 'indexeddb' | 'localstorage';

export const useConversationStorage = () => {
  const [storageType, setStorageType] = useState<StorageType>('indexeddb');
  const [isAvailable, setIsAvailable] = useState(false);

  // Test IndexedDB availability
  useEffect(() => {
    const testIndexedDB = async () => {
      try {
        const testDB = getDB();
        await testDB.sessions.toArray();
        setStorageType('indexeddb');
        setIsAvailable(true);
        console.log('[Storage] IndexedDB available');
      } catch (error) {
        console.warn('[Storage] IndexedDB unavailable, falling back to localStorage', error);
        setStorageType('localstorage');
        setIsAvailable(typeof window !== 'undefined' && !!window.localStorage);
      }
    };
    testIndexedDB();
  }, []);

  // --- SESSION OPERATIONS ---

  const createSession = useCallback(async (title?: string): Promise<Session> => {
    const session: Session = {
      id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: title || `Session ${new Date().toLocaleString()}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messageCount: 0
    };

    if (storageType === 'indexeddb') {
      const database = getDB();
      await database.sessions.add(session);
    } else {
      const sessions = await listSessions();
      sessions.push(session);
      localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
    }

    console.log('[Storage] Session created:', session.id);
    return session;
  }, [storageType]);

  const getSession = useCallback(async (id: string): Promise<Session | undefined> => {
    if (storageType === 'indexeddb') {
      const database = getDB();
      return await database.sessions.get(id);
    } else {
      const sessions = await listSessions();
      return sessions.find(s => s.id === id);
    }
  }, [storageType]);

  const updateSession = useCallback(async (id: string, updates: Partial<Session>): Promise<void> => {
    if (storageType === 'indexeddb') {
      const database = getDB();
      await database.sessions.update(id, { ...updates, updatedAt: Date.now() });
    } else {
      const sessions = await listSessions();
      const index = sessions.findIndex(s => s.id === id);
      if (index !== -1) {
        sessions[index] = { ...sessions[index], ...updates, updatedAt: Date.now() };
        localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
      }
    }
  }, [storageType]);

  const deleteSession = useCallback(async (id: string): Promise<void> => {
    if (storageType === 'indexeddb') {
      const database = getDB();
      await database.sessions.delete(id);
      await database.messages.where('sessionId').equals(id).delete();
    } else {
      const sessions = await listSessions();
      const filtered = sessions.filter(s => s.id !== id);
      localStorage.setItem(SESSIONS_KEY, JSON.stringify(filtered));
      localStorage.removeItem(`${MESSAGES_PREFIX}${id}`);
    }
    console.log('[Storage] Session deleted:', id);
  }, [storageType]);

  const listSessions = useCallback(async (): Promise<Session[]> => {
    if (storageType === 'indexeddb') {
      const database = getDB();
      return await database.sessions.orderBy('updatedAt').reverse().toArray();
    } else {
      const data = localStorage.getItem(SESSIONS_KEY);
      if (!data) return [];
      try {
        const sessions = JSON.parse(data) as Session[];
        return sessions.sort((a, b) => b.updatedAt - a.updatedAt);
      } catch (error) {
        console.error('[Storage] Error parsing sessions from localStorage', error);
        return [];
      }
    }
  }, [storageType]);

  // --- MESSAGE OPERATIONS ---

  const addMessage = useCallback(async (sessionId: string, message: ChatMessage): Promise<void> => {
    if (storageType === 'indexeddb') {
      const database = getDB();
      await database.messages.add({ ...message, sessionId });
      
      // Update session message count and timestamp
      const session = await database.sessions.get(sessionId);
      if (session) {
        await database.sessions.update(sessionId, {
          messageCount: session.messageCount + 1,
          updatedAt: Date.now()
        });
      }
    } else {
      const messages = await getMessages(sessionId);
      messages.push(message);
      localStorage.setItem(`${MESSAGES_PREFIX}${sessionId}`, JSON.stringify(messages));
      
      // Update session
      const sessions = await listSessions();
      const session = sessions.find(s => s.id === sessionId);
      if (session) {
        session.messageCount = messages.length;
        session.updatedAt = Date.now();
        localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
      }
    }
  }, [storageType]);

  const getMessages = useCallback(async (
    sessionId: string,
    limit?: number,
    offset: number = 0
  ): Promise<ChatMessage[]> => {
    if (storageType === 'indexeddb') {
      const database = getDB();
      let query = database.messages.where('sessionId').equals(sessionId).sortBy('timestamp');
      const messages = await query;
      
      if (limit) {
        return messages.slice(offset, offset + limit);
      }
      return messages;
    } else {
      const data = localStorage.getItem(`${MESSAGES_PREFIX}${sessionId}`);
      if (!data) return [];
      try {
        const messages = JSON.parse(data) as ChatMessage[];
        if (limit) {
          return messages.slice(offset, offset + limit);
        }
        return messages;
      } catch (error) {
        console.error('[Storage] Error parsing messages from localStorage', error);
        return [];
      }
    }
  }, [storageType]);

  const clearMessages = useCallback(async (sessionId: string): Promise<void> => {
    if (storageType === 'indexeddb') {
      const database = getDB();
      await database.messages.where('sessionId').equals(sessionId).delete();
      await database.sessions.update(sessionId, { messageCount: 0, updatedAt: Date.now() });
    } else {
      localStorage.removeItem(`${MESSAGES_PREFIX}${sessionId}`);
      const sessions = await listSessions();
      const session = sessions.find(s => s.id === sessionId);
      if (session) {
        session.messageCount = 0;
        session.updatedAt = Date.now();
        localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
      }
    }
  }, [storageType]);

  // --- STORAGE MANAGEMENT ---

  const getStorageUsage = useCallback(async (): Promise<{ used: number; quota: number }> => {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      return {
        used: estimate.usage || 0,
        quota: estimate.quota || 0
      };
    }
    return { used: 0, quota: 0 };
  }, []);

  const cleanup = useCallback(async (retentionDays: number = 30): Promise<number> => {
    const cutoffTime = Date.now() - (retentionDays * 24 * 60 * 60 * 1000);
    const sessions = await listSessions();
    const toDelete = sessions.filter(s => s.updatedAt < cutoffTime);
    
    for (const session of toDelete) {
      await deleteSession(session.id);
    }
    
    console.log(`[Storage] Cleaned up ${toDelete.length} old sessions`);
    return toDelete.length;
  }, [listSessions, deleteSession]);

  return {
    storageType,
    isAvailable,
    // Session operations
    createSession,
    getSession,
    updateSession,
    deleteSession,
    listSessions,
    // Message operations
    addMessage,
    getMessages,
    clearMessages,
    // Storage management
    getStorageUsage,
    cleanup
  };
};
