/**
 * Optimized MCP Transport
 * 
 * High-performance transport layer with compression, batching,
 * and intelligent message routing for reduced latency.
 */

interface MCPMessage {
  id: string;
  type: 'request' | 'response' | 'notification' | 'batch' | 'error';
  priority?: 'high' | 'normal' | 'low';
  payload: any;
  timestamp: number;
}

interface TransportConfig {
  compressionEnabled: boolean;
  compressionThreshold: number; // bytes
  batchingEnabled: boolean;
  batchTimeoutMs: number;
  maxBatchSize: number;
  requestTimeoutMs: number;
}

interface TransportStats {
  messagesSent: number;
  messagesReceived: number;
  bytesSent: number;
  bytesReceived: number;
  avgLatency: number;
  compressionRatio: number;
  batchEfficiency: number;
}

const DEFAULT_CONFIG: TransportConfig = {
  compressionEnabled: true,
  compressionThreshold: 1024, // 1KB
  batchingEnabled: true,
  batchTimeoutMs: 10,
  maxBatchSize: 100,
  requestTimeoutMs: 30000,
};

export class OptimizedTransport {
  private config: TransportConfig;
  private batchBuffer: MCPMessage[] = [];
  private batchTimeout: NodeJS.Timeout | null = null;
  private pendingRequests: Map<string, { resolve: Function; reject: Function; timer: NodeJS.Timeout }> = new Map();
  private stats: TransportStats;
  private messageHandler?: (message: MCPMessage) => void;
  private sendFunction: (data: Uint8Array) => Promise<void>;

  constructor(
    sendFunction: (data: Uint8Array) => Promise<void>,
    config: Partial<TransportConfig> = {}
  ) {
    this.sendFunction = sendFunction;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.stats = {
      messagesSent: 0,
      messagesReceived: 0,
      bytesSent: 0,
      bytesReceived: 0,
      avgLatency: 0,
      compressionRatio: 0,
      batchEfficiency: 0,
    };
  }

  /**
   * Set message handler for incoming messages
   */
  onMessage(handler: (message: MCPMessage) => void): void {
    this.messageHandler = handler;
  }

  /**
   * Send a message through the transport
   */
  async send(message: MCPMessage): Promise<void> {
    // Check if message can be batched
    if (this.config.batchingEnabled && this.canBatch(message)) {
      this.addToBatch(message);
      return;
    }

    await this.sendImmediate(message);
  }

