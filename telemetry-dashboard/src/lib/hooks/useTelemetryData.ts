import { useTelemetry } from "@/context/TelemetryDataContext";
import { useMemo, useCallback } from "react";
import { OpenF1CarData } from "@/lib/api/types";

/**
 * Specialized hook that provides telemetry data for specific components
 * while optimizing renders and adding derived calculations
 */
export function useTelemetryData(metricType: 'car' | 'track' | 'driver' | 'weather' = 'car') {
  const { telemetryState, connectionStatus } = useTelemetry();
  
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
      case 'weather': {
        const weather = telemetryState.weather;
        return {
          weather,
          // Add derived weather calculations
          conditions: weather ? {
            isTyreCritical: (weather.track_temperature ?? 0) > 45 || 
                           (weather.track_temperature ?? 0) < 15,
            isRaining: (weather.rainfall ?? 0) > 0.5,
            windEffect: (weather.wind_speed ?? 0) > 20 ? 'strong' : 
                       (weather.wind_speed ?? 0) > 10 ? 'moderate' : 'light'
          } : null
        };
      }
      default:
        return telemetryState;
    }
  }, [telemetryState, connectionStatus, metricType]);

  // Simple current data accessor since we don't have historical data
  const getCurrentData = useCallback(() => {
    return telemetryState.carData;
  }, [telemetryState.carData]);

  // Get basic statistics from current data using the correct type
  const getCurrentStatistics = useCallback((metric: string) => {
    const carData = telemetryState.carData as any;
    const currentValue = carData?.[metric];
    
    if (currentValue === undefined || typeof currentValue !== 'number') {
      return null;
    }
    
    return {
      current: currentValue,
      // Since we don't have historical data, we can't calculate min/max/avg/trend
      min: currentValue,
      max: currentValue,
      avg: currentValue,
      trend: 'stable' as const
    };
  }, [telemetryState.carData]);

  // Add a more type-safe version that works with known TelemetryData properties
  const getTelemetryStatistics = useCallback((metric: 'speed' | 'throttle' | 'brake' | 'gear' | 'rpm' | 'drs') => {
    if (!telemetryState.carData) {
      return null;
    }

    const currentValue = telemetryState.carData[metric];
    
    if (currentValue === undefined || typeof currentValue !== 'number') {
      return null;
    }
    
    return {
      current: currentValue,
      min: currentValue,
      max: currentValue,
      avg: currentValue,
      trend: 'stable' as const
    };
  }, [telemetryState.carData]);

  return {
    ...currentData,
    getCurrentData,
    getCurrentStatistics,
    getTelemetryStatistics
  };
}