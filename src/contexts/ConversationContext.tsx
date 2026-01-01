import React, { createContext, useContext, useState, useEffect, useCallback, useReducer } from 'react';
import { ChatMessage } from '../types';
import { useConversationStorage, Session, StorageType } from '../hooks/useConversationStorage';

const LAST_SESSION_KEY = 'neuraldeck_last_session';

interface ConversationState {
  currentSessionId: string | null;
  sessions: Session[];
  messages: ChatMessage[];
  isLoading: boolean;
  storageType: StorageType;
}

type ConversationAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_SESSIONS'; payload: Session[] }
  | { type: 'SET_CURRENT_SESSION'; payload: string | null }
  | { type: 'SET_MESSAGES'; payload: ChatMessage[] }
  | { type: 'ADD_MESSAGE'; payload: ChatMessage }
  | { type: 'SET_STORAGE_TYPE'; payload: StorageType }
  | { type: 'UPDATE_SESSION'; payload: Session };

const conversationReducer = (state: ConversationState, action: ConversationAction): ConversationState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_SESSIONS':
      return { ...state, sessions: action.payload };
    case 'SET_CURRENT_SESSION':
      return { ...state, currentSessionId: action.payload };
    case 'SET_MESSAGES':
      return { ...state, messages: action.payload };
    case 'ADD_MESSAGE':
      return { ...state, messages: [...state.messages, action.payload] };
    case 'SET_STORAGE_TYPE':
      return { ...state, storageType: action.payload };
    case 'UPDATE_SESSION':
      return {
        ...state,
        sessions: state.sessions.map(s =>
          s.id === action.payload.id ? action.payload : s
        )
      };
    default:
      return state;
  }
};

interface ConversationContextType {
  // State
  currentSessionId: string | null;
  sessions: Session[];
  messages: ChatMessage[];
  isLoading: boolean;
  storageType: StorageType;
  
  // Actions
  loadSession: (sessionId: string) => Promise<void>;
  switchSession: (sessionId: string) => Promise<void>;
  newSession: (title?: string) => Promise<void>;
  addMessage: (message: ChatMessage) => Promise<void>;
  renameSession: (sessionId: string, newTitle: string) => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;
  exportSession: (sessionId: string) => Promise<void>;
  clearCurrentSession: () => Promise<void>;
  refreshSessions: () => Promise<void>;
  
  // Storage info
  getStorageUsage: () => Promise<{ used: number; quota: number }>;
  cleanupOldSessions: (retentionDays?: number) => Promise<number>;
}

const ConversationContext = createContext<ConversationContextType | undefined>(undefined);

