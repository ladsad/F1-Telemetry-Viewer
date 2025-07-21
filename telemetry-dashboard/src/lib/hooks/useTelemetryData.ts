import { useTelemetry } from "@/context/TelemetryDataContext";
import { useMemo, useCallback } from "react";
import { TelemetryDataPoint } from "@/lib/types";

/**
 * Specialized hook that provides telemetry data for specific components
 * while optimizing renders and adding derived calculations
 */
export function useTelemetryData(metricType: 'car' | 'track' | 'driver' | 'weather' = 'car') {
  const { telemetryState, connectionStatus, telemetryHistory } = useTelemetry();
  
  // Use useMemo to prevent unnecessary recalculations when other parts of state change
  const currentData = useMemo(() => {
    // Optimize by returning only needed subset of state based on component type
    switch (metricType) {
      case 'car':
        return {
          data: telemetryState.carData,
          status: connectionStatus.telemetry
        };
      case 'track':
        return {
          positions: telemetryState.positions,
          raceProgress: telemetryState.raceProgress,
          status: connectionStatus.positions
        };
      case 'driver':
        return {
          driverStatus: telemetryState.driverStatus,
          raceProgress: telemetryState.raceProgress
        };
      case 'weather':
        return {
          weather: telemetryState.weather,
          // Add derived weather calculations
          conditions: telemetryState.weather ? {
            isTyreCritical: telemetryState.weather.track_temperature > 45 || telemetryState.weather.track_temperature < 15,
            isRaining: (telemetryState.weather.rainfall || 0) > 0.5,
            windEffect: telemetryState.weather.wind_speed > 20 ? 'strong' : 
                      telemetryState.weather.wind_speed > 10 ? 'moderate' : 'light'
          } : null
        };
      default:
        return telemetryState;
    }
  }, [telemetryState, connectionStatus, metricType]);

  // Efficient query methods for historical data
  const getRecentHistory = useCallback((seconds: number = 10): TelemetryDataPoint[] => {
    if (!telemetryHistory || !telemetryHistory.indexedData.length) return [];
    
    const now = Date.now();
    const cutoffTime = now - (seconds * 1000);
    
    // Use binary search to find closest index
    const { point, index } = telemetryHistory.findByTimestamp(cutoffTime);
    if (index === -1) return [];
    
    // Return slice from index to end (most recent data)
    return telemetryHistory.indexedData.slice(index);
  }, [telemetryHistory]);

  // Get metric statistics for specific duration
  const getMetricStatistics = useCallback((metric: keyof TelemetryDataPoint, seconds: number = 30) => {
    const recentData = getRecentHistory(seconds);
    if (!recentData.length) return null;
    
    const values = recentData.map(point => point[metric]);
    const numericValues = values.filter(v => typeof v === 'number') as number[];
    
    if (!numericValues.length) return null;
    
    return {
      min: Math.min(...numericValues),
      max: Math.max(...numericValues),
      avg: numericValues.reduce((sum, val) => sum + val, 0) / numericValues.length,
      current: recentData[recentData.length - 1][metric],
      trend: calculateTrend(numericValues)
    };
  }, [getRecentHistory]);

  // Calculate trend direction
  function calculateTrend(values: number[]): 'up' | 'down' | 'stable' {
    if (values.length < 5) return 'stable';
    
    // Use linear regression slope to determine trend
    const n = Math.min(values.length, 10); // Use last 10 points
    const recentValues = values.slice(-n);
    
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumXX = 0;
    
    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += recentValues[i];
      sumXY += i * recentValues[i];
      sumXX += i * i;
    }
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    
    if (slope > 0.1) return 'up';
    if (slope < -0.1) return 'down';
    return 'stable';
  }

  return {
    ...currentData,
    getRecentHistory,
    getMetricStatistics
  };
}