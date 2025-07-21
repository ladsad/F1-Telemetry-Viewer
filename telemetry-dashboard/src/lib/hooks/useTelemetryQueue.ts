import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { throttle, debounce } from "lodash";

export type QueueProcessStrategy = 'latest' | 'average' | 'smooth' | 'median' | 'adaptive';

export type QueueOptions = {
  throttleMs?: number; // How often to process queue (throttle)
  debounceMs?: number; // How long to wait after updates stop (debounce)
  maxQueueSize?: number; // Maximum size before older items are dropped
  processStrategy?: QueueProcessStrategy; // How to process multiple items
  onProcessedData?: (data: any) => void; // Callback for processed data
  onQueueFull?: (droppedItems: any[]) => void; // Callback when queue overflows
  adaptiveThreshold?: number; // Threshold for adaptive processing
  smoothingFactor?: number; // Factor for smoothing (0-1, lower = smoother)
  enableMetrics?: boolean; // Track performance metrics
};

export type QueueMetrics = {
  totalEnqueued: number;
  totalProcessed: number;
  totalDropped: number;
  avgProcessingTime: number;
  queueUtilization: number; // Current queue size / max size
  lastProcessedAt: number | null;
};

/**
 * Enhanced telemetry queue hook with advanced processing strategies
 * and performance monitoring capabilities
 */
