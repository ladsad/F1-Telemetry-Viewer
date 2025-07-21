import { useTelemetry } from "@/context/TelemetryDataContext";
import { useMemo } from "react";

/**
 * Specialized hook that provides telemetry data for specific components
 * while optimizing renders and adding derived calculations
 */
export function useTelemetryData(metricType: 'car' | 'track' | 'driver' | 'weather' = 'car') {
  const { telemetryState, connectionStatus } = useTelemetry();
  
  // Use useMemo to prevent unnecessary recalculations when other parts of state change
  return useMemo(() => {
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
}