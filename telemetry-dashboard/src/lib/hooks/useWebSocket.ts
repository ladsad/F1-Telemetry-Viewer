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

  // Connect function with enhanced error handling
  const connect = useCallback(() => {
    if (!url) {
      setError("No WebSocket URL provided");
      return;
    }

    // Don't attempt connection if already connected or connecting
    if (status === "open" || status === "connecting") {
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

      // Set up error recovery - if connection fails after timeout, try again
      const connectionTimeout = setTimeout(() => {
        if (wsRef.current?.status === "connecting") {
          console.warn('WebSocket connection timeout, retrying...');
          // Call reconnect logic directly here instead of using reconnect()
          setError(null);
          disconnect();
          setTimeout(() => {
            connectionStatsRef.current.reconnectAttempts = 0;
            connect();
          }, 200);
        }
      }, 10000); // 10 second timeout

      // Clear timeout when connection succeeds or component unmounts
      unsubscribersRef.current.push(() => clearTimeout(connectionTimeout));

    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to create WebSocket connection');
      console.error('WebSocket connection error:', error);
      handleError(error);
      
      // Attempt reconnection after error if auto-reconnect is enabled
      if (connectionConfig.enableAutoReconnect && connectionStatsRef.current.reconnectAttempts < connectionConfig.maxReconnectAttempts) {
        setTimeout(() => {
          // Inline reconnect logic to avoid circular dependency
          setError(null);
          disconnect();
          setTimeout(() => {
            connectionStatsRef.current.reconnectAttempts = 0;
            connect();
          }, 200);
        }, connectionConfig.reconnectInterval);
      }
    }
  }, [url, connectionConfig, handleStatusChange, handleMessage, handleError, status, disconnect]);

  // Reconnect function with improved error handling
  const reconnect = useCallback(() => {
    // Clear any existing error state
    setError(null);
    
    // Disconnect cleanly first
    disconnect();
    
    // Add small delay to ensure cleanup, then reconnect
    setTimeout(() => {
      // Reset connection stats for new attempt
      connectionStatsRef.current.reconnectAttempts = 0;
      connect();
    }, 200);
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

  // Main effect for connection management with better error recovery
  useEffect(() => {
    if (!url) {
      setError("No WebSocket URL provided");
      setStatus("closed");
      return;
    }

    // Validate URL format before attempting connection
    try {
      new URL(url);
    } catch (urlError) {
      setError(`Invalid WebSocket URL: ${url}`);
      setStatus("error");
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

  // Add connection health monitoring
  useEffect(() => {
    if (!wsRef.current || !connectionConfig.enableAutoReconnect) return;

    const healthCheckInterval = setInterval(() => {
      // If we haven't received data in a while and should be connected, reconnect
      const timeSinceLastData = Date.now() - (connectionStatsRef.current.lastConnectedAt || 0);
      const healthTimeout = 60000; // 1 minute without data is unhealthy

      if (status === 'open' && timeSinceLastData > healthTimeout) {
        console.warn('WebSocket connection appears stale, reconnecting...');
        reconnect();
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(healthCheckInterval);
  }, [status, reconnect, connectionConfig.enableAutoReconnect]);

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
  // Read from environment variables with fallback
  const baseUrl = process.env.NEXT_PUBLIC_OPENF1_WS_URL || "wss://api.openf1.org/v1";
  
  // Ensure baseUrl doesn't end with slash for consistent URL building
  const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  
  try {
    const url = new URL(endpoint, cleanBaseUrl);
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.set(key, value);
      });
    }
    
    return url.toString();
  } catch (error) {
    console.error('Failed to create WebSocket URL:', error);
    // Fallback to manual URL construction
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return `${cleanBaseUrl}${endpoint}${queryString}`;
  }
}

// Hook for specific OpenF1 telemetry data
export function useOpenF1Telemetry(sessionKey: string | null, driverNumber?: number) {
  // Only create URL if we have a valid session key
  const url = useMemo(() => {
    if (!sessionKey || sessionKey === 'null' || sessionKey === 'undefined') {
      return null;
    }
    
    try {
      return createOpenF1WebSocketUrl('/live_timing', {
        session_key: sessionKey,
        ...(driverNumber && { driver_number: driverNumber.toString() })
      });
    } catch (error) {
      console.error('Failed to create telemetry WebSocket URL:', error);
      return null;
    }
  }, [sessionKey, driverNumber]);

  return useWebSocket(url, {
    parseOptions: {
      enableParsing: true,
      validator: (data) => {
        // More robust validation for OpenF1 data
        if (!data || typeof data !== 'object') return false;
        
        // Check for required fields based on OpenF1 API structure
        const hasTimestamp = 'timestamp' in data || 'date' in data;
        const hasDriverData = 'driver_number' in data || 'session_key' in data;
        
        return hasTimestamp && hasDriverData;
      },
      transformer: (data) => {
        // Transform OpenF1 data structure to match our internal format
        const timestamp = data.timestamp || data.date;
        
        return {
          ...data,
          timestamp: timestamp ? new Date(timestamp).getTime() : Date.now(),
          // Normalize field names from OpenF1 to our internal format
          gear: data.gear || data.n_gear || 0,
          drs: Boolean(data.drs === 1 || data.drs === true || data.drs === 'true'),
        };
      }
    },
    queueOptions: {
      throttleMs: 100, // Slightly higher for stability
      debounceMs: 50,  // Lower debounce for more responsive updates
      processStrategy: 'smooth',
    },
    connectionOptions: {
      enableAutoReconnect: true,
      maxReconnectAttempts: 20, // Increased for better reliability
      reconnectInterval: 2000,  // Slower initial reconnect
      pingInterval: 25000,      // Regular ping to keep connection alive
    },
    onError: (error) => {
      console.error('OpenF1 Telemetry WebSocket error:', error);
    },
    onStatusChange: (status) => {
      if (process.env.NODE_ENV === 'development') {
        console.log(`OpenF1 Telemetry connection status: ${status}`);
      }
    }
  });
}

// Enhanced hook for live dashboard with better error handling
export function useLiveTelemetryStream(sessionKey: string | null) {
  const [drivers, setDrivers] = useState<any[]>([])
  const [sessionInfo, setSessionInfo] = useState<any>(null)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  const { data, status, error, reconnect, disconnect } = useOpenF1Telemetry(sessionKey)

  // Process incoming telemetry data with error handling
  useEffect(() => {
    if (!data) return;

    try {
      const now = new Date()
      
      if (Array.isArray(data)) {
        // Bulk update from multiple drivers
        setDrivers(prevDrivers => {
          const updatedDrivers = [...prevDrivers]
          
          data.forEach(driverData => {
            // Validate driver data structure
            if (!driverData || typeof driverData !== 'object' || !driverData.driver_number) {
              console.warn('Invalid driver data received:', driverData);
              return;
            }

            const existingIndex = updatedDrivers.findIndex(d => d.driver_number === driverData.driver_number)
            
            if (existingIndex >= 0) {
              updatedDrivers[existingIndex] = { 
                ...updatedDrivers[existingIndex], 
                ...driverData, 
                timestamp: now.getTime() 
              }
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
            updatedDrivers[existingIndex] = { 
              ...updatedDrivers[existingIndex], 
              ...data, 
              timestamp: now.getTime() 
            }
          } else {
            updatedDrivers.push({ ...data, timestamp: now.getTime() })
          }
          
          return updatedDrivers
        })
      } else {
        console.warn('Received data without driver_number:', data);
      }
      
      setLastUpdate(now)
    } catch (processingError) {
      console.error('Error processing telemetry data:', processingError);
    }
  }, [data])

  return {
    drivers,
    sessionInfo,
    lastUpdate,
    connectionState: status, // Fix: use 'status' instead of 'connectionState'
    error,
    reconnect,
    disconnect,
    isLive: status === 'open', // Fix: use 'status' instead of 'connectionState'
    // Add health check function
    isHealthy: status === 'open' && drivers.length > 0 // Fix: use 'status' instead of 'connectionState'
  }
}