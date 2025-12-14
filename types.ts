
export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
}

export interface LintIssue {
  line: number;
  message: string;
  severity: 'error' | 'warning';
  suggestion?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  // Metadata for autonomous agents
  type?: 'thought' | 'command' | 'output' | 'error' | 'vote_request' | 'vote_result' | 'phase_change' | 'pruning_alert';
  tokenCount?: number; // Economy tracking
  agentId?: AgentProfile; // Distinct Agent Identity
  phase?: NeuralPhase;
}

export type LlmProvider = 'vllm' | 'gemini' | 'anthropic' | 'cli' | 'copilot' | 'openai' | 'mock';

export interface ConnectionProfile {
  id: string;
  name: string;
  provider: LlmProvider;
  model: string;
  baseUrl?: string;
  apiKey?: string;
  cliCommand?: string;
}

export interface LlmConfig {
  provider: LlmProvider;
  model: string; 
  baseUrl?: string; 
  apiKey?: string; 
  cliCommand?: string; 
  maxTokensBudget?: number; 
}

export interface ApiConfig {
  baseUrl: string;
}

// NeuralDeck Agents
export type AgentProfile = 
  | 'analyst' 
  | 'product_manager' 
  | 'ux_designer' 
  | 'architect' 
  | 'scrum_master' 
  | 'developer' 
  | 'qa_engineer' 
  | 'sec_auditor' 
  | 'optimizer'
  | 'devops'
  | 'tech_writer'
  | 'red_teamer'; // New Adversarial Agent

export interface CouncilMember {
  id: string;
  name: string;
  role: 'Logic' | 'Creative' | 'Critic';
  color: string;
}

// Framework Types
export interface AgentAction {
  thought: string;
  tool: 'read_file' | 'write_file' | 'fs_write' | 'fs_read' | 'run_command' | 'list_files' | 'finish' | 'consult_expert' | 'npm_install' | string;
  parameters: {
    path?: string;
    content?: string;
    command?: string;
    expert?: string;
    question?: string;
    package?: string;
    [key: string]: any;
  };
  phaseTransition?: NeuralPhase; // Explicit request to change phase
}

export interface VoteResult {
  voter: AgentProfile;
  verdict: 'APPROVE' | 'REJECT' | 'ABSTAIN';
  reason: string;
}

export interface CouncilState {
  isVoting: boolean;
  proposal?: string;
  votes: VoteResult[];
  consensus?: 'APPROVED' | 'REJECTED';
}

export interface AgentState {
  goal: string;
  history: ChatMessage[];
  iteration: number;
  maxIterations: number;
  tokensUsed: number;
}

export type InterventionResponse = 
  | { type: 'APPROVE' }
  | { type: 'REJECT' }
  | { type: 'STEER', instruction: string };

export type ViewMode = 'workspace' | 'orchestrator' | 'laboratory' | 'connections' | 'git' | 'synapse' | 'construct' | 'board' | 'grid' | 'roundtable';

// NeuralDeck Phases
export type NeuralPhase = 'idle' | 'analysis' | 'planning' | 'design' | 'architecture' | 'implementation' | 'scrum' | 'swarm' | 'testing' | 'review' | 'optimize' | 'deployment' | 'documentation' | 'finished';

// Kanban Types
export interface Story {
  id: string;
  path: string;
  title: string;
  status: 'todo' | 'in-progress' | 'done';
  assignee?: AgentProfile;
  content: string;
}