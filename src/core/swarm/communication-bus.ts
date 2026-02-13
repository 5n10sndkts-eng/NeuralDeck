/**
 * V3 Swarm Coordination - Communication Bus
 *
 * High-performance inter-agent messaging system for the 15-agent swarm.
 * Enables real-time coordination with priority-based message routing.
 */

import { Agent } from './agent-registry';

export type MessagePriority = 'critical' | 'high' | 'medium' | 'low';
export type MessageType = 
  | 'task' 
  | 'status' 
  | 'result' 
  | 'error' 
  | 'coordination' 
  | 'heartbeat';

export interface SwarmMessage {
  id: string;
  type: MessageType;
  priority: MessagePriority;
  from: number; // Agent ID
  to?: number | number[]; // Target agent(s), undefined = broadcast
  payload: any;
  timestamp: number;
  ttl?: number; // Time to live in ms
}

export interface MessageHandler {
  (message: SwarmMessage): void | Promise<void>;
}

export interface BusMetrics {
  messagesSent: number;
  messagesReceived: number;
  messagesDropped: number;
  avgLatency: number;
  queueDepth: number;
}

export class CommunicationBus {
  private handlers: Map<string, MessageHandler[]> = new Map();
  private messageQueue: SwarmMessage[] = [];
  private messageHistory: SwarmMessage[] = [];
  private maxHistorySize = 1000;
  private metrics: BusMetrics = {
    messagesSent: 0,
    messagesReceived: 0,
    messagesDropped: 0,
    avgLatency: 0,
    queueDepth: 0,
  };
  private isRunning: boolean = false;
  private processInterval: NodeJS.Timeout | null = null;

  constructor(private processIntervalMs: number = 100) {}

  /**
   * Start the communication bus
   */
  start(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    this.processInterval = setInterval(() => {
      this.processQueue();
    }, this.processIntervalMs);

    console.log('[CommunicationBus] Started');
  }

  /**
   * Stop the communication bus
   */
  stop(): void {
    if (!this.isRunning) return;

    this.isRunning = false;
    if (this.processInterval) {
      clearInterval(this.processInterval);
      this.processInterval = null;
    }

    console.log('[CommunicationBus] Stopped');
  }

  /**
   * Send a message to specific agent(s)
   */
  send(message: Omit<SwarmMessage, 'id' | 'timestamp'>): string {
    const fullMessage: SwarmMessage = {
      ...message,
      id: this.generateMessageId(),
      timestamp: Date.now(),
    };

    this.enqueueMessage(fullMessage);
    this.metrics.messagesSent++;
    this.metrics.queueDepth = this.messageQueue.length;

    return fullMessage.id;
  }

  /**
   * Broadcast a message to all agents
   */
  broadcast(
    from: number,
    type: MessageType,
    payload: any,
    priority: MessagePriority = 'medium'
  ): string {
    return this.send({
      type,
      priority,
      from,
      to: undefined,
      payload,
    });
  }

  /**
   * Subscribe to messages
   */
  subscribe(
    agentId: number,
    handler: MessageHandler,
    messageTypes?: MessageType[]
  ): () => void {
    const key = messageTypes 
      ? `agent:${agentId}:${messageTypes.join(',')}` 
      : `agent:${agentId}`;
    
    if (!this.handlers.has(key)) {
      this.handlers.set(key, []);
    }
    
    this.handlers.get(key)!.push(handler);

    return () => {
      const handlers = this.handlers.get(key);
      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index > -1) {
          handlers.splice(index, 1);
        }
      }
    };
  }

  /**
   * Process message queue
   */
  private processQueue(): void {
    if (this.messageQueue.length === 0) return;

    // Sort by priority
    this.messageQueue.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    // Process messages
    const batchSize = Math.min(10, this.messageQueue.length);
    const batch = this.messageQueue.splice(0, batchSize);

    for (const message of batch) {
      this.deliverMessage(message);
    }

    this.metrics.queueDepth = this.messageQueue.length;
  }

  private deliverMessage(message: SwarmMessage): void {
    const startTime = Date.now();

    // Check TTL
    if (message.ttl && Date.now() - message.timestamp > message.ttl) {
      this.metrics.messagesDropped++;
      return;
    }

    // Get target handlers
    const handlers: MessageHandler[] = [];

    if (message.to !== undefined) {
      if (typeof message.to === 'number') {
        const agentKey = `agent:${message.to}`;
        handlers.push(...(this.handlers.get(agentKey) || []));
      } else {
        for (const agentId of message.to) {
          const agentKey = `agent:${agentId}`;
          handlers.push(...(this.handlers.get(agentKey) || []));
        }
      }
    } else {
      // Broadcast
      handlers.push(...(this.handlers.get('broadcast') || []));
    }

    // Call handlers
    for (const handler of handlers) {
      try {
        handler(message);
      } catch (error) {
        console.error('[CommunicationBus] Handler error:', error);
      }
    }

    // Record metrics
    const latency = Date.now() - startTime;
    this.updateLatencyMetrics(latency);
    this.metrics.messagesReceived++;

    // Store in history
    this.messageHistory.push(message);
    if (this.messageHistory.length > this.maxHistorySize) {
      this.messageHistory.shift();
    }
  }

  private enqueueMessage(message: SwarmMessage): void {
    this.messageQueue.push(message);
  }

  private generateMessageId(): string {
    return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private updateLatencyMetrics(latency: number): void {
    if (this.metrics.avgLatency === 0) {
      this.metrics.avgLatency = latency;
    } else {
      this.metrics.avgLatency = (this.metrics.avgLatency * 0.9) + (latency * 0.1);
    }
  }

  getMetrics(): BusMetrics {
    return { ...this.metrics };
  }

  getQueueDepth(): number {
    return this.messageQueue.length;
  }
}

export default CommunicationBus;
