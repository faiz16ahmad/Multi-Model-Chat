import { ModelId } from './atoms';

export interface SSEConnectionOptions {
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
  heartbeatInterval?: number;
  reconnectOnDrop?: boolean;
  bufferSize?: number;
  performanceMonitoring?: boolean;
}

export interface SSEEventData {
  modelId: ModelId;
  type: 'chunk' | 'progress' | 'error' | 'end' | 'heartbeat';
  data: string | { progress?: string; error?: string; [key: string]: unknown };
}

export type SSEEventHandler = (event: SSEEventData) => void;

export class SSEConnectionManager {
  private controller: AbortController | null = null;
  private reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  private decoder = new TextDecoder();
  private buffer = '';
  private lastActivity = 0;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private timeoutTimer: NodeJS.Timeout | null = null;
  private retryCount = 0;
  private isConnected = false;
  private completedModels = new Set<string>();
  private connectionStartTime = 0;
  private totalBytesReceived = 0;
  private chunksProcessed = 0;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  
  constructor(
    private options: SSEConnectionOptions = {},
    private onEvent: SSEEventHandler,
    private onConnectionChange: (status: 'connecting' | 'connected' | 'disconnected' | 'error') => void
  ) {
    this.options = {
      maxRetries: 3,
      retryDelay: 2000,
      timeout: 60000,
      heartbeatInterval: 10000,
      reconnectOnDrop: true,
      bufferSize: 8192,
      performanceMonitoring: true,
      ...options
    };
  }

  async connect(prompt: string, models: ModelId[]): Promise<void> {
    // Convert prompt to messages format for backward compatibility
    const messages = [{ role: 'user', content: prompt }];
    return this.connectWithMessages(messages, models);
  }

  async connectWithMessages(messages: { role: string; content: string }[], models: ModelId[]): Promise<void> {
    this.cleanup();
    this.onConnectionChange('connecting');
    this.connectionStartTime = Date.now();
    this.totalBytesReceived = 0;
    this.chunksProcessed = 0;
    
    try {
      this.controller = new AbortController();
      this.setupTimeout();
      
      const response = await fetch('/api/chat-proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify({ messages, models }),
        signal: this.controller.signal
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error('No response body received');
      }

      this.reader = response.body.getReader();
      this.isConnected = true;
      this.lastActivity = Date.now();
      this.onConnectionChange('connected');
      
      this.startHeartbeat();
      await this.processStream(models);
      
    } catch (error) {
      console.error('SSE Connection error:', error);
      this.onConnectionChange('error');
      
      if (this.shouldRetry(error)) {
        await this.retryWithMessages(messages, models);
      } else {
        throw error;
      }
    }
  }

  private async processStream(expectedModels: ModelId[]): Promise<void> {
    if (!this.reader) throw new Error('No reader available');
    
    try {
      while (this.isConnected) {
        const { done, value } = await this.reader.read();
        
        if (done) {
          // Check if this was an unexpected disconnection
          if (this.completedModels.size < expectedModels.length && this.options.reconnectOnDrop) {
            console.warn('Stream ended unexpectedly, attempting reconnection');
            await this.handleUnexpectedDisconnection(expectedModels);
            return;
          }
          
          this.handleStreamEnd(expectedModels);
          break;
        }

        this.lastActivity = Date.now();
        this.processChunk(value);
        
        // Check if all models completed
        if (this.completedModels.size === expectedModels.length) {
          this.disconnect();
          break;
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('Stream processing error:', error);
        
        // Try to reconnect on network errors
        if (this.options.reconnectOnDrop && this.shouldReconnect(error)) {
          await this.handleUnexpectedDisconnection(expectedModels);
          return;
        }
        
        throw error;
      }
    }
  }

  private processChunk(chunk: Uint8Array): void {
    this.totalBytesReceived += chunk.length;
    this.chunksProcessed++;
    
    const text = this.decoder.decode(chunk, { stream: true });
    this.buffer += text;
    
    // Prevent buffer from growing too large
    if (this.buffer.length > (this.options.bufferSize || 8192) * 2) {
      console.warn('SSE buffer growing large, truncating older data');
      const lines = this.buffer.split('\n');
      this.buffer = lines.slice(-50).join('\n'); // Keep last 50 lines
    }
    
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop() || '';
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line.startsWith('event: ')) {
        const event = line.slice(7);
        
        if (i + 1 < lines.length && lines[i + 1].startsWith('data: ')) {
          const data = lines[i + 1].slice(6);
          this.handleSSEEvent(event, data);
          i++; // Skip the data line
        }
      }
    }
    
