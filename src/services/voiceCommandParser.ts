/**
 * Voice Command Parser
 * 
 * Parses natural language voice commands and maps them to application actions.
 * Uses fuzzy matching for command recognition with confidence threshold.
 */

export interface VoiceCommand {
  action: string;
  target?: string;
  confidence: number;
}

export interface CommandPattern {
  pattern: RegExp;
  action: string;
  category: 'navigation' | 'agent' | 'file' | 'system';
  examples: string[];
}

// Command vocabulary with regex patterns
const COMMAND_PATTERNS: CommandPattern[] = [
  // Navigation commands
  {
    pattern: /show (the )?workspace/i,
    action: 'navigation:workspace',
    category: 'navigation',
    examples: ['show workspace', 'show the workspace', 'go to workspace'],
  },
  {
    pattern: /open (the )?construct/i,
    action: 'navigation:construct',
    category: 'navigation',
    examples: ['open construct', 'open the construct'],
  },
  {
    pattern: /switch to (the )?terminal/i,
    action: 'navigation:terminal',
    category: 'navigation',
    examples: ['switch to terminal', 'switch to the terminal'],
  },
  {
    pattern: /show (the )?dashboard/i,
    action: 'navigation:dashboard',
    category: 'navigation',
    examples: ['show dashboard', 'show the dashboard'],
  },
  {
    pattern: /go to workspace/i,
    action: 'navigation:workspace',
    category: 'navigation',
    examples: ['go to workspace'],
  },
  
  // Agent control commands
  {
    pattern: /activate (\w+)/i,
    action: 'agent:activate',
    category: 'agent',
    examples: ['activate analyst', 'activate architect'],
  },
  {
    pattern: /run (the )?swarm/i,
    action: 'agent:swarm',
    category: 'agent',
    examples: ['run swarm', 'run the swarm'],
  },
  {
    pattern: /stop (all )?agents/i,
    action: 'agent:stop',
    category: 'agent',
    examples: ['stop agents', 'stop all agents'],
  },
  {
    pattern: /pause agents/i,
    action: 'agent:pause',
    category: 'agent',
    examples: ['pause agents'],
  },
  {
    pattern: /resume agents/i,
    action: 'agent:resume',
    category: 'agent',
    examples: ['resume agents'],
  },
  
  // File operation commands
  {
    pattern: /open file (.+)/i,
    action: 'file:open',
    category: 'file',
    examples: ['open file app.tsx'],
  },
  {
    pattern: /create (a )?new file/i,
    action: 'file:create',
    category: 'file',
    examples: ['create new file', 'create a new file'],
  },
  {
    pattern: /save (all )?files?/i,
    action: 'file:save',
    category: 'file',
    examples: ['save file', 'save all files'],
  },
  {
    pattern: /close file/i,
    action: 'file:close',
    category: 'file',
    examples: ['close file'],
  },
  
  // System commands
  { pattern: /help/i, action: 'system:help', category: 'system', examples: ['help'] },
  {
    pattern: /repeat (last|that)/i,
    action: 'system:repeat',
    category: 'system',
    examples: ['repeat last', 'repeat that'],
  },
  { pattern: /cancel/i, action: 'system:cancel', category: 'system', examples: ['cancel'] },
  { pattern: /undo/i, action: 'system:undo', category: 'system', examples: ['undo'] },
];

/**
 * Calculate Levenshtein distance for fuzzy matching
 */
function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix: number[][] = [];

  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[len1][len2];
}

/**
 * Calculate similarity score between two strings (0-1)
 */
function similarityScore(str1: string, str2: string): number {
  const distance = levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
  const maxLength = Math.max(str1.length, str2.length);
  return 1 - distance / maxLength;
}

/**
 * Parse voice transcript into command
 */
export function parseVoiceCommand(
  transcript: string | null | undefined,
  speechConfidence: number = 1.0,
  confidenceThreshold: number = 0.7
): VoiceCommand | null {
  if (typeof transcript !== 'string') {
    return null;
  }

  const normalizedTranscript = transcript.trim().toLowerCase();
  if (!normalizedTranscript) {
    return null;
  }

  // Try exact pattern matching first
  for (const pattern of COMMAND_PATTERNS) {
    const match = normalizedTranscript.match(pattern.pattern);
    if (match) {
      const target = match[1] || match[2]; // Capture group for target (e.g., agent name, file name)
      
      return {
        action: pattern.action,
        target: target?.trim(),
        confidence: speechConfidence,
      };
    }
  }

  // Fuzzy matching fallback
  let bestMatch: { pattern: CommandPattern; score: number } | null = null;

  for (const pattern of COMMAND_PATTERNS) {
    for (const example of pattern.examples) {
      const score = similarityScore(normalizedTranscript, example);
      if (score > 0.72 && (!bestMatch || score > bestMatch.score)) {
        bestMatch = { pattern, score };
      }
    }
  }

  if (bestMatch && bestMatch.score * speechConfidence >= confidenceThreshold) {
    return {
      action: bestMatch.pattern.action,
      confidence: bestMatch.score * speechConfidence,
    };
  }

  return null;
}

/**
 * Get all available commands grouped by category
 */
export function getAvailableCommands(): Record<string, string[]> {
  const commands: Record<string, string[]> = {
    navigation: [],
    agent: [],
    file: [],
    system: [],
  };

  for (const pattern of COMMAND_PATTERNS) {
    const example = pattern.pattern.source
      .replace(/\\/gi, '')
      .replace(/\(\?\:/g, '')
      .replace(/\)/g, '')
      .replace(/\|/g, ' or ')
      .replace(/\(\w\+\)/i, '<name>')
      .replace(/\(\.\+\)/i, '<name>');

    commands[pattern.category].push(example);
  }

  return commands;
}

/**
 * Format command for display
 */
export function formatCommand(command: VoiceCommand): string {
  const [category, actionType] = command.action.split(':');
  const target = command.target ? ` "${command.target}"` : '';
  return `${category}: ${actionType}${target} (${Math.round(command.confidence * 100)}%)`;
}
