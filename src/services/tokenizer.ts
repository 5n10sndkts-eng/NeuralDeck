
import { ChatMessage } from '../types';

// Heuristic: ~4 chars per token on average for English code/text
const CHARS_PER_TOKEN = 4;

export const estimateTokens = (text: string): number => {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
};

export const countHistoryTokens = (history: ChatMessage[]): number => {
  return history.reduce((acc, msg) => acc + estimateTokens(msg.content), 0);
};

export const pruneHistory = (
  history: ChatMessage[], 
  maxTokens: number = 4000
): { prunedHistory: ChatMessage[]; removedCount: number } => {
  const currentTokens = countHistoryTokens(history);
  
  if (currentTokens <= maxTokens) {
    return { prunedHistory: history, removedCount: 0 };
  }

  // STRATEGY:
  // 1. Keep System Prompt (First message usually)
  // 2. Keep Last N messages (Active context)
  // 3. Prune from the middle

  const systemMsg = history[0].role === 'system' ? history[0] : null;
  const startIndex = systemMsg ? 1 : 0;
  const protectedCount = 4; // Keep last 4 messages
  
  if (history.length <= protectedCount + startIndex + 1) {
     return { prunedHistory: history, removedCount: 0 }; // Can't prune much
  }

  let pruned = [...history];
  let removed = 0;
  
  // Remove messages from the 'middle' until we fit or hit the protected zone
  // We actually remove from index 1 (after system) up to length-protected
  
  while (countHistoryTokens(pruned) > maxTokens && pruned.length > (protectedCount + startIndex + 1)) {
      // Remove the oldest non-system message
      pruned.splice(startIndex, 1);
      removed++;
  }

  // Insert a placeholder to indicate memory loss
  if (removed > 0) {
      pruned.splice(startIndex, 0, {
          role: 'system',
          content: `[SYSTEM NOTICE: ${removed} messages were archived to free up ${currentTokens - maxTokens} tokens of memory space. Previous context compressed.]`,
          timestamp: Date.now(),
          type: 'pruning_alert'
      });
  }

  return { prunedHistory: pruned, removedCount: removed };
};
