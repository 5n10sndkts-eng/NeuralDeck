
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

export type LlmProvider =
  | 'vllm'
  | 'lmstudio'
  | 'gemini'
  | 'anthropic'
  | 'cli'
  | 'copilot'
  | 'openai'
  | 'mock'
  | 'claude-cli'
  | 'gemini-cli'
  | 'copilot-cli'
  | 'cursor-cli';

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
  | 'red_teamer'
  | 'merger' // Story 4-3: Merge Conflict Resolver
  // Story 5-2: Red Team Agent Squad
  | 'pen_tester'
  | 'vuln_scanner'
  | 'code_auditor';

// Story 5-2: Red Team Agent Types
export type RedTeamAgent = 'pen_tester' | 'vuln_scanner' | 'code_auditor' | 'red_teamer';

export type VulnerabilitySeverity = 'Critical' | 'High' | 'Medium' | 'Low';

export type VulnerabilityType =
  | 'SQL_INJECTION'
  | 'XSS'
  | 'PATH_TRAVERSAL'
  | 'COMMAND_INJECTION'
  | 'INSECURE_DESERIALIZATION'
  | 'BROKEN_AUTH'
  | 'SENSITIVE_DATA_EXPOSURE'
  | 'XXE'
  | 'BROKEN_ACCESS_CONTROL'
  | 'SECURITY_MISCONFIGURATION'
  | 'INSECURE_DEPENDENCY'
  | 'HARDCODED_SECRET'
  | 'WEAK_CRYPTO';

export interface VulnerabilityFinding {
  id: string;
  type: VulnerabilityType;
  severity: VulnerabilitySeverity;
  title: string;
  description: string;
  filePath: string;
  lineNumber?: number;
  codeSnippet?: string;
  impact: string;
  remediation: string;
  detectedBy: RedTeamAgent;
  timestamp: number;
  status: 'open' | 'reviewed' | 'fixed' | 'false_positive';
}

export interface SecurityReport {
  id: string;
  scanId: string;
  startTime: number;
  endTime?: number;
  status: 'running' | 'completed' | 'failed';
  findings: VulnerabilityFinding[];
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    total: number;
  };
  scannedFiles: string[];
  agentsDeployed: RedTeamAgent[];
}

// Visual state for ReactFlow nodes (Story 2-1)
export type AgentNodeState = 'IDLE' | 'THINKING' | 'WORKING' | 'DONE';

// ReactFlow node data interface
export interface AgentNodeData {
  label: string;
  role: string;
  agentId: AgentProfile | 'user_input' | 'qa' | 'security';
  state: AgentNodeState;
}

export interface Packet {
  id: string;
  sourceId: string;
  targetId: string;
  edgeId: string;
  timestamp: number;
}

// Tool Execution Types (Story 2-3)
export type ToolExecutionState = 'idle' | 'executing' | 'success' | 'error';

export interface ToolOutputChunk {
  stream: 'stdout' | 'stderr';
  content: string;
  timestamp: number;
  sequenceNumber?: number;
}

export interface ToolExecution {
  id: string;
  agentId: string;
  toolName: string;
  status: ToolExecutionState;
  output: ToolOutputChunk[];
  startTime: number;
  endTime?: number;
  duration?: number;
  exitCode?: number;
  error?: string;
  arguments?: Record<string, unknown>;
}

export interface ToolHistoryEntry {
  id: string;
  agentId: string;
  toolName: string;
  status: ToolExecutionState;
  timestamp: number;
  duration: number;
  exitCode?: number;
  outputPreview: string; // First 200 chars of output
  fullOutput: string;
}

// WebSocket event payloads for tool execution
export interface ToolStartedEvent {
  agentId: string;
  toolName: string;
  executionId: string;
  timestamp: number;
  arguments?: Record<string, unknown>;
}

export interface ToolOutputEvent {
  agentId: string;
  toolName: string;
  executionId: string;
  output: string;
  stream: 'stdout' | 'stderr';
  timestamp: number;
  sequenceNumber: number;
}

export interface ToolCompletedEvent {
  agentId: string;
  toolName: string;
  executionId: string;
  status: 'success' | 'error';
  exitCode?: number;
  duration: number;
  timestamp: number;
  error?: string;
}


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

export type ViewMode = 'workspace' | 'orchestrator' | 'laboratory' | 'connections' | 'git' | 'synapse' | 'construct' | 'construct-3d' | 'board' | 'grid' | 'roundtable' | 'terminal';

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