import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { OpenF1WebSocket, WebSocketStatus } from "@/lib/api/openf1WebSocket";
import { useTelemetryQueue } from "@/lib/hooks/useTelemetryQueue";

export type WebSocketHookOptions = {
  onStatusChange?: (status: WebSocketStatus) => void;
  onError?: (error: Error | Event) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onMessage?: (data: any) => void;
  
  // Queue configuration
  queueOptions?: {
    throttleMs?: number;
    debounceMs?: number;
    processStrategy?: 'latest' | 'average' | 'smooth';
  };
  
  // Connection configuration
  connectionOptions?: {
    maxReconnectAttempts?: number;
    reconnectInterval?: number;
    enableAutoReconnect?: boolean;
    pingInterval?: number;
  };
  
  // Data parsing options
  parseOptions?: {
    enableParsing?: boolean;
    validator?: (data: any) => boolean;
    transformer?: (data: any) => any;
  };
};

export type WebSocketHookReturn<T = any> = {
  // Data and state
  data: T | null;
  status: WebSocketStatus;
  error: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  
  // Connection control
  connect: () => void;
  disconnect: () => void;
  reconnect: () => void;
  send: (data: any) => boolean;
  
  // Queue information
  queueStats: {
    queueLength: number;
    processedCount: number;
    droppedCount: number;
  };
  
  // Connection metrics
  connectionStats: {
    reconnectAttempts: number;
    totalConnections: number;
    uptime: number;
    lastConnectedAt: number | null;
  };
};

/**
 * Enhanced WebSocket hook with integrated queue for telemetry data
 */
