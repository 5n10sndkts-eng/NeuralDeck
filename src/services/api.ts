
import { ChatMessage, FileNode, LlmConfig } from '../types';
import { authFetch, authService } from './auth';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001/api';

// Helper to make requests with optional auth
async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  // Use auth service if available, otherwise fallback to regular fetch
  if (authService.isAuthenticated()) {
    return authFetch(url, options);
  }
  return fetch(url, options);
}

// --- MCP METHODS ---
export const getMCPTools = async () => {
  try {
    const res = await fetch(`${API_BASE}/mcp/tools`);
    return await res.json();
  } catch { return { tools: [] }; }
};

export const callMCPTool = async (tool: string, args: any) => {
  try {
    const res = await fetch(`${API_BASE}/mcp/call`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool, args }),
    });
    return await res.json();
  } catch (e: any) { return { error: e.message }; }
};

export const ingestContext = async (content: string) => {
  await fetch(`${API_BASE}/context/ingest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });
};

export const getKeyStatus = async () => {
  try {
    const res = await fetch(`${API_BASE}/status/keys`);
    return await res.json();
  } catch { return { gemini: false, anthropic: false }; }
};

// --- RAG METHODS ---
export const ingestContextFile = async (content: string, metadata: any) => {
  try {
    const res = await fetch(`${API_BASE}/rag/ingest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, metadata }),
    });
    return await res.json();
  } catch { return { success: false }; }
};

export const queryContext = async (query: string): Promise<string> => {
  try {
    const res = await fetch(`${API_BASE}/rag/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    const data = await res.json();
    if (data.results && Array.isArray(data.results)) {
      return data.results.map((r: any) => `[SOURCE: ${r.source}]\n${r.content}`).join('\n\n');
    }
    return "";
  } catch { return ""; }
};

// --- LEGACY / UI SUPPORT ---
export const fetchFiles = async (workspaceId?: string): Promise<FileNode[]> => {
  try {
    const url = workspaceId 
      ? `${API_BASE}/files?workspaceId=${encodeURIComponent(workspaceId)}`
      : `${API_BASE}/files`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch files');
    return res.json();
  } catch (error) {
    return [];
  }
};

export const readFile = async (filePath: string, workspaceId?: string): Promise<string> => {
  try {
    const res = await fetch(`${API_BASE}/read`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filePath, workspaceId }),
    });
    const data = await res.json();
    return data.content;
  } catch (error) { return "Error reading file"; }
};

export const writeFile = async (filePath: string, content: string, workspaceId?: string): Promise<void> => {
  await fetch(`${API_BASE}/write`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filePath, content, workspaceId }),
  });
};

export const sendChat = async (messages: ChatMessage[], config?: LlmConfig): Promise<ChatMessage> => {
  try {
    const res = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: messages.map(m => ({ role: m.role, content: m.content })),
        temperature: 0.2,
        config: config || { provider: 'lmstudio', model: 'openai/gpt-oss-20b', baseUrl: 'http://192.168.100.190:1234/v1' }
      }),
    });
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || "Error: No response content";
    return { role: 'assistant', content, timestamp: Date.now() };
  } catch (error) {
    return { role: 'assistant', content: "SYSTEM ALERT: AI Offline or Connection Refused.", timestamp: Date.now() };
  }
};

// --- Story 6-7: DIFF PREVIEW & APPLY API ---

export interface DiffPreviewRequest {
  path: string;
  proposedContent: string;
  agentId?: string;
  reason?: string;
}

export interface DiffPreviewResponse {
  id: string;
  path: string;
  oldContent: string;
  newContent: string;
  additions: number;
  deletions: number;
  isNewFile: boolean;
}

export interface DiffRecord {
  id: string;
  path: string;
  oldContent: string;
  newContent: string;
  additions: number;
  deletions: number;
  isNewFile: boolean;
  agentId: string | null;
  reason: string | null;
  createdAt: number;
  status: 'pending' | 'applied' | 'rejected';
  appliedAt?: number;
  appliedBy?: string;
  rejectedAt?: number;
  rejectedBy?: string;
  rejectionReason?: string | null;
}

export interface PendingDiffSummary {
  id: string;
  path: string;
  additions: number;
  deletions: number;
  isNewFile: boolean;
  agentId: string | null;
  createdAt: number;
}

// Create a diff preview for proposed changes
export const createDiffPreview = async (request: DiffPreviewRequest): Promise<DiffPreviewResponse> => {
  const res = await apiFetch(`${API_BASE}/diff/preview`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to create diff preview');
  }

  return res.json();
};

// Apply a pending diff (write changes to file)
export const applyDiff = async (diffId: string): Promise<{ success: boolean; path: string; appliedAt: number }> => {
  const res = await apiFetch(`${API_BASE}/diff/apply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ diffId }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to apply diff');
  }

  return res.json();
};

