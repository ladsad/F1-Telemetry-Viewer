import { useState, useCallback, useRef, useEffect } from 'react';

export interface VirtualizationMetrics {
  renderTime: number;
  dataPoints: number;
  compressionRatio: number;
  samplingEfficiency: number;
}

export function useChartVirtualization() {
  const [metrics, setMetrics] = useState<VirtualizationMetrics>({
    renderTime: 0,
    dataPoints: 0,
    compressionRatio: 1,
    samplingEfficiency: 1
  });

  const renderStartTime = useRef<number>(0);

  const startRender = useCallback(() => {
    renderStartTime.current = performance.now();
  }, []);

  const endRender = useCallback((dataPoints: number, originalDataPoints: number) => {
    const renderTime = performance.now() - renderStartTime.current;
    const compressionRatio = originalDataPoints > 0 ? dataPoints / originalDataPoints : 1;
    const samplingEfficiency = compressionRatio > 0 ? (1 / renderTime) * compressionRatio : 0;

    setMetrics({
      renderTime,
      dataPoints,
      compressionRatio,
      samplingEfficiency
    });
  }, []);

  return {
    metrics,
    startRender,
    endRender
  };
}