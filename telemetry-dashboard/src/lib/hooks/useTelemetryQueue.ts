import { useEffect, useRef, useState } from "react";
import { throttle, debounce } from "lodash";

type QueueOptions = {
  throttleMs?: number; // How often to process queue (throttle)
  debounceMs?: number; // How long to wait after updates stop (debounce)
  maxQueueSize?: number; // Maximum size before older items are dropped
  processStrategy?: 'latest' | 'average' | 'smooth'; // How to process multiple items
};

/**
 * Custom hook that implements a queue system for high-frequency telemetry data.
 * - Throttles UI updates to prevent render thrashing
 * - Optionally debounces to ensure final value is always rendered
 * - Can limit queue size to prevent memory issues with very high frequency data
 * - Supports different processing strategies (latest, average, smooth)
 */
export function useTelemetryQueue<T>(options: QueueOptions = {}) {
  const {
    throttleMs = 100, // Process queue every 100ms by default
    debounceMs = 200, // Wait 200ms after updates stop to ensure final value
    maxQueueSize = 1000, // Limit queue size to prevent memory issues
    processStrategy = 'latest', // Default to using latest value
  } = options;

  const [data, setData] = useState<T | null>(null);
  const queueRef = useRef<T[]>([]);
  const processingRef = useRef(false);

  // Process the queue and update state
  const processQueue = useRef(
    throttle(() => {
      if (queueRef.current.length === 0) return;

      let result: T;
      
      switch (processStrategy) {
        case 'latest':
          // Use the most recent value
          result = queueRef.current[queueRef.current.length - 1];
          break;
          
        case 'average':
          // Calculate average of numeric values
          if (typeof queueRef.current[0] === 'object') {
            const keys = Object.keys(queueRef.current[0] as object);
            const avg = {} as any;
            
            keys.forEach(key => {
              if (typeof (queueRef.current[0] as any)[key] === 'number') {
                avg[key] = queueRef.current.reduce((sum, item) => 
                  sum + (item as any)[key], 0) / queueRef.current.length;
              } else {
                avg[key] = (queueRef.current[queueRef.current.length - 1] as any)[key];
              }
            });
            
            result = avg as T;
          } else {
            result = queueRef.current[queueRef.current.length - 1];
          }
          break;
          
        case 'smooth':
          // Apply simple low-pass filter for smoothing
          if (typeof queueRef.current[0] === 'object' && data) {
            const keys = Object.keys(queueRef.current[0] as object);
            const smoothed = { ...(data as object) } as any;
            const latest = queueRef.current[queueRef.current.length - 1] as any;
            const smoothFactor = 0.3; // Lower = smoother but more lag
            
            keys.forEach(key => {
              if (typeof latest[key] === 'number' && typeof smoothed[key] === 'number') {
                smoothed[key] = smoothed[key] + smoothFactor * (latest[key] - smoothed[key]);
              } else {
                smoothed[key] = latest[key];
              }
            });
            
            result = smoothed as T;
          } else {
            result = queueRef.current[queueRef.current.length - 1];
          }
          break;
      }
      
      setData(result);
      queueRef.current = [];
      processingRef.current = false;
    }, throttleMs)
  ).current;
  
  // Ensure final value is processed with debounce
  const processQueueDebounced = useRef(
    debounce(() => {
      processQueue();
    }, debounceMs)
  ).current;

  // Add item to queue and trigger processing
  const enqueue = (item: T) => {
    // Add to queue
    queueRef.current.push(item);
    
    // Limit queue size by removing oldest items
    if (queueRef.current.length > maxQueueSize) {
      queueRef.current = queueRef.current.slice(-maxQueueSize);
    }
    
    // Process queue (throttled)
    processQueue();
    
    // Also ensure final value is processed (debounced)
    processQueueDebounced();
  };
  
  // Clear the queue
  const clearQueue = () => {
    queueRef.current = [];
    setData(null);
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      processQueue.cancel();
      processQueueDebounced.cancel();
    };
  }, [processQueue, processQueueDebounced]);

  return {
    data,
    enqueue,
    clearQueue,
    queueLength: queueRef.current.length,
  };
}