  /**
   * Send a request and wait for response
   */
  async sendRequest(message: MCPMessage): Promise<MCPMessage> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(message.id);
        reject(new Error(`Request timeout after ${this.config.requestTimeoutMs}ms`));
      }, this.config.requestTimeoutMs);

      this.pendingRequests.set(message.id, { resolve, reject, timer: timeout });
      this.send(message);
    });
  }

  /**
   * Handle incoming message
   */
  async receive(data: Uint8Array): Promise<void> {
    const startTime = performance.now();

    try {
      // Decompress if needed
      const message = await this.decompress(data);
      
      this.stats.messagesReceived++;
      this.stats.bytesReceived += data.length;

      // Handle batched messages
      if (message.type === 'batch' && Array.isArray(message.payload.messages)) {
        for (const batchedMessage of message.payload.messages) {
          await this.processMessage(batchedMessage);
        }
      } else {
        await this.processMessage(message);
      }

      // Update latency stats
      const latency = performance.now() - startTime;
      this.updateLatencyStats(latency);
    } catch (err) {
      console.error('[OptimizedTransport] Error processing message:', err);
    }
  }

  /**
   * Flush any pending batched messages
   */
  async flush(): Promise<void> {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }
    await this.flushBatch();
  }

  /**
   * Get transport statistics
   */
  getStats(): TransportStats {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      messagesSent: 0,
      messagesReceived: 0,
      bytesSent: 0,
      bytesReceived: 0,
      avgLatency: 0,
      compressionRatio: 0,
      batchEfficiency: 0,
    };
  }

  private async sendImmediate(message: MCPMessage): Promise<void> {
    const startTime = performance.now();

    // Serialize
    const serialized = JSON.stringify(message);
    let payload = new TextEncoder().encode(serialized);
    let compressed = false;

    // Compress if enabled and payload is large enough
    if (this.config.compressionEnabled && payload.length > this.config.compressionThreshold) {
      payload = await this.compress(payload);
      compressed = true;
    }

    // Send
    await this.sendFunction(payload);

    // Update stats
    this.stats.messagesSent++;
    this.stats.bytesSent += payload.length;
    
    if (compressed) {
      const ratio = serialized.length / payload.length;
      this.stats.compressionRatio = this.updateMovingAverage(
        this.stats.compressionRatio,
        ratio
      );
    }

    const latency = performance.now() - startTime;
    this.updateLatencyStats(latency);
  }

  private addToBatch(message: MCPMessage): void {
    this.batchBuffer.push(message);

    // Start batch timeout if not already running
    if (!this.batchTimeout) {
      this.batchTimeout = setTimeout(
        () => this.flushBatch(),
        this.config.batchTimeoutMs
      );
    }

    // Flush if batch is full
    if (this.batchBuffer.length >= this.config.maxBatchSize) {
      this.flushBatch();
    }
  }

  private async flushBatch(): Promise<void> {
    if (this.batchBuffer.length === 0) return;

    const batch = this.batchBuffer.splice(0);
    this.batchTimeout = null;

    // Calculate batch efficiency
    this.stats.batchEfficiency = batch.length / this.config.maxBatchSize;

    // Send as single batched message
    const batchMessage: MCPMessage = {
      id: `batch-${Date.now()}`,
      type: 'batch',
      payload: { messages: batch },
      timestamp: Date.now(),
    };

    await this.sendImmediate(batchMessage);
  }

  private async processMessage(message: MCPMessage): Promise<void> {
    // Check if this is a response to a pending request
    if (message.type === 'response') {
      const pending = this.pendingRequests.get(message.payload.requestId);
      if (pending) {
        clearTimeout(pending.timer);
        this.pendingRequests.delete(message.payload.requestId);
        pending.resolve(message);
        return;
      }
    }

    // Handle error responses
    if (message.type === 'error') {
      const pending = this.pendingRequests.get(message.payload.requestId);
      if (pending) {
        clearTimeout(pending.timer);
        this.pendingRequests.delete(message.payload.requestId);
        pending.reject(new Error(message.payload.error));
        return;
      }
    }

    // Call message handler
    if (this.messageHandler) {
      this.messageHandler(message);
    }
  }

  private canBatch(message: MCPMessage): boolean {
    // Don't batch urgent or high priority messages
    if (message.priority === 'high') return false;
    
    // Don't batch responses or errors
    if (message.type === 'response' || message.type === 'error') return false;
    
    return true;
  }

  private async compress(data: Uint8Array): Promise<Uint8Array> {
    // Use CompressionStream API if available
    if (typeof CompressionStream !== 'undefined') {
      const stream = new CompressionStream('gzip');
      const writer = stream.writable.getWriter();
      writer.write(data);
      writer.close();

      const reader = stream.readable.getReader();
      const chunks: Uint8Array[] = [];
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }

      // Concatenate chunks
      const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
      const result = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
      }

      return result;
    }

    // Fallback: return uncompressed
    return data;
  }

  private async decompress(data: Uint8Array): Promise<MCPMessage> {
    // Try to decompress
    try {
      if (typeof DecompressionStream !== 'undefined') {
        const stream = new DecompressionStream('gzip');
        const writer = stream.writable.getWriter();
        writer.write(data);
        writer.close();

        const reader = stream.readable.getReader();
        const chunks: Uint8Array[] = [];
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
        }

        // Concatenate chunks
        const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
        const result = new Uint8Array(totalLength);
        let offset = 0;
        for (const chunk of chunks) {
          result.set(chunk, offset);
          offset += chunk.length;
        }

        const json = new TextDecoder().decode(result);
        return JSON.parse(json);
      }
    } catch {
      // Not compressed or decompression failed, try parsing directly
    }

    // Parse as JSON directly
    const json = new TextDecoder().decode(data);
    return JSON.parse(json);
  }

  private updateLatencyStats(latency: number): void {
    this.stats.avgLatency = this.updateMovingAverage(
      this.stats.avgLatency,
      latency
    );
  }

  private updateMovingAverage(current: number, newValue: number): number {
    if (current === 0) return newValue;
    return (current * 0.9) + (newValue * 0.1);
  }
}

export type { MCPMessage, TransportConfig, TransportStats };