export function useWebSocket<T = any>(
  url: string | null, 
  options: WebSocketHookOptions = {}
): WebSocketHookReturn<T> {
  // Refs
  const wsRef = useRef<OpenF1WebSocket | null>(null);
  const connectionStatsRef = useRef({
    reconnectAttempts: 0,
    totalConnections: 0,
    uptime: 0,
    lastConnectedAt: null as number | null,
    connectedAt: null as number | null,
  });
  const unsubscribersRef = useRef<(() => void)[]>([]);
  const queueStatsRef = useRef({
    processedCount: 0,
    droppedCount: 0,
  });
  
  // State
  const [status, setStatus] = useState<WebSocketStatus>("closed");
  const [error, setError] = useState<string | null>(null);
  const [connectionStats, setConnectionStats] = useState(connectionStatsRef.current);

  // Create telemetry queue to handle high-frequency updates
  const telemetryQueue = useTelemetryQueue<T>({
    throttleMs: options.queueOptions?.throttleMs || 100,
    debounceMs: options.queueOptions?.debounceMs || 200,
    processStrategy: options.queueOptions?.processStrategy || 'latest',
  });

  // Memoized connection options
  const connectionConfig = useMemo(() => ({
    maxReconnectAttempts: options.connectionOptions?.maxReconnectAttempts || 10,
    reconnectInterval: options.connectionOptions?.reconnectInterval || 1000,
    enableAutoReconnect: options.connectionOptions?.enableAutoReconnect ?? true,
    pingInterval: options.connectionOptions?.pingInterval || 30000,
  }), [options.connectionOptions]);

  // Parse and validate incoming data
  const parseMessage = useCallback((rawData: any): T | null => {
    try {
      let parsedData = rawData;
      
      // Apply custom transformer if provided
      if (options.parseOptions?.transformer) {
        parsedData = options.parseOptions.transformer(parsedData);
      }
      
      // Validate data if validator provided
      if (options.parseOptions?.validator && !options.parseOptions.validator(parsedData)) {
        console.warn("WebSocket message failed validation:", parsedData);
        return null;
      }
      
      return parsedData as T;
    } catch (err) {
      console.error("Error parsing WebSocket message:", err);
      setError(`Parse error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      return null;
    }
  }, [options.parseOptions]);

  // Handle status changes with metrics
  const handleStatusChange = useCallback((newStatus: WebSocketStatus) => {
    setStatus(newStatus);
    
    // Update connection stats
    const now = Date.now();
    const stats = connectionStatsRef.current;
    
    switch (newStatus) {
      case "connecting":
        stats.reconnectAttempts++;
        break;
        
      case "open":
        stats.totalConnections++;
        stats.connectedAt = now;
        stats.lastConnectedAt = now;
        setError(null); // Clear error on successful connection
        options.onConnect?.();
        break;
        
      case "closed":
      case "error":
        if (stats.connectedAt) {
          stats.uptime += now - stats.connectedAt;
          stats.connectedAt = null;
        }
        if (newStatus === "closed") {
          options.onDisconnect?.();
        }
        break;
    }
    
    setConnectionStats({ ...stats });
    options.onStatusChange?.(newStatus);
  }, [options]);

  // Handle incoming messages
  const handleMessage = useCallback((data: any) => {
    const parsedData = parseMessage(data);
    if (parsedData !== null) {
      telemetryQueue.enqueue(parsedData);
      queueStatsRef.current.processedCount++;
      options.onMessage?.(parsedData);
    } else {
      queueStatsRef.current.droppedCount++;
    }
  }, [parseMessage, telemetryQueue, options]);

  // Handle errors
  const handleError = useCallback((error: Error | Event) => {
    const errorMessage = error instanceof Error ? error.message : 'WebSocket connection error';
    setError(errorMessage);
    options.onError?.(error);
  }, [options]);

  // Connect function
  const connect = useCallback(() => {
    if (!url) {
      setError("No WebSocket URL provided");
      return;
    }

    if (wsRef.current) {
      wsRef.current.close();
    }

    // Clear any existing unsubscribers
    unsubscribersRef.current.forEach(unsub => unsub());
    unsubscribersRef.current = [];

    try {
      wsRef.current = new OpenF1WebSocket(url, {
        batchSize: 10,
        intervalMs: 50,
        maxQueueSize: connectionConfig.maxReconnectAttempts * 10,
      });

      // Set up event handlers and store unsubscribe functions
      const unsubStatus = wsRef.current.onStatusChange(handleStatusChange);
      const unsubMessage = wsRef.current.onMessage(handleMessage);

      // Store unsubscribe functions in our ref
      unsubscribersRef.current = [unsubStatus, unsubMessage];
      
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to create WebSocket connection');
      handleError(error);
    }
  }, [url, connectionConfig, handleStatusChange, handleMessage, handleError]);

  // Disconnect function
  const disconnect = useCallback(() => {
    // Call unsubscribe functions
    unsubscribersRef.current.forEach(unsub => unsub());
    unsubscribersRef.current = [];
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    // Update connection stats
    const now = Date.now();
    const stats = connectionStatsRef.current;
    if (stats.connectedAt) {
      stats.uptime += now - stats.connectedAt;
      stats.connectedAt = null;
    }
    setConnectionStats({ ...stats });
    
    setStatus("closed");
    setError(null);
  }, []);

  // Reconnect function
  const reconnect = useCallback(() => {
    disconnect();
    setTimeout(() => connect(), 100); // Small delay to ensure cleanup
  }, [disconnect, connect]);

  // Send function
  const send = useCallback((data: any): boolean => {
    if (!wsRef.current) {
      setError("WebSocket not connected");
      return false;
    }

    try {
      return wsRef.current.send(data);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to send data');
      handleError(error);
      return false;
    }
  }, [handleError]);

  // Main effect for connection management
  useEffect(() => {
    if (!url) {
      setError("No WebSocket URL provided");
      return;
    }

    // Auto-connect if enabled
    if (connectionConfig.enableAutoReconnect) {
      connect();
    }

    // Cleanup on unmount or URL change
    return () => {
      disconnect();
    };
  }, [url, connectionConfig.enableAutoReconnect, connect, disconnect]);

  // Periodic uptime update effect
  useEffect(() => {
    const interval = setInterval(() => {
      if (connectionStatsRef.current.connectedAt) {
        const now = Date.now();
        const currentUptime = now - connectionStatsRef.current.connectedAt;
        setConnectionStats(prev => ({
          ...prev,
          uptime: prev.uptime + currentUptime,
        }));
        connectionStatsRef.current.connectedAt = now;
      }
    }, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, []);

  // Memoized derived state
  const isConnected = status === "open";
  const isConnecting = status === "connecting";
  
  const queueStats = useMemo(() => ({
    queueLength: telemetryQueue.queueLength || 0,
    processedCount: queueStatsRef.current.processedCount,
    droppedCount: queueStatsRef.current.droppedCount,
  }), [telemetryQueue.queueLength]);

  return {
    // Data and state
    data: telemetryQueue.data,
    status,
    error,
    isConnected,
    isConnecting,
    
    // Connection control
    connect,
    disconnect,
    reconnect,
    send,
    
    // Statistics
    queueStats,
    connectionStats,
  };
}

// Utility function to create WebSocket URLs for OpenF1
export function createOpenF1WebSocketUrl(endpoint: string, params?: Record<string, string>): string {
  const baseUrl = "wss://api.openf1.org/v1";
  const url = new URL(endpoint, baseUrl);
  
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }
  
  return url.toString();
}

// Hook for specific OpenF1 telemetry data
export function useOpenF1Telemetry(sessionKey: string | null, driverNumber?: number) {
  const url = sessionKey 
    ? createOpenF1WebSocketUrl('/live_timing', {
        session_key: sessionKey,
        ...(driverNumber && { driver_number: driverNumber.toString() })
      })
    : null;

  return useWebSocket(url, {
    parseOptions: {
      enableParsing: true,
      validator: (data) => {
        return data && typeof data === 'object' && 'timestamp' in data;
      },
      transformer: (data) => {
        // Transform OpenF1 data structure to match our internal format
        return {
          ...data,
          timestamp: new Date(data.timestamp || data.date).getTime(),
        };
      }
    },
    queueOptions: {
      throttleMs: 50,
      processStrategy: 'smooth',
    },
    connectionOptions: {
      enableAutoReconnect: true,
      maxReconnectAttempts: 15,
    }
  });
}

// Enhanced hook for live dashboard with better error handling
export function useLiveTelemetryStream(sessionKey: string | null) {
  const [drivers, setDrivers] = useState<any[]>([])
  const [sessionInfo, setSessionInfo] = useState<any>(null)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  const { data, connectionState, error, reconnect, disconnect } = useOpenF1Telemetry(sessionKey)

  // Process incoming telemetry data
  useEffect(() => {
    if (data) {
      const now = new Date()
      
      if (Array.isArray(data)) {
        // Bulk update from multiple drivers
        setDrivers(prevDrivers => {
          const updatedDrivers = [...prevDrivers]
          
          data.forEach(driverData => {
            const existingIndex = updatedDrivers.findIndex(d => d.driver_number === driverData.driver_number)
            
            if (existingIndex >= 0) {
              updatedDrivers[existingIndex] = { ...updatedDrivers[existingIndex], ...driverData, timestamp: now.getTime() }
            } else {
              updatedDrivers.push({ ...driverData, timestamp: now.getTime() })
            }
          })
          
          return updatedDrivers
        })
      } else if (data.driver_number) {
        // Single driver update
        setDrivers(prevDrivers => {
          const updatedDrivers = [...prevDrivers]
          const existingIndex = updatedDrivers.findIndex(d => d.driver_number === data.driver_number)
          
          if (existingIndex >= 0) {
            updatedDrivers[existingIndex] = { ...updatedDrivers[existingIndex], ...data, timestamp: now.getTime() }
          } else {
            updatedDrivers.push({ ...data, timestamp: now.getTime() })
          }
          
          return updatedDrivers
        })
      }
      
      setLastUpdate(now)
    }
  }, [data])

  return {
    drivers,
    sessionInfo,
    lastUpdate,
    connectionState,
    error,
    reconnect,
    disconnect,
    isLive: connectionState === 'open'
  }
}