// Reject a pending diff
export const rejectDiff = async (diffId: string, reason?: string): Promise<{ success: boolean; path: string; rejectedAt: number }> => {
  const res = await apiFetch(`${API_BASE}/diff/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ diffId, reason }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to reject diff');
  }

  return res.json();
};

// Get all pending diffs
export const getPendingDiffs = async (): Promise<{ pending: PendingDiffSummary[] }> => {
  const res = await apiFetch(`${API_BASE}/diff/pending`);

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to get pending diffs');
  }

  return res.json();
};

// Get a specific diff by ID
export const getDiff = async (diffId: string): Promise<DiffRecord> => {
  const res = await apiFetch(`${API_BASE}/diff/${diffId}`);

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Diff not found');
  }

  return res.json();
};

// --- Story 6-8: CHECKPOINT/UNDO API ---

export interface Checkpoint {
  id: string;
  filePath: string;
  timestamp: number;
  agentId: string | null;
  summary: string;
  contentHash: string;
  size: number;
}

export interface CheckpointStats {
  checkpointCount: number;
  fileCount: number;
  totalSizeBytes: number;
  totalSizeMB: string;
  maxStorageMB: number;
}

// Get checkpoints for a file
export const getCheckpoints = async (filePath: string): Promise<{ checkpoints: Checkpoint[] }> => {
  const res = await apiFetch(`${API_BASE}/checkpoints?filePath=${encodeURIComponent(filePath)}`);

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to get checkpoints');
  }

  return res.json();
};

// Get checkpoint content
export const getCheckpointContent = async (checkpointId: string): Promise<{ content: string }> => {
  const res = await apiFetch(`${API_BASE}/checkpoints/${checkpointId}/content`);

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to get checkpoint content');
  }

  return res.json();
};

// Restore a checkpoint
export const restoreCheckpoint = async (checkpointId: string): Promise<{
  success: boolean;
  filePath: string;
  restoredFrom: number;
  checkpointId: string;
}> => {
  const res = await apiFetch(`${API_BASE}/checkpoints/${checkpointId}/restore`, {
    method: 'POST',
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to restore checkpoint');
  }

  return res.json();
};

// Delete a checkpoint
export const deleteCheckpoint = async (checkpointId: string): Promise<{ success: boolean }> => {
  const res = await apiFetch(`${API_BASE}/checkpoints/${checkpointId}`, {
    method: 'DELETE',
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to delete checkpoint');
  }

  return res.json();
};

// Create manual checkpoint
export const createCheckpoint = async (filePath: string, summary?: string): Promise<Checkpoint> => {
  const res = await apiFetch(`${API_BASE}/checkpoints`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filePath, summary }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to create checkpoint');
  }

  return res.json();
};

// Get checkpoint stats
export const getCheckpointStats = async (): Promise<CheckpointStats> => {
  const res = await apiFetch(`${API_BASE}/checkpoints/stats`);

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to get checkpoint stats');
  }

  return res.json();
};

// Trigger manual cleanup
export const cleanupCheckpoints = async (): Promise<{ deletedCount: number }> => {
  const res = await apiFetch(`${API_BASE}/checkpoints/cleanup`, {
    method: 'POST',
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to cleanup checkpoints');
  }

  return res.json();
};

// --- Story 7-1: COGNITIVE SWARM ---

export interface Thought {
  id: string;
  thought: string;
  thoughtNumber: number;
  role: string;
}

export const triggerThink = async (prompt: string): Promise<{ thoughts: Thought[] }> => {
  const res = await apiFetch(`${API_BASE}/think`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to trigger reasoning');
  }

  return res.json();
};

// --- WORKSPACE MANAGEMENT ---

export interface Workspace {
  id: string;
  path: string;
  name: string;
  lastOpened: number;
  created: number;
  isGitRepo: boolean;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
  isGitRepo: boolean;
  fileCount: number;
}

export interface BrowseResult {
  entries: Array<{ name: string; path: string; isDirectory: boolean }>;
  parent: string | null;
  currentPath: string;
}

// Get all workspaces and active workspace
export const getWorkspaces = async (): Promise<{ workspaces: Workspace[], active: Workspace | null }> => {
  const res = await apiFetch(`${API_BASE}/workspaces`);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to get workspaces');
  }
  return res.json();
};

// Add new workspace
export const addWorkspace = async (path: string, name?: string): Promise<Workspace> => {
  const res = await apiFetch(`${API_BASE}/workspaces`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, name }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to add workspace');
  }

  const data = await res.json();
  return data.workspace;
};

// Activate a workspace
export const activateWorkspace = async (id: string): Promise<Workspace> => {
  const res = await apiFetch(`${API_BASE}/workspaces/${id}/activate`, {
    method: 'POST',
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to activate workspace');
  }

  const data = await res.json();
  return data.workspace;
};

// Remove workspace from list (doesn't delete files)
export const removeWorkspace = async (id: string): Promise<void> => {
  const res = await apiFetch(`${API_BASE}/workspaces/${id}`, {
    method: 'DELETE',
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to remove workspace');
  }
};

// Validate workspace path
export const validateWorkspacePath = async (path: string): Promise<ValidationResult> => {
  const res = await apiFetch(`${API_BASE}/workspaces/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to validate path');
  }

  return res.json();
};

// Browse directory for folder picker
export const browsePath = async (path?: string): Promise<BrowseResult> => {
  const url = path 
    ? `${API_BASE}/browse?path=${encodeURIComponent(path)}`
    : `${API_BASE}/browse`;
  
  const res = await apiFetch(url);

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to browse directory');
  }

  return res.json();
};

// File CRUD operations (workspace-aware)
export const createFile = async (path: string, workspaceId?: string): Promise<void> => {
  const res = await apiFetch(`${API_BASE}/files/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, type: 'file', workspaceId }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to create file');
  }
};

export const createFolder = async (path: string, workspaceId?: string): Promise<void> => {
  const res = await apiFetch(`${API_BASE}/files/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, type: 'directory', workspaceId }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to create folder');
  }
};

export const renameItem = async (oldPath: string, newPath: string, workspaceId?: string): Promise<void> => {
  const res = await apiFetch(`${API_BASE}/files/rename`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ oldPath, newPath, workspaceId }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to rename item');
  }
};

export const deleteItem = async (path: string, workspaceId?: string): Promise<void> => {
  const res = await apiFetch(`${API_BASE}/files`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, workspaceId }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to delete item');
  }
};