    // Performance monitoring
    if (this.options.performanceMonitoring && this.chunksProcessed % 100 === 0) {
      const duration = Date.now() - this.connectionStartTime;
      const avgBytesPerSecond = this.totalBytesReceived / (duration / 1000);
      console.log(`SSE Performance: ${this.chunksProcessed} chunks, ${this.totalBytesReceived} bytes, ${avgBytesPerSecond.toFixed(0)} B/s`);
    }
  }

  private handleSSEEvent(event: string, data: string): void {
    try {
      // Handle heartbeat events
      if (event === 'heartbeat') {
        this.onEvent({
          modelId: '' as ModelId,
          type: 'heartbeat',
          data: { timestamp: Date.now() }
        });
        return;
      }

      // Parse model-specific events
      const eventParts = event.split('_');
      if (eventParts.length < 2) return;
      
      const modelId = eventParts.slice(0, -1).join('_') as ModelId;
      const eventType = eventParts[eventParts.length - 1] as 'chunk' | 'progress' | 'error' | 'end';
      
      let parsedData;
      try {
        parsedData = JSON.parse(data);
      } catch {
        parsedData = { message: data };
      }

      this.onEvent({
        modelId,
        type: eventType,
        data: parsedData
      });

      // Track completed models
      if (eventType === 'end' || eventType === 'error') {
        this.completedModels.add(modelId);
      }

    } catch (error) {
      console.error('Error handling SSE event:', error, { event, data });
    }
  }

  private handleStreamEnd(expectedModels: ModelId[]): void {
    // Mark any incomplete models as having stream errors
    expectedModels.forEach(modelId => {
      if (!this.completedModels.has(modelId)) {
        this.onEvent({
          modelId,
          type: 'error',
          data: { 
            message: 'Stream ended unexpectedly',
            retryable: true 
          }
        });
      }
    });
  }

  private setupTimeout(): void {
    if (this.options.timeout) {
      this.timeoutTimer = setTimeout(() => {
        if (this.isConnected) {
          this.disconnect();
          throw new Error('Connection timeout');
        }
      }, this.options.timeout);
    }
  }

  private startHeartbeat(): void {
    if (this.options.heartbeatInterval) {
      this.heartbeatTimer = setInterval(() => {
        const timeSinceActivity = Date.now() - this.lastActivity;
        
        if (timeSinceActivity > (this.options.heartbeatInterval! * 2)) {
          console.warn('No activity detected, connection may be stale');
          this.disconnect();
        }
      }, this.options.heartbeatInterval);
    }
  }

  private shouldRetry(error: unknown): boolean {
    if (this.retryCount >= this.options.maxRetries!) return false;
    
    if (error instanceof Error) {
      // Don't retry on authentication or permission errors
      if (error.message.includes('401') || error.message.includes('403')) {
        return false;
      }
      
      // Don't retry on abort errors (user cancelled)
      if (error.name === 'AbortError') {
        return false;
      }
    }
    
    return true;
  }

  private async retry(prompt: string, models: ModelId[]): Promise<void> {
    this.retryCount++;
    const delay = this.options.retryDelay! * Math.pow(2, this.retryCount - 1);
    
    console.log(`Retrying SSE connection in ${delay}ms (attempt ${this.retryCount}/${this.options.maxRetries})`);
    
    await new Promise(resolve => setTimeout(resolve, delay));
    return this.connect(prompt, models);
  }

  private async retryWithMessages(messages: { role: string; content: string }[], models: ModelId[]): Promise<void> {
    this.retryCount++;
    const delay = this.options.retryDelay! * Math.pow(2, this.retryCount - 1);
    
    console.log(`Retrying SSE connection with messages in ${delay}ms (attempt ${this.retryCount}/${this.options.maxRetries})`);
    
    await new Promise(resolve => setTimeout(resolve, delay));
    return this.connectWithMessages(messages, models);
  }

  disconnect(): void {
    this.isConnected = false;
    this.onConnectionChange('disconnected');
    this.cleanup();
  }

  private async handleUnexpectedDisconnection(expectedModels: ModelId[]): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      this.handleStreamEnd(expectedModels);
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 10000); // Max 10s delay
    
    console.log(`Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);
    
    // Notify about reconnection attempt
    this.onEvent({
      modelId: '' as ModelId,
      type: 'progress',
      data: { 
        message: `Connection lost, reconnecting... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`,
        reconnecting: true 
      }
    });

    await new Promise(resolve => setTimeout(resolve, delay));
    
    // Only reconnect for incomplete models
    const incompleteModels = expectedModels.filter(model => !this.completedModels.has(model));
    if (incompleteModels.length > 0) {
      try {
        // Store the original prompt - we'll need to get this from context
        // For now, we'll emit an error for incomplete models
        incompleteModels.forEach(modelId => {
          this.onEvent({
            modelId,
            type: 'error',
            data: { 
              message: 'Connection lost and could not be restored. Please try again.',
              retryable: true,
              reconnectionFailed: true
            }
          });
        });
      } catch (error) {
        console.error('Reconnection failed:', error);
        this.handleStreamEnd(expectedModels);
      }
    }
  }

  private shouldReconnect(error: unknown): boolean {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) return false;
    
    if (error instanceof Error) {
      // Reconnect on network errors, timeouts, but not on auth errors
      return !error.message.includes('401') && 
             !error.message.includes('403') && 
             !error.message.includes('400');
    }
    
    return true;
  }

  private cleanup(): void {
    if (this.controller) {
      this.controller.abort();
      this.controller = null;
    }
    
    if (this.reader) {
      this.reader.releaseLock();
      this.reader = null;
    }
    
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    
    if (this.timeoutTimer) {
      clearTimeout(this.timeoutTimer);
      this.timeoutTimer = null;
    }
    
    this.buffer = '';
    this.completedModels.clear();
    this.retryCount = 0;
    this.reconnectAttempts = 0;
  }

  isActive(): boolean {
    return this.isConnected;
  }

  getCompletedModels(): Set<string> {
    return new Set(this.completedModels);
  }

  getConnectionStats() {
    const duration = Date.now() - this.connectionStartTime;
    return {
      isConnected: this.isConnected,
      duration,
      totalBytesReceived: this.totalBytesReceived,
      chunksProcessed: this.chunksProcessed,
      avgBytesPerSecond: duration > 0 ? this.totalBytesReceived / (duration / 1000) : 0,
      completedModels: this.completedModels.size,
      reconnectAttempts: this.reconnectAttempts,
      lastActivity: this.lastActivity
    };
  }

  // Force reconnection for testing or manual recovery
  async forceReconnect(prompt: string, models: ModelId[]): Promise<void> {
    console.log('Force reconnecting SSE connection');
    this.reconnectAttempts = 0; // Reset reconnect attempts
    this.cleanup();
    await this.connect(prompt, models);
  }

  async forceReconnectWithMessages(messages: { role: string; content: string }[], models: ModelId[]): Promise<void> {
    console.log('Force reconnecting SSE connection with messages');
    this.reconnectAttempts = 0; // Reset reconnect attempts
    this.cleanup();
    await this.connectWithMessages(messages, models);
  }
}