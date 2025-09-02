import { SSEConnectionManager, SSEEventHandler, SSEConnectionOptions } from './sseManager';
import { ModelId } from './atoms';

export interface ConnectionPoolOptions {
  maxConcurrentConnections?: number;
  connectionTimeout?: number;
  retryOptions?: SSEConnectionOptions;
}

export interface PooledConnection {
  id: string;
  manager: SSEConnectionManager;
  models: ModelId[];
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  createdAt: number;
}

export class ConnectionPool {
  private connections = new Map<string, PooledConnection>();
  private activeConnections = 0;
  
  constructor(
    private options: ConnectionPoolOptions = {},
    private globalEventHandler: SSEEventHandler,
    private globalStatusHandler: (connectionId: string, status: string) => void
  ) {
    this.options = {
      maxConcurrentConnections: 3,
      connectionTimeout: 60000,
      retryOptions: {
        maxRetries: 3,
        retryDelay: 2000,
        timeout: 60000,
        heartbeatInterval: 10000,
        reconnectOnDrop: true,
        bufferSize: 8192,
        performanceMonitoring: true
      },
      ...options
    };
  }

  async createConnection(
    messages: { role: string; content: string }[] | string, 
    models: ModelId[], 
    connectionId?: string
  ): Promise<string> {
    const id = connectionId || this.generateConnectionId();
    
    // Check connection limits
    if (this.activeConnections >= this.options.maxConcurrentConnections!) {
      await this.waitForAvailableSlot();
    }

    // Clean up existing connection with same ID
    if (this.connections.has(id)) {
      await this.closeConnection(id);
    }

    const manager = new SSEConnectionManager(
      this.options.retryOptions,
      (event) => this.handleEvent(id, event),
      (status) => this.handleStatusChange(id, status)
    );

    const connection: PooledConnection = {
      id,
      manager,
      models,
      status: 'connecting',
      createdAt: Date.now()
    };

    this.connections.set(id, connection);
    this.activeConnections++;

    try {
      // Support both string prompt (legacy) and messages array
      if (typeof messages === 'string') {
        await manager.connect(messages, models);
      } else {
        await manager.connectWithMessages(messages, models);
      }
      return id;
    } catch (error) {
      this.removeConnection(id);
      throw error;
    }
  }

  async closeConnection(connectionId: string): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    connection.manager.disconnect();
    this.removeConnection(connectionId);
  }

  async closeAllConnections(): Promise<void> {
    const closePromises = Array.from(this.connections.keys()).map(id => 
      this.closeConnection(id)
    );
    await Promise.all(closePromises);
  }

  getConnection(connectionId: string): PooledConnection | undefined {
    return this.connections.get(connectionId);
  }

  getAllConnections(): PooledConnection[] {
    return Array.from(this.connections.values());
  }

  getActiveConnectionCount(): number {
    return this.activeConnections;
  }

  getConnectionStats(): {
    total: number;
    active: number;
    connecting: number;
    connected: number;
    error: number;
    performance?: any[];
  } {
    const connections = Array.from(this.connections.values());
    const performance = connections.map(conn => ({
      id: conn.id,
      status: conn.status,
      models: conn.models,
      age: Date.now() - conn.createdAt,
      stats: conn.manager.getConnectionStats()
    }));

    return {
      total: connections.length,
      active: this.activeConnections,
      connecting: connections.filter(c => c.status === 'connecting').length,
      connected: connections.filter(c => c.status === 'connected').length,
      error: connections.filter(c => c.status === 'error').length,
      performance
    };
  }

  // Cleanup stale connections
  cleanupStaleConnections(maxAge: number = 300000): number { // 5 minutes default
    const now = Date.now();
    let cleaned = 0;
    
    for (const [id, connection] of this.connections) {
      if (now - connection.createdAt > maxAge && 
          (connection.status === 'disconnected' || connection.status === 'error')) {
        this.removeConnection(id);
        cleaned++;
      }
    }
    
    return cleaned;
  }

  private handleEvent(connectionId: string, event: any): void {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    // Add connection context to event
    const enhancedEvent = {
      ...event,
      connectionId,
      timestamp: Date.now()
    };

    this.globalEventHandler(enhancedEvent);
  }

  private handleStatusChange(connectionId: string, status: string): void {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    connection.status = status as any;
    this.globalStatusHandler(connectionId, status);

    // Clean up completed connections
    if (status === 'disconnected' || status === 'error') {
      setTimeout(() => {
        if (this.connections.has(connectionId)) {
          this.removeConnection(connectionId);
        }
      }, 5000); // Keep for 5 seconds for debugging
    }
  }

  private removeConnection(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    this.connections.delete(connectionId);
    if (this.activeConnections > 0) {
      this.activeConnections--;
    }
  }

  private async waitForAvailableSlot(): Promise<void> {
    return new Promise((resolve) => {
      const checkSlot = () => {
        if (this.activeConnections < this.options.maxConcurrentConnections!) {
          resolve();
        } else {
          setTimeout(checkSlot, 100);
        }
      };
      checkSlot();
    });
  }

  // Force reconnection for a specific connection
  async forceReconnect(connectionId: string, messages: { role: string; content: string }[] | string): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      throw new Error(`Connection ${connectionId} not found`);
    }

    try {
      if (typeof messages === 'string') {
        await connection.manager.forceReconnect(messages, connection.models);
      } else {
        await connection.manager.forceReconnectWithMessages(messages, connection.models);
      }
    } catch (error) {
      console.error(`Failed to reconnect ${connectionId}:`, error);
      this.removeConnection(connectionId);
      throw error;
    }
  }

  // Get detailed performance metrics for all connections
  getPerformanceMetrics() {
    const connections = Array.from(this.connections.values());
    return {
      poolStats: {
        totalConnections: connections.length,
        activeConnections: this.activeConnections,
        avgConnectionAge: connections.length > 0 
          ? connections.reduce((sum, conn) => sum + (Date.now() - conn.createdAt), 0) / connections.length 
          : 0
      },
      connectionDetails: connections.map(conn => ({
        id: conn.id,
        models: conn.models,
        status: conn.status,
        age: Date.now() - conn.createdAt,
        performance: conn.manager.getConnectionStats()
      }))
    };
  }

  private generateConnectionId(): string {
    return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}