export function useTelemetryQueue<T>(options: QueueOptions = {}) {
  const {
    throttleMs = 100,
    debounceMs = 200,
    maxQueueSize = 1000,
    processStrategy = 'latest',
    onProcessedData,
    onQueueFull,
    adaptiveThreshold = 0.8, // Switch to 'latest' when queue is 80% full
    smoothingFactor = 0.3,
    enableMetrics = false,
  } = options;

  const [data, setData] = useState<T | null>(null);
  const queueRef = useRef<T[]>([]);
  const processingRef = useRef(false);
  const smoothedDataRef = useRef<T | null>(null);
  
  // Performance metrics
  const metricsRef = useRef<QueueMetrics>({
    totalEnqueued: 0,
    totalProcessed: 0,
    totalDropped: 0,
    avgProcessingTime: 0,
    queueUtilization: 0,
    lastProcessedAt: null,
  });
  
  const [metrics, setMetrics] = useState<QueueMetrics>(metricsRef.current);

  // Memoized processing functions for better performance
  const processStrategies = useMemo(() => ({
    latest: (queue: T[]): T => queue[queue.length - 1],
    
    average: (queue: T[]): T => {
      if (typeof queue[0] !== 'object') return queue[queue.length - 1];
      
      const keys = Object.keys(queue[0] as object);
      const avg = {} as any;
      
      keys.forEach(key => {
        const numericValues = queue
          .map(item => (item as any)[key])
          .filter(val => typeof val === 'number');
          
        if (numericValues.length > 0) {
          avg[key] = numericValues.reduce((sum, val) => sum + val, 0) / numericValues.length;
        } else {
          avg[key] = (queue[queue.length - 1] as any)[key];
        }
      });
      
      return avg as T;
    },
    
    smooth: (queue: T[]): T => {
      if (typeof queue[0] !== 'object' || !smoothedDataRef.current) {
        return queue[queue.length - 1];
      }
      
      const keys = Object.keys(queue[0] as object);
      const smoothed = { ...smoothedDataRef.current } as any;
      const latest = queue[queue.length - 1] as any;
      
      keys.forEach(key => {
        if (typeof latest[key] === 'number' && typeof smoothed[key] === 'number') {
          smoothed[key] = smoothed[key] + smoothingFactor * (latest[key] - smoothed[key]);
        } else {
          smoothed[key] = latest[key];
        }
      });
      
      smoothedDataRef.current = smoothed;
      return smoothed as T;
    },
    
    median: (queue: T[]): T => {
      if (typeof queue[0] !== 'object') return queue[queue.length - 1];
      
      const keys = Object.keys(queue[0] as object);
      const median = {} as any;
      
      keys.forEach(key => {
        const numericValues = queue
          .map(item => (item as any)[key])
          .filter(val => typeof val === 'number')
          .sort((a, b) => a - b);
          
        if (numericValues.length > 0) {
          const mid = Math.floor(numericValues.length / 2);
          median[key] = numericValues.length % 2 === 0
            ? (numericValues[mid - 1] + numericValues[mid]) / 2
            : numericValues[mid];
        } else {
          median[key] = (queue[queue.length - 1] as any)[key];
        }
      });
      
      return median as T;
    },
    
    adaptive: (queue: T[]): T => {
      const utilization = queue.length / maxQueueSize;
      
      // Use different strategies based on queue utilization
      if (utilization > adaptiveThreshold) {
        return processStrategies.latest(queue);
      } else if (utilization > 0.5) {
        return processStrategies.smooth(queue);
      } else {
        return processStrategies.average(queue);
      }
    },
  }), [maxQueueSize, adaptiveThreshold, smoothingFactor]);

  // Enhanced processing with performance tracking
  const processQueue = useRef(
    throttle(() => {
      if (queueRef.current.length === 0 || processingRef.current) return;
      
      const startTime = enableMetrics ? performance.now() : 0;
      processingRef.current = true;

      try {
        // Select processing strategy
        const strategy = processStrategies[processStrategy] || processStrategies.latest;
        const result = strategy(queueRef.current);
        
        // Update metrics
        if (enableMetrics) {
          const processingTime = performance.now() - startTime;
          const metrics = metricsRef.current;
          
          metrics.totalProcessed++;
          metrics.avgProcessingTime = 
            (metrics.avgProcessingTime * (metrics.totalProcessed - 1) + processingTime) / 
            metrics.totalProcessed;
          metrics.queueUtilization = queueRef.current.length / maxQueueSize;
          metrics.lastProcessedAt = Date.now();
          
          setMetrics({ ...metrics });
        }
        
        // Update state
        setData(result);
        
        // Notify callback if provided
        onProcessedData?.(result);
        
        // Clear processed items
        queueRef.current = [];
        
      } catch (error) {
        console.error('Error processing telemetry queue:', error);
      } finally {
        processingRef.current = false;
      }
    }, throttleMs)
  ).current;

  // Debounced processing to ensure final value is captured
  const processQueueDebounced = useRef(
    debounce(() => {
      if (!processingRef.current) {
        processQueue();
      }
    }, debounceMs)
  ).current;

  // Enhanced enqueue with overflow handling
  const enqueue = useCallback((item: T) => {
    // Handle queue overflow
    if (queueRef.current.length >= maxQueueSize) {
      const droppedItems = queueRef.current.splice(0, Math.floor(maxQueueSize * 0.3));
      
      if (enableMetrics) {
        metricsRef.current.totalDropped += droppedItems.length;
      }
      
      onQueueFull?.(droppedItems);
    }
    
    queueRef.current.push(item);
    
    if (enableMetrics) {
      metricsRef.current.totalEnqueued++;
    }
    
    // Initialize smoothed data if using smooth strategy
    if (processStrategy === 'smooth' && !smoothedDataRef.current) {
      smoothedDataRef.current = item;
    }
    
    // Process queue
    processQueue();
    processQueueDebounced();
  }, [processStrategy, maxQueueSize, enableMetrics, onQueueFull, processQueue, processQueueDebounced]);

  // Clear queue and reset metrics
  const clearQueue = useCallback(() => {
    queueRef.current = [];
    smoothedDataRef.current = null;
    setData(null);
    
    if (enableMetrics) {
      metricsRef.current = {
        totalEnqueued: 0,
        totalProcessed: 0,
        totalDropped: 0,
        avgProcessingTime: 0,
        queueUtilization: 0,
        lastProcessedAt: null,
      };
      setMetrics({ ...metricsRef.current });
    }
  }, [enableMetrics]);

  // Pause/resume processing
  const pauseProcessing = useCallback(() => {
    processQueue.cancel();
    processQueueDebounced.cancel();
  }, [processQueue, processQueueDebounced]);

  const resumeProcessing = useCallback(() => {
    if (queueRef.current.length > 0) {
      processQueue();
    }
  }, [processQueue]);

  // Get queue statistics
  const getQueueStats = useCallback(() => ({
    currentSize: queueRef.current.length,
    maxSize: maxQueueSize,
    utilization: queueRef.current.length / maxQueueSize,
    strategy: processStrategy,
    isProcessing: processingRef.current,
  }), [maxQueueSize, processStrategy]);

  // Batch processing for multiple items
  const enqueueBatch = useCallback((items: T[]) => {
    items.forEach(item => enqueue(item));
  }, [enqueue]);

  // Priority enqueue (adds to front of queue)
  const enqueuePriority = useCallback((item: T) => {
    if (queueRef.current.length >= maxQueueSize) {
      queueRef.current.pop(); // Remove last item instead of first
      
      if (enableMetrics) {
        metricsRef.current.totalDropped++;
      }
    }
    
    queueRef.current.unshift(item);
    
    if (enableMetrics) {
      metricsRef.current.totalEnqueued++;
    }
    
    processQueue();
    processQueueDebounced();
  }, [maxQueueSize, enableMetrics, processQueue, processQueueDebounced]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      processQueue.cancel();
      processQueueDebounced.cancel();
    };
  }, [processQueue, processQueueDebounced]);

  // Auto-clear old data if queue hasn't been updated in a while
  useEffect(() => {
    if (!data) return;
    
    const timeout = setTimeout(() => {
      if (queueRef.current.length === 0) {
        setData(null);
      }
    }, debounceMs * 3); // Clear after 3x debounce time
    
    return () => clearTimeout(timeout);
  }, [data, debounceMs]);

  return {
    // Core functionality
    data,
    enqueue,
    clearQueue,
    queueLength: queueRef.current.length,
    
    // Advanced features
    enqueueBatch,
    enqueuePriority,
    pauseProcessing,
    resumeProcessing,
    getQueueStats,
    
    // Metrics (only available if enabled)
    metrics: enableMetrics ? metrics : null,
    
    // Configuration info
    config: {
      throttleMs,
      debounceMs,
      maxQueueSize,
      processStrategy,
      smoothingFactor,
    },
  };
}

// Specialized hooks for different telemetry types
export function useCarTelemetryQueue<T>(customOptions: Partial<QueueOptions> = {}) {
  return useTelemetryQueue<T>({
    throttleMs: 50, // Higher frequency for car data
    processStrategy: 'smooth',
    smoothingFactor: 0.2,
    enableMetrics: true,
    ...customOptions,
  });
}

export function usePositionQueue<T>(customOptions: Partial<QueueOptions> = {}) {
  return useTelemetryQueue<T>({
    throttleMs: 100,
    processStrategy: 'latest', // Positions should be latest
    maxQueueSize: 500,
    ...customOptions,
  });
}

export function useWeatherQueue<T>(customOptions: Partial<QueueOptions> = {}) {
  return useTelemetryQueue<T>({
    throttleMs: 1000, // Weather changes slowly
    processStrategy: 'average',
    maxQueueSize: 100,
    ...customOptions,
  });
}