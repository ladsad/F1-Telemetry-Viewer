import { useState, useEffect, useCallback, useRef } from 'react';

type VirtualizationOptions = {
  batchSize?: number;
  overscanCount?: number;
  throttleMs?: number;
};

/**
 * Custom hook for handling large telemetry datasets with virtualization
 * - Processes data in batches to prevent UI blocking
 * - Optimizes rendering of large datasets
 * - Provides windowing capabilities for visible data
 */
export function useTelemetryVirtualization<T>(
  data: T[],
  options: VirtualizationOptions = {}
) {
  const {
    batchSize = 100,
    overscanCount = 10,
    throttleMs = 16, // ~60fps
  } = options;
  
  const [processedData, setProcessedData] = useState<T[]>([]);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 0 });
  const [isProcessing, setIsProcessing] = useState(false);
  const processingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Process data in batches to prevent UI blocking
  useEffect(() => {
    if (!data.length) {
      setProcessedData([]);
      return;
    }
    
    let currentBatch = 0;
    const totalBatches = Math.ceil(data.length / batchSize);
    setIsProcessing(true);
    
    const processNextBatch = () => {
      if (currentBatch >= totalBatches) {
        setIsProcessing(false);
        return;
      }
      
      const startIndex = currentBatch * batchSize;
      const endIndex = Math.min(startIndex + batchSize, data.length);
      const batchData = data.slice(startIndex, endIndex);
      
      setProcessedData(prev => [...prev, ...batchData]);
      currentBatch++;
      
      processingTimeoutRef.current = setTimeout(processNextBatch, throttleMs);
    };
    
    setProcessedData([]);
    processNextBatch();
    
    return () => {
      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current);
      }
    };
  }, [data, batchSize, throttleMs]);
  
  // Update visible range based on scroll position
  const updateVisibleRange = useCallback((start: number, end: number) => {
    // Include overscan for smoother scrolling
    const overscanStart = Math.max(0, start - overscanCount);
    const overscanEnd = Math.min(processedData.length, end + overscanCount);
    
    setVisibleRange({ start: overscanStart, end: overscanEnd });
  }, [processedData.length, overscanCount]);
  
  // Get only the visible items for rendering
  const visibleData = processedData.slice(visibleRange.start, visibleRange.end);
  
  return {
    processedData,
    visibleData,
    updateVisibleRange,
    isProcessing,
    totalCount: data.length,
    processedCount: processedData.length,
  };
}