export const ConversationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const storage = useConversationStorage();
  
  const [state, dispatch] = useReducer(conversationReducer, {
    currentSessionId: null,
    sessions: [],
    messages: [],
    isLoading: true,
    storageType: storage.storageType
  });

  // Update storage type when it changes
  useEffect(() => {
    dispatch({ type: 'SET_STORAGE_TYPE', payload: storage.storageType });
  }, [storage.storageType]);

  // Initialize: Load sessions and restore last active session
  useEffect(() => {
    const init = async () => {
      if (!storage.isAvailable) {
        console.warn('[Conversation] Storage not available');
        dispatch({ type: 'SET_LOADING', payload: false });
        return;
      }

      try {
        dispatch({ type: 'SET_LOADING', payload: true });
        
        // Load all sessions
        const sessions = await storage.listSessions();
        dispatch({ type: 'SET_SESSIONS', payload: sessions });

        // Restore last active session
        const lastSessionId = localStorage.getItem(LAST_SESSION_KEY);
        
        if (lastSessionId && sessions.some(s => s.id === lastSessionId)) {
          await loadSession(lastSessionId);
        } else if (sessions.length > 0) {
          // Load most recent session
          await loadSession(sessions[0].id);
        } else {
          // Create first session
          await newSession('Welcome Session');
        }
      } catch (error) {
        console.error('[Conversation] Initialization error:', error);
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    init();
  }, [storage.isAvailable]);

  // Load a specific session's messages
  const loadSession = useCallback(async (sessionId: string) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const messages = await storage.getMessages(sessionId);
      dispatch({ type: 'SET_MESSAGES', payload: messages });
      dispatch({ type: 'SET_CURRENT_SESSION', payload: sessionId });
      localStorage.setItem(LAST_SESSION_KEY, sessionId);
      console.log('[Conversation] Loaded session:', sessionId, 'with', messages.length, 'messages');
    } catch (error) {
      console.error('[Conversation] Error loading session:', error);
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [storage]);

  // Switch to a different session
  const switchSession = useCallback(async (sessionId: string) => {
    await loadSession(sessionId);
    const sessions = await storage.listSessions();
    dispatch({ type: 'SET_SESSIONS', payload: sessions });
  }, [loadSession, storage]);

  // Create a new session
  const newSession = useCallback(async (title?: string) => {
    try {
      const session = await storage.createSession(title);
      const sessions = await storage.listSessions();
      dispatch({ type: 'SET_SESSIONS', payload: sessions });
      dispatch({ type: 'SET_CURRENT_SESSION', payload: session.id });
      dispatch({ type: 'SET_MESSAGES', payload: [] });
      localStorage.setItem(LAST_SESSION_KEY, session.id);
      console.log('[Conversation] Created new session:', session.id);
    } catch (error) {
      console.error('[Conversation] Error creating session:', error);
    }
  }, [storage]);

  // Add a message to current session
  const addMessage = useCallback(async (message: ChatMessage) => {
    if (!state.currentSessionId) {
      console.warn('[Conversation] No active session, creating new one');
      await newSession();
      // After creating new session, state.currentSessionId will be updated
      // We need to wait for the next render cycle
      return;
    }

    try {
      await storage.addMessage(state.currentSessionId, message);
      dispatch({ type: 'ADD_MESSAGE', payload: message });
      
      // Update session in list
      const updatedSession = await storage.getSession(state.currentSessionId);
      if (updatedSession) {
        dispatch({ type: 'UPDATE_SESSION', payload: updatedSession });
      }
    } catch (error) {
      console.error('[Conversation] Error adding message:', error);
    }
  }, [state.currentSessionId, storage, newSession]);

  // Rename a session
  const renameSession = useCallback(async (sessionId: string, newTitle: string) => {
    try {
      await storage.updateSession(sessionId, { title: newTitle });
      const sessions = await storage.listSessions();
      dispatch({ type: 'SET_SESSIONS', payload: sessions });
    } catch (error) {
      console.error('[Conversation] Error renaming session:', error);
    }
  }, [storage]);

  // Delete a session
  const deleteSession = useCallback(async (sessionId: string) => {
    try {
      await storage.deleteSession(sessionId);
      const sessions = await storage.listSessions();
      dispatch({ type: 'SET_SESSIONS', payload: sessions });
      
      // If we deleted the current session, switch to another
      if (state.currentSessionId === sessionId) {
        if (sessions.length > 0) {
          await loadSession(sessions[0].id);
        } else {
          await newSession();
        }
      }
    } catch (error) {
      console.error('[Conversation] Error deleting session:', error);
    }
  }, [storage, state.currentSessionId, loadSession, newSession]);

  // Export session to JSON
  const exportSession = useCallback(async (sessionId: string) => {
    try {
      const session = await storage.getSession(sessionId);
      const messages = await storage.getMessages(sessionId);
      
      const exportData = {
        session,
        messages,
        exportedAt: Date.now(),
        version: '1.0'
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `neuraldeck-session-${session?.title || sessionId}-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      console.log('[Conversation] Session exported:', sessionId);
    } catch (error) {
      console.error('[Conversation] Error exporting session:', error);
    }
  }, [storage]);

  // Clear messages in current session
  const clearCurrentSession = useCallback(async () => {
    if (!state.currentSessionId) return;
    
    try {
      await storage.clearMessages(state.currentSessionId);
      dispatch({ type: 'SET_MESSAGES', payload: [] });
      
      // Update session in list
      const updatedSession = await storage.getSession(state.currentSessionId);
      if (updatedSession) {
        dispatch({ type: 'UPDATE_SESSION', payload: updatedSession });
      }
    } catch (error) {
      console.error('[Conversation] Error clearing session:', error);
    }
  }, [state.currentSessionId, storage]);

  // Refresh sessions list
  const refreshSessions = useCallback(async () => {
    try {
      const sessions = await storage.listSessions();
      dispatch({ type: 'SET_SESSIONS', payload: sessions });
    } catch (error) {
      console.error('[Conversation] Error refreshing sessions:', error);
    }
  }, [storage]);

  // Get storage usage
  const getStorageUsage = useCallback(async () => {
    return await storage.getStorageUsage();
  }, [storage]);

  // Cleanup old sessions
  const cleanupOldSessions = useCallback(async (retentionDays: number = 30) => {
    return await storage.cleanup(retentionDays);
  }, [storage]);

  const value: ConversationContextType = {
    // State
    currentSessionId: state.currentSessionId,
    sessions: state.sessions,
    messages: state.messages,
    isLoading: state.isLoading,
    storageType: state.storageType,
    
    // Actions
    loadSession,
    switchSession,
    newSession,
    addMessage,
    renameSession,
    deleteSession,
    exportSession,
    clearCurrentSession,
    refreshSessions,
    
    // Storage info
    getStorageUsage,
    cleanupOldSessions
  };

  return (
    <ConversationContext.Provider value={value}>
      {children}
    </ConversationContext.Provider>
  );
};

export const useConversation = () => {
  const context = useContext(ConversationContext);
  if (!context) {
    throw new Error('useConversation must be used within a ConversationProvider');
  }
  return context;
};
