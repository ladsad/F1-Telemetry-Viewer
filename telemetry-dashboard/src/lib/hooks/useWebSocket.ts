import { useEffect, useRef, useState, useCallback } from "react";
import { OpenF1WebSocket, WebSocketStatus } from "@/lib/api/openf1WebSocket";
import { useTelemetryQueue } from "@/lib/hooks/useTelemetryQueue";

export type WebSocketHookOptions = {
  onStatusChange?: (status: WebSocketStatus) => void;
  queueOptions?: {
    throttleMs?: number;
    debounceMs?: number;
    processStrategy?: 'latest' | 'average' | 'smooth';
  };
};

/**
 * Enhanced WebSocket hook with integrated queue for telemetry data
 */
export function useWebSocket<T = any>(url: string | null, options: WebSocketHookOptions = {}) {
  const wsRef = useRef<OpenF1WebSocket | null>(null);
  const [status, setStatus] = useState<WebSocketStatus>("closed");

  // Create telemetry queue to handle high-frequency updates
  const telemetryQueue = useTelemetryQueue<T>({
    throttleMs: options.queueOptions?.throttleMs || 100,
    debounceMs: options.queueOptions?.debounceMs || 200,
    processStrategy: options.queueOptions?.processStrategy || 'latest',
  });
  
  // Handle WebSocket connection/messages
  useEffect(() => {
    if (!url) return;
    
    wsRef.current = new OpenF1WebSocket(url);
    
    // Handle status changes
    const unsubStatus = wsRef.current.onStatusChange((newStatus) => {
      setStatus(newStatus);
      options.onStatusChange?.(newStatus);
    });
    
    // Handle incoming messages
    const unsubMessage = wsRef.current.onMessage((msg: T) => {
      telemetryQueue.enqueue(msg);
    });
    
    return () => {
      unsubStatus();
      unsubMessage();
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [url, options.onStatusChange]);

  // Function to send data if needed
  const send = useCallback((data: any): boolean => {
    return wsRef.current?.send(data) || false;
  }, []);
  
  // Function to force-reconnect if needed
  const reconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = url ? new OpenF1WebSocket(url) : null;
      return true;
    }
    return false;
  }, [url]);

  return {
    data: telemetryQueue.data,
    status,
    send,
    reconnect,
    queueLength: telemetryQueue.queueLength
  };
}