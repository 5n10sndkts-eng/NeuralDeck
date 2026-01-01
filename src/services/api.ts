
import { ChatMessage, FileNode, LlmConfig } from '../types';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001/api';

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
export const fetchFiles = async (): Promise<FileNode[]> => {
  try {
    const res = await fetch(`${API_BASE}/files`);
    if (!res.ok) throw new Error('Failed to fetch files');
    return res.json();
  } catch (error) {
    return [];
  }
};

export const readFile = async (filePath: string): Promise<string> => {
  try {
    const res = await fetch(`${API_BASE}/read`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filePath }),
    });
    const data = await res.json();
    return data.content;
  } catch (error) { return "Error reading file"; }
};

export const writeFile = async (filePath: string, content: string): Promise<void> => {
  await fetch(`${API_BASE}/write`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filePath, content }),
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
