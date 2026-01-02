import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  getWorkspaces,
  addWorkspace as apiAddWorkspace,
  activateWorkspace as apiActivateWorkspace,
  removeWorkspace as apiRemoveWorkspace,
  fetchFiles,
  createFile as apiCreateFile,
  createFolder as apiCreateFolder,
  renameItem as apiRenameItem,
  deleteItem as apiDeleteItem,
  type Workspace,
} from '../services/api';
import type { FileNode } from '../types';

interface WorkspaceContextValue {
  // State
  currentWorkspace: Workspace | null;
  recentWorkspaces: Workspace[];
  isLoading: boolean;
  error: string | null;
  files: FileNode[];
  
  // Actions
  openWorkspace: (id: string) => Promise<void>;
  addWorkspace: (path: string, name?: string) => Promise<void>;
  removeWorkspace: (id: string) => Promise<void>;
  refreshWorkspaces: () => Promise<void>;
  refreshFiles: () => Promise<void>;
  
  // File operations scoped to current workspace
  createFile: (path: string) => Promise<void>;
  createFolder: (path: string) => Promise<void>;
  renameItem: (oldPath: string, newPath: string) => Promise<void>;
  deleteItem: (path: string) => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextValue | undefined>(undefined);

export const useWorkspace = () => {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within WorkspaceProvider');
  }
  return context;
};

export const WorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  const [recentWorkspaces, setRecentWorkspaces] = useState<Workspace[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [files, setFiles] = useState<FileNode[]>([]);

  // Load workspaces on mount
  const refreshWorkspaces = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const { workspaces, active } = await getWorkspaces();
      setRecentWorkspaces(workspaces);
      setCurrentWorkspace(active);
      
      // If there's an active workspace, load its files
      if (active) {
        const workspaceFiles = await fetchFiles(active.id);
        setFiles(workspaceFiles);
      } else {
        setFiles([]);
      }
    } catch (err: any) {
      console.error('[WORKSPACE] Failed to load workspaces:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Refresh files for current workspace
  const refreshFiles = useCallback(async () => {
    if (!currentWorkspace) {
      setFiles([]);
      return;
    }

    try {
      const workspaceFiles = await fetchFiles(currentWorkspace.id);
      setFiles(workspaceFiles);
    } catch (err: any) {
      console.error('[WORKSPACE] Failed to refresh files:', err);
      setError(err.message);
    }
  }, [currentWorkspace]);

  // Open/activate a workspace
  const openWorkspace = useCallback(async (id: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const workspace = await apiActivateWorkspace(id);
      setCurrentWorkspace(workspace);
      
      // Load files for the newly activated workspace
      const workspaceFiles = await fetchFiles(workspace.id);
      setFiles(workspaceFiles);
      
      // Refresh workspaces list to update lastOpened times
      const { workspaces } = await getWorkspaces();
      setRecentWorkspaces(workspaces);
    } catch (err: any) {
      console.error('[WORKSPACE] Failed to open workspace:', err);
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Add a new workspace
  const addWorkspace = useCallback(async (path: string, name?: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const workspace = await apiAddWorkspace(path, name);
      
      // Refresh workspaces list
      const { workspaces } = await getWorkspaces();
      setRecentWorkspaces(workspaces);
      
      // Optionally activate the newly added workspace
      await openWorkspace(workspace.id);
    } catch (err: any) {
      console.error('[WORKSPACE] Failed to add workspace:', err);
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [openWorkspace]);

  // Remove workspace
  const removeWorkspace = useCallback(async (id: string) => {
    try {
      setError(null);
      await apiRemoveWorkspace(id);
      
      // If we removed the active workspace, clear it
      if (currentWorkspace?.id === id) {
        setCurrentWorkspace(null);
        setFiles([]);
      }
      
      // Refresh workspaces list
      const { workspaces } = await getWorkspaces();
      setRecentWorkspaces(workspaces);
    } catch (err: any) {
      console.error('[WORKSPACE] Failed to remove workspace:', err);
      setError(err.message);
      throw err;
    }
  }, [currentWorkspace]);

  // File operations (scoped to current workspace)
  const createFile = useCallback(async (path: string) => {
    if (!currentWorkspace) {
      throw new Error('No active workspace');
    }
    
    try {
      await apiCreateFile(path, currentWorkspace.id);
      await refreshFiles();
    } catch (err: any) {
      console.error('[WORKSPACE] Failed to create file:', err);
      throw err;
    }
  }, [currentWorkspace, refreshFiles]);

  const createFolder = useCallback(async (path: string) => {
    if (!currentWorkspace) {
      throw new Error('No active workspace');
    }
    
    try {
      await apiCreateFolder(path, currentWorkspace.id);
      await refreshFiles();
    } catch (err: any) {
      console.error('[WORKSPACE] Failed to create folder:', err);
      throw err;
    }
  }, [currentWorkspace, refreshFiles]);

  const renameItem = useCallback(async (oldPath: string, newPath: string) => {
    if (!currentWorkspace) {
      throw new Error('No active workspace');
    }
    
    try {
      await apiRenameItem(oldPath, newPath, currentWorkspace.id);
      await refreshFiles();
    } catch (err: any) {
      console.error('[WORKSPACE] Failed to rename item:', err);
      throw err;
    }
  }, [currentWorkspace, refreshFiles]);

  const deleteItem = useCallback(async (path: string) => {
    if (!currentWorkspace) {
      throw new Error('No active workspace');
    }
    
    try {
      await apiDeleteItem(path, currentWorkspace.id);
      await refreshFiles();
    } catch (err: any) {
      console.error('[WORKSPACE] Failed to delete item:', err);
      throw err;
    }
  }, [currentWorkspace, refreshFiles]);

  // Load workspaces on mount
  useEffect(() => {
    refreshWorkspaces();
  }, [refreshWorkspaces]);

  const value: WorkspaceContextValue = {
    currentWorkspace,
    recentWorkspaces,
    isLoading,
    error,
    files,
    openWorkspace,
    addWorkspace,
    removeWorkspace,
    refreshWorkspaces,
    refreshFiles,
    createFile,
    createFolder,
    renameItem,
    deleteItem,
  };

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
};
