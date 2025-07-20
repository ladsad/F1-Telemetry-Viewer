export type WebSocketStatus = "connecting" | "open" | "closed" | "error";

type MessageHandler<T = any> = (data: T) => void;
type StatusHandler = (status: WebSocketStatus) => void;

/**
 * Enhanced WebSocket client for OpenF1 API with:
 * - Automatic reconnection
 * - Burst handling
 * - Status tracking
 * - Robust error handling
 */
export class OpenF1WebSocket {
  private url: string;
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private handlers: MessageHandler[] = [];
  private statusHandlers: StatusHandler[] = [];
  private isClosed = false;
  public status: WebSocketStatus = "closed";

  // For handling bursts - queue and batch process
  private messageQueue: any[] = [];
  private processingInterval: NodeJS.Timeout | null = null;
  private queueOptions = {
    batchSize: 5,       // Process up to 5 messages at once
    intervalMs: 50,     // Process queue every 50ms
    maxQueueSize: 100   // Prevent unbounded growth
  };

  constructor(url: string, queueOptions?: Partial<typeof this.queueOptions>) {
    this.url = url;
    
    if (queueOptions) {
      this.queueOptions = {...this.queueOptions, ...queueOptions};
    }
    
    this.startQueueProcessor();
    this.connect();
  }

  private startQueueProcessor() {
    this.processingInterval = setInterval(() => {
      this.processQueue();
    }, this.queueOptions.intervalMs);
  }

  private processQueue() {
    if (this.messageQueue.length === 0) return;
    
    // Process a batch of messages
    const batch = this.messageQueue.splice(0, this.queueOptions.batchSize);
    
    // Send each message to all handlers
    batch.forEach(message => {
      this.handlers.forEach(handler => {
        try {
          handler(message);
        } catch (err) {
          console.error("Error in message handler:", err);
        }
      });
    });
  }

  private updateStatus(newStatus: WebSocketStatus) {
    if (this.status !== newStatus) {
      this.status = newStatus;
      this.statusHandlers.forEach(handler => {
        try {
          handler(newStatus);
        } catch (err) {
          console.error("Error in status handler:", err);
        }
      });
    }
  }

  private connect() {
    this.updateStatus("connecting");
    
    try {
      this.ws = new WebSocket(this.url);
      
      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.updateStatus("open");
      };
      
      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Add to queue instead of immediately processing
          this.messageQueue.push(data);
          
          // Prevent queue from growing too large
          if (this.messageQueue.length > this.queueOptions.maxQueueSize) {
            // Keep most recent messages, discard oldest
            this.messageQueue = this.messageQueue.slice(-Math.floor(this.queueOptions.maxQueueSize / 2));
          }
        } catch (err) {
          console.error("Error parsing WebSocket message:", err);
        }
      };
      
      this.ws.onclose = () => {
        this.updateStatus("closed");
        if (!this.isClosed) this.scheduleReconnect();
      };
      
      this.ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        this.updateStatus("error");
        if (!this.isClosed) this.scheduleReconnect();
      };
    } catch (err) {
      console.error("Failed to create WebSocket connection:", err);
      this.updateStatus("error");
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimeout) return;
    
    this.reconnectAttempts++;
    
    // Exponential backoff with maximum delay
    const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts - 1), 30000);
    
    console.log(`Scheduling reconnection attempt #${this.reconnectAttempts} in ${delay}ms`);
    
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      this.connect();
    }, delay);
  }

  /**
   * Add a handler for incoming messages
   */
  onMessage<T = any>(handler: MessageHandler<T>) {
    this.handlers.push(handler as MessageHandler);
    return () => {
      this.handlers = this.handlers.filter(h => h !== handler);
    };
  }

  /**
   * Add a handler for connection status changes
   */
  onStatusChange(handler: StatusHandler) {
    this.statusHandlers.push(handler);
    return () => {
      this.statusHandlers = this.statusHandlers.filter(h => h !== handler);
    };
  }

  /**
   * Send data to the server
   */
  send(data: any) {
    if (this.ws && this.status === "open") {
      this.ws.send(JSON.stringify(data));
      return true;
    }
    return false;
  }

  /**
   * Close the connection and clean up resources
   */
  close() {
    this.isClosed = true;
    
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.messageQueue = [];
  }

  /**
   * Get current queue statistics
   */
  getQueueStats() {
    return {
      queueLength: this.messageQueue.length,
      reconnectAttempts: this.reconnectAttempts,
      status: this.status
    };
